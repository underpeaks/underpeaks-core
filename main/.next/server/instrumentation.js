"use strict";
/*
 * ATTENTION: An "eval-source-map" devtool has been used.
 * This devtool is neither made for production nor for readable output files.
 * It uses "eval()" calls to create a separate source file with attached SourceMaps in the browser devtools.
 * If you are trying to read the output file, select a different devtool (https://webpack.js.org/configuration/devtool/)
 * or disable the default devtool with "devtool: false".
 * If you are looking for production-ready output files, see mode: "production" (https://webpack.js.org/configuration/mode/).
 */
(() => {
var exports = {};
exports.id = "instrumentation";
exports.ids = ["instrumentation"];
exports.modules = {

/***/ "(instrument)/./instrumentation.ts":
/*!****************************!*\
  !*** ./instrumentation.ts ***!
  \****************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

eval("__webpack_require__.r(__webpack_exports__);\n/* harmony export */ __webpack_require__.d(__webpack_exports__, {\n/* harmony export */   register: () => (/* binding */ register)\n/* harmony export */ });\n// instrumentation.ts (Core root — same level as package.json)\nasync function register() {\n    if (true) {\n        const { startPhoneHome } = await __webpack_require__.e(/*! import() */ \"_instrument_app_lib_licensePhoneHome_ts\").then(__webpack_require__.bind(__webpack_require__, /*! ./app/lib/licensePhoneHome */ \"(instrument)/./app/lib/licensePhoneHome.ts\"));\n        startPhoneHome();\n    }\n}\n//# sourceURL=[module]\n//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiKGluc3RydW1lbnQpLy4vaW5zdHJ1bWVudGF0aW9uLnRzIiwibWFwcGluZ3MiOiI7Ozs7QUFBQSw4REFBOEQ7QUFDdkQsZUFBZUE7SUFDcEIsSUFBSUMsSUFBcUMsRUFBRTtRQUN6QyxNQUFNLEVBQUVHLGNBQWMsRUFBRSxHQUFHLE1BQU0sb05BQW9DO1FBQ3JFQTtJQUNGO0FBQ0YiLCJzb3VyY2VzIjpbIkQ6XFxOWFRGTFVUVEVSX0NPUkVcXE5YVEZsdXR0ZXJfQ29yZVxcbWFpblxcaW5zdHJ1bWVudGF0aW9uLnRzIl0sInNvdXJjZXNDb250ZW50IjpbIi8vIGluc3RydW1lbnRhdGlvbi50cyAoQ29yZSByb290IOKAlCBzYW1lIGxldmVsIGFzIHBhY2thZ2UuanNvbilcclxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIHJlZ2lzdGVyKCkge1xyXG4gIGlmIChwcm9jZXNzLmVudi5ORVhUX1JVTlRJTUUgPT09ICdub2RlanMnKSB7XHJcbiAgICBjb25zdCB7IHN0YXJ0UGhvbmVIb21lIH0gPSBhd2FpdCBpbXBvcnQoJy4vYXBwL2xpYi9saWNlbnNlUGhvbmVIb21lJylcclxuICAgIHN0YXJ0UGhvbmVIb21lKClcclxuICB9XHJcbn0iXSwibmFtZXMiOlsicmVnaXN0ZXIiLCJwcm9jZXNzIiwiZW52IiwiTkVYVF9SVU5USU1FIiwic3RhcnRQaG9uZUhvbWUiXSwiaWdub3JlTGlzdCI6W10sInNvdXJjZVJvb3QiOiIifQ==\n//# sourceURL=webpack-internal:///(instrument)/./instrumentation.ts\n");

/***/ }),

/***/ "fs":
/*!*********************!*\
  !*** external "fs" ***!
  \*********************/
/***/ ((module) => {

module.exports = require("fs");

/***/ }),

/***/ "path":
/*!***********************!*\
  !*** external "path" ***!
  \***********************/
/***/ ((module) => {

module.exports = require("path");

/***/ })

};
;

// load runtime
var __webpack_require__ = require("./webpack-runtime.js");
__webpack_require__.C(exports);
var __webpack_exec__ = (moduleId) => (__webpack_require__(__webpack_require__.s = moduleId))
var __webpack_exports__ = (__webpack_exec__("(instrument)/./instrumentation.ts"));
module.exports = __webpack_exports__;

})();