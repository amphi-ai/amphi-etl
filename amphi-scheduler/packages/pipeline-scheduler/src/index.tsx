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
  CheckCircleOutlined,
  CalendarOutlined,
  ClockCircleOutlined,
  CloseOutlined,
  DeleteOutlined,
  EditOutlined,
  FileTextOutlined,
  PlayCircleOutlined,
  PlusOutlined,
  ReloadOutlined,
  ScheduleOutlined,
  CloseCircleOutlined,
  FolderOpenOutlined
} from '@ant-design/icons';
import { pipelineBrandIcon, schedulerIcon } from './icons';
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
  Tabs,
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
  schedule_type: 'date' | 'interval' | 'cron' | 'trigger';
  date_type?: 'once' | 'daily' | 'weekly' | 'monthly' | 'every_x_days';
  run_date?: string;              // only for `date`
  interval_seconds?: number;      // only for `interval`
  interval_days?: number;         // only for `date` with `every_x_days`
  cron_expression?: string;       // only for `cron`
  logical_operator?: 'AND' | 'OR';
  trigger_conditions?: TriggerCondition[];
}

interface TriggerCondition {
  job_id: string;
  on: 'success' | 'failure';
}

interface RunEntry {
  id: number;
  job_id?: string;
  job_name?: string;
  status: 'success' | 'failure';
  triggered_by: 'schedule' | 'manual' | 'trigger' | string;
  started_at: string;
  finished_at: string;
  exit_code?: number | null;
  output?: string | null;
  error?: string | null;
}

interface JobFormValues {
  id?: string;
  name: string;
  pipeline_path: string;
  schedule_type: 'date' | 'interval' | 'cron' | 'trigger';
  date_type?: 'once' | 'daily' | 'weekly' | 'monthly' | 'every_x_days';
  run_date?: Dayjs;  // Changed to Dayjs type
  interval_seconds?: number;
  interval_days?: number;
  cron_expression?: string;
  logical_operator?: 'AND' | 'OR';
  trigger_conditions?: TriggerCondition[];
}

/* Replace the previous definition completely */
interface JobFormSubmitValues {
  id?: string;
  name: string;
  schedule_type: 'date' | 'interval' | 'cron' | 'trigger';
  date_type?: 'once' | 'daily' | 'weekly' | 'monthly' | 'every_x_days';
  run_date?: string;          // ISO string sent to backend
  interval_seconds?: number;
  interval_days?: number;
  cron_expression?: string;
  logical_operator?: 'AND' | 'OR';
  trigger_conditions?: TriggerCondition[];
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

  static listRuns(limit = 200): Promise<{ runs: RunEntry[] }> {
    return this.makeRequest(`runs?limit=${limit}`);
  }

  static getRun(id: number): Promise<RunEntry> {
    return this.makeRequest(`runs/${id}`);
  }

  static deleteRun(id: number): Promise<{ success: boolean }> {
    return this.makeRequest(`runs/${id}`, {
      method: 'DELETE'
    });
  }

