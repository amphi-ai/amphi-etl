// index.tsx
import {
  JupyterFrontEnd,
  JupyterFrontEndPlugin
} from '@jupyterlab/application';
import { ICommandPalette, ReactWidget } from '@jupyterlab/apputils';
import { ServerConnection } from '@jupyterlab/services';
import { URLExt } from '@jupyterlab/coreutils';
import { requestScheduler } from './handler';
import { IDocumentManager } from '@jupyterlab/docmanager';
import React, { useState, useEffect } from 'react';
import {
  CalendarOutlined,
  ClockCircleOutlined,
  DeleteOutlined,
  EditOutlined,
  PlayCircleOutlined,
  PlusOutlined,
  ReloadOutlined,
  ScheduleOutlined,
  FolderOpenOutlined
} from '@ant-design/icons';
import { schedulerIcon } from './icons';
import {
  Button,
  Card,
  DatePicker,
  Divider,
  Empty,
  Form,
  Input,
  InputNumber,
  List,
  Modal,
  Radio,
  Select,
  Space,
  Spin,
  Tag,
  Tooltip,
  message,

  ConfigProvider
} from 'antd';
import { createStyles } from 'antd-style';
import dayjs, { Dayjs } from 'dayjs'; // Import dayjs and Dayjs type
import { showBrowseFileDialog } from './BrowseFileDialog';   /* NEW */
import { Notification } from '@jupyterlab/apputils';

/* ---------- types ---------- */
interface Job {
  id: string;
  name: string;
  next_run_time: string | null;
  trigger: string;
  pipeline_path: string;

  /*  ⇣ fields returned by the backend's `_serialise()` helper ⇣  */
  schedule_type: 'date' | 'interval' | 'cron';
  run_date?: string;              // only for `date`
  interval_seconds?: number;      // only for `interval`
  cron_expression?: string;       // only for `cron`
}

interface JobFormValues {
  id?: string;
  name: string;
  pipeline_path: string;
  schedule_type: 'date' | 'interval' | 'cron';
  run_date?: Dayjs;  // Changed to Dayjs type
  interval_seconds?: number;
  cron_expression?: string;
}

/* Replace the previous definition completely */
interface JobFormSubmitValues {
  id?: string;
  name: string;
  schedule_type: 'date' | 'interval' | 'cron';
  run_date?: string;          // ISO string sent to backend
  interval_seconds?: number;
  cron_expression?: string;
  pipeline_path: string;      // ALWAYS present - the original file path
  python_code?: string;       // present when user picked a .ampln
}

interface SchedulerPanelProps {
  commands: JupyterFrontEnd['commands'];
  docManager: IDocumentManager;   /* NEW */
}

function toHeaderRecord(h?: HeadersInit): Record<string, string> {
  if (!h) return {};
  if (h instanceof Headers) {
    const obj: Record<string, string> = {};
    h.forEach((v, k) => (obj[k] = v));
    return obj;
  }
  if (Array.isArray(h)) return Object.fromEntries(h);
  return { ...(h as Record<string, string>) };
}


type ExtendedRequestInit = Omit<RequestInit, 'body'> & {
  body?: BodyInit | Record<string, any> | null;
};

