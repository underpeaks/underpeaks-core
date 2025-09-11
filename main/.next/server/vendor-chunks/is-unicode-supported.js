"use strict";
/*
 * ATTENTION: An "eval-source-map" devtool has been used.
 * This devtool is neither made for production nor for readable output files.
 * It uses "eval()" calls to create a separate source file with attached SourceMaps in the browser devtools.
 * If you are trying to read the output file, select a different devtool (https://webpack.js.org/configuration/devtool/)
 * or disable the default devtool with "devtool: false".
 * If you are looking for production-ready output files, see mode: "production" (https://webpack.js.org/configuration/mode/).
 */
exports.id = "vendor-chunks/is-unicode-supported";
exports.ids = ["vendor-chunks/is-unicode-supported"];
exports.modules = {

/***/ "(rsc)/./node_modules/is-unicode-supported/index.js":
/*!****************************************************!*\
  !*** ./node_modules/is-unicode-supported/index.js ***!
  \****************************************************/
/***/ ((__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) => {

eval("__webpack_require__.r(__webpack_exports__);\n/* harmony export */ __webpack_require__.d(__webpack_exports__, {\n/* harmony export */   \"default\": () => (/* binding */ isUnicodeSupported)\n/* harmony export */ });\n/* harmony import */ var node_process__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! node:process */ \"node:process\");\n\n\nfunction isUnicodeSupported() {\n\tconst {env} = node_process__WEBPACK_IMPORTED_MODULE_0__;\n\tconst {TERM, TERM_PROGRAM} = env;\n\n\tif (node_process__WEBPACK_IMPORTED_MODULE_0__.platform !== 'win32') {\n\t\treturn TERM !== 'linux'; // Linux console (kernel)\n\t}\n\n\treturn Boolean(env.WT_SESSION) // Windows Terminal\n\t\t|| Boolean(env.TERMINUS_SUBLIME) // Terminus (<0.2.27)\n\t\t|| env.ConEmuTask === '{cmd::Cmder}' // ConEmu and cmder\n\t\t|| TERM_PROGRAM === 'Terminus-Sublime'\n\t\t|| TERM_PROGRAM === 'vscode'\n\t\t|| TERM === 'xterm-256color'\n\t\t|| TERM === 'alacritty'\n\t\t|| TERM === 'rxvt-unicode'\n\t\t|| TERM === 'rxvt-unicode-256color'\n\t\t|| env.TERMINAL_EMULATOR === 'JetBrains-JediTerm';\n}\n//# sourceURL=[module]\n//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiKHJzYykvLi9ub2RlX21vZHVsZXMvaXMtdW5pY29kZS1zdXBwb3J0ZWQvaW5kZXguanMiLCJtYXBwaW5ncyI6Ijs7Ozs7QUFBbUM7O0FBRXBCO0FBQ2YsUUFBUSxLQUFLLEVBQUUseUNBQU87QUFDdEIsUUFBUSxvQkFBb0I7O0FBRTVCLEtBQUssa0RBQWdCO0FBQ3JCLDJCQUEyQjtBQUMzQjs7QUFFQTtBQUNBO0FBQ0EsMEJBQTBCLFdBQVc7QUFDckM7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSIsInNvdXJjZXMiOlsiQzpcXFVzZXJzXFxBbnRvbldlbnR6ZWxcXERlc2t0b3BcXG54dF9mbHV0dGVyXFxOWFRGbHV0dGVyX0NvcmVcXG1haW5cXG5vZGVfbW9kdWxlc1xcaXMtdW5pY29kZS1zdXBwb3J0ZWRcXGluZGV4LmpzIl0sInNvdXJjZXNDb250ZW50IjpbImltcG9ydCBwcm9jZXNzIGZyb20gJ25vZGU6cHJvY2Vzcyc7XG5cbmV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uIGlzVW5pY29kZVN1cHBvcnRlZCgpIHtcblx0Y29uc3Qge2Vudn0gPSBwcm9jZXNzO1xuXHRjb25zdCB7VEVSTSwgVEVSTV9QUk9HUkFNfSA9IGVudjtcblxuXHRpZiAocHJvY2Vzcy5wbGF0Zm9ybSAhPT0gJ3dpbjMyJykge1xuXHRcdHJldHVybiBURVJNICE9PSAnbGludXgnOyAvLyBMaW51eCBjb25zb2xlIChrZXJuZWwpXG5cdH1cblxuXHRyZXR1cm4gQm9vbGVhbihlbnYuV1RfU0VTU0lPTikgLy8gV2luZG93cyBUZXJtaW5hbFxuXHRcdHx8IEJvb2xlYW4oZW52LlRFUk1JTlVTX1NVQkxJTUUpIC8vIFRlcm1pbnVzICg8MC4yLjI3KVxuXHRcdHx8IGVudi5Db25FbXVUYXNrID09PSAne2NtZDo6Q21kZXJ9JyAvLyBDb25FbXUgYW5kIGNtZGVyXG5cdFx0fHwgVEVSTV9QUk9HUkFNID09PSAnVGVybWludXMtU3VibGltZSdcblx0XHR8fCBURVJNX1BST0dSQU0gPT09ICd2c2NvZGUnXG5cdFx0fHwgVEVSTSA9PT0gJ3h0ZXJtLTI1NmNvbG9yJ1xuXHRcdHx8IFRFUk0gPT09ICdhbGFjcml0dHknXG5cdFx0fHwgVEVSTSA9PT0gJ3J4dnQtdW5pY29kZSdcblx0XHR8fCBURVJNID09PSAncnh2dC11bmljb2RlLTI1NmNvbG9yJ1xuXHRcdHx8IGVudi5URVJNSU5BTF9FTVVMQVRPUiA9PT0gJ0pldEJyYWlucy1KZWRpVGVybSc7XG59XG4iXSwibmFtZXMiOltdLCJpZ25vcmVMaXN0IjpbMF0sInNvdXJjZVJvb3QiOiIifQ==\n//# sourceURL=webpack-internal:///(rsc)/./node_modules/is-unicode-supported/index.js\n");

/***/ })

};
;