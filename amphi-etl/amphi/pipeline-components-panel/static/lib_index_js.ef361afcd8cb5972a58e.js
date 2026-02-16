"use strict";
(self["webpackChunk_amphi_pipeline_components_panel"] = self["webpackChunk_amphi_pipeline_components_panel"] || []).push([["lib_index_js"],{

/***/ "../../node_modules/css-loader/dist/cjs.js!./style/index.css"
/*!*******************************************************************!*\
  !*** ../../node_modules/css-loader/dist/cjs.js!./style/index.css ***!
  \*******************************************************************/
(module, __webpack_exports__, __webpack_require__) {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__)
/* harmony export */ });
/* harmony import */ var _node_modules_css_loader_dist_runtime_sourceMaps_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../../../node_modules/css-loader/dist/runtime/sourceMaps.js */ "../../node_modules/css-loader/dist/runtime/sourceMaps.js");
/* harmony import */ var _node_modules_css_loader_dist_runtime_sourceMaps_js__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(_node_modules_css_loader_dist_runtime_sourceMaps_js__WEBPACK_IMPORTED_MODULE_0__);
/* harmony import */ var _node_modules_css_loader_dist_runtime_api_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ../../../node_modules/css-loader/dist/runtime/api.js */ "../../node_modules/css-loader/dist/runtime/api.js");
/* harmony import */ var _node_modules_css_loader_dist_runtime_api_js__WEBPACK_IMPORTED_MODULE_1___default = /*#__PURE__*/__webpack_require__.n(_node_modules_css_loader_dist_runtime_api_js__WEBPACK_IMPORTED_MODULE_1__);
/* harmony import */ var _node_modules_css_loader_dist_cjs_js_base_css__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! -!../../../node_modules/css-loader/dist/cjs.js!./base.css */ "../../node_modules/css-loader/dist/cjs.js!./style/base.css");
// Imports



var ___CSS_LOADER_EXPORT___ = _node_modules_css_loader_dist_runtime_api_js__WEBPACK_IMPORTED_MODULE_1___default()((_node_modules_css_loader_dist_runtime_sourceMaps_js__WEBPACK_IMPORTED_MODULE_0___default()));
___CSS_LOADER_EXPORT___.i(_node_modules_css_loader_dist_cjs_js_base_css__WEBPACK_IMPORTED_MODULE_2__["default"]);
// Module
___CSS_LOADER_EXPORT___.push([module.id, `
`, "",{"version":3,"sources":[],"names":[],"mappings":"","sourceRoot":""}]);
// Exports
/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = (___CSS_LOADER_EXPORT___);


/***/ },

/***/ "./lib/icons.js"
/*!**********************!*\
  !*** ./lib/icons.js ***!
  \**********************/
(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   puzzleIcon: () => (/* binding */ puzzleIcon)
/* harmony export */ });
/* harmony import */ var _jupyterlab_ui_components__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! @jupyterlab/ui-components */ "webpack/sharing/consume/default/@jupyterlab/ui-components");
/* harmony import */ var _jupyterlab_ui_components__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(_jupyterlab_ui_components__WEBPACK_IMPORTED_MODULE_0__);
/* harmony import */ var _style_icons_puzzle_svg__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ../style/icons/puzzle.svg */ "./style/icons/puzzle.svg");


const puzzleIcon = new _jupyterlab_ui_components__WEBPACK_IMPORTED_MODULE_0__.LabIcon({
    name: 'amphi:puzzle-icon',
    svgstr: _style_icons_puzzle_svg__WEBPACK_IMPORTED_MODULE_1__
});


/***/ },

/***/ "./lib/index.js"
/*!**********************!*\
  !*** ./lib/index.js ***!
  \**********************/