/* ---------- API Client ---------- */
class SchedulerAPI {
  private static async makeRequest(endpoint: string, init: ExtendedRequestInit = {}) {
    const settings = ServerConnection.makeSettings();
    const urlPatterns = ['pipeline-scheduler'];

    let lastError: Error | null = null;

    for (const baseEndpoint of urlPatterns) {
      try {
        // take body out first so we can re-type it safely
        const { body, ...rest } = init;
        const requestInit: RequestInit = { ...rest };

        // normalize headers to a plain object we can mutate
        const headers = toHeaderRecord(rest.headers);
        const method = (rest.method || 'GET').toUpperCase();

        if (method !== 'GET' && body != null) {
          const isPlainObject =
            typeof body === 'object' &&
            !(body instanceof FormData) &&
            !(body instanceof URLSearchParams) &&
            !(body instanceof ArrayBuffer) &&
            !(body instanceof Blob);

          if (isPlainObject) {
            requestInit.body = JSON.stringify(body as Record<string, any>);
            headers['Content-Type'] = headers['Content-Type'] || 'application/json';
          } else {
            requestInit.body = body as BodyInit;
          }
        }
        requestInit.headers = headers;

        const response = await requestScheduler(endpoint, requestInit);
        return response;
      } catch (error) {
        console.warn(`Failed to connect using ${baseEndpoint}:`, error);
        lastError = error instanceof Error ? error : new Error(String(error));
      }
    }

    throw lastError || new Error('Failed to connect to any API endpoint');
  }

  static listJobs(): Promise<{ jobs: Job[] }> {
    return this.makeRequest('jobs');
  }

  static getJob(id: string): Promise<Job> {
    return this.makeRequest(`jobs/${id}`);
  }

  static createJob(job: JobFormSubmitValues): Promise<Job> {
    return this.makeRequest('jobs', {
      method: 'POST',
      body: job  // This will be properly serialized by makeRequest
    });
  }

  static deleteJob(id: string): Promise<{ success: boolean }> {
    return this.makeRequest(`jobs/${id}`, {
      method: 'DELETE'
    });
  }

  static runJob(
    id: string
  ): Promise<{ success: boolean; output?: string; error?: string }> {
    // Server does not read a body here
    return this.makeRequest(`run/${id}`, { method: 'POST' });
  }
}

/* ---------- styles ---------- */
const useStyle = createStyles(({ token, css }) => ({
  root: css`
    display: flex;
    flex-direction: column;
    height: 100%;
    background: ${token.colorBgContainer};
    color: ${token.colorText};
  `,
  header: css`
    height: 52px;
    border-bottom: 1px solid ${token.colorBorder};
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 12px 0 16px;
  `,
  headerTitle: css`
    font-weight: 600;
    font-size: 15px;
  `,
  content: css`
    flex: 1;
    overflow: auto;
    padding: 16px;
  `,
  jobCard: css`
    margin-bottom: 12px;
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.03);
  `,
  jobMeta: css`
    margin-bottom: 4px;
    display: flex;
    align-items: center;
    color: ${token.colorTextSecondary};
  `,
  jobMetaIcon: css`
    margin-right: 6px;
  `,
  actionsBar: css`
    padding: 12px 16px;
    border-top: 1px solid ${token.colorBorder};
    display: flex;
    justify-content: space-between;
  `
}));

