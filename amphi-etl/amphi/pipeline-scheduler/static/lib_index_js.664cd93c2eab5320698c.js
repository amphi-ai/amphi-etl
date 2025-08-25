"use strict";
(self["webpackChunk_amphi_pipeline_scheduler"] = self["webpackChunk_amphi_pipeline_scheduler"] || []).push([["lib_index_js"],{

/***/ "./lib/BrowseFileDialog.js":
/*!*********************************!*\
  !*** ./lib/BrowseFileDialog.js ***!
  \*********************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   showBrowseFileDialog: () => (/* binding */ showBrowseFileDialog)
/* harmony export */ });
/* harmony import */ var react__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! react */ "webpack/sharing/consume/default/react");
/* harmony import */ var react__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(react__WEBPACK_IMPORTED_MODULE_0__);
/* harmony import */ var react_dom__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! react-dom */ "webpack/sharing/consume/default/react-dom");
/* harmony import */ var react_dom__WEBPACK_IMPORTED_MODULE_1___default = /*#__PURE__*/__webpack_require__.n(react_dom__WEBPACK_IMPORTED_MODULE_1__);
/* harmony import */ var antd__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! antd */ "webpack/sharing/consume/default/antd/antd?3739");
/* harmony import */ var antd__WEBPACK_IMPORTED_MODULE_2___default = /*#__PURE__*/__webpack_require__.n(antd__WEBPACK_IMPORTED_MODULE_2__);
/* harmony import */ var _jupyterlab_apputils__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! @jupyterlab/apputils */ "webpack/sharing/consume/default/@jupyterlab/apputils");
/* harmony import */ var _jupyterlab_apputils__WEBPACK_IMPORTED_MODULE_3___default = /*#__PURE__*/__webpack_require__.n(_jupyterlab_apputils__WEBPACK_IMPORTED_MODULE_3__);
/* harmony import */ var _jupyterlab_filebrowser__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(/*! @jupyterlab/filebrowser */ "webpack/sharing/consume/default/@jupyterlab/filebrowser");
/* harmony import */ var _jupyterlab_filebrowser__WEBPACK_IMPORTED_MODULE_4___default = /*#__PURE__*/__webpack_require__.n(_jupyterlab_filebrowser__WEBPACK_IMPORTED_MODULE_4__);
/* harmony import */ var _lumino_widgets__WEBPACK_IMPORTED_MODULE_5__ = __webpack_require__(/*! @lumino/widgets */ "webpack/sharing/consume/default/@lumino/widgets");
/* harmony import */ var _lumino_widgets__WEBPACK_IMPORTED_MODULE_5___default = /*#__PURE__*/__webpack_require__.n(_lumino_widgets__WEBPACK_IMPORTED_MODULE_5__);