(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__)
/* harmony export */ });
/* harmony import */ var _jupyterlab_apputils__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! @jupyterlab/apputils */ "webpack/sharing/consume/default/@jupyterlab/apputils");
/* harmony import */ var _jupyterlab_apputils__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(_jupyterlab_apputils__WEBPACK_IMPORTED_MODULE_0__);
/* harmony import */ var _jupyterlab_coreutils__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! @jupyterlab/coreutils */ "webpack/sharing/consume/default/@jupyterlab/coreutils");
/* harmony import */ var _jupyterlab_coreutils__WEBPACK_IMPORTED_MODULE_1___default = /*#__PURE__*/__webpack_require__.n(_jupyterlab_coreutils__WEBPACK_IMPORTED_MODULE_1__);
/* harmony import */ var _jupyterlab_filebrowser__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! @jupyterlab/filebrowser */ "webpack/sharing/consume/default/@jupyterlab/filebrowser");
/* harmony import */ var _jupyterlab_filebrowser__WEBPACK_IMPORTED_MODULE_2___default = /*#__PURE__*/__webpack_require__.n(_jupyterlab_filebrowser__WEBPACK_IMPORTED_MODULE_2__);
/* harmony import */ var _amphi_pipeline_components_manager__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! @amphi/pipeline-components-manager */ "webpack/sharing/consume/default/@amphi/pipeline-components-manager");
/* harmony import */ var _amphi_pipeline_components_manager__WEBPACK_IMPORTED_MODULE_3___default = /*#__PURE__*/__webpack_require__.n(_amphi_pipeline_components_manager__WEBPACK_IMPORTED_MODULE_3__);
/* harmony import */ var _icons__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(/*! ./icons */ "./lib/icons.js");
/* harmony import */ var react__WEBPACK_IMPORTED_MODULE_5__ = __webpack_require__(/*! react */ "webpack/sharing/consume/default/react");
/* harmony import */ var react__WEBPACK_IMPORTED_MODULE_5___default = /*#__PURE__*/__webpack_require__.n(react__WEBPACK_IMPORTED_MODULE_5__);
/* harmony import */ var _ant_design_icons__WEBPACK_IMPORTED_MODULE_6__ = __webpack_require__(/*! @ant-design/icons */ "../../node_modules/@ant-design/icons/es/icons/PlusOutlined.js");
/* harmony import */ var _ant_design_icons__WEBPACK_IMPORTED_MODULE_7__ = __webpack_require__(/*! @ant-design/icons */ "../../node_modules/@ant-design/icons/es/icons/ReloadOutlined.js");
/* harmony import */ var antd__WEBPACK_IMPORTED_MODULE_8__ = __webpack_require__(/*! antd */ "webpack/sharing/consume/default/antd/antd");
/* harmony import */ var _style_index_css__WEBPACK_IMPORTED_MODULE_9__ = __webpack_require__(/*! ../style/index.css */ "./style/index.css");









