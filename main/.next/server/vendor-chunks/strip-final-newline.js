"use strict";
/*
 * ATTENTION: An "eval-source-map" devtool has been used.
 * This devtool is neither made for production nor for readable output files.
 * It uses "eval()" calls to create a separate source file with attached SourceMaps in the browser devtools.
 * If you are trying to read the output file, select a different devtool (https://webpack.js.org/configuration/devtool/)
 * or disable the default devtool with "devtool: false".
 * If you are looking for production-ready output files, see mode: "production" (https://webpack.js.org/configuration/mode/).
 */
exports.id = "vendor-chunks/strip-final-newline";
exports.ids = ["vendor-chunks/strip-final-newline"];
exports.modules = {

/***/ "(rsc)/./node_modules/strip-final-newline/index.js":
/*!***************************************************!*\
  !*** ./node_modules/strip-final-newline/index.js ***!
  \***************************************************/
/***/ ((__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) => {

eval("__webpack_require__.r(__webpack_exports__);\n/* harmony export */ __webpack_require__.d(__webpack_exports__, {\n/* harmony export */   \"default\": () => (/* binding */ stripFinalNewline)\n/* harmony export */ });\nfunction stripFinalNewline(input) {\n\tif (typeof input === 'string') {\n\t\treturn stripFinalNewlineString(input);\n\t}\n\n\tif (!(ArrayBuffer.isView(input) && input.BYTES_PER_ELEMENT === 1)) {\n\t\tthrow new Error('Input must be a string or a Uint8Array');\n\t}\n\n\treturn stripFinalNewlineBinary(input);\n}\n\nconst stripFinalNewlineString = input =>\n\tinput.at(-1) === LF\n\t\t? input.slice(0, input.at(-2) === CR ? -2 : -1)\n\t\t: input;\n\nconst stripFinalNewlineBinary = input =>\n\tinput.at(-1) === LF_BINARY\n\t\t? input.subarray(0, input.at(-2) === CR_BINARY ? -2 : -1)\n\t\t: input;\n\nconst LF = '\\n';\nconst LF_BINARY = LF.codePointAt(0);\nconst CR = '\\r';\nconst CR_BINARY = CR.codePointAt(0);\n//# sourceURL=[module]\n//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiKHJzYykvLi9ub2RlX21vZHVsZXMvc3RyaXAtZmluYWwtbmV3bGluZS9pbmRleC5qcyIsIm1hcHBpbmdzIjoiOzs7O0FBQWU7QUFDZjtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBOztBQUVBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0EiLCJzb3VyY2VzIjpbIi9Vc2Vycy9hbnRvbndlbnR6ZWwvbnh0Zmx1dHRlcl9jb3JlL21haW4vbm9kZV9tb2R1bGVzL3N0cmlwLWZpbmFsLW5ld2xpbmUvaW5kZXguanMiXSwic291cmNlc0NvbnRlbnQiOlsiZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24gc3RyaXBGaW5hbE5ld2xpbmUoaW5wdXQpIHtcblx0aWYgKHR5cGVvZiBpbnB1dCA9PT0gJ3N0cmluZycpIHtcblx0XHRyZXR1cm4gc3RyaXBGaW5hbE5ld2xpbmVTdHJpbmcoaW5wdXQpO1xuXHR9XG5cblx0aWYgKCEoQXJyYXlCdWZmZXIuaXNWaWV3KGlucHV0KSAmJiBpbnB1dC5CWVRFU19QRVJfRUxFTUVOVCA9PT0gMSkpIHtcblx0XHR0aHJvdyBuZXcgRXJyb3IoJ0lucHV0IG11c3QgYmUgYSBzdHJpbmcgb3IgYSBVaW50OEFycmF5Jyk7XG5cdH1cblxuXHRyZXR1cm4gc3RyaXBGaW5hbE5ld2xpbmVCaW5hcnkoaW5wdXQpO1xufVxuXG5jb25zdCBzdHJpcEZpbmFsTmV3bGluZVN0cmluZyA9IGlucHV0ID0+XG5cdGlucHV0LmF0KC0xKSA9PT0gTEZcblx0XHQ/IGlucHV0LnNsaWNlKDAsIGlucHV0LmF0KC0yKSA9PT0gQ1IgPyAtMiA6IC0xKVxuXHRcdDogaW5wdXQ7XG5cbmNvbnN0IHN0cmlwRmluYWxOZXdsaW5lQmluYXJ5ID0gaW5wdXQgPT5cblx0aW5wdXQuYXQoLTEpID09PSBMRl9CSU5BUllcblx0XHQ/IGlucHV0LnN1YmFycmF5KDAsIGlucHV0LmF0KC0yKSA9PT0gQ1JfQklOQVJZID8gLTIgOiAtMSlcblx0XHQ6IGlucHV0O1xuXG5jb25zdCBMRiA9ICdcXG4nO1xuY29uc3QgTEZfQklOQVJZID0gTEYuY29kZVBvaW50QXQoMCk7XG5jb25zdCBDUiA9ICdcXHInO1xuY29uc3QgQ1JfQklOQVJZID0gQ1IuY29kZVBvaW50QXQoMCk7XG4iXSwibmFtZXMiOltdLCJpZ25vcmVMaXN0IjpbMF0sInNvdXJjZVJvb3QiOiIifQ==\n//# sourceURL=webpack-internal:///(rsc)/./node_modules/strip-final-newline/index.js\n");

/***/ })

};
;