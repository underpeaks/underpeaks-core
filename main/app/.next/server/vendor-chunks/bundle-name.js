"use strict";
/*
 * ATTENTION: An "eval-source-map" devtool has been used.
 * This devtool is neither made for production nor for readable output files.
 * It uses "eval()" calls to create a separate source file with attached SourceMaps in the browser devtools.
 * If you are trying to read the output file, select a different devtool (https://webpack.js.org/configuration/devtool/)
 * or disable the default devtool with "devtool: false".
 * If you are looking for production-ready output files, see mode: "production" (https://webpack.js.org/configuration/mode/).
 */
exports.id = "vendor-chunks/bundle-name";
exports.ids = ["vendor-chunks/bundle-name"];
exports.modules = {

/***/ "(rsc)/./node_modules/bundle-name/index.js":
/*!*******************************************!*\
  !*** ./node_modules/bundle-name/index.js ***!
  \*******************************************/
/***/ ((__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) => {

eval("__webpack_require__.r(__webpack_exports__);\n/* harmony export */ __webpack_require__.d(__webpack_exports__, {\n/* harmony export */   \"default\": () => (/* binding */ bundleName)\n/* harmony export */ });\n/* harmony import */ var run_applescript__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! run-applescript */ \"(rsc)/./node_modules/run-applescript/index.js\");\n\n\nasync function bundleName(bundleId) {\n\treturn (0,run_applescript__WEBPACK_IMPORTED_MODULE_0__.runAppleScript)(`tell application \"Finder\" to set app_path to application file id \"${bundleId}\" as string\\ntell application \"System Events\" to get value of property list item \"CFBundleName\" of property list file (app_path & \":Contents:Info.plist\")`);\n}\n//# sourceURL=[module]\n//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiKHJzYykvLi9ub2RlX21vZHVsZXMvYnVuZGxlLW5hbWUvaW5kZXguanMiLCJtYXBwaW5ncyI6Ijs7Ozs7QUFBK0M7O0FBRWhDO0FBQ2YsUUFBUSwrREFBYyxzRUFBc0UsU0FBUztBQUNyRyIsInNvdXJjZXMiOlsiL1VzZXJzL2FudG9ud2VudHplbC9ueHRmbHV0dGVyX2NvcmUvbWFpbi9hcHAvbm9kZV9tb2R1bGVzL2J1bmRsZS1uYW1lL2luZGV4LmpzIl0sInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7cnVuQXBwbGVTY3JpcHR9IGZyb20gJ3J1bi1hcHBsZXNjcmlwdCc7XG5cbmV4cG9ydCBkZWZhdWx0IGFzeW5jIGZ1bmN0aW9uIGJ1bmRsZU5hbWUoYnVuZGxlSWQpIHtcblx0cmV0dXJuIHJ1bkFwcGxlU2NyaXB0KGB0ZWxsIGFwcGxpY2F0aW9uIFwiRmluZGVyXCIgdG8gc2V0IGFwcF9wYXRoIHRvIGFwcGxpY2F0aW9uIGZpbGUgaWQgXCIke2J1bmRsZUlkfVwiIGFzIHN0cmluZ1xcbnRlbGwgYXBwbGljYXRpb24gXCJTeXN0ZW0gRXZlbnRzXCIgdG8gZ2V0IHZhbHVlIG9mIHByb3BlcnR5IGxpc3QgaXRlbSBcIkNGQnVuZGxlTmFtZVwiIG9mIHByb3BlcnR5IGxpc3QgZmlsZSAoYXBwX3BhdGggJiBcIjpDb250ZW50czpJbmZvLnBsaXN0XCIpYCk7XG59XG4iXSwibmFtZXMiOltdLCJpZ25vcmVMaXN0IjpbMF0sInNvdXJjZVJvb3QiOiIifQ==\n//# sourceURL=webpack-internal:///(rsc)/./node_modules/bundle-name/index.js\n");

/***/ })

};
;