  static clearRuns(): Promise<{ success: boolean; deleted: number }> {
    return this.makeRequest('runs', {
      method: 'DELETE'
    });
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
    padding: 6px 16px 16px;
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
  jobs: Job[];
  onSubmit: (values: JobFormValues) => void;
  onCancel: () => void;
  initialValues?: Partial<JobFormValues>;
}> = ({ docManager, jobs, onSubmit, onCancel, initialValues }) => {
  const [form] = Form.useForm<JobFormValues>();
  const [scheduleType, setScheduleType] = useState<'date' | 'interval' | 'cron' | 'trigger'>(
    initialValues?.schedule_type || 'date'
  );
  const [dateType, setDateType] = useState<'once' | 'daily' | 'weekly' | 'monthly' | 'every_x_days'>(
    initialValues?.date_type || 'once'
  );

  useEffect(() => {
    if (initialValues) {
      form.setFieldsValue(initialValues);
      setScheduleType(initialValues.schedule_type || 'date');
      setDateType(initialValues.date_type || 'once');
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
        initialValues={{
          schedule_type: 'date',
          date_type: 'once',
          logical_operator: 'AND',
          trigger_conditions: [],
          ...initialValues
        }}
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
            <Radio value="date">Date</Radio>
            <Radio value="interval">Interval</Radio>
            <Radio value="cron">Cron</Radio>
            <Radio value="trigger">Trigger</Radio>
          </Radio.Group>
        </Form.Item>

        {scheduleType === 'date' && (
          <>
            <Form.Item style={{ marginBottom: 16 }} name="date_type" label="Date Type">
              <Select onChange={(value) => setDateType(value)} style={{ width: '100%' }}>
                <Select.Option value="once">One-time</Select.Option>
                <Select.Option value="daily">Daily</Select.Option>
                <Select.Option value="weekly">Weekly</Select.Option>
                <Select.Option value="monthly">Monthly</Select.Option>
                <Select.Option value="every_x_days">Every X Days</Select.Option>
              </Select>
            </Form.Item>

            {dateType !== 'every_x_days' ? (
              <Form.Item
                style={{ marginBottom: 16 }}
                name="run_date"
                label={dateType === 'once' ? 'Run Date & Time' : 'Start Date & Time'}
                rules={[{ required: true, message: 'Please select a date and time' }]}
              >
                <DatePicker showTime style={{ width: '100%' }} />
              </Form.Item>
            ) : (
              <Form.Item
                style={{ marginBottom: 16 }}
                name="interval_days"
                label="Interval (days)"
                rules={[{ required: true, message: 'Please input a number of days' }]}
              >
                <InputNumber min={1} style={{ width: '100%' }} />
              </Form.Item>
            )}
          </>
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

        {scheduleType === 'trigger' && (
          <>
            <Form.Item
              style={{ marginBottom: 16 }}
              name="logical_operator"
              label="Conditions Logic"
              rules={[{ required: true, message: 'Please select AND or OR' }]}
            >
              <Radio.Group>
                <Radio value="AND">AND</Radio>
                <Radio value="OR">OR</Radio>
              </Radio.Group>
            </Form.Item>

            <Form.List
              name="trigger_conditions"
              rules={[
                {
                  validator: async (_, value) => {
                    if (!value || value.length < 1) {
                      return Promise.reject(new Error('Add at least one condition'));
                    }
                    return Promise.resolve();
                  }
                }
              ]}
            >
              {(fields, { add, remove }, { errors }) => (
                <>
                  {fields.map(field => (
                    <Space key={field.key} style={{ display: 'flex', marginBottom: 12 }} align="start">
                      <Form.Item
                        {...field}
                        name={[field.name, 'job_id']}
                        rules={[{ required: true, message: 'Select a task' }]}
                        style={{ minWidth: 220 }}
                      >
                        <Select
                          placeholder="Task"
                          showSearch
                          optionFilterProp="label"
                          options={jobs
                            .filter(job => job.id !== form.getFieldValue('id'))
                            .map(job => ({ value: job.id, label: job.name }))}
                        />
                      </Form.Item>

                      <Form.Item
                        {...field}
                        name={[field.name, 'on']}
                        rules={[{ required: true, message: 'Select outcome' }]}
                        style={{ minWidth: 140 }}
                      >
                        <Select placeholder="Outcome">
                          <Select.Option value="success">Success</Select.Option>
                          <Select.Option value="failure">Failure</Select.Option>
                        </Select>
                      </Form.Item>

                      <Button type="text" danger onClick={() => remove(field.name)}>
                        Remove
                      </Button>
                    </Space>
                  ))}

                  <Form.ErrorList errors={errors} />

                  <Button
                    type="dashed"
                    onClick={() => add({ on: 'success' })}
                    icon={<PlusOutlined />}
                    style={{ width: '100%', marginBottom: 16 }}
                  >
                    Add Condition
                  </Button>
                </>
              )}
            </Form.List>
          </>
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
  const [runs, setRuns] = useState<RunEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [monitoringLoading, setMonitoringLoading] = useState(false);
  const [jobModalVisible, setJobModalVisible] = useState(false);
  const [currentJob, setCurrentJob] = useState<Partial<JobFormValues> | null>(null);
  const [activeTab, setActiveTab] = useState<'tasks' | 'monitoring'>('tasks');
  const [logsModalVisible, setLogsModalVisible] = useState(false);
  const [logsLoading, setLogsLoading] = useState(false);
  const [selectedRun, setSelectedRun] = useState<RunEntry | null>(null);

  const fetchJobs = async (showLoader = false) => {
    if (showLoader) {
      setLoading(true);
    }
    try {
      const data = await SchedulerAPI.listJobs();
      setJobs(data.jobs || []);
    } catch (error) {
      console.error('Error fetching jobs:', error);
      Notification.error('Failed to fetch scheduled jobs');
    } finally {
      if (showLoader) {
        setLoading(false);
      }
    }
  };

  const fetchRuns = async (showLoader = false) => {
    if (showLoader) {
      setMonitoringLoading(true);
    }
    try {
      const data = await SchedulerAPI.listRuns();
      setRuns(data.runs || []);
    } catch (error) {
      console.error('Error fetching runs:', error);
      Notification.error('Failed to fetch run monitoring data');
    } finally {
      if (showLoader) {
        setMonitoringLoading(false);
      }
    }
  };

  useEffect(() => {
    fetchJobs(true);
    fetchRuns(true);
    // Set up a refresh interval
    const intervalId = setInterval(() => {
      fetchJobs();
      fetchRuns();
    }, 30000); // Refresh every 30 seconds
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

    if (job.schedule_type === 'date') {
      formValues.date_type = job.date_type || 'once';
      if (job.run_date) {
        formValues.run_date = dayjs(job.run_date);
      }
      if (job.date_type === 'every_x_days') {
        formValues.interval_days = job.interval_days;
      }
    }
    if (job.schedule_type === 'interval') {
      formValues.interval_seconds = job.interval_seconds;
    }
    if (job.schedule_type === 'cron') {
      formValues.cron_expression = job.cron_expression;
    }
    if (job.schedule_type === 'trigger') {
      formValues.logical_operator = job.logical_operator || 'AND';
      formValues.trigger_conditions = job.trigger_conditions || [];
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

    promise.then(() => fetchJobs()).catch(console.error);
  };

  const handleRunJob = async (jobId: string) => {
    const job = jobs.find(j => j.id === jobId);
    if (!job) return;

    const promise = SchedulerAPI.runJob(jobId).then(res => {
      if (!res.success) throw new Error(res.error || 'Execution failed');
      return res.output ?? '';
    });

    Notification.promise(promise, {
      pending: { message: 'Running pipeline…' },
      success: {
        message: () => {
          fetchRuns();
          return 'Pipeline executed successfully';
        }
      },
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

      // Add date_type if schedule_type is 'date'
      if (values.schedule_type === 'date') {
        formData.date_type = values.date_type || 'once';
        if (values.date_type === 'every_x_days') {
          formData.interval_days = values.interval_days;
        }
      }
      if (values.schedule_type === 'trigger') {
        formData.logical_operator = values.logical_operator || 'AND';
        formData.trigger_conditions = values.trigger_conditions || [];
      }

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

  const jobNameById = new Map(jobs.map(job => [job.id, job.name]));

  const getScheduleBadge = (job: Job) => {
    if (job.schedule_type === 'trigger') return { label: 'Trigger', icon: <ScheduleOutlined /> };
    if (job.schedule_type === 'interval') return { label: 'Interval', icon: <ClockCircleOutlined /> };
    if (job.schedule_type === 'cron') return { label: 'Cron', icon: <ScheduleOutlined /> };
    return { label: 'Date', icon: <CalendarOutlined /> };
  };

  const formatTriggerConditions = (job: Job): string => {
    const conditions = job.trigger_conditions || [];
    if (conditions.length <= 1) return '';
    const op = ` ${job.logical_operator || 'AND'} `;
    return conditions
      .map(c => {
        const sourceName = jobNameById.get(c.job_id) || c.job_id;
        const outcome = c.on === 'success' ? 'succeeds' : 'fails';
        return `${sourceName} ${outcome}`;
      })
      .join(op);
  };

  const openRunLogs = async (run: RunEntry) => {
    setLogsLoading(true);
    setLogsModalVisible(true);
    try {
      const detailed = await SchedulerAPI.getRun(run.id);
      setSelectedRun(detailed);
    } catch (error) {
      console.error('Error fetching run logs:', error);
      Notification.error('Failed to fetch run logs');
      setSelectedRun(run);
    } finally {
      setLogsLoading(false);
    }
  };

  const handleDeleteRun = (runId: number) => {
    const promise = SchedulerAPI.deleteRun(runId);

    Notification.promise(promise, {
      pending: { message: 'Deleting monitoring entry…' },
      success: {
        message: () => {
          fetchRuns();
          return 'Monitoring entry removed';
        }
      },
      error: {
        message: (err: unknown) =>
          `Failed to remove monitoring entry: ${err instanceof Error ? err.message : String(err)}`
      }
    });
  };

  const handleClearRuns = () => {
    const promise = SchedulerAPI.clearRuns();

    Notification.promise(promise, {
      pending: { message: 'Clearing monitoring entries…' },
      success: {
        message: (_result: unknown, data?: { success: boolean; deleted: number }) => {
          fetchRuns();
          const deleted = data?.deleted ?? 0;
          return `Cleared ${deleted} monitoring entr${deleted === 1 ? 'y' : 'ies'}`;
        }
      },
      error: {
        message: (err: unknown) =>
          `Failed to clear monitoring entries: ${err instanceof Error ? err.message : String(err)}`
      }
    });
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
        <div className={styles.content}>
          <Tabs
            activeKey={activeTab}
            onChange={key => setActiveTab(key as 'tasks' | 'monitoring')}
            items={[
              {
                key: 'tasks',
                label: 'Tasks',
                children: (
                  <>
                    <Space style={{ marginBottom: 12 }}>
                      <Button
                        type="primary"
                        icon={<PlusOutlined />}
                        onClick={handleCreateJob}
                      >
                        New Task
                      </Button>
                      <Button
                        icon={<ReloadOutlined />}
                        onClick={() => {
                          fetchJobs();
                          fetchRuns();
                        }}
                      />
                    </Space>
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
                        itemLayout="vertical"
                        dataSource={jobs}
                        renderItem={job => {
                          const badge = getScheduleBadge(job);
                          const triggerSummary = formatTriggerConditions(job);
                          return (
                            <List.Item
                              key={job.id}
                              actions={[
                                <Tooltip title="Run now" key="run">
                                  <Button
                                    type="text"
                                    icon={<PlayCircleOutlined />}
                                    onClick={() => handleRunJob(job.id)}
                                  />
                                </Tooltip>,
                                <Tooltip title="Edit" key="edit">
                                  <Button
                                    type="text"
                                    icon={<EditOutlined />}
                                    onClick={() => handleEditJob(job)}
                                  />
                                </Tooltip>,
                                <Tooltip title="Delete" key="delete">
                                  <Button
                                    type="text"
                                    danger
                                    icon={<DeleteOutlined />}
                                    onClick={() => handleDeleteJob(job.id)}
                                  />
                                </Tooltip>
                              ]}
                            >
                              <List.Item.Meta
                                title={
                                  <Space wrap>
                                    <span style={{ fontWeight: 600 }}>{job.name}</span>
                                    <Tag icon={badge.icon} color="default">
                                      {badge.label}
                                    </Tag>
                                  </Space>
                                }
                                description={
                                  <div>
                                    <div className={styles.jobMeta}>
                                      <pipelineBrandIcon.react className={styles.jobMetaIcon} />
                                      <span>Pipeline: {job.pipeline_path}</span>
                                    </div>
                                    {job.schedule_type !== 'trigger' && job.next_run_time && (
                                      <div className={styles.jobMeta}>
                                        <CalendarOutlined className={styles.jobMetaIcon} />
                                        <span>Next: {dayjs(job.next_run_time).format('YYYY-MM-DD HH:mm:ss')}</span>
                                      </div>
                                    )}
                                    {job.schedule_type === 'trigger' && !!triggerSummary && (
                                      <div className={styles.jobMeta}>
                                        <ScheduleOutlined className={styles.jobMetaIcon} />
                                        <span>Trigger when: {triggerSummary}</span>
                                      </div>
                                    )}
                                  </div>
                                }
                              />
                            </List.Item>
                          );
                        }}
                      />
                    )}
                  </>
                )
              },
              {
                key: 'monitoring',
                label: 'Monitoring',
                children: (
                  <>
                    <Space style={{ marginBottom: 12 }}>
                      <Button danger icon={<DeleteOutlined />} onClick={handleClearRuns}>
                        Clear
                      </Button>
                      <Button
                        icon={<ReloadOutlined />}
                        onClick={() => fetchRuns()}
                      />
                    </Space>
                    {monitoringLoading ? (
                      <div style={{ textAlign: 'center', padding: '40px 0' }}>
                        <Spin size="large" />
                      </div>
                    ) : runs.length === 0 ? (
                      <Empty
                        description="No runs recorded yet"
                        image={Empty.PRESENTED_IMAGE_SIMPLE}
                      />
                    ) : (
                      <List
                        itemLayout="horizontal"
                        dataSource={runs}
                        renderItem={run => (
                          <List.Item
                            key={run.id}
                            actions={[
                              <Tooltip title="View logs" key={`logs-tooltip-${run.id}`}>
                                <Button
                                  key={`logs-${run.id}`}
                                  type="text"
                                  icon={<FileTextOutlined />}
                                  onClick={() => openRunLogs(run)}
                                />
                              </Tooltip>,
                              <Tooltip title="Remove from monitoring" key={`remove-tooltip-${run.id}`}>
                                <Button
                                  key={`remove-${run.id}`}
                                  type="text"
                                  danger
                                  icon={<CloseOutlined />}
                                  onClick={() => handleDeleteRun(run.id)}
                                />
                              </Tooltip>
                            ]}
                          >
                            <List.Item.Meta
                              title={
                                <Space wrap>
                                  <span style={{ fontWeight: 600 }}>
                                    {run.job_name || jobNameById.get(run.job_id || '') || run.job_id || 'Unknown Task'}
                                  </span>
                                  {run.triggered_by === 'manual' && <Tag color="default">Manual</Tag>}
                                  <Tag
                                    icon={run.status === 'success' ? <CheckCircleOutlined /> : <CloseCircleOutlined />}
                                    style={
                                      run.status === 'success'
                                        ? { color: '#1f883d', borderColor: '#1f883d', background: '#eef8f2' }
                                        : { color: '#D1242F', borderColor: '#D1242F', background: '#fff1f2' }
                                    }
                                  >
                                    {run.status === 'success' ? 'Succeeded' : 'Failed'}
                                  </Tag>
                                </Space>
                              }
                              description={`Time: ${dayjs(run.finished_at).format('YYYY-MM-DD HH:mm:ss')}`}
                            />
                          </List.Item>
                        )}
                      />
                    )}
                  </>
                )
              }
            ]}
          />
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
            jobs={jobs}
            onSubmit={handleFormSubmit}
            onCancel={() => setJobModalVisible(false)}
            initialValues={currentJob || undefined}
          />
        </Modal>

        <Modal
          title={selectedRun ? `Run Logs - ${selectedRun.job_name || selectedRun.job_id || selectedRun.id}` : 'Run Logs'}
          open={logsModalVisible}
          onCancel={() => setLogsModalVisible(false)}
          footer={null}
          width={800}
          destroyOnClose
        >
          {logsLoading ? (
            <div style={{ textAlign: 'center', padding: '24px 0' }}>
              <Spin />
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <strong>Status:</strong>{' '}
                {selectedRun?.status === 'success' ? 'Succeeded' : 'Failed'} at{' '}
                {selectedRun?.finished_at ? dayjs(selectedRun.finished_at).format('YYYY-MM-DD HH:mm:ss') : 'n/a'}
              </div>
              <div>
                <strong>Output</strong>
                <pre style={{ maxHeight: 220, overflow: 'auto', background: '#f6f8fa', padding: 10 }}>
                  {selectedRun?.output || '(no output)'}
                </pre>
              </div>
              <div>
                <strong>Error</strong>
                <pre style={{ maxHeight: 220, overflow: 'auto', background: '#fff2f0', padding: 10 }}>
                  {selectedRun?.error || '(no error)'}
                </pre>
              </div>
            </div>
          )}
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
