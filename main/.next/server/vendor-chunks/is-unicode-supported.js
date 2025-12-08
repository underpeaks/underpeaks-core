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

eval("__webpack_require__.r(__webpack_exports__);\n/* harmony export */ __webpack_require__.d(__webpack_exports__, {\n/* harmony export */   \"default\": () => (/* binding */ isUnicodeSupported)\n/* harmony export */ });\n/* harmony import */ var node_process__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! node:process */ \"node:process\");\n\n\nfunction isUnicodeSupported() {\n\tconst {env} = node_process__WEBPACK_IMPORTED_MODULE_0__;\n\tconst {TERM, TERM_PROGRAM} = env;\n\n\tif (node_process__WEBPACK_IMPORTED_MODULE_0__.platform !== 'win32') {\n\t\treturn TERM !== 'linux'; // Linux console (kernel)\n\t}\n\n\treturn Boolean(env.WT_SESSION) // Windows Terminal\n\t\t|| Boolean(env.TERMINUS_SUBLIME) // Terminus (<0.2.27)\n\t\t|| env.ConEmuTask === '{cmd::Cmder}' // ConEmu and cmder\n\t\t|| TERM_PROGRAM === 'Terminus-Sublime'\n\t\t|| TERM_PROGRAM === 'vscode'\n\t\t|| TERM === 'xterm-256color'\n\t\t|| TERM === 'alacritty'\n\t\t|| TERM === 'rxvt-unicode'\n\t\t|| TERM === 'rxvt-unicode-256color'\n\t\t|| env.TERMINAL_EMULATOR === 'JetBrains-JediTerm';\n}\n//# sourceURL=[module]\n//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiKHJzYykvLi9ub2RlX21vZHVsZXMvaXMtdW5pY29kZS1zdXBwb3J0ZWQvaW5kZXguanMiLCJtYXBwaW5ncyI6Ijs7Ozs7QUFBbUM7O0FBRXBCO0FBQ2YsUUFBUSxLQUFLLEVBQUUseUNBQU87QUFDdEIsUUFBUSxvQkFBb0I7O0FBRTVCLEtBQUssa0RBQWdCO0FBQ3JCLDJCQUEyQjtBQUMzQjs7QUFFQTtBQUNBO0FBQ0EsMEJBQTBCLFdBQVc7QUFDckM7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSIsInNvdXJjZXMiOlsiRDpcXE5YVEZMVVRURVJfQ09SRVxcTlhURmx1dHRlcl9Db3JlXFxtYWluXFxub2RlX21vZHVsZXNcXGlzLXVuaWNvZGUtc3VwcG9ydGVkXFxpbmRleC5qcyJdLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgcHJvY2VzcyBmcm9tICdub2RlOnByb2Nlc3MnO1xuXG5leHBvcnQgZGVmYXVsdCBmdW5jdGlvbiBpc1VuaWNvZGVTdXBwb3J0ZWQoKSB7XG5cdGNvbnN0IHtlbnZ9ID0gcHJvY2Vzcztcblx0Y29uc3Qge1RFUk0sIFRFUk1fUFJPR1JBTX0gPSBlbnY7XG5cblx0aWYgKHByb2Nlc3MucGxhdGZvcm0gIT09ICd3aW4zMicpIHtcblx0XHRyZXR1cm4gVEVSTSAhPT0gJ2xpbnV4JzsgLy8gTGludXggY29uc29sZSAoa2VybmVsKVxuXHR9XG5cblx0cmV0dXJuIEJvb2xlYW4oZW52LldUX1NFU1NJT04pIC8vIFdpbmRvd3MgVGVybWluYWxcblx0XHR8fCBCb29sZWFuKGVudi5URVJNSU5VU19TVUJMSU1FKSAvLyBUZXJtaW51cyAoPDAuMi4yNylcblx0XHR8fCBlbnYuQ29uRW11VGFzayA9PT0gJ3tjbWQ6OkNtZGVyfScgLy8gQ29uRW11IGFuZCBjbWRlclxuXHRcdHx8IFRFUk1fUFJPR1JBTSA9PT0gJ1Rlcm1pbnVzLVN1YmxpbWUnXG5cdFx0fHwgVEVSTV9QUk9HUkFNID09PSAndnNjb2RlJ1xuXHRcdHx8IFRFUk0gPT09ICd4dGVybS0yNTZjb2xvcidcblx0XHR8fCBURVJNID09PSAnYWxhY3JpdHR5J1xuXHRcdHx8IFRFUk0gPT09ICdyeHZ0LXVuaWNvZGUnXG5cdFx0fHwgVEVSTSA9PT0gJ3J4dnQtdW5pY29kZS0yNTZjb2xvcidcblx0XHR8fCBlbnYuVEVSTUlOQUxfRU1VTEFUT1IgPT09ICdKZXRCcmFpbnMtSmVkaVRlcm0nO1xufVxuIl0sIm5hbWVzIjpbXSwiaWdub3JlTGlzdCI6WzBdLCJzb3VyY2VSb290IjoiIn0=\n//# sourceURL=webpack-internal:///(rsc)/./node_modules/is-unicode-supported/index.js\n");

/***/ })

};
;