/* ---------- Components ---------- */
const JobForm: React.FC<{
  docManager: IDocumentManager;
  onSubmit: (values: JobFormValues) => void;
  onCancel: () => void;
  initialValues?: Partial<JobFormValues>;
}> = ({ docManager, onSubmit, onCancel, initialValues }) => {
  const [form] = Form.useForm<JobFormValues>();
  const [scheduleType, setScheduleType] = useState<'date' | 'interval' | 'cron'>(
    initialValues?.schedule_type || 'date'
  );

  useEffect(() => {
    if (initialValues) {
      form.setFieldsValue(initialValues);
      setScheduleType(initialValues.schedule_type || 'date');
    }
  }, [initialValues, form]);


  /* helper to launch the file-picker */
  const pickPipelinePath = async () => {
    try {
      const res = await showBrowseFileDialog(docManager, {
        extensions: ['.ampln', '.py'],
        includeDir: false
      });
      if (res.button.accept && res.value.length) {
        form.setFieldsValue({ pipeline_path: res.value[0].path });
      }
    } catch (err) {
      console.error('Browse file error:', err);
      message.error('Failed to open file chooser');
    }
  };


  return (
    <ConfigProvider
      theme={{
        token: {
          colorPrimary: '#5F9B97',
        },
      }}
    >
      <Form
        form={form}
        layout="vertical"
        onFinish={onSubmit}
        initialValues={{ schedule_type: 'date', ...initialValues }}
      >
        <Form.Item name="id" hidden>
          <Input />
        </Form.Item>

        <Form.Item style={{ marginBottom: 16 }} name="name" label="Task Name" rules={[{ required: true, message: 'Please input a task name' }]}>
          <Input placeholder="My Task Name" />
        </Form.Item>

        <Form.Item
          style={{ marginBottom: 16 }}                 /* spacing */
          label="Pipeline Path"
          required
        >
          <Space.Compact style={{ width: '100%' }}>
            <Form.Item
              name="pipeline_path"
              noStyle
              rules={[{ required: true, message: 'Please select a pipeline file' }]}
            >
              <Input
                readOnly
                placeholder="Select a .ampln or .py file"
              />
            </Form.Item>
            <Button icon={<FolderOpenOutlined />} onClick={pickPipelinePath} />
          </Space.Compact>
        </Form.Item>

        <Form.Item style={{ marginBottom: 16 }} name="schedule_type" label="Schedule Type">
          <Radio.Group onChange={(e) => setScheduleType(e.target.value)}>
            <Radio value="date">One-time</Radio>
            <Radio value="interval">Interval</Radio>
            <Radio value="cron">Cron</Radio>
          </Radio.Group>
        </Form.Item>

        {scheduleType === 'date' && (
          <Form.Item
            style={{ marginBottom: 16 }}
            name="run_date"
            label="Run Date"
            rules={[{ required: true, message: 'Please select a date and time' }]}
          >
            <DatePicker showTime style={{ width: '100%' }} />
          </Form.Item>
        )}

        {scheduleType === 'interval' && (
          <Form.Item
            style={{ marginBottom: 16 }}
            name="interval_seconds"
            label="Interval (seconds)"
            rules={[{ required: true, message: 'Please input an interval' }]}
          >
            <InputNumber min={1} style={{ width: '100%' }} />
          </Form.Item>
        )}

        {scheduleType === 'cron' && (
          <Form.Item
            style={{ marginBottom: 16 }}
            name="cron_expression"
            label="Cron Expression"
            rules={[{ required: true, message: 'Please input a cron expression' }]}
          >
            <Input placeholder="*/5 * * * *" />
          </Form.Item>
        )}

        <Form.Item>
          <Space style={{ marginBottom: 16, width: '100%', justifyContent: 'flex-end' }}>
            <Button onClick={onCancel}>Cancel</Button>
            <Button type="primary" htmlType="submit">
              Submit
            </Button>
          </Space>
        </Form.Item>
      </Form>
    </ConfigProvider>
  );
};

/** getPythonCode – convert .ampln to Python */
const getPythonCode = async (
  path: string,
  commands: JupyterFrontEnd['commands'],
  docManager: IDocumentManager
): Promise<string> => {

  console.log('Loaded path:', path);
  // Ask for text; server may still return JSON for certain mimetypes
  const file = await docManager.services.contents.get(path, {
    content: true,
    format: 'text'
  });

  console.log('Loaded file:', file);

  if (file.content == null) {
    console.error('File content is empty or null:', path);
    throw new Error('Selected file is empty or could not be loaded');
  }

  if (path.endsWith('.ampln')) {
    try {
      const raw = file.content as unknown;
      const jsonString =
        typeof raw === 'string'
          ? raw
          : JSON.stringify(raw);

      // Many generators expect a string and will JSON.parse internally.
      const code = (await commands.execute('pipeline-editor:generate-code', {
        json: jsonString
      })) as string;

      console.log('Generated Python code:', code);
      if (!code) throw new Error('Code generation failed');
      return code;
    } catch (err) {
      console.error('Error during code generation:', err);
      throw err;
    }
  }

  // .py and others: the server returns text, so just forward it
  return file.content as string;
};


