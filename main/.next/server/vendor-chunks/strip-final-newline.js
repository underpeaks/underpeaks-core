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

eval("__webpack_require__.r(__webpack_exports__);\n/* harmony export */ __webpack_require__.d(__webpack_exports__, {\n/* harmony export */   \"default\": () => (/* binding */ stripFinalNewline)\n/* harmony export */ });\nfunction stripFinalNewline(input) {\n\tif (typeof input === 'string') {\n\t\treturn stripFinalNewlineString(input);\n\t}\n\n\tif (!(ArrayBuffer.isView(input) && input.BYTES_PER_ELEMENT === 1)) {\n\t\tthrow new Error('Input must be a string or a Uint8Array');\n\t}\n\n\treturn stripFinalNewlineBinary(input);\n}\n\nconst stripFinalNewlineString = input =>\n\tinput.at(-1) === LF\n\t\t? input.slice(0, input.at(-2) === CR ? -2 : -1)\n\t\t: input;\n\nconst stripFinalNewlineBinary = input =>\n\tinput.at(-1) === LF_BINARY\n\t\t? input.subarray(0, input.at(-2) === CR_BINARY ? -2 : -1)\n\t\t: input;\n\nconst LF = '\\n';\nconst LF_BINARY = LF.codePointAt(0);\nconst CR = '\\r';\nconst CR_BINARY = CR.codePointAt(0);\n//# sourceURL=[module]\n//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiKHJzYykvLi9ub2RlX21vZHVsZXMvc3RyaXAtZmluYWwtbmV3bGluZS9pbmRleC5qcyIsIm1hcHBpbmdzIjoiOzs7O0FBQWU7QUFDZjtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBOztBQUVBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0EiLCJzb3VyY2VzIjpbIkQ6XFxOWFRGTFVUVEVSX0NPUkVcXE5YVEZsdXR0ZXJfQ29yZVxcbWFpblxcbm9kZV9tb2R1bGVzXFxzdHJpcC1maW5hbC1uZXdsaW5lXFxpbmRleC5qcyJdLCJzb3VyY2VzQ29udGVudCI6WyJleHBvcnQgZGVmYXVsdCBmdW5jdGlvbiBzdHJpcEZpbmFsTmV3bGluZShpbnB1dCkge1xuXHRpZiAodHlwZW9mIGlucHV0ID09PSAnc3RyaW5nJykge1xuXHRcdHJldHVybiBzdHJpcEZpbmFsTmV3bGluZVN0cmluZyhpbnB1dCk7XG5cdH1cblxuXHRpZiAoIShBcnJheUJ1ZmZlci5pc1ZpZXcoaW5wdXQpICYmIGlucHV0LkJZVEVTX1BFUl9FTEVNRU5UID09PSAxKSkge1xuXHRcdHRocm93IG5ldyBFcnJvcignSW5wdXQgbXVzdCBiZSBhIHN0cmluZyBvciBhIFVpbnQ4QXJyYXknKTtcblx0fVxuXG5cdHJldHVybiBzdHJpcEZpbmFsTmV3bGluZUJpbmFyeShpbnB1dCk7XG59XG5cbmNvbnN0IHN0cmlwRmluYWxOZXdsaW5lU3RyaW5nID0gaW5wdXQgPT5cblx0aW5wdXQuYXQoLTEpID09PSBMRlxuXHRcdD8gaW5wdXQuc2xpY2UoMCwgaW5wdXQuYXQoLTIpID09PSBDUiA/IC0yIDogLTEpXG5cdFx0OiBpbnB1dDtcblxuY29uc3Qgc3RyaXBGaW5hbE5ld2xpbmVCaW5hcnkgPSBpbnB1dCA9PlxuXHRpbnB1dC5hdCgtMSkgPT09IExGX0JJTkFSWVxuXHRcdD8gaW5wdXQuc3ViYXJyYXkoMCwgaW5wdXQuYXQoLTIpID09PSBDUl9CSU5BUlkgPyAtMiA6IC0xKVxuXHRcdDogaW5wdXQ7XG5cbmNvbnN0IExGID0gJ1xcbic7XG5jb25zdCBMRl9CSU5BUlkgPSBMRi5jb2RlUG9pbnRBdCgwKTtcbmNvbnN0IENSID0gJ1xccic7XG5jb25zdCBDUl9CSU5BUlkgPSBDUi5jb2RlUG9pbnRBdCgwKTtcbiJdLCJuYW1lcyI6W10sImlnbm9yZUxpc3QiOlswXSwic291cmNlUm9vdCI6IiJ9\n//# sourceURL=webpack-internal:///(rsc)/./node_modules/strip-final-newline/index.js\n");

/***/ })

};
;