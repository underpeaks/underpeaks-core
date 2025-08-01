"use strict";
/*
 * ATTENTION: An "eval-source-map" devtool has been used.
 * This devtool is neither made for production nor for readable output files.
 * It uses "eval()" calls to create a separate source file with attached SourceMaps in the browser devtools.
 * If you are trying to read the output file, select a different devtool (https://webpack.js.org/configuration/devtool/)
 * or disable the default devtool with "devtool: false".
 * If you are looking for production-ready output files, see mode: "production" (https://webpack.js.org/configuration/mode/).
 */
exports.id = "vendor-chunks/is-inside-container";
exports.ids = ["vendor-chunks/is-inside-container"];
exports.modules = {

/***/ "(rsc)/./node_modules/is-inside-container/index.js":
/*!***************************************************!*\
  !*** ./node_modules/is-inside-container/index.js ***!
  \***************************************************/
/***/ ((__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) => {

eval("__webpack_require__.r(__webpack_exports__);\n/* harmony export */ __webpack_require__.d(__webpack_exports__, {\n/* harmony export */   \"default\": () => (/* binding */ isInsideContainer)\n/* harmony export */ });\n/* harmony import */ var node_fs__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! node:fs */ \"node:fs\");\n/* harmony import */ var is_docker__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! is-docker */ \"(rsc)/./node_modules/is-docker/index.js\");\n\n\n\nlet cachedResult;\n\n// Podman detection\nconst hasContainerEnv = () => {\n\ttry {\n\t\tnode_fs__WEBPACK_IMPORTED_MODULE_0__.statSync('/run/.containerenv');\n\t\treturn true;\n\t} catch {\n\t\treturn false;\n\t}\n};\n\nfunction isInsideContainer() {\n\t// TODO: Use `??=` when targeting Node.js 16.\n\tif (cachedResult === undefined) {\n\t\tcachedResult = hasContainerEnv() || (0,is_docker__WEBPACK_IMPORTED_MODULE_1__[\"default\"])();\n\t}\n\n\treturn cachedResult;\n}\n//# sourceURL=[module]\n//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiKHJzYykvLi9ub2RlX21vZHVsZXMvaXMtaW5zaWRlLWNvbnRhaW5lci9pbmRleC5qcyIsIm1hcHBpbmdzIjoiOzs7Ozs7QUFBeUI7QUFDUTs7QUFFakM7O0FBRUE7QUFDQTtBQUNBO0FBQ0EsRUFBRSw2Q0FBVztBQUNiO0FBQ0EsR0FBRztBQUNIO0FBQ0E7QUFDQTs7QUFFZTtBQUNmO0FBQ0E7QUFDQSxzQ0FBc0MscURBQVE7QUFDOUM7O0FBRUE7QUFDQSIsInNvdXJjZXMiOlsiL1VzZXJzL2FudG9ud2VudHplbC9ueHRmbHV0dGVyX2NvcmUvbWFpbi9hcHAvbm9kZV9tb2R1bGVzL2lzLWluc2lkZS1jb250YWluZXIvaW5kZXguanMiXSwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IGZzIGZyb20gJ25vZGU6ZnMnO1xuaW1wb3J0IGlzRG9ja2VyIGZyb20gJ2lzLWRvY2tlcic7XG5cbmxldCBjYWNoZWRSZXN1bHQ7XG5cbi8vIFBvZG1hbiBkZXRlY3Rpb25cbmNvbnN0IGhhc0NvbnRhaW5lckVudiA9ICgpID0+IHtcblx0dHJ5IHtcblx0XHRmcy5zdGF0U3luYygnL3J1bi8uY29udGFpbmVyZW52Jyk7XG5cdFx0cmV0dXJuIHRydWU7XG5cdH0gY2F0Y2gge1xuXHRcdHJldHVybiBmYWxzZTtcblx0fVxufTtcblxuZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24gaXNJbnNpZGVDb250YWluZXIoKSB7XG5cdC8vIFRPRE86IFVzZSBgPz89YCB3aGVuIHRhcmdldGluZyBOb2RlLmpzIDE2LlxuXHRpZiAoY2FjaGVkUmVzdWx0ID09PSB1bmRlZmluZWQpIHtcblx0XHRjYWNoZWRSZXN1bHQgPSBoYXNDb250YWluZXJFbnYoKSB8fCBpc0RvY2tlcigpO1xuXHR9XG5cblx0cmV0dXJuIGNhY2hlZFJlc3VsdDtcbn1cbiJdLCJuYW1lcyI6W10sImlnbm9yZUxpc3QiOlswXSwic291cmNlUm9vdCI6IiJ9\n//# sourceURL=webpack-internal:///(rsc)/./node_modules/is-inside-container/index.js\n");

/***/ })

};
;