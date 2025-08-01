"use strict";
/*
 * ATTENTION: An "eval-source-map" devtool has been used.
 * This devtool is neither made for production nor for readable output files.
 * It uses "eval()" calls to create a separate source file with attached SourceMaps in the browser devtools.
 * If you are trying to read the output file, select a different devtool (https://webpack.js.org/configuration/devtool/)
 * or disable the default devtool with "devtool: false".
 * If you are looking for production-ready output files, see mode: "production" (https://webpack.js.org/configuration/mode/).
 */
exports.id = "vendor-chunks/default-browser-id";
exports.ids = ["vendor-chunks/default-browser-id"];
exports.modules = {

/***/ "(rsc)/./node_modules/default-browser-id/index.js":
/*!**************************************************!*\
  !*** ./node_modules/default-browser-id/index.js ***!
  \**************************************************/
/***/ ((__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) => {

eval("__webpack_require__.r(__webpack_exports__);\n/* harmony export */ __webpack_require__.d(__webpack_exports__, {\n/* harmony export */   \"default\": () => (/* binding */ defaultBrowserId)\n/* harmony export */ });\n/* harmony import */ var node_util__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! node:util */ \"node:util\");\n/* harmony import */ var node_process__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! node:process */ \"node:process\");\n/* harmony import */ var node_child_process__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! node:child_process */ \"node:child_process\");\n\n\n\n\nconst execFileAsync = (0,node_util__WEBPACK_IMPORTED_MODULE_0__.promisify)(node_child_process__WEBPACK_IMPORTED_MODULE_2__.execFile);\n\nasync function defaultBrowserId() {\n\tif (node_process__WEBPACK_IMPORTED_MODULE_1__.platform !== 'darwin') {\n\t\tthrow new Error('macOS only');\n\t}\n\n\tconst {stdout} = await execFileAsync('defaults', ['read', 'com.apple.LaunchServices/com.apple.launchservices.secure', 'LSHandlers']);\n\n\t// `(?!-)` is to prevent matching `LSHandlerRoleAll = \"-\";`.\n\tconst match = /LSHandlerRoleAll = \"(?!-)(?<id>[^\"]+?)\";\\s+?LSHandlerURLScheme = (?:http|https);/.exec(stdout);\n\n\treturn match?.groups.id ?? 'com.apple.Safari';\n}\n//# sourceURL=[module]\n//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiKHJzYykvLi9ub2RlX21vZHVsZXMvZGVmYXVsdC1icm93c2VyLWlkL2luZGV4LmpzIiwibWFwcGluZ3MiOiI7Ozs7Ozs7QUFBb0M7QUFDRDtBQUNTOztBQUU1QyxzQkFBc0Isb0RBQVMsQ0FBQyx3REFBUTs7QUFFekI7QUFDZixLQUFLLGtEQUFnQjtBQUNyQjtBQUNBOztBQUVBLFFBQVEsUUFBUTs7QUFFaEIsMkRBQTJEO0FBQzNELHdEQUF3RCx3Q0FBd0M7O0FBRWhHO0FBQ0EiLCJzb3VyY2VzIjpbIi9Vc2Vycy9hbnRvbndlbnR6ZWwvbnh0Zmx1dHRlcl9jb3JlL21haW4vYXBwL25vZGVfbW9kdWxlcy9kZWZhdWx0LWJyb3dzZXItaWQvaW5kZXguanMiXSwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHtwcm9taXNpZnl9IGZyb20gJ25vZGU6dXRpbCc7XG5pbXBvcnQgcHJvY2VzcyBmcm9tICdub2RlOnByb2Nlc3MnO1xuaW1wb3J0IHtleGVjRmlsZX0gZnJvbSAnbm9kZTpjaGlsZF9wcm9jZXNzJztcblxuY29uc3QgZXhlY0ZpbGVBc3luYyA9IHByb21pc2lmeShleGVjRmlsZSk7XG5cbmV4cG9ydCBkZWZhdWx0IGFzeW5jIGZ1bmN0aW9uIGRlZmF1bHRCcm93c2VySWQoKSB7XG5cdGlmIChwcm9jZXNzLnBsYXRmb3JtICE9PSAnZGFyd2luJykge1xuXHRcdHRocm93IG5ldyBFcnJvcignbWFjT1Mgb25seScpO1xuXHR9XG5cblx0Y29uc3Qge3N0ZG91dH0gPSBhd2FpdCBleGVjRmlsZUFzeW5jKCdkZWZhdWx0cycsIFsncmVhZCcsICdjb20uYXBwbGUuTGF1bmNoU2VydmljZXMvY29tLmFwcGxlLmxhdW5jaHNlcnZpY2VzLnNlY3VyZScsICdMU0hhbmRsZXJzJ10pO1xuXG5cdC8vIGAoPyEtKWAgaXMgdG8gcHJldmVudCBtYXRjaGluZyBgTFNIYW5kbGVyUm9sZUFsbCA9IFwiLVwiO2AuXG5cdGNvbnN0IG1hdGNoID0gL0xTSGFuZGxlclJvbGVBbGwgPSBcIig/IS0pKD88aWQ+W15cIl0rPylcIjtcXHMrP0xTSGFuZGxlclVSTFNjaGVtZSA9ICg/Omh0dHB8aHR0cHMpOy8uZXhlYyhzdGRvdXQpO1xuXG5cdHJldHVybiBtYXRjaD8uZ3JvdXBzLmlkID8/ICdjb20uYXBwbGUuU2FmYXJpJztcbn1cbiJdLCJuYW1lcyI6W10sImlnbm9yZUxpc3QiOlswXSwic291cmNlUm9vdCI6IiJ9\n//# sourceURL=webpack-internal:///(rsc)/./node_modules/default-browser-id/index.js\n");

/***/ })

};
;