function formatCategoryLabel(category) {
    return category
        .replace(/[_-]+/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .replace(/\b\w/g, char => char.toUpperCase());
}
const ComponentsPanel = ({ app, componentService, getCurrentBrowserPath }) => {
    const [componentCatalog, setComponentCatalog] = (0,react__WEBPACK_IMPORTED_MODULE_5__.useState)(() => componentService.getComponents());
    const [registeredIds, setRegisteredIds] = (0,react__WEBPACK_IMPORTED_MODULE_5__.useState)(() => new Set(componentService.getComponents().map(component => component._id)));
    const [isModalOpen, setIsModalOpen] = (0,react__WEBPACK_IMPORTED_MODULE_5__.useState)(false);
    const [sourceMode, setSourceMode] = (0,react__WEBPACK_IMPORTED_MODULE_5__.useState)('code');
    const [codeValue, setCodeValue] = (0,react__WEBPACK_IMPORTED_MODULE_5__.useState)('');
    const [urlValue, setUrlValue] = (0,react__WEBPACK_IMPORTED_MODULE_5__.useState)('');
    const [isSubmitting, setIsSubmitting] = (0,react__WEBPACK_IMPORTED_MODULE_5__.useState)(false);
    const stopKeyPropagation = (event) => {
        event.stopPropagation();
    };
    const stopClipboardPropagation = (event) => {
        event.stopPropagation();
    };
    const treeData = (0,react__WEBPACK_IMPORTED_MODULE_5__.useMemo)(() => {
        const categories = new Map();
        for (const component of componentCatalog) {
            const category = component._category || 'uncategorized';
            if (!categories.has(category)) {
                categories.set(category, []);
            }
            categories.get(category).push(component);
        }
        return Array.from(categories.entries()).map(([category, components]) => ({
            title: formatCategoryLabel(category),
            key: `category:${category}`,
            children: components.map(component => ({
                title: component._name,
                key: component._id
            }))
        }));
    }, [componentCatalog]);
    const syncFromService = () => {
        const liveComponents = componentService.getComponents();
        const nextCatalogById = new Map(componentCatalog.map(component => [component._id, component]));
        for (const component of liveComponents) {
            nextCatalogById.set(component._id, component);
        }
        setComponentCatalog(Array.from(nextCatalogById.values()));
        setRegisteredIds(new Set(liveComponents.map(component => component._id)));
        _jupyterlab_apputils__WEBPACK_IMPORTED_MODULE_0__.Notification.success('Components list refreshed.', { autoClose: 2500 });
    };
    const onCheck = checkedKeysValue => {
        const keys = Array.isArray(checkedKeysValue)
            ? checkedKeysValue
            : checkedKeysValue.checked;
        const nextCheckedComponentIds = new Set(keys
            .map(value => String(value))
            .filter(value => componentCatalog.some(component => component._id === value)));
        const currentRegistered = new Set(componentService.getComponents().map(component => component._id));
        const nextCatalogById = new Map(componentCatalog.map(component => [component._id, component]));
        for (const componentId of nextCheckedComponentIds) {
            if (!currentRegistered.has(componentId)) {
                const component = nextCatalogById.get(componentId);
                if (component) {
                    componentService.addComponent(component);
                }
            }
        }
        for (const componentId of currentRegistered) {
            if (!nextCheckedComponentIds.has(componentId)) {
                componentService.removeComponent(componentId);
            }
        }
        setRegisteredIds(nextCheckedComponentIds);
    };
    const openModal = () => {
        setIsModalOpen(true);
    };
    const closeModal = () => {
        setIsModalOpen(false);
        setSourceMode('code');
        setCodeValue('');
        setUrlValue('');
    };
    const registerNewComponent = async () => {
        var _a;
        try {
            setIsSubmitting(true);
            let source = '';
            if (sourceMode === 'code') {
                source = codeValue.trim();
                if (!source) {
                    throw new Error('Please provide component code.');
                }
            }
            else {
                const url = urlValue.trim();
                if (!url) {
                    throw new Error('Please provide a component URL.');
                }
                const response = await fetch(url);
                if (!response.ok) {
                    throw new Error(`Could not load URL (${response.status}).`);
                }
                source = await response.text();
            }
            const currentPath = getCurrentBrowserPath();
            const fileName = `amphi_component_${Date.now()}.tsx`;
            const tempPath = currentPath ? _jupyterlab_coreutils__WEBPACK_IMPORTED_MODULE_1__.PathExt.join(currentPath, fileName) : fileName;
            await app.serviceManager.contents.save(tempPath, {
                type: 'file',
                format: 'text',
                content: source
            });
            try {
                await app.commands.execute('@amphi/pipeline-components-manager:register-tsx', {
                    path: tempPath
                });
            }
            finally {
                // Best-effort cleanup of temporary source file.
                await app.serviceManager.contents.delete(tempPath).catch(() => undefined);
            }
            syncFromService();
            closeModal();
        }
        catch (error) {
            _jupyterlab_apputils__WEBPACK_IMPORTED_MODULE_0__.Notification.error(String((_a = error === null || error === void 0 ? void 0 : error.message) !== null && _a !== void 0 ? _a : error), { autoClose: 5000 });
        }
        finally {
            setIsSubmitting(false);
        }
    };
    return (react__WEBPACK_IMPORTED_MODULE_5___default().createElement(antd__WEBPACK_IMPORTED_MODULE_8__.ConfigProvider, { theme: {
            token: {
                colorPrimary: '#5F9B97'
            }
        } },
        react__WEBPACK_IMPORTED_MODULE_5___default().createElement("div", { className: "amphi-ComponentsPanel" },
            react__WEBPACK_IMPORTED_MODULE_5___default().createElement("div", { className: "amphi-ComponentsPanel__header" },
                react__WEBPACK_IMPORTED_MODULE_5___default().createElement("h3", { className: "amphi-ComponentsPanel__headerTitle" }, "Components"),
                react__WEBPACK_IMPORTED_MODULE_5___default().createElement("div", { className: "amphi-ComponentsPanel__headerSubtitle" }, "Browse categories and enable registered components.")),
            react__WEBPACK_IMPORTED_MODULE_5___default().createElement("div", { className: "amphi-ComponentsPanel__actions" },
                react__WEBPACK_IMPORTED_MODULE_5___default().createElement(antd__WEBPACK_IMPORTED_MODULE_8__.Button, { type: "primary", icon: react__WEBPACK_IMPORTED_MODULE_5___default().createElement(_ant_design_icons__WEBPACK_IMPORTED_MODULE_6__["default"], null), className: "amphi-ComponentsPanel__actionButton", onClick: openModal }, "Add Component"),
                react__WEBPACK_IMPORTED_MODULE_5___default().createElement(antd__WEBPACK_IMPORTED_MODULE_8__.Button, { icon: react__WEBPACK_IMPORTED_MODULE_5___default().createElement(_ant_design_icons__WEBPACK_IMPORTED_MODULE_7__["default"], null), className: "amphi-ComponentsPanel__actionButton", onClick: syncFromService })),
            react__WEBPACK_IMPORTED_MODULE_5___default().createElement("div", { className: "amphi-ComponentsPanel__tree" }, componentCatalog.length === 0 ? (react__WEBPACK_IMPORTED_MODULE_5___default().createElement(antd__WEBPACK_IMPORTED_MODULE_8__.Empty, { description: "No components found" })) : (react__WEBPACK_IMPORTED_MODULE_5___default().createElement(antd__WEBPACK_IMPORTED_MODULE_8__.Tree, { checkable: true, defaultExpandAll: true, checkedKeys: Array.from(registeredIds), onCheck: onCheck, treeData: treeData }))),
            react__WEBPACK_IMPORTED_MODULE_5___default().createElement("div", { className: "amphi-ComponentsPanel__footer" }, "Checked components are registered in the manager."),
            react__WEBPACK_IMPORTED_MODULE_5___default().createElement(antd__WEBPACK_IMPORTED_MODULE_8__.Modal, { title: "Add Component", open: isModalOpen, onOk: registerNewComponent, okText: "Register", confirmLoading: isSubmitting, onCancel: closeModal, destroyOnClose: true },
                react__WEBPACK_IMPORTED_MODULE_5___default().createElement(antd__WEBPACK_IMPORTED_MODULE_8__.Radio.Group, { value: sourceMode, onChange: event => setSourceMode(event.target.value), style: { marginBottom: 12 } },
                    react__WEBPACK_IMPORTED_MODULE_5___default().createElement(antd__WEBPACK_IMPORTED_MODULE_8__.Radio.Button, { value: "code" }, "Code"),
                    react__WEBPACK_IMPORTED_MODULE_5___default().createElement(antd__WEBPACK_IMPORTED_MODULE_8__.Radio.Button, { value: "url" }, "URL")),
                sourceMode === 'code' ? (react__WEBPACK_IMPORTED_MODULE_5___default().createElement(antd__WEBPACK_IMPORTED_MODULE_8__.Input.TextArea, { value: codeValue, onChange: event => setCodeValue(event.target.value), onKeyDown: stopKeyPropagation, onCopy: stopClipboardPropagation, onCut: stopClipboardPropagation, onPaste: stopClipboardPropagation, rows: 12, placeholder: "Paste a component file (.ts or .tsx)." })) : (react__WEBPACK_IMPORTED_MODULE_5___default().createElement(antd__WEBPACK_IMPORTED_MODULE_8__.Input, { value: urlValue, onChange: event => setUrlValue(event.target.value), onKeyDown: stopKeyPropagation, onCopy: stopClipboardPropagation, onCut: stopClipboardPropagation, onPaste: stopClipboardPropagation, placeholder: "https://.../component.tsx" }))))));
};
var CommandIDs;
(function (CommandIDs) {
    CommandIDs.open = 'pipeline-components-panel:open';
})(CommandIDs || (CommandIDs = {}));
const plugin = {
    id: '@amphi/pipeline-components-panel:plugin',
    autoStart: true,
    requires: [_jupyterlab_apputils__WEBPACK_IMPORTED_MODULE_0__.ICommandPalette, _amphi_pipeline_components_manager__WEBPACK_IMPORTED_MODULE_3__.ComponentManager, _jupyterlab_filebrowser__WEBPACK_IMPORTED_MODULE_2__.IDefaultFileBrowser],
    activate: (app, palette, componentService, defaultFileBrowser) => {
        const { commands, shell } = app;
        commands.addCommand(CommandIDs.open, {
            label: 'Pipeline Components',
            caption: 'Manage registered pipeline components',
            execute: () => {
                class ComponentsPanelWidget extends _jupyterlab_apputils__WEBPACK_IMPORTED_MODULE_0__.ReactWidget {
                    constructor() {
                        super();
                        this.id = 'amphi-pipeline-components-panel';
                        this.title.caption = 'Pipeline Components';
                        this.title.icon = _icons__WEBPACK_IMPORTED_MODULE_4__.puzzleIcon;
                        this.title.closable = true;
                    }
                    render() {
                        return (react__WEBPACK_IMPORTED_MODULE_5___default().createElement(ComponentsPanel, { app: app, componentService: componentService, getCurrentBrowserPath: () => defaultFileBrowser.model.path }));
                    }
                }
                let widget;
                for (const item of shell.widgets('left')) {
                    if (item.id === 'amphi-pipeline-components-panel') {
                        widget = item;
                        break;
                    }
                }
                if (!widget || widget.isDisposed) {
                    widget = new ComponentsPanelWidget();
                }
                if (!widget.isAttached) {
                    shell.add(widget, 'left');
                }
                shell.activateById(widget.id);
            }
        });
        palette.addItem({ command: CommandIDs.open, category: 'Amphi' });
        commands.execute(CommandIDs.open);
    }
};
/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = (plugin);


/***/ },