const BROWSE_FILE_CLASS = 'amphi-browseFileDialog';
const BROWSE_FILE_OPEN_CLASS = 'amphi-browseFileDialog-open';
const { Text } = antd__WEBPACK_IMPORTED_MODULE_2__.Typography;
/* ───────────────────────── breadcrumbs ───────────────────────── */
class BrowseFileDialogBreadcrumbs extends _jupyterlab_filebrowser__WEBPACK_IMPORTED_MODULE_4__.BreadCrumbs {
    constructor(options) {
        super(options);
        this.model = options.model;
        this.rootPath = options.rootPath;
    }
    onUpdateRequest(msg) {
        super.onUpdateRequest(msg);
        const contents = this.model.manager.services.contents;
        const localPath = contents.localPath(this.model.path);
        if (localPath && this.rootPath && localPath.indexOf(this.rootPath) === 0) {
            const crumbs = document.querySelectorAll(`.${BROWSE_FILE_CLASS} .jp-BreadCrumbs > span[title]`);
            crumbs.forEach(c => {
                var _a;
                const s = c;
                if (s.title.indexOf((_a = this.rootPath) !== null && _a !== void 0 ? _a : '') === 0) {
                    s.className = s.className.replace('amphi-BreadCrumbs-disabled', '').trim();
                }
                else if (s.className.indexOf('amphi-BreadCrumbs-disabled') === -1) {
                    s.className += ' amphi-BreadCrumbs-disabled';
                }
            });
        }
    }
}
/* ─────────────────────── main widget ─────────────────────────── */
class BrowseFileDialog extends _lumino_widgets__WEBPACK_IMPORTED_MODULE_5__.Widget {
    constructor(props) {
        var _a;
        super(props);
        this.switchWidget = null;
        this.showAll = false;
        /* filter definitions */
        this.baseFilter = props.filter || (() => true);
        // The extFilter checks file extensions
        this.extFilter =
            props.extensions && props.extensions.length
                ? (m) => {
                    if (m.type === 'directory')
                        return true; // Always show directories
                    const ext = `.${m.name.split('.').pop().toLowerCase()}`;
                    return props.extensions.includes(ext);
                }
                : (() => true); // If no extensions are provided, show everything
        // Initialize the model with the extension filter
        this.model = new _jupyterlab_filebrowser__WEBPACK_IMPORTED_MODULE_4__.FilterFileBrowserModel({
            manager: props.manager,
            filter: BrowseFileDialog.boolToScore((m) => {
                // Apply base filter first (user-provided filter)
                if (!this.baseFilter(m))
                    return false;
                // Then apply extension filter if not showing all
                if (!this.showAll && m.type !== 'directory') {
                    const ext = `.${m.name.split('.').pop().toLowerCase()}`;
                    return props.extensions && props.extensions.length ?
                        props.extensions.includes(ext) : true;
                }
                return true;
            })
        });
        const layout = (this.layout = new _lumino_widgets__WEBPACK_IMPORTED_MODULE_5__.PanelLayout());
        /* breadcrumbs */
        this.breadCrumbs = new BrowseFileDialogBreadcrumbs({
            model: this.model,
            rootPath: props.rootPath
        });
        layout.addWidget(this.breadCrumbs);
        /* toggle switch + label */
        if (props.extensions && props.extensions.length) {
            const container = document.createElement('div');
            // Create a render function that can be called to update the UI
            const renderSwitchUI = (showAllFiles) => {
                react_dom__WEBPACK_IMPORTED_MODULE_1___default().render(react__WEBPACK_IMPORTED_MODULE_0___default().createElement("div", { style: { marginBottom: '10px' } },
                    react__WEBPACK_IMPORTED_MODULE_0___default().createElement(antd__WEBPACK_IMPORTED_MODULE_2__.ConfigProvider, { theme: {
                            token: {
                                // Seed Token
                                colorPrimary: '#5F9B97',
                            },
                        } },
                        react__WEBPACK_IMPORTED_MODULE_0___default().createElement("div", { style: { display: 'flex', alignItems: 'center', gap: '8px' } },
                            react__WEBPACK_IMPORTED_MODULE_0___default().createElement("span", { style: { flexShrink: 0 } },
                                react__WEBPACK_IMPORTED_MODULE_0___default().createElement(antd__WEBPACK_IMPORTED_MODULE_2__.Switch, { checked: showAllFiles, size: "small", style: {
                                        width: '28px',
                                        minWidth: '28px',
                                        height: '16px',
                                        lineHeight: '16px'
                                    }, onChange: (checked) => {
                                        this.showAll = checked;
                                        // Update the filter based on the switch state
                                        this.model.setFilter(BrowseFileDialog.boolToScore((m) => {
                                            // Always apply base filter
                                            if (!this.baseFilter(m))
                                                return false;
                                            // Apply extension filter only when showAll is false and it's a file
                                            if (!checked && m.type !== 'directory') {
                                                const ext = `.${m.name.split('.').pop().toLowerCase()}`;
                                                return props.extensions && props.extensions.length ?
                                                    props.extensions.includes(ext) : true;
                                            }
                                            return true;
                                        }));
                                        // Re-render with the new state
                                        renderSwitchUI(checked);
                                        void this.model.refresh();
                                    } })),
                            react__WEBPACK_IMPORTED_MODULE_0___default().createElement("span", { style: { fontSize: '14px' } }, showAllFiles ? "Show all files" : "Only show relevant files")))), container);
            };
            // Initial render
            renderSwitchUI(this.showAll);
            this.switchWidget = new _lumino_widgets__WEBPACK_IMPORTED_MODULE_5__.Widget({ node: container });
            layout.insertWidget(1, this.switchWidget); // directly under breadcrumbs
        }
        /* directory listing */
        this.directoryListing = new _jupyterlab_filebrowser__WEBPACK_IMPORTED_MODULE_4__.DirListing({ model: this.model });
        this.acceptFileOnDblClick = (_a = props.acceptFileOnDblClick) !== null && _a !== void 0 ? _a : true;
        this.multiselect = !!props.multiselect;
        this.includeDir = !!props.includeDir;
        this.dirListingHandleEvent = this.directoryListing.handleEvent;
        this.directoryListing.handleEvent = (e) => { this.handleEvent(e); };
        layout.addWidget(this.directoryListing);
    }
    /* factory */
    static async init(options) {
        const dlg = new BrowseFileDialog({
            manager: options.manager,
            extensions: options.extensions,
            filter: options.filter || (() => true),
            multiselect: options.multiselect,
            includeDir: options.includeDir,
            rootPath: options.rootPath,
            startPath: options.startPath,
            acceptFileOnDblClick: options.acceptFileOnDblClick
        });
        if (options.startPath) {
            if (!options.rootPath || options.startPath.indexOf(options.rootPath) === 0) {
                await dlg.model.cd(options.startPath);
            }
        }
        else if (options.rootPath) {
            await dlg.model.cd(options.rootPath);
        }
        return dlg;
    }
    /* result */
    getValue() {
        const selected = [];
        for (const item of this.directoryListing.selectedItems()) {
            if (this.includeDir || item.type !== 'directory')
                selected.push(item);
        }
        return selected;
    }
    /* event proxy */
    handleEvent(event) {
        var _a;
        let modifierKey = false;
        if (event instanceof MouseEvent || event instanceof KeyboardEvent) {
            modifierKey = event.shiftKey || event.metaKey;
        }
        switch (event.type) {
            case 'keydown':
            case 'keyup':
            case 'mousedown':
            case 'mouseup':
            case 'click':
                if (this.multiselect || !modifierKey) {
                    this.dirListingHandleEvent.call(this.directoryListing, event);
                }
                break;
            case 'dblclick': {
                const clicked = this.directoryListing.modelForClick(event);
                if ((clicked === null || clicked === void 0 ? void 0 : clicked.type) === 'directory') {
                    this.dirListingHandleEvent.call(this.directoryListing, event);
                }
                else {
                    event.preventDefault();
                    event.stopPropagation();
                    if (this.acceptFileOnDblClick) {
                        (_a = document.querySelector(`.${BROWSE_FILE_OPEN_CLASS} .jp-mod-accept`)) === null || _a === void 0 ? void 0 : _a.click();
                    }
                }
                break;
            }
            default:
                this.dirListingHandleEvent.call(this.directoryListing, event);
                break;
        }
    }
}
/**
 * Helper function to convert a boolean predicate to a score function that the FileBrowserModel accepts
 */
