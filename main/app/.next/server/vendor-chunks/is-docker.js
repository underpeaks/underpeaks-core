"use strict";
/*
 * ATTENTION: An "eval-source-map" devtool has been used.
 * This devtool is neither made for production nor for readable output files.
 * It uses "eval()" calls to create a separate source file with attached SourceMaps in the browser devtools.
 * If you are trying to read the output file, select a different devtool (https://webpack.js.org/configuration/devtool/)
 * or disable the default devtool with "devtool: false".
 * If you are looking for production-ready output files, see mode: "production" (https://webpack.js.org/configuration/mode/).
 */
exports.id = "vendor-chunks/is-docker";
exports.ids = ["vendor-chunks/is-docker"];
exports.modules = {

/***/ "(rsc)/./node_modules/is-docker/index.js":
/*!*****************************************!*\
  !*** ./node_modules/is-docker/index.js ***!
  \*****************************************/
/***/ ((__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) => {

eval("__webpack_require__.r(__webpack_exports__);\n/* harmony export */ __webpack_require__.d(__webpack_exports__, {\n/* harmony export */   \"default\": () => (/* binding */ isDocker)\n/* harmony export */ });\n/* harmony import */ var node_fs__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! node:fs */ \"node:fs\");\n\n\nlet isDockerCached;\n\nfunction hasDockerEnv() {\n\ttry {\n\t\tnode_fs__WEBPACK_IMPORTED_MODULE_0__.statSync('/.dockerenv');\n\t\treturn true;\n\t} catch {\n\t\treturn false;\n\t}\n}\n\nfunction hasDockerCGroup() {\n\ttry {\n\t\treturn node_fs__WEBPACK_IMPORTED_MODULE_0__.readFileSync('/proc/self/cgroup', 'utf8').includes('docker');\n\t} catch {\n\t\treturn false;\n\t}\n}\n\nfunction isDocker() {\n\t// TODO: Use `??=` when targeting Node.js 16.\n\tif (isDockerCached === undefined) {\n\t\tisDockerCached = hasDockerEnv() || hasDockerCGroup();\n\t}\n\n\treturn isDockerCached;\n}\n//# sourceURL=[module]\n//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiKHJzYykvLi9ub2RlX21vZHVsZXMvaXMtZG9ja2VyL2luZGV4LmpzIiwibWFwcGluZ3MiOiI7Ozs7O0FBQXlCOztBQUV6Qjs7QUFFQTtBQUNBO0FBQ0EsRUFBRSw2Q0FBVztBQUNiO0FBQ0EsR0FBRztBQUNIO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0EsU0FBUyxpREFBZTtBQUN4QixHQUFHO0FBQ0g7QUFDQTtBQUNBOztBQUVlO0FBQ2Y7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQSIsInNvdXJjZXMiOlsiL1VzZXJzL2FudG9ud2VudHplbC9ueHRmbHV0dGVyX2NvcmUvbWFpbi9hcHAvbm9kZV9tb2R1bGVzL2lzLWRvY2tlci9pbmRleC5qcyJdLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgZnMgZnJvbSAnbm9kZTpmcyc7XG5cbmxldCBpc0RvY2tlckNhY2hlZDtcblxuZnVuY3Rpb24gaGFzRG9ja2VyRW52KCkge1xuXHR0cnkge1xuXHRcdGZzLnN0YXRTeW5jKCcvLmRvY2tlcmVudicpO1xuXHRcdHJldHVybiB0cnVlO1xuXHR9IGNhdGNoIHtcblx0XHRyZXR1cm4gZmFsc2U7XG5cdH1cbn1cblxuZnVuY3Rpb24gaGFzRG9ja2VyQ0dyb3VwKCkge1xuXHR0cnkge1xuXHRcdHJldHVybiBmcy5yZWFkRmlsZVN5bmMoJy9wcm9jL3NlbGYvY2dyb3VwJywgJ3V0ZjgnKS5pbmNsdWRlcygnZG9ja2VyJyk7XG5cdH0gY2F0Y2gge1xuXHRcdHJldHVybiBmYWxzZTtcblx0fVxufVxuXG5leHBvcnQgZGVmYXVsdCBmdW5jdGlvbiBpc0RvY2tlcigpIHtcblx0Ly8gVE9ETzogVXNlIGA/Pz1gIHdoZW4gdGFyZ2V0aW5nIE5vZGUuanMgMTYuXG5cdGlmIChpc0RvY2tlckNhY2hlZCA9PT0gdW5kZWZpbmVkKSB7XG5cdFx0aXNEb2NrZXJDYWNoZWQgPSBoYXNEb2NrZXJFbnYoKSB8fCBoYXNEb2NrZXJDR3JvdXAoKTtcblx0fVxuXG5cdHJldHVybiBpc0RvY2tlckNhY2hlZDtcbn1cbiJdLCJuYW1lcyI6W10sImlnbm9yZUxpc3QiOlswXSwic291cmNlUm9vdCI6IiJ9\n//# sourceURL=webpack-internal:///(rsc)/./node_modules/is-docker/index.js\n");

/***/ })

};
;