/***/ "./style/index.css"
/*!*************************!*\
  !*** ./style/index.css ***!
  \*************************/
(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__)
/* harmony export */ });
/* harmony import */ var _node_modules_style_loader_dist_runtime_injectStylesIntoStyleTag_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! !../../../node_modules/style-loader/dist/runtime/injectStylesIntoStyleTag.js */ "../../node_modules/style-loader/dist/runtime/injectStylesIntoStyleTag.js");
/* harmony import */ var _node_modules_style_loader_dist_runtime_injectStylesIntoStyleTag_js__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(_node_modules_style_loader_dist_runtime_injectStylesIntoStyleTag_js__WEBPACK_IMPORTED_MODULE_0__);
/* harmony import */ var _node_modules_style_loader_dist_runtime_styleDomAPI_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! !../../../node_modules/style-loader/dist/runtime/styleDomAPI.js */ "../../node_modules/style-loader/dist/runtime/styleDomAPI.js");
/* harmony import */ var _node_modules_style_loader_dist_runtime_styleDomAPI_js__WEBPACK_IMPORTED_MODULE_1___default = /*#__PURE__*/__webpack_require__.n(_node_modules_style_loader_dist_runtime_styleDomAPI_js__WEBPACK_IMPORTED_MODULE_1__);
/* harmony import */ var _node_modules_style_loader_dist_runtime_insertBySelector_js__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! !../../../node_modules/style-loader/dist/runtime/insertBySelector.js */ "../../node_modules/style-loader/dist/runtime/insertBySelector.js");
/* harmony import */ var _node_modules_style_loader_dist_runtime_insertBySelector_js__WEBPACK_IMPORTED_MODULE_2___default = /*#__PURE__*/__webpack_require__.n(_node_modules_style_loader_dist_runtime_insertBySelector_js__WEBPACK_IMPORTED_MODULE_2__);
/* harmony import */ var _node_modules_style_loader_dist_runtime_setAttributesWithoutAttributes_js__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! !../../../node_modules/style-loader/dist/runtime/setAttributesWithoutAttributes.js */ "../../node_modules/style-loader/dist/runtime/setAttributesWithoutAttributes.js");
/* harmony import */ var _node_modules_style_loader_dist_runtime_setAttributesWithoutAttributes_js__WEBPACK_IMPORTED_MODULE_3___default = /*#__PURE__*/__webpack_require__.n(_node_modules_style_loader_dist_runtime_setAttributesWithoutAttributes_js__WEBPACK_IMPORTED_MODULE_3__);
/* harmony import */ var _node_modules_style_loader_dist_runtime_insertStyleElement_js__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(/*! !../../../node_modules/style-loader/dist/runtime/insertStyleElement.js */ "../../node_modules/style-loader/dist/runtime/insertStyleElement.js");
/* harmony import */ var _node_modules_style_loader_dist_runtime_insertStyleElement_js__WEBPACK_IMPORTED_MODULE_4___default = /*#__PURE__*/__webpack_require__.n(_node_modules_style_loader_dist_runtime_insertStyleElement_js__WEBPACK_IMPORTED_MODULE_4__);
/* harmony import */ var _node_modules_style_loader_dist_runtime_styleTagTransform_js__WEBPACK_IMPORTED_MODULE_5__ = __webpack_require__(/*! !../../../node_modules/style-loader/dist/runtime/styleTagTransform.js */ "../../node_modules/style-loader/dist/runtime/styleTagTransform.js");
/* harmony import */ var _node_modules_style_loader_dist_runtime_styleTagTransform_js__WEBPACK_IMPORTED_MODULE_5___default = /*#__PURE__*/__webpack_require__.n(_node_modules_style_loader_dist_runtime_styleTagTransform_js__WEBPACK_IMPORTED_MODULE_5__);
/* harmony import */ var _node_modules_css_loader_dist_cjs_js_index_css__WEBPACK_IMPORTED_MODULE_6__ = __webpack_require__(/*! !!../../../node_modules/css-loader/dist/cjs.js!./index.css */ "../../node_modules/css-loader/dist/cjs.js!./style/index.css");

      
      
      
      
      
      
      
      
      