const SchedulerPanel: React.FC<SchedulerPanelProps> = ({ commands, docManager }) => {
  const { styles } = useStyle();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(false);
  const [jobModalVisible, setJobModalVisible] = useState(false);
  const [currentJob, setCurrentJob] = useState<Partial<JobFormValues> | null>(null);

  const fetchJobs = async () => {
    setLoading(true);
    try {
      const data = await SchedulerAPI.listJobs();
      setJobs(data.jobs || []);
    } catch (error) {
      console.error('Error fetching jobs:', error);
      Notification.error('Failed to fetch scheduled jobs');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchJobs();
    // Set up a refresh interval
    const intervalId = setInterval(fetchJobs, 30000); // Refresh every 30 seconds
    return () => clearInterval(intervalId);
  }, []);

  const handleCreateJob = () => {
    setCurrentJob(null);
    setJobModalVisible(true);
  };

  const handleEditJob = (job: Job) => {
    // Need to transform the job data to form values
    const formValues: Partial<JobFormValues> = {
      id: job.id,
      name: job.name,
      pipeline_path: job.pipeline_path,
      schedule_type: job.schedule_type as any
    };

    if (job.schedule_type === 'date' && job.run_date) {
      formValues.run_date = dayjs(job.run_date);
    }
    if (job.schedule_type === 'interval') {
      formValues.interval_seconds = job.interval_seconds;
    }
    if (job.schedule_type === 'cron') {
      formValues.cron_expression = job.cron_expression;
    }

    setCurrentJob(formValues);
    setJobModalVisible(true);
  };

  const handleDeleteJob = (jobId: string) => {
    const promise = SchedulerAPI.deleteJob(jobId);

    Notification.promise(promise, {
      pending: { message: 'Deleting job…' },
      success: { message: () => 'Job deleted successfully', options: { autoClose: 3000 } },
      error: {
        message: (err: unknown) =>
          `Failed to delete job: ${err instanceof Error ? err.message : String(err)}`
      }
    });

    promise.then(fetchJobs).catch(console.error);
  };

  const handleRunJob = async (jobId: string) => {
    const job = jobs.find(j => j.id === jobId);
    if (!job) return;

    const pythonCode = await getPythonCode(job.pipeline_path, commands, docManager);

    const promise = SchedulerAPI.runJob(jobId).then(res => {
      if (!res.success) throw new Error(res.error || 'Execution failed');
      return res.output ?? '';
    });

    Notification.promise(promise, {
      pending: { message: 'Running pipeline…' },
      success: { message: () => 'Pipeline executed successfully' },
      error: {
        message: (e: unknown) =>
          `Pipeline execution failed: ${e instanceof Error ? e.message : String(e)}`
      }
    });
  };


  const handleFormSubmit = async (values: JobFormValues) => {
    try {
      /* build payload for backend */
      const formData: JobFormSubmitValues = {
        name: values.name,
        schedule_type: values.schedule_type,
        run_date: values.run_date ? values.run_date.toDate().toISOString() : undefined,
        interval_seconds: values.interval_seconds,
        cron_expression: values.cron_expression,
        pipeline_path: values.pipeline_path  // ALWAYS send the original path
      };

      if (values.id) formData.id = values.id;

      /* .ampln → also send raw Python code */
      if (values.pipeline_path.endsWith('.ampln')) {
        formData.python_code = await getPythonCode(
          values.pipeline_path,
          commands,
          docManager
        );
      }

      await SchedulerAPI.createJob(formData);
      Notification.success('Job created successfully');
      setJobModalVisible(false);
      fetchJobs();
    } catch (error) {
      console.error('Error creating job:', error);
      Notification.error('Failed to create job');
    }
  };

  return (
    <ConfigProvider
      theme={{
        token: {
          colorPrimary: '#5F9B97',
        },
      }}
    >
      <div className={styles.root}>
        <div className={styles.header}>
          <Space>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={handleCreateJob}
            >
              Task
            </Button>
            <Button
              icon={<ReloadOutlined />}
              onClick={fetchJobs}
            />
          </Space>
        </div>

        <div className={styles.content}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '40px 0' }}>
              <Spin size="large" />
            </div>
          ) : jobs.length === 0 ? (
            <Empty
              description="No scheduled tasks yet"
              image={Empty.PRESENTED_IMAGE_SIMPLE}
            />
          ) : (
            <List
              dataSource={jobs}
              renderItem={(job) => (
                <Card className={styles.jobCard} size="small" title={job.name} key={job.id}>
                  <div className={styles.jobMeta}>
                    <ScheduleOutlined className={styles.jobMetaIcon} />
                    <span>Pipeline: {job.pipeline_path}</span>
                  </div>
                  <div className={styles.jobMeta}>
                    <ClockCircleOutlined className={styles.jobMetaIcon} />
                    <span>Type: {job.trigger.split('[')[0]}</span>
                  </div>
                  {job.next_run_time && (
                    <div className={styles.jobMeta}>
                      <CalendarOutlined className={styles.jobMetaIcon} />
                      <span>Next run: {dayjs(job.next_run_time).format('YYYY-MM-DD HH:mm:ss')}</span>
                    </div>
                  )}
                  <Divider style={{ margin: '12px 0' }} />
                  <Space>
                    <Tooltip title="Run now">
                      <Button
                        type="text"
                        icon={<PlayCircleOutlined />}
                        onClick={() => handleRunJob(job.id)}
                      />
                    </Tooltip>
                    <Tooltip title="Edit">
                      <Button
                        type="text"
                        icon={<EditOutlined />}
                        onClick={() => handleEditJob(job)}
                      />
                    </Tooltip>
                    <Tooltip title="Delete">
                      <Button
                        type="text"
                        danger
                        icon={<DeleteOutlined />}
                        onClick={() => handleDeleteJob(job.id)}
                      />
                    </Tooltip>
                  </Space>
                </Card>
              )}
            />
          )}
        </div>

        <Modal
          title={currentJob ? 'Edit Task' : 'New Task'}
          open={jobModalVisible}
          onCancel={() => setJobModalVisible(false)}
          footer={null}
          destroyOnClose
          width={500}
        >
          <JobForm
            docManager={docManager}
            onSubmit={handleFormSubmit}
            onCancel={() => setJobModalVisible(false)}
            initialValues={currentJob || undefined}
          />
        </Modal>
      </div>
    </ConfigProvider>
  );
};