BrowseFileDialog.boolToScore = (pred) => (m) => (pred(m) ? {} : null);
/* ───────────────────────── helper ───────────────────────────── */
const showBrowseFileDialog = async (manager, options) => {
    const body = await BrowseFileDialog.init({
        manager,
        extensions: options.extensions,
        filter: options.filter,
        multiselect: options.multiselect,
        includeDir: options.includeDir,
        rootPath: options.rootPath,
        startPath: options.startPath,
        acceptFileOnDblClick: Object.prototype.hasOwnProperty.call(options, 'acceptFileOnDblClick')
            ? options.acceptFileOnDblClick
            : true
    });
    const dialog = new _jupyterlab_apputils__WEBPACK_IMPORTED_MODULE_3__.Dialog({
        title: 'Select a file',
        body,
        buttons: [_jupyterlab_apputils__WEBPACK_IMPORTED_MODULE_3__.Dialog.cancelButton(), _jupyterlab_apputils__WEBPACK_IMPORTED_MODULE_3__.Dialog.okButton({ label: 'Select' })]
    });
    dialog.addClass(BROWSE_FILE_CLASS);
    document.body.className += ` ${BROWSE_FILE_OPEN_CLASS}`;
    return dialog.launch().then(result => {
        document.body.className = document.body.className
            .replace(BROWSE_FILE_OPEN_CLASS, '')
            .trim();
        if (options.rootPath && result.button.accept && result.value.length) {
            const root = options.rootPath.endsWith('/') ? options.rootPath : `${options.rootPath}/`;
            result.value.forEach((v) => { v.path = v.path.replace(root, ''); });
        }
        return result;
    });
};


/***/ }),

/***/ "./lib/handler.js":
/*!************************!*\
  !*** ./lib/handler.js ***!
  \************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   requestScheduler: () => (/* binding */ requestScheduler)
/* harmony export */ });
/* harmony import */ var _jupyterlab_coreutils__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! @jupyterlab/coreutils */ "webpack/sharing/consume/default/@jupyterlab/coreutils");
/* harmony import */ var _jupyterlab_coreutils__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(_jupyterlab_coreutils__WEBPACK_IMPORTED_MODULE_0__);
/* harmony import */ var _jupyterlab_services__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! @jupyterlab/services */ "webpack/sharing/consume/default/@jupyterlab/services");
/* harmony import */ var _jupyterlab_services__WEBPACK_IMPORTED_MODULE_1___default = /*#__PURE__*/__webpack_require__.n(_jupyterlab_services__WEBPACK_IMPORTED_MODULE_1__);
/* utils/requestScheduler.ts
 * Helper for making requests to the pipeline-scheduler endpoint
 * – Supports JSON requests with optional SSE streaming.
 */


async function requestScheduler(endpoint, { method = 'GET', body, stream = false, signal, init = {} } = {}) {
    const settings = _jupyterlab_services__WEBPACK_IMPORTED_MODULE_1__.ServerConnection.makeSettings();
    const url = _jupyterlab_coreutils__WEBPACK_IMPORTED_MODULE_0__.URLExt.join(settings.baseUrl, 'pipeline-scheduler', endpoint);
    const requestInit = {
        method,
        headers: {
            ...(body ? { 'Content-Type': 'application/json' } : {}),
            ...(init.headers || {})
        },
        ...(body ? { body: JSON.stringify(body) } : {}),
        signal,
        ...init
    };
    const response = await _jupyterlab_services__WEBPACK_IMPORTED_MODULE_1__.ServerConnection.makeRequest(url, requestInit, settings);
    if (!response.ok) {
        throw new _jupyterlab_services__WEBPACK_IMPORTED_MODULE_1__.ServerConnection.ResponseError(response, await response.text());
    }
    /* stream mode → return reader, caller parses SSE */
    if (stream)
        return response.body.getReader();
    /* plain JSON reply */
    return (await response.json());
}


/***/ }),