var options = {};

options.styleTagTransform = (_node_modules_style_loader_dist_runtime_styleTagTransform_js__WEBPACK_IMPORTED_MODULE_5___default());
options.setAttributes = (_node_modules_style_loader_dist_runtime_setAttributesWithoutAttributes_js__WEBPACK_IMPORTED_MODULE_3___default());

      options.insert = _node_modules_style_loader_dist_runtime_insertBySelector_js__WEBPACK_IMPORTED_MODULE_2___default().bind(null, "head");
    
options.domAPI = (_node_modules_style_loader_dist_runtime_styleDomAPI_js__WEBPACK_IMPORTED_MODULE_1___default());
options.insertStyleElement = (_node_modules_style_loader_dist_runtime_insertStyleElement_js__WEBPACK_IMPORTED_MODULE_4___default());

var update = _node_modules_style_loader_dist_runtime_injectStylesIntoStyleTag_js__WEBPACK_IMPORTED_MODULE_0___default()(_node_modules_css_loader_dist_cjs_js_index_css__WEBPACK_IMPORTED_MODULE_6__["default"], options);




       /* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = (_node_modules_css_loader_dist_cjs_js_index_css__WEBPACK_IMPORTED_MODULE_6__["default"] && _node_modules_css_loader_dist_cjs_js_index_css__WEBPACK_IMPORTED_MODULE_6__["default"].locals ? _node_modules_css_loader_dist_cjs_js_index_css__WEBPACK_IMPORTED_MODULE_6__["default"].locals : undefined);


/***/ },

/***/ "./style/icons/puzzle.svg"
/*!********************************!*\
  !*** ./style/icons/puzzle.svg ***!
  \********************************/
(module) {

module.exports = "<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"24\" height=\"24\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\" class=\"icon icon-tabler icons-tabler-outline icon-tabler-puzzle\"><path stroke=\"none\" d=\"M0 0h24v24H0z\" fill=\"none\"/><path d=\"M4 7h3a1 1 0 0 0 1 -1v-1a2 2 0 0 1 4 0v1a1 1 0 0 0 1 1h3a1 1 0 0 1 1 1v3a1 1 0 0 0 1 1h1a2 2 0 0 1 0 4h-1a1 1 0 0 0 -1 1v3a1 1 0 0 1 -1 1h-3a1 1 0 0 1 -1 -1v-1a2 2 0 0 0 -4 0v1a1 1 0 0 1 -1 1h-3a1 1 0 0 1 -1 -1v-3a1 1 0 0 1 1 -1h1a2 2 0 0 0 0 -4h-1a1 1 0 0 1 -1 -1v-3a1 1 0 0 1 1 -1\" /></svg>";

/***/ }

}]);
//# sourceMappingURL=lib_index_js.ef361afcd8cb5972a58e.js.map