/* ---------- plugin ---------- */
namespace CommandIDs {
  export const open = 'pipeline-scheduler:open';
}

const plugin: JupyterFrontEndPlugin<void> = {
  id: '@amphi/pipeline-scheduler:plugin',
  autoStart: true,
  requires: [ICommandPalette, IDocumentManager],   /* UPDATED */
  activate: (app: JupyterFrontEnd, palette: ICommandPalette, docManager: IDocumentManager) => {
    const { commands, shell } = app;

    commands.addCommand(CommandIDs.open, {
      label: 'Pipeline Scheduler',
      caption: 'Schedule Amphi pipelines',
      execute: () => {
        class SchedulerWidget extends ReactWidget {
          constructor() {
            super();
            this.id = 'amphi-pipeline-scheduler';
            this.title.caption = 'Pipeline Scheduler';
            this.title.icon = schedulerIcon;
            this.title.closable = true;
          }
          render() {
            return <SchedulerPanel commands={commands} docManager={docManager} />;
          }
        }
        const widget = new SchedulerWidget();
        if (!widget.isAttached) shell.add(widget, 'left');
        shell.activateById(widget.id);
      }
    });

    palette.addItem({ command: CommandIDs.open, category: 'Amphi' });
    commands.execute(CommandIDs.open);
  }
};

export default plugin;