/***/ "./lib/index.js":
/*!**********************!*\
  !*** ./lib/index.js ***!
  \**********************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__)
/* harmony export */ });
/* harmony import */ var _jupyterlab_apputils__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! @jupyterlab/apputils */ "webpack/sharing/consume/default/@jupyterlab/apputils");
/* harmony import */ var _jupyterlab_apputils__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(_jupyterlab_apputils__WEBPACK_IMPORTED_MODULE_0__);
/* harmony import */ var _jupyterlab_services__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! @jupyterlab/services */ "webpack/sharing/consume/default/@jupyterlab/services");
/* harmony import */ var _jupyterlab_services__WEBPACK_IMPORTED_MODULE_1___default = /*#__PURE__*/__webpack_require__.n(_jupyterlab_services__WEBPACK_IMPORTED_MODULE_1__);
/* harmony import */ var _handler__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ./handler */ "./lib/handler.js");
/* harmony import */ var _jupyterlab_docmanager__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! @jupyterlab/docmanager */ "webpack/sharing/consume/default/@jupyterlab/docmanager");
/* harmony import */ var _jupyterlab_docmanager__WEBPACK_IMPORTED_MODULE_3___default = /*#__PURE__*/__webpack_require__.n(_jupyterlab_docmanager__WEBPACK_IMPORTED_MODULE_3__);
/* harmony import */ var react__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(/*! react */ "webpack/sharing/consume/default/react");
/* harmony import */ var react__WEBPACK_IMPORTED_MODULE_4___default = /*#__PURE__*/__webpack_require__.n(react__WEBPACK_IMPORTED_MODULE_4__);
/* harmony import */ var _ant_design_icons__WEBPACK_IMPORTED_MODULE_5__ = __webpack_require__(/*! @ant-design/icons */ "webpack/sharing/consume/default/@ant-design/icons/@ant-design/icons");
/* harmony import */ var _ant_design_icons__WEBPACK_IMPORTED_MODULE_5___default = /*#__PURE__*/__webpack_require__.n(_ant_design_icons__WEBPACK_IMPORTED_MODULE_5__);
/* harmony import */ var antd__WEBPACK_IMPORTED_MODULE_6__ = __webpack_require__(/*! antd */ "webpack/sharing/consume/default/antd/antd?3739");
/* harmony import */ var antd__WEBPACK_IMPORTED_MODULE_6___default = /*#__PURE__*/__webpack_require__.n(antd__WEBPACK_IMPORTED_MODULE_6__);
/* harmony import */ var antd_style__WEBPACK_IMPORTED_MODULE_7__ = __webpack_require__(/*! antd-style */ "webpack/sharing/consume/default/antd-style/antd-style");
/* harmony import */ var antd_style__WEBPACK_IMPORTED_MODULE_7___default = /*#__PURE__*/__webpack_require__.n(antd_style__WEBPACK_IMPORTED_MODULE_7__);
/* harmony import */ var dayjs__WEBPACK_IMPORTED_MODULE_8__ = __webpack_require__(/*! dayjs */ "webpack/sharing/consume/default/dayjs/dayjs?44f5");
/* harmony import */ var dayjs__WEBPACK_IMPORTED_MODULE_8___default = /*#__PURE__*/__webpack_require__.n(dayjs__WEBPACK_IMPORTED_MODULE_8__);
/* harmony import */ var _BrowseFileDialog__WEBPACK_IMPORTED_MODULE_9__ = __webpack_require__(/*! ./BrowseFileDialog */ "./lib/BrowseFileDialog.js");








 // Import dayjs and Dayjs type
 /* NEW */

/* ---------- API Client ---------- */
class SchedulerAPI {
    static async makeRequest(endpoint, init = {}) {
        const settings = _jupyterlab_services__WEBPACK_IMPORTED_MODULE_1__.ServerConnection.makeSettings();
        // Try multiple URL patterns to increase chances of connecting successfully
        const urlPatterns = [
            'pipeline-scheduler'
        ];
        // Try each URL pattern until one succeeds
        let lastError = null;
        for (const baseEndpoint of urlPatterns) {
            try {
                console.log(`Trying API endpoint with base: ${baseEndpoint}`);
                const response = await (0,_handler__WEBPACK_IMPORTED_MODULE_2__.requestScheduler)(endpoint, {
                    method: init.method || 'GET',
                    body: init.body ? JSON.parse(init.body) : undefined,
                    init
                });
                console.log(`Successfully connected using base: ${baseEndpoint}`);
                return response;
            }
            catch (error) {
                console.warn(`Failed to connect using ${baseEndpoint}:`, error);
                lastError = error instanceof Error ? error : new Error(String(error));
                // Continue to try the next URL pattern
            }
        }
        // If we get here, all patterns failed
        throw lastError || new Error('Failed to connect to any API endpoint');
    }
    static listJobs() {
        return this.makeRequest('jobs');
    }
    static getJob(id) {
        return this.makeRequest(`jobs/${id}`);
    }
    static createJob(job) {
        return this.makeRequest('jobs', {
            method: 'POST',
            body: JSON.stringify(job)
        });
    }
    static deleteJob(id) {
        return this.makeRequest(`jobs/${id}`, {
            method: 'DELETE'
        });
    }
    static runJob(id, payload) {
        return this.makeRequest(`run/${id}`, {
            method: 'POST',
            body: JSON.stringify(payload)
        });
    }
}
/* ---------- styles ---------- */
const useStyle = (0,antd_style__WEBPACK_IMPORTED_MODULE_7__.createStyles)(({ token, css }) => ({
    root: css `
    display: flex;
    flex-direction: column;
    height: 100%;
    background: ${token.colorBgContainer};
    color: ${token.colorText};
  `,
    header: css `
    height: 52px;
    border-bottom: 1px solid ${token.colorBorder};
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 12px 0 16px;
  `,
    headerTitle: css `
    font-weight: 600;
    font-size: 15px;
  `,
    content: css `
    flex: 1;
    overflow: auto;
    padding: 16px;
  `,
    jobCard: css `
    margin-bottom: 12px;
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.03);
  `,
    jobMeta: css `
    margin-bottom: 4px;
    display: flex;
    align-items: center;
    color: ${token.colorTextSecondary};
  `,
    jobMetaIcon: css `
    margin-right: 6px;
  `,
    actionsBar: css `
    padding: 12px 16px;
    border-top: 1px solid ${token.colorBorder};
    display: flex;
    justify-content: space-between;
  `
}));
/* ---------- Components ---------- */
const JobForm = ({ docManager, onSubmit, onCancel, initialValues }) => {
    const [form] = antd__WEBPACK_IMPORTED_MODULE_6__.Form.useForm();
    const [scheduleType, setScheduleType] = (0,react__WEBPACK_IMPORTED_MODULE_4__.useState)((initialValues === null || initialValues === void 0 ? void 0 : initialValues.schedule_type) || 'date');
    (0,react__WEBPACK_IMPORTED_MODULE_4__.useEffect)(() => {
        if (initialValues) {
            form.setFieldsValue(initialValues);
            setScheduleType(initialValues.schedule_type || 'date');
        }
    }, [initialValues, form]);
    /* helper to launch the file-picker */
    const pickPipelinePath = async () => {
        try {
            const res = await (0,_BrowseFileDialog__WEBPACK_IMPORTED_MODULE_9__.showBrowseFileDialog)(docManager, {
                extensions: ['.ampln', '.py'],
                includeDir: false
            });
            if (res.button.accept && res.value.length) {
                form.setFieldsValue({ pipeline_path: res.value[0].path });
            }
        }
        catch (err) {
            console.error('Browse file error:', err);
            antd__WEBPACK_IMPORTED_MODULE_6__.message.error('Failed to open file chooser');
        }
    };
    return (react__WEBPACK_IMPORTED_MODULE_4___default().createElement(antd__WEBPACK_IMPORTED_MODULE_6__.ConfigProvider, { theme: {
            token: {
                colorPrimary: '#5F9B97',
            },
        } },
        react__WEBPACK_IMPORTED_MODULE_4___default().createElement(antd__WEBPACK_IMPORTED_MODULE_6__.Form, { form: form, layout: "vertical", onFinish: onSubmit, initialValues: { schedule_type: 'date', ...initialValues } },
            react__WEBPACK_IMPORTED_MODULE_4___default().createElement(antd__WEBPACK_IMPORTED_MODULE_6__.Form.Item, { name: "id", hidden: true },
                react__WEBPACK_IMPORTED_MODULE_4___default().createElement(antd__WEBPACK_IMPORTED_MODULE_6__.Input, null)),
            react__WEBPACK_IMPORTED_MODULE_4___default().createElement(antd__WEBPACK_IMPORTED_MODULE_6__.Form.Item, { style: { marginBottom: 16 }, name: "name", label: "Task Name", rules: [{ required: true, message: 'Please input a task name' }] },
                react__WEBPACK_IMPORTED_MODULE_4___default().createElement(antd__WEBPACK_IMPORTED_MODULE_6__.Input, { placeholder: "My Task Name" })),
            react__WEBPACK_IMPORTED_MODULE_4___default().createElement(antd__WEBPACK_IMPORTED_MODULE_6__.Form.Item, { style: { marginBottom: 16 }, label: "Pipeline Path", required: true },
                react__WEBPACK_IMPORTED_MODULE_4___default().createElement(antd__WEBPACK_IMPORTED_MODULE_6__.Space.Compact, { style: { width: '100%' } },
                    react__WEBPACK_IMPORTED_MODULE_4___default().createElement(antd__WEBPACK_IMPORTED_MODULE_6__.Form.Item, { name: "pipeline_path", noStyle: true, rules: [{ required: true, message: 'Please select a pipeline file' }] },
                        react__WEBPACK_IMPORTED_MODULE_4___default().createElement(antd__WEBPACK_IMPORTED_MODULE_6__.Input, { readOnly: true, placeholder: "Select a .ampln or .py file" })),
                    react__WEBPACK_IMPORTED_MODULE_4___default().createElement(antd__WEBPACK_IMPORTED_MODULE_6__.Button, { icon: react__WEBPACK_IMPORTED_MODULE_4___default().createElement(_ant_design_icons__WEBPACK_IMPORTED_MODULE_5__.FolderOpenOutlined, null), onClick: pickPipelinePath }))),
            react__WEBPACK_IMPORTED_MODULE_4___default().createElement(antd__WEBPACK_IMPORTED_MODULE_6__.Form.Item, { style: { marginBottom: 16 }, name: "schedule_type", label: "Schedule Type" },
                react__WEBPACK_IMPORTED_MODULE_4___default().createElement(antd__WEBPACK_IMPORTED_MODULE_6__.Radio.Group, { onChange: (e) => setScheduleType(e.target.value) },
                    react__WEBPACK_IMPORTED_MODULE_4___default().createElement(antd__WEBPACK_IMPORTED_MODULE_6__.Radio, { value: "date" }, "One-time"),
                    react__WEBPACK_IMPORTED_MODULE_4___default().createElement(antd__WEBPACK_IMPORTED_MODULE_6__.Radio, { value: "interval" }, "Interval"),
                    react__WEBPACK_IMPORTED_MODULE_4___default().createElement(antd__WEBPACK_IMPORTED_MODULE_6__.Radio, { value: "cron" }, "Cron"))),
            scheduleType === 'date' && (react__WEBPACK_IMPORTED_MODULE_4___default().createElement(antd__WEBPACK_IMPORTED_MODULE_6__.Form.Item, { style: { marginBottom: 16 }, name: "run_date", label: "Run Date", rules: [{ required: true, message: 'Please select a date and time' }] },
                react__WEBPACK_IMPORTED_MODULE_4___default().createElement(antd__WEBPACK_IMPORTED_MODULE_6__.DatePicker, { showTime: true, style: { width: '100%' } }))),
            scheduleType === 'interval' && (react__WEBPACK_IMPORTED_MODULE_4___default().createElement(antd__WEBPACK_IMPORTED_MODULE_6__.Form.Item, { style: { marginBottom: 16 }, name: "interval_seconds", label: "Interval (seconds)", rules: [{ required: true, message: 'Please input an interval' }] },
                react__WEBPACK_IMPORTED_MODULE_4___default().createElement(antd__WEBPACK_IMPORTED_MODULE_6__.InputNumber, { min: 1, style: { width: '100%' } }))),
            scheduleType === 'cron' && (react__WEBPACK_IMPORTED_MODULE_4___default().createElement(antd__WEBPACK_IMPORTED_MODULE_6__.Form.Item, { style: { marginBottom: 16 }, name: "cron_expression", label: "Cron Expression", rules: [{ required: true, message: 'Please input a cron expression' }] },
                react__WEBPACK_IMPORTED_MODULE_4___default().createElement(antd__WEBPACK_IMPORTED_MODULE_6__.Input, { placeholder: "*/5 * * * *" }))),
            react__WEBPACK_IMPORTED_MODULE_4___default().createElement(antd__WEBPACK_IMPORTED_MODULE_6__.Form.Item, null,
                react__WEBPACK_IMPORTED_MODULE_4___default().createElement(antd__WEBPACK_IMPORTED_MODULE_6__.Space, { style: { marginBottom: 16, width: '100%', justifyContent: 'flex-end' } },
                    react__WEBPACK_IMPORTED_MODULE_4___default().createElement(antd__WEBPACK_IMPORTED_MODULE_6__.Button, { onClick: onCancel }, "Cancel"),
                    react__WEBPACK_IMPORTED_MODULE_4___default().createElement(antd__WEBPACK_IMPORTED_MODULE_6__.Button, { type: "primary", htmlType: "submit" }, "Submit"))))));
};
/** getPythonCode – convert .ampln to Python */
const getPythonCode = async (path, commands, docManager) => {
    console.log('Loaded path:', path);
    const file = await docManager.services.contents.get(path, {
        content: true // Required
    });
    console.log('Loaded file:', file);
    if (!file.content) {
        console.error('File content is empty or null:', path);
        throw new Error('Selected file is empty or could not be loaded');
    }
    if (path.endsWith('.ampln')) {
        try {
            const parsed = JSON.parse(file.content);
            console.log('Parsed JSON:', parsed);
            const code = await commands.execute('pipeline-editor:generate-code', {
                json: parsed
            });
            console.log('Generated Python code:', code);
            if (!code)
                throw new Error('Code generation failed');
            return code;
        }
        catch (err) {
            console.error('Error during code generation:', err);
            throw err;
        }
    }
    return file.content;
};
const SchedulerPanel = ({ commands, docManager }) => {
    const { styles } = useStyle();
    const [jobs, setJobs] = (0,react__WEBPACK_IMPORTED_MODULE_4__.useState)([]);
    const [loading, setLoading] = (0,react__WEBPACK_IMPORTED_MODULE_4__.useState)(false);
    const [jobModalVisible, setJobModalVisible] = (0,react__WEBPACK_IMPORTED_MODULE_4__.useState)(false);
    const [currentJob, setCurrentJob] = (0,react__WEBPACK_IMPORTED_MODULE_4__.useState)(null);
    const fetchJobs = async () => {
        setLoading(true);
        try {
            const data = await SchedulerAPI.listJobs();
            setJobs(data.jobs || []);
        }
        catch (error) {
            console.error('Error fetching jobs:', error);
            _jupyterlab_apputils__WEBPACK_IMPORTED_MODULE_0__.Notification.error('Failed to fetch scheduled jobs');
        }
        finally {
            setLoading(false);
        }
    };
    (0,react__WEBPACK_IMPORTED_MODULE_4__.useEffect)(() => {
        fetchJobs();
        // Set up a refresh interval
        const intervalId = setInterval(fetchJobs, 30000); // Refresh every 30 seconds
        return () => clearInterval(intervalId);
    }, []);
    const handleCreateJob = () => {
        setCurrentJob(null);
        setJobModalVisible(true);
    };
    const handleEditJob = (job) => {
        // Need to transform the job data to form values
        const formValues = {
            id: job.id,
            name: job.name,
            pipeline_path: job.pipeline_path,
            schedule_type: job.schedule_type
        };
        if (job.schedule_type === 'date' && job.run_date) {
            formValues.run_date = dayjs__WEBPACK_IMPORTED_MODULE_8___default()(job.run_date);
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
    const handleDeleteJob = (jobId) => {
        const promise = SchedulerAPI.deleteJob(jobId);
        _jupyterlab_apputils__WEBPACK_IMPORTED_MODULE_0__.Notification.promise(promise, {
            pending: { message: 'Deleting job…' },
            success: { message: () => 'Job deleted successfully', options: { autoClose: 3000 } },
            error: {
                message: (err) => `Failed to delete job: ${err instanceof Error ? err.message : String(err)}`
            }
        });
        promise.then(fetchJobs).catch(console.error);
    };
    const handleRunJob = async (jobId) => {
        const job = jobs.find(j => j.id === jobId);
        if (!job)
            return;
        const pythonCode = await getPythonCode(job.pipeline_path, commands, docManager);
        const promise = SchedulerAPI.runJob(jobId, { code: pythonCode }).then(res => {
            var _a;
            if (!res.success)
                throw new Error(res.error || 'Execution failed');
            return (_a = res.output) !== null && _a !== void 0 ? _a : '';
        });
        _jupyterlab_apputils__WEBPACK_IMPORTED_MODULE_0__.Notification.promise(promise, {
            pending: { message: 'Running pipeline…' },
            success: { message: () => 'Pipeline executed successfully' },
            error: {
                message: (e) => `Pipeline execution failed: ${e instanceof Error ? e.message : String(e)}`
            }
        });
    };
    const handleFormSubmit = async (values) => {
        var _a;
        try {
            /* build payload for backend */
            const formData = {
                name: values.name,
                schedule_type: values.schedule_type,
                run_date: (_a = values.run_date) === null || _a === void 0 ? void 0 : _a.toISOString(),
                interval_seconds: values.interval_seconds,
                cron_expression: values.cron_expression
            };
            if (values.id)
                formData.id = values.id;
            /* .ampln → raw Python, else keep path */
            if (values.pipeline_path.endsWith('.ampln')) {
                formData.python_code = await getPythonCode(values.pipeline_path, commands, docManager);
            }
            else {
                formData.pipeline_path = values.pipeline_path;
            }
            await SchedulerAPI.createJob(formData);
            _jupyterlab_apputils__WEBPACK_IMPORTED_MODULE_0__.Notification.success('Job created successfully');
            setJobModalVisible(false);
            fetchJobs();
        }
        catch (error) {
            console.error('Error creating job:', error);
            _jupyterlab_apputils__WEBPACK_IMPORTED_MODULE_0__.Notification.error('Failed to create job');
        }
    };
    return (react__WEBPACK_IMPORTED_MODULE_4___default().createElement(antd__WEBPACK_IMPORTED_MODULE_6__.ConfigProvider, { theme: {
            token: {
                colorPrimary: '#5F9B97',
            },
        } },
        react__WEBPACK_IMPORTED_MODULE_4___default().createElement("div", { className: styles.root },
            react__WEBPACK_IMPORTED_MODULE_4___default().createElement("div", { className: styles.header },
                react__WEBPACK_IMPORTED_MODULE_4___default().createElement(antd__WEBPACK_IMPORTED_MODULE_6__.Space, null,
                    react__WEBPACK_IMPORTED_MODULE_4___default().createElement(antd__WEBPACK_IMPORTED_MODULE_6__.Button, { type: "primary", icon: react__WEBPACK_IMPORTED_MODULE_4___default().createElement(_ant_design_icons__WEBPACK_IMPORTED_MODULE_5__.PlusOutlined, null), onClick: handleCreateJob }, "Task"),
                    react__WEBPACK_IMPORTED_MODULE_4___default().createElement(antd__WEBPACK_IMPORTED_MODULE_6__.Button, { icon: react__WEBPACK_IMPORTED_MODULE_4___default().createElement(_ant_design_icons__WEBPACK_IMPORTED_MODULE_5__.ReloadOutlined, null), onClick: fetchJobs }))),
            react__WEBPACK_IMPORTED_MODULE_4___default().createElement("div", { className: styles.content }, loading ? (react__WEBPACK_IMPORTED_MODULE_4___default().createElement("div", { style: { textAlign: 'center', padding: '40px 0' } },
                react__WEBPACK_IMPORTED_MODULE_4___default().createElement(antd__WEBPACK_IMPORTED_MODULE_6__.Spin, { size: "large" }))) : jobs.length === 0 ? (react__WEBPACK_IMPORTED_MODULE_4___default().createElement(antd__WEBPACK_IMPORTED_MODULE_6__.Empty, { description: "No scheduled tasks yet", image: antd__WEBPACK_IMPORTED_MODULE_6__.Empty.PRESENTED_IMAGE_SIMPLE })) : (react__WEBPACK_IMPORTED_MODULE_4___default().createElement(antd__WEBPACK_IMPORTED_MODULE_6__.List, { dataSource: jobs, renderItem: (job) => (react__WEBPACK_IMPORTED_MODULE_4___default().createElement(antd__WEBPACK_IMPORTED_MODULE_6__.Card, { className: styles.jobCard, size: "small", title: job.name, key: job.id },
                    react__WEBPACK_IMPORTED_MODULE_4___default().createElement("div", { className: styles.jobMeta },
                        react__WEBPACK_IMPORTED_MODULE_4___default().createElement(_ant_design_icons__WEBPACK_IMPORTED_MODULE_5__.ScheduleOutlined, { className: styles.jobMetaIcon }),
                        react__WEBPACK_IMPORTED_MODULE_4___default().createElement("span", null,
                            "Pipeline: ",
                            job.pipeline_path)),
                    react__WEBPACK_IMPORTED_MODULE_4___default().createElement("div", { className: styles.jobMeta },
                        react__WEBPACK_IMPORTED_MODULE_4___default().createElement(_ant_design_icons__WEBPACK_IMPORTED_MODULE_5__.ClockCircleOutlined, { className: styles.jobMetaIcon }),
                        react__WEBPACK_IMPORTED_MODULE_4___default().createElement("span", null,
                            "Type: ",
                            job.trigger.split('[')[0])),
                    job.next_run_time && (react__WEBPACK_IMPORTED_MODULE_4___default().createElement("div", { className: styles.jobMeta },
                        react__WEBPACK_IMPORTED_MODULE_4___default().createElement(_ant_design_icons__WEBPACK_IMPORTED_MODULE_5__.CalendarOutlined, { className: styles.jobMetaIcon }),
                        react__WEBPACK_IMPORTED_MODULE_4___default().createElement("span", null,
                            "Next run: ",
                            dayjs__WEBPACK_IMPORTED_MODULE_8___default()(job.next_run_time).format('YYYY-MM-DD HH:mm:ss')))),
                    react__WEBPACK_IMPORTED_MODULE_4___default().createElement(antd__WEBPACK_IMPORTED_MODULE_6__.Divider, { style: { margin: '12px 0' } }),
                    react__WEBPACK_IMPORTED_MODULE_4___default().createElement(antd__WEBPACK_IMPORTED_MODULE_6__.Space, null,
                        react__WEBPACK_IMPORTED_MODULE_4___default().createElement(antd__WEBPACK_IMPORTED_MODULE_6__.Tooltip, { title: "Run now" },
                            react__WEBPACK_IMPORTED_MODULE_4___default().createElement(antd__WEBPACK_IMPORTED_MODULE_6__.Button, { type: "text", icon: react__WEBPACK_IMPORTED_MODULE_4___default().createElement(_ant_design_icons__WEBPACK_IMPORTED_MODULE_5__.PlayCircleOutlined, null), onClick: () => handleRunJob(job.id) })),
                        react__WEBPACK_IMPORTED_MODULE_4___default().createElement(antd__WEBPACK_IMPORTED_MODULE_6__.Tooltip, { title: "Edit" },
                            react__WEBPACK_IMPORTED_MODULE_4___default().createElement(antd__WEBPACK_IMPORTED_MODULE_6__.Button, { type: "text", icon: react__WEBPACK_IMPORTED_MODULE_4___default().createElement(_ant_design_icons__WEBPACK_IMPORTED_MODULE_5__.EditOutlined, null), onClick: () => handleEditJob(job) })),
                        react__WEBPACK_IMPORTED_MODULE_4___default().createElement(antd__WEBPACK_IMPORTED_MODULE_6__.Tooltip, { title: "Delete" },
                            react__WEBPACK_IMPORTED_MODULE_4___default().createElement(antd__WEBPACK_IMPORTED_MODULE_6__.Button, { type: "text", danger: true, icon: react__WEBPACK_IMPORTED_MODULE_4___default().createElement(_ant_design_icons__WEBPACK_IMPORTED_MODULE_5__.DeleteOutlined, null), onClick: () => handleDeleteJob(job.id) }))))) }))),
            react__WEBPACK_IMPORTED_MODULE_4___default().createElement(antd__WEBPACK_IMPORTED_MODULE_6__.Modal, { title: currentJob ? 'Edit Task' : 'New Task', open: jobModalVisible, onCancel: () => setJobModalVisible(false), footer: null, destroyOnClose: true, width: 500 },
                react__WEBPACK_IMPORTED_MODULE_4___default().createElement(JobForm, { docManager: docManager, onSubmit: handleFormSubmit, onCancel: () => setJobModalVisible(false), initialValues: currentJob || undefined })))));
};
/* ---------- plugin ---------- */
var CommandIDs;
(function (CommandIDs) {
    CommandIDs.open = 'pipeline-scheduler:open';
})(CommandIDs || (CommandIDs = {}));
const plugin = {
    id: '@amphi/pipeline-scheduler:plugin',
    autoStart: true,
    requires: [_jupyterlab_apputils__WEBPACK_IMPORTED_MODULE_0__.ICommandPalette, _jupyterlab_docmanager__WEBPACK_IMPORTED_MODULE_3__.IDocumentManager],
    activate: (app, palette, docManager) => {
        const { commands, shell } = app;
        commands.addCommand(CommandIDs.open, {
            label: 'Pipeline Scheduler',
            caption: 'Schedule Amphi pipelines',
            execute: () => {
                class SchedulerWidget extends _jupyterlab_apputils__WEBPACK_IMPORTED_MODULE_0__.ReactWidget {
                    constructor() {
                        super();
                        this.id = 'pipeline-scheduler-sidebar';
                        this.title.caption = 'Pipeline Scheduler';
                        this.title.iconClass = 'jp-SideBar-tabIcon jp-CalendarIcon';
                        this.title.closable = true;
                    }
                    render() {
                        return react__WEBPACK_IMPORTED_MODULE_4___default().createElement(SchedulerPanel, { commands: commands, docManager: docManager });
                    }
                }
                const widget = new SchedulerWidget();
                if (!widget.isAttached)
                    shell.add(widget, 'left');
                shell.activateById(widget.id);
            }
        });
        palette.addItem({ command: CommandIDs.open, category: 'Amphi' });
        commands.execute(CommandIDs.open);
    }
};
/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = (plugin);


/***/ })

}]);
//# sourceMappingURL=lib_index_js.664cd93c2eab5320698c.js.map