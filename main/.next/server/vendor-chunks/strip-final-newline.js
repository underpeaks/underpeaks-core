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

eval("__webpack_require__.r(__webpack_exports__);\n/* harmony export */ __webpack_require__.d(__webpack_exports__, {\n/* harmony export */   \"default\": () => (/* binding */ stripFinalNewline)\n/* harmony export */ });\nfunction stripFinalNewline(input) {\n\tif (typeof input === 'string') {\n\t\treturn stripFinalNewlineString(input);\n\t}\n\n\tif (!(ArrayBuffer.isView(input) && input.BYTES_PER_ELEMENT === 1)) {\n\t\tthrow new Error('Input must be a string or a Uint8Array');\n\t}\n\n\treturn stripFinalNewlineBinary(input);\n}\n\nconst stripFinalNewlineString = input =>\n\tinput.at(-1) === LF\n\t\t? input.slice(0, input.at(-2) === CR ? -2 : -1)\n\t\t: input;\n\nconst stripFinalNewlineBinary = input =>\n\tinput.at(-1) === LF_BINARY\n\t\t? input.subarray(0, input.at(-2) === CR_BINARY ? -2 : -1)\n\t\t: input;\n\nconst LF = '\\n';\nconst LF_BINARY = LF.codePointAt(0);\nconst CR = '\\r';\nconst CR_BINARY = CR.codePointAt(0);\n//# sourceURL=[module]\n//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiKHJzYykvLi9ub2RlX21vZHVsZXMvc3RyaXAtZmluYWwtbmV3bGluZS9pbmRleC5qcyIsIm1hcHBpbmdzIjoiOzs7O0FBQWU7QUFDZjtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBOztBQUVBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0EiLCJzb3VyY2VzIjpbIkM6XFxVc2Vyc1xcQW50b25XZW50emVsXFxEZXNrdG9wXFxueHRfZmx1dHRlclxcTlhURmx1dHRlcl9Db3JlXFxtYWluXFxub2RlX21vZHVsZXNcXHN0cmlwLWZpbmFsLW5ld2xpbmVcXGluZGV4LmpzIl0sInNvdXJjZXNDb250ZW50IjpbImV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uIHN0cmlwRmluYWxOZXdsaW5lKGlucHV0KSB7XG5cdGlmICh0eXBlb2YgaW5wdXQgPT09ICdzdHJpbmcnKSB7XG5cdFx0cmV0dXJuIHN0cmlwRmluYWxOZXdsaW5lU3RyaW5nKGlucHV0KTtcblx0fVxuXG5cdGlmICghKEFycmF5QnVmZmVyLmlzVmlldyhpbnB1dCkgJiYgaW5wdXQuQllURVNfUEVSX0VMRU1FTlQgPT09IDEpKSB7XG5cdFx0dGhyb3cgbmV3IEVycm9yKCdJbnB1dCBtdXN0IGJlIGEgc3RyaW5nIG9yIGEgVWludDhBcnJheScpO1xuXHR9XG5cblx0cmV0dXJuIHN0cmlwRmluYWxOZXdsaW5lQmluYXJ5KGlucHV0KTtcbn1cblxuY29uc3Qgc3RyaXBGaW5hbE5ld2xpbmVTdHJpbmcgPSBpbnB1dCA9PlxuXHRpbnB1dC5hdCgtMSkgPT09IExGXG5cdFx0PyBpbnB1dC5zbGljZSgwLCBpbnB1dC5hdCgtMikgPT09IENSID8gLTIgOiAtMSlcblx0XHQ6IGlucHV0O1xuXG5jb25zdCBzdHJpcEZpbmFsTmV3bGluZUJpbmFyeSA9IGlucHV0ID0+XG5cdGlucHV0LmF0KC0xKSA9PT0gTEZfQklOQVJZXG5cdFx0PyBpbnB1dC5zdWJhcnJheSgwLCBpbnB1dC5hdCgtMikgPT09IENSX0JJTkFSWSA/IC0yIDogLTEpXG5cdFx0OiBpbnB1dDtcblxuY29uc3QgTEYgPSAnXFxuJztcbmNvbnN0IExGX0JJTkFSWSA9IExGLmNvZGVQb2ludEF0KDApO1xuY29uc3QgQ1IgPSAnXFxyJztcbmNvbnN0IENSX0JJTkFSWSA9IENSLmNvZGVQb2ludEF0KDApO1xuIl0sIm5hbWVzIjpbXSwiaWdub3JlTGlzdCI6WzBdLCJzb3VyY2VSb290IjoiIn0=\n//# sourceURL=webpack-internal:///(rsc)/./node_modules/strip-final-newline/index.js\n");

/***/ })

};
;