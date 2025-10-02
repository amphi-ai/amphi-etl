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

/***/ "./lib/icons.js":
/*!**********************!*\
  !*** ./lib/icons.js ***!
  \**********************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   databaseIcon: () => (/* binding */ databaseIcon),
/* harmony export */   schedulerIcon: () => (/* binding */ schedulerIcon),
/* harmony export */   schemaIcon: () => (/* binding */ schemaIcon),
/* harmony export */   tableIcon: () => (/* binding */ tableIcon)
/* harmony export */ });
/* harmony import */ var _jupyterlab_ui_components__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! @jupyterlab/ui-components */ "webpack/sharing/consume/default/@jupyterlab/ui-components");
/* harmony import */ var _jupyterlab_ui_components__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(_jupyterlab_ui_components__WEBPACK_IMPORTED_MODULE_0__);
/* harmony import */ var _style_icons_database_24_svg__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ../style/icons/database-24.svg */ "./style/icons/database-24.svg");
/* harmony import */ var _style_icons_layout_24_svg__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ../style/icons/layout-24.svg */ "./style/icons/layout-24.svg");
/* harmony import */ var _style_icons_hard_drive_24_svg__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ../style/icons/hard-drive-24.svg */ "./style/icons/hard-drive-24.svg");
/* harmony import */ var _style_icons_scheduler_svg__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(/*! ../style/icons/scheduler.svg */ "./style/icons/scheduler.svg");





const databaseIcon = new _jupyterlab_ui_components__WEBPACK_IMPORTED_MODULE_0__.LabIcon({
    name: 'amphi:database-browser-Icon',
    svgstr: _style_icons_database_24_svg__WEBPACK_IMPORTED_MODULE_1__
});
const schemaIcon = new _jupyterlab_ui_components__WEBPACK_IMPORTED_MODULE_0__.LabIcon({
    name: 'amphi:schema-Icon',
    svgstr: _style_icons_layout_24_svg__WEBPACK_IMPORTED_MODULE_2__
});
const tableIcon = new _jupyterlab_ui_components__WEBPACK_IMPORTED_MODULE_0__.LabIcon({
    name: 'amphi:table-browser-icon',
    svgstr: _style_icons_hard_drive_24_svg__WEBPACK_IMPORTED_MODULE_3__
});
const schedulerIcon = new _jupyterlab_ui_components__WEBPACK_IMPORTED_MODULE_0__.LabIcon({
    name: 'amphi:scheduler-icon',
    svgstr: _style_icons_scheduler_svg__WEBPACK_IMPORTED_MODULE_4__
});


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
/* harmony import */ var _icons__WEBPACK_IMPORTED_MODULE_6__ = __webpack_require__(/*! ./icons */ "./lib/icons.js");
/* harmony import */ var antd__WEBPACK_IMPORTED_MODULE_7__ = __webpack_require__(/*! antd */ "webpack/sharing/consume/default/antd/antd?3739");
/* harmony import */ var antd__WEBPACK_IMPORTED_MODULE_7___default = /*#__PURE__*/__webpack_require__.n(antd__WEBPACK_IMPORTED_MODULE_7__);
/* harmony import */ var antd_style__WEBPACK_IMPORTED_MODULE_8__ = __webpack_require__(/*! antd-style */ "webpack/sharing/consume/default/antd-style/antd-style");
/* harmony import */ var antd_style__WEBPACK_IMPORTED_MODULE_8___default = /*#__PURE__*/__webpack_require__.n(antd_style__WEBPACK_IMPORTED_MODULE_8__);
/* harmony import */ var dayjs__WEBPACK_IMPORTED_MODULE_9__ = __webpack_require__(/*! dayjs */ "webpack/sharing/consume/default/dayjs/dayjs?44f5");
/* harmony import */ var dayjs__WEBPACK_IMPORTED_MODULE_9___default = /*#__PURE__*/__webpack_require__.n(dayjs__WEBPACK_IMPORTED_MODULE_9__);
/* harmony import */ var _BrowseFileDialog__WEBPACK_IMPORTED_MODULE_10__ = __webpack_require__(/*! ./BrowseFileDialog */ "./lib/BrowseFileDialog.js");









 // Import dayjs and Dayjs type
 /* NEW */

function toHeaderRecord(h) {
    if (!h)
        return {};
    if (h instanceof Headers) {
        const obj = {};
        h.forEach((v, k) => (obj[k] = v));
        return obj;
    }
    if (Array.isArray(h))
        return Object.fromEntries(h);
    return { ...h };
}
/* ---------- API Client ---------- */
class SchedulerAPI {
    static async makeRequest(endpoint, init = {}) {
        const settings = _jupyterlab_services__WEBPACK_IMPORTED_MODULE_1__.ServerConnection.makeSettings();
        const urlPatterns = ['pipeline-scheduler'];
        let lastError = null;
        for (const baseEndpoint of urlPatterns) {
            try {
                // take body out first so we can re-type it safely
                const { body, ...rest } = init;
                const requestInit = { ...rest };
                // normalize headers to a plain object we can mutate
                const headers = toHeaderRecord(rest.headers);
                const method = (rest.method || 'GET').toUpperCase();
                if (method !== 'GET' && body != null) {
                    const isPlainObject = typeof body === 'object' &&
                        !(body instanceof FormData) &&
                        !(body instanceof URLSearchParams) &&
                        !(body instanceof ArrayBuffer) &&
                        !(body instanceof Blob);
                    if (isPlainObject) {
                        requestInit.body = JSON.stringify(body);
                        headers['Content-Type'] = headers['Content-Type'] || 'application/json';
                    }
                    else {
                        requestInit.body = body;
                    }
                }
                requestInit.headers = headers;
                const response = await (0,_handler__WEBPACK_IMPORTED_MODULE_2__.requestScheduler)(endpoint, requestInit);
                return response;
            }
            catch (error) {
                console.warn(`Failed to connect using ${baseEndpoint}:`, error);
                lastError = error instanceof Error ? error : new Error(String(error));
            }
        }
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
            body: job // This will be properly serialized by makeRequest
        });
    }
    static deleteJob(id) {
        return this.makeRequest(`jobs/${id}`, {
            method: 'DELETE'
        });
    }
    static runJob(id) {
        // Server does not read a body here
        return this.makeRequest(`run/${id}`, { method: 'POST' });
    }
}
/* ---------- styles ---------- */
const useStyle = (0,antd_style__WEBPACK_IMPORTED_MODULE_8__.createStyles)(({ token, css }) => ({
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
    const [form] = antd__WEBPACK_IMPORTED_MODULE_7__.Form.useForm();
    const [scheduleType, setScheduleType] = (0,react__WEBPACK_IMPORTED_MODULE_4__.useState)((initialValues === null || initialValues === void 0 ? void 0 : initialValues.schedule_type) || 'date');
    const [dateType, setDateType] = (0,react__WEBPACK_IMPORTED_MODULE_4__.useState)((initialValues === null || initialValues === void 0 ? void 0 : initialValues.date_type) || 'once');
    (0,react__WEBPACK_IMPORTED_MODULE_4__.useEffect)(() => {
        if (initialValues) {
            form.setFieldsValue(initialValues);
            setScheduleType(initialValues.schedule_type || 'date');
            setDateType(initialValues.date_type || 'once');
        }
    }, [initialValues, form]);
    /* helper to launch the file-picker */
    const pickPipelinePath = async () => {
        try {
            const res = await (0,_BrowseFileDialog__WEBPACK_IMPORTED_MODULE_10__.showBrowseFileDialog)(docManager, {
                extensions: ['.ampln', '.py'],
                includeDir: false
            });
            if (res.button.accept && res.value.length) {
                form.setFieldsValue({ pipeline_path: res.value[0].path });
            }
        }
        catch (err) {
            console.error('Browse file error:', err);
            antd__WEBPACK_IMPORTED_MODULE_7__.message.error('Failed to open file chooser');
        }
    };
    return (react__WEBPACK_IMPORTED_MODULE_4___default().createElement(antd__WEBPACK_IMPORTED_MODULE_7__.ConfigProvider, { theme: {
            token: {
                colorPrimary: '#5F9B97',
            },
        } },
        react__WEBPACK_IMPORTED_MODULE_4___default().createElement(antd__WEBPACK_IMPORTED_MODULE_7__.Form, { form: form, layout: "vertical", onFinish: onSubmit, initialValues: { schedule_type: 'date', date_type: 'once', ...initialValues } },
            react__WEBPACK_IMPORTED_MODULE_4___default().createElement(antd__WEBPACK_IMPORTED_MODULE_7__.Form.Item, { name: "id", hidden: true },
                react__WEBPACK_IMPORTED_MODULE_4___default().createElement(antd__WEBPACK_IMPORTED_MODULE_7__.Input, null)),
            react__WEBPACK_IMPORTED_MODULE_4___default().createElement(antd__WEBPACK_IMPORTED_MODULE_7__.Form.Item, { style: { marginBottom: 16 }, name: "name", label: "Task Name", rules: [{ required: true, message: 'Please input a task name' }] },
                react__WEBPACK_IMPORTED_MODULE_4___default().createElement(antd__WEBPACK_IMPORTED_MODULE_7__.Input, { placeholder: "My Task Name" })),
            react__WEBPACK_IMPORTED_MODULE_4___default().createElement(antd__WEBPACK_IMPORTED_MODULE_7__.Form.Item, { style: { marginBottom: 16 }, label: "Pipeline Path", required: true },
                react__WEBPACK_IMPORTED_MODULE_4___default().createElement(antd__WEBPACK_IMPORTED_MODULE_7__.Space.Compact, { style: { width: '100%' } },
                    react__WEBPACK_IMPORTED_MODULE_4___default().createElement(antd__WEBPACK_IMPORTED_MODULE_7__.Form.Item, { name: "pipeline_path", noStyle: true, rules: [{ required: true, message: 'Please select a pipeline file' }] },
                        react__WEBPACK_IMPORTED_MODULE_4___default().createElement(antd__WEBPACK_IMPORTED_MODULE_7__.Input, { readOnly: true, placeholder: "Select a .ampln or .py file" })),
                    react__WEBPACK_IMPORTED_MODULE_4___default().createElement(antd__WEBPACK_IMPORTED_MODULE_7__.Button, { icon: react__WEBPACK_IMPORTED_MODULE_4___default().createElement(_ant_design_icons__WEBPACK_IMPORTED_MODULE_5__.FolderOpenOutlined, null), onClick: pickPipelinePath }))),
            react__WEBPACK_IMPORTED_MODULE_4___default().createElement(antd__WEBPACK_IMPORTED_MODULE_7__.Form.Item, { style: { marginBottom: 16 }, name: "schedule_type", label: "Schedule Type" },
                react__WEBPACK_IMPORTED_MODULE_4___default().createElement(antd__WEBPACK_IMPORTED_MODULE_7__.Radio.Group, { onChange: (e) => setScheduleType(e.target.value) },
                    react__WEBPACK_IMPORTED_MODULE_4___default().createElement(antd__WEBPACK_IMPORTED_MODULE_7__.Radio, { value: "date" }, "Date"),
                    react__WEBPACK_IMPORTED_MODULE_4___default().createElement(antd__WEBPACK_IMPORTED_MODULE_7__.Radio, { value: "interval" }, "Interval"),
                    react__WEBPACK_IMPORTED_MODULE_4___default().createElement(antd__WEBPACK_IMPORTED_MODULE_7__.Radio, { value: "cron" }, "Cron"))),
            scheduleType === 'date' && (react__WEBPACK_IMPORTED_MODULE_4___default().createElement((react__WEBPACK_IMPORTED_MODULE_4___default().Fragment), null,
                react__WEBPACK_IMPORTED_MODULE_4___default().createElement(antd__WEBPACK_IMPORTED_MODULE_7__.Form.Item, { style: { marginBottom: 16 }, name: "date_type", label: "Date Type" },
                    react__WEBPACK_IMPORTED_MODULE_4___default().createElement(antd__WEBPACK_IMPORTED_MODULE_7__.Select, { onChange: (value) => setDateType(value), style: { width: '100%' } },
                        react__WEBPACK_IMPORTED_MODULE_4___default().createElement(antd__WEBPACK_IMPORTED_MODULE_7__.Select.Option, { value: "once" }, "One-time"),
                        react__WEBPACK_IMPORTED_MODULE_4___default().createElement(antd__WEBPACK_IMPORTED_MODULE_7__.Select.Option, { value: "daily" }, "Daily"),
                        react__WEBPACK_IMPORTED_MODULE_4___default().createElement(antd__WEBPACK_IMPORTED_MODULE_7__.Select.Option, { value: "weekly" }, "Weekly"),
                        react__WEBPACK_IMPORTED_MODULE_4___default().createElement(antd__WEBPACK_IMPORTED_MODULE_7__.Select.Option, { value: "monthly" }, "Monthly"),
                        react__WEBPACK_IMPORTED_MODULE_4___default().createElement(antd__WEBPACK_IMPORTED_MODULE_7__.Select.Option, { value: "every_x_days" }, "Every X Days"))),
                dateType !== 'every_x_days' ? (react__WEBPACK_IMPORTED_MODULE_4___default().createElement(antd__WEBPACK_IMPORTED_MODULE_7__.Form.Item, { style: { marginBottom: 16 }, name: "run_date", label: dateType === 'once' ? 'Run Date & Time' : 'Start Date & Time', rules: [{ required: true, message: 'Please select a date and time' }] },
                    react__WEBPACK_IMPORTED_MODULE_4___default().createElement(antd__WEBPACK_IMPORTED_MODULE_7__.DatePicker, { showTime: true, style: { width: '100%' } }))) : (react__WEBPACK_IMPORTED_MODULE_4___default().createElement(antd__WEBPACK_IMPORTED_MODULE_7__.Form.Item, { style: { marginBottom: 16 }, name: "interval_days", label: "Interval (days)", rules: [{ required: true, message: 'Please input a number of days' }] },
                    react__WEBPACK_IMPORTED_MODULE_4___default().createElement(antd__WEBPACK_IMPORTED_MODULE_7__.InputNumber, { min: 1, style: { width: '100%' } }))))),
            scheduleType === 'interval' && (react__WEBPACK_IMPORTED_MODULE_4___default().createElement(antd__WEBPACK_IMPORTED_MODULE_7__.Form.Item, { style: { marginBottom: 16 }, name: "interval_seconds", label: "Interval (seconds)", rules: [{ required: true, message: 'Please input an interval' }] },
                react__WEBPACK_IMPORTED_MODULE_4___default().createElement(antd__WEBPACK_IMPORTED_MODULE_7__.InputNumber, { min: 1, style: { width: '100%' } }))),
            scheduleType === 'cron' && (react__WEBPACK_IMPORTED_MODULE_4___default().createElement(antd__WEBPACK_IMPORTED_MODULE_7__.Form.Item, { style: { marginBottom: 16 }, name: "cron_expression", label: "Cron Expression", rules: [{ required: true, message: 'Please input a cron expression' }] },
                react__WEBPACK_IMPORTED_MODULE_4___default().createElement(antd__WEBPACK_IMPORTED_MODULE_7__.Input, { placeholder: "*/5 * * * *" }))),
            react__WEBPACK_IMPORTED_MODULE_4___default().createElement(antd__WEBPACK_IMPORTED_MODULE_7__.Form.Item, null,
                react__WEBPACK_IMPORTED_MODULE_4___default().createElement(antd__WEBPACK_IMPORTED_MODULE_7__.Space, { style: { marginBottom: 16, width: '100%', justifyContent: 'flex-end' } },
                    react__WEBPACK_IMPORTED_MODULE_4___default().createElement(antd__WEBPACK_IMPORTED_MODULE_7__.Button, { onClick: onCancel }, "Cancel"),
                    react__WEBPACK_IMPORTED_MODULE_4___default().createElement(antd__WEBPACK_IMPORTED_MODULE_7__.Button, { type: "primary", htmlType: "submit" }, "Submit"))))));
};
/** getPythonCode – convert .ampln to Python */
const getPythonCode = async (path, commands, docManager) => {
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
            const raw = file.content;
            const jsonString = typeof raw === 'string'
                ? raw
                : JSON.stringify(raw);
            // Many generators expect a string and will JSON.parse internally.
            const code = (await commands.execute('pipeline-editor:generate-code', {
                json: jsonString
            }));
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
    // .py and others: the server returns text, so just forward it
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
        if (job.schedule_type === 'date') {
            formValues.date_type = job.date_type || 'once';
            if (job.run_date) {
                formValues.run_date = dayjs__WEBPACK_IMPORTED_MODULE_9___default()(job.run_date);
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
        const promise = SchedulerAPI.runJob(jobId).then(res => {
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
        try {
            /* build payload for backend */
            const formData = {
                name: values.name,
                schedule_type: values.schedule_type,
                run_date: values.run_date ? values.run_date.toDate().toISOString() : undefined,
                interval_seconds: values.interval_seconds,
                cron_expression: values.cron_expression,
                pipeline_path: values.pipeline_path // ALWAYS send the original path
            };
            // Add date_type if schedule_type is 'date'
            if (values.schedule_type === 'date') {
                formData.date_type = values.date_type || 'once';
                if (values.date_type === 'every_x_days') {
                    formData.interval_days = values.interval_days;
                }
            }
            if (values.id)
                formData.id = values.id;
            /* .ampln → also send raw Python code */
            if (values.pipeline_path.endsWith('.ampln')) {
                formData.python_code = await getPythonCode(values.pipeline_path, commands, docManager);
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
    return (react__WEBPACK_IMPORTED_MODULE_4___default().createElement(antd__WEBPACK_IMPORTED_MODULE_7__.ConfigProvider, { theme: {
            token: {
                colorPrimary: '#5F9B97',
            },
        } },
        react__WEBPACK_IMPORTED_MODULE_4___default().createElement("div", { className: styles.root },
            react__WEBPACK_IMPORTED_MODULE_4___default().createElement("div", { className: styles.header },
                react__WEBPACK_IMPORTED_MODULE_4___default().createElement(antd__WEBPACK_IMPORTED_MODULE_7__.Space, null,
                    react__WEBPACK_IMPORTED_MODULE_4___default().createElement(antd__WEBPACK_IMPORTED_MODULE_7__.Button, { type: "primary", icon: react__WEBPACK_IMPORTED_MODULE_4___default().createElement(_ant_design_icons__WEBPACK_IMPORTED_MODULE_5__.PlusOutlined, null), onClick: handleCreateJob }, "Task"),
                    react__WEBPACK_IMPORTED_MODULE_4___default().createElement(antd__WEBPACK_IMPORTED_MODULE_7__.Button, { icon: react__WEBPACK_IMPORTED_MODULE_4___default().createElement(_ant_design_icons__WEBPACK_IMPORTED_MODULE_5__.ReloadOutlined, null), onClick: fetchJobs }))),
            react__WEBPACK_IMPORTED_MODULE_4___default().createElement("div", { className: styles.content }, loading ? (react__WEBPACK_IMPORTED_MODULE_4___default().createElement("div", { style: { textAlign: 'center', padding: '40px 0' } },
                react__WEBPACK_IMPORTED_MODULE_4___default().createElement(antd__WEBPACK_IMPORTED_MODULE_7__.Spin, { size: "large" }))) : jobs.length === 0 ? (react__WEBPACK_IMPORTED_MODULE_4___default().createElement(antd__WEBPACK_IMPORTED_MODULE_7__.Empty, { description: "No scheduled tasks yet", image: antd__WEBPACK_IMPORTED_MODULE_7__.Empty.PRESENTED_IMAGE_SIMPLE })) : (react__WEBPACK_IMPORTED_MODULE_4___default().createElement(antd__WEBPACK_IMPORTED_MODULE_7__.List, { itemLayout: "vertical", dataSource: jobs, renderItem: job => {
                    const type = job.trigger.split('[')[0];
                    return (react__WEBPACK_IMPORTED_MODULE_4___default().createElement(antd__WEBPACK_IMPORTED_MODULE_7__.List.Item, { key: job.id, actions: [
                            react__WEBPACK_IMPORTED_MODULE_4___default().createElement(antd__WEBPACK_IMPORTED_MODULE_7__.Tooltip, { title: "Run now", key: "run" },
                                react__WEBPACK_IMPORTED_MODULE_4___default().createElement(antd__WEBPACK_IMPORTED_MODULE_7__.Button, { type: "text", icon: react__WEBPACK_IMPORTED_MODULE_4___default().createElement(_ant_design_icons__WEBPACK_IMPORTED_MODULE_5__.PlayCircleOutlined, null), onClick: () => handleRunJob(job.id) })),
                            react__WEBPACK_IMPORTED_MODULE_4___default().createElement(antd__WEBPACK_IMPORTED_MODULE_7__.Tooltip, { title: "Edit", key: "edit" },
                                react__WEBPACK_IMPORTED_MODULE_4___default().createElement(antd__WEBPACK_IMPORTED_MODULE_7__.Button, { type: "text", icon: react__WEBPACK_IMPORTED_MODULE_4___default().createElement(_ant_design_icons__WEBPACK_IMPORTED_MODULE_5__.EditOutlined, null), onClick: () => handleEditJob(job) })),
                            react__WEBPACK_IMPORTED_MODULE_4___default().createElement(antd__WEBPACK_IMPORTED_MODULE_7__.Tooltip, { title: "Delete", key: "delete" },
                                react__WEBPACK_IMPORTED_MODULE_4___default().createElement(antd__WEBPACK_IMPORTED_MODULE_7__.Button, { type: "text", danger: true, icon: react__WEBPACK_IMPORTED_MODULE_4___default().createElement(_ant_design_icons__WEBPACK_IMPORTED_MODULE_5__.DeleteOutlined, null), onClick: () => handleDeleteJob(job.id) }))
                        ] },
                        react__WEBPACK_IMPORTED_MODULE_4___default().createElement(antd__WEBPACK_IMPORTED_MODULE_7__.List.Item.Meta, { title: react__WEBPACK_IMPORTED_MODULE_4___default().createElement(antd__WEBPACK_IMPORTED_MODULE_7__.Space, { wrap: true },
                                react__WEBPACK_IMPORTED_MODULE_4___default().createElement("span", { style: { fontWeight: 600 } }, job.name),
                                react__WEBPACK_IMPORTED_MODULE_4___default().createElement(antd__WEBPACK_IMPORTED_MODULE_7__.Tag, { icon: react__WEBPACK_IMPORTED_MODULE_4___default().createElement(_ant_design_icons__WEBPACK_IMPORTED_MODULE_5__.ClockCircleOutlined, null), color: "default" }, type)), description: react__WEBPACK_IMPORTED_MODULE_4___default().createElement("div", null,
                                react__WEBPACK_IMPORTED_MODULE_4___default().createElement("div", { className: styles.jobMeta },
                                    react__WEBPACK_IMPORTED_MODULE_4___default().createElement(_ant_design_icons__WEBPACK_IMPORTED_MODULE_5__.ScheduleOutlined, { className: styles.jobMetaIcon }),
                                    react__WEBPACK_IMPORTED_MODULE_4___default().createElement("span", null,
                                        "Pipeline: ",
                                        job.pipeline_path)),
                                job.next_run_time && (react__WEBPACK_IMPORTED_MODULE_4___default().createElement("div", { className: styles.jobMeta },
                                    react__WEBPACK_IMPORTED_MODULE_4___default().createElement(_ant_design_icons__WEBPACK_IMPORTED_MODULE_5__.CalendarOutlined, { className: styles.jobMetaIcon }),
                                    react__WEBPACK_IMPORTED_MODULE_4___default().createElement("span", null,
                                        "Next: ",
                                        dayjs__WEBPACK_IMPORTED_MODULE_9___default()(job.next_run_time).format('YYYY-MM-DD HH:mm:ss'))))) })));
                } }))),
            react__WEBPACK_IMPORTED_MODULE_4___default().createElement(antd__WEBPACK_IMPORTED_MODULE_7__.Modal, { title: currentJob ? 'Edit Task' : 'New Task', open: jobModalVisible, onCancel: () => setJobModalVisible(false), footer: null, destroyOnClose: true, width: 500 },
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
                        this.id = 'amphi-pipeline-scheduler';
                        this.title.caption = 'Pipeline Scheduler';
                        this.title.icon = _icons__WEBPACK_IMPORTED_MODULE_6__.schedulerIcon;
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


/***/ }),

/***/ "./style/icons/database-24.svg":
/*!*************************************!*\
  !*** ./style/icons/database-24.svg ***!
  \*************************************/
/***/ ((module) => {

module.exports = "<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"24\" height=\"24\" fill=\"none\" viewBox=\"0 0 24 24\"><path fill=\"currentColor\" fill-rule=\"evenodd\" d=\"M22 5.75c0-.751-.47-1.34-1.02-1.763-.563-.43-1.329-.787-2.208-1.072C17.005 2.342 14.611 2 12 2c-2.61 0-5.005.342-6.772.915-.88.285-1.646.641-2.207 1.072C2.469 4.41 2 5 2 5.75v12.412c0 .752.454 1.352 1.006 1.79.56.445 1.325.812 2.204 1.106 1.766.59 4.163.942 6.79.942s5.024-.352 6.79-.942c.88-.294 1.644-.66 2.204-1.105.552-.439 1.006-1.039 1.006-1.791V5.75zM3.933 5.177c-.385.296-.433.496-.433.573 0 .077.048.277.433.573.374.286.963.577 1.758.835C7.27 7.67 9.502 8 12 8s4.729-.33 6.31-.842c.794-.258 1.383-.549 1.757-.835.385-.296.433-.496.433-.573 0-.077-.048-.277-.433-.573-.375-.286-.963-.577-1.758-.835C16.73 3.83 14.498 3.5 12 3.5s-4.729.33-6.31.842c-.794.258-1.383.549-1.757.835zM20.5 7.835c-.49.29-1.078.539-1.728.75-1.767.573-4.161.915-6.772.915-2.61 0-5.005-.342-6.772-.915-.65-.211-1.238-.46-1.728-.75v3.915c0 .08.05.281.43.575.372.287.957.577 1.75.834C7.256 13.671 9.486 14 12 14c2.514 0 4.744-.329 6.32-.84.793-.258 1.378-.549 1.75-.835.38-.294.43-.495.43-.575V7.835zm0 6.005c-.486.288-1.07.536-1.716.746-1.764.573-4.159.914-6.784.914s-5.02-.341-6.784-.914c-.646-.21-1.23-.458-1.716-.746v4.322c0 .102.06.315.439.616.371.295.956.593 1.747.857 1.574.527 3.802.865 6.314.865s4.74-.338 6.314-.865c.791-.264 1.376-.563 1.747-.857.379-.3.439-.514.439-.616V13.84z\" clip-rule=\"evenodd\"/></svg>";

/***/ }),

/***/ "./style/icons/hard-drive-24.svg":
/*!***************************************!*\
  !*** ./style/icons/hard-drive-24.svg ***!
  \***************************************/
/***/ ((module) => {

module.exports = "<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"24\" height=\"24\" fill=\"none\" viewBox=\"0 0 24 24\"><g fill=\"currentColor\"><path d=\"M4 15.75a.75.75 0 01.75-.75h.5a.75.75 0 010 1.5h-.5a.75.75 0 01-.75-.75z\"/><path fill-rule=\"evenodd\" d=\"M7.202 3a2.75 2.75 0 00-2.428 1.46L1.32 10.958A2.75 2.75 0 001 12.248v6.002A2.75 2.75 0 003.75 21h16.5A2.75 2.75 0 0023 18.25v-6.002c0-.45-.11-.893-.321-1.29L19.226 4.46A2.75 2.75 0 0016.798 3H7.202zM6.098 5.164A1.25 1.25 0 017.202 4.5h9.596c.462 0 .887.255 1.104.664l3.366 6.336H2.732l3.366-6.336zM2.5 13v5.25c0 .69.56 1.25 1.25 1.25h16.5c.69 0 1.25-.56 1.25-1.25V13h-19z\" clip-rule=\"evenodd\"/></g></svg>";

/***/ }),

/***/ "./style/icons/layout-24.svg":
/*!***********************************!*\
  !*** ./style/icons/layout-24.svg ***!
  \***********************************/
/***/ ((module) => {

module.exports = "<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"24\" height=\"24\" fill=\"none\" viewBox=\"0 0 24 24\"><path fill=\"currentColor\" fill-rule=\"evenodd\" d=\"M2 4.75A2.75 2.75 0 014.75 2h14.5A2.75 2.75 0 0122 4.75v14.5A2.75 2.75 0 0119.25 22H4.75A2.75 2.75 0 012 19.25V4.75zM9 20.5h10.25c.69 0 1.25-.56 1.25-1.25V9.5H9v11zm-1.5-11v11H4.75c-.69 0-1.25-.56-1.25-1.25V9.5h4zm13-1.5V4.75c0-.69-.56-1.25-1.25-1.25H4.75c-.69 0-1.25.56-1.25 1.25V8h17z\" clip-rule=\"evenodd\"/></svg>";

/***/ }),

/***/ "./style/icons/scheduler.svg":
/*!***********************************!*\
  !*** ./style/icons/scheduler.svg ***!
  \***********************************/
/***/ ((module) => {

module.exports = "<svg  xmlns=\"http://www.w3.org/2000/svg\"  width=\"24\"  height=\"24\"  viewBox=\"0 0 24 24\"  fill=\"none\"  stroke=\"currentColor\"  stroke-width=\"2\"  stroke-linecap=\"round\"  stroke-linejoin=\"round\"  class=\"icon icon-tabler icons-tabler-outline icon-tabler-calendar-clock\"><path stroke=\"none\" d=\"M0 0h24v24H0z\" fill=\"none\"/><path d=\"M10.5 21h-4.5a2 2 0 0 1 -2 -2v-12a2 2 0 0 1 2 -2h12a2 2 0 0 1 2 2v3\" /><path d=\"M16 3v4\" /><path d=\"M8 3v4\" /><path d=\"M4 11h10\" /><path d=\"M18 18m-4 0a4 4 0 1 0 8 0a4 4 0 1 0 -8 0\" /><path d=\"M18 16.5v1.5l.5 .5\" /></svg>";

/***/ })

}]);
//# sourceMappingURL=lib_index_js.8565f7561787e2b97e4f.js.map