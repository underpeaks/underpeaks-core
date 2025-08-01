"use strict";
/*
 * ATTENTION: An "eval-source-map" devtool has been used.
 * This devtool is neither made for production nor for readable output files.
 * It uses "eval()" calls to create a separate source file with attached SourceMaps in the browser devtools.
 * If you are trying to read the output file, select a different devtool (https://webpack.js.org/configuration/devtool/)
 * or disable the default devtool with "devtool: false".
 * If you are looking for production-ready output files, see mode: "production" (https://webpack.js.org/configuration/mode/).
 */
exports.id = "vendor-chunks/native-duplexpair";
exports.ids = ["vendor-chunks/native-duplexpair"];
exports.modules = {

/***/ "(rsc)/./node_modules/native-duplexpair/index.js":
/*!*************************************************!*\
  !*** ./node_modules/native-duplexpair/index.js ***!
  \*************************************************/
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

eval("\nconst Duplex = (__webpack_require__(/*! stream */ \"stream\").Duplex);\n\nconst kCallback = Symbol('Callback');\nconst kOtherSide = Symbol('Other');\n\nclass DuplexSocket extends Duplex {\n  constructor(options) {\n    super(options);\n    this[kCallback] = null;\n    this[kOtherSide] = null;\n  }\n\n  _read() {\n    const callback = this[kCallback];\n    if (callback) {\n      this[kCallback] = null;\n      callback();\n    }\n  }\n\n  _write(chunk, encoding, callback) {\n    this[kOtherSide][kCallback] = callback;\n    this[kOtherSide].push(chunk);\n  }\n\n  _final(callback) {\n    this[kOtherSide].on('end', callback);\n    this[kOtherSide].push(null);\n  }\n}\n\nclass DuplexPair {\n  constructor(options) {\n    this.socket1 = new DuplexSocket(options);\n    this.socket2 = new DuplexSocket(options);\n    this.socket1[kOtherSide] = this.socket2;\n    this.socket2[kOtherSide] = this.socket1;\n  }\n}\n\nmodule.exports = DuplexPair;\n//# sourceURL=[module]\n//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiKHJzYykvLi9ub2RlX21vZHVsZXMvbmF0aXZlLWR1cGxleHBhaXIvaW5kZXguanMiLCJtYXBwaW5ncyI6IkFBQWE7QUFDYixlQUFlLG9EQUF3Qjs7QUFFdkM7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBIiwic291cmNlcyI6WyIvVXNlcnMvYW50b253ZW50emVsL254dGZsdXR0ZXJfY29yZS9tYWluL2FwcC9ub2RlX21vZHVsZXMvbmF0aXZlLWR1cGxleHBhaXIvaW5kZXguanMiXSwic291cmNlc0NvbnRlbnQiOlsiJ3VzZSBzdHJpY3QnO1xuY29uc3QgRHVwbGV4ID0gcmVxdWlyZSgnc3RyZWFtJykuRHVwbGV4O1xuXG5jb25zdCBrQ2FsbGJhY2sgPSBTeW1ib2woJ0NhbGxiYWNrJyk7XG5jb25zdCBrT3RoZXJTaWRlID0gU3ltYm9sKCdPdGhlcicpO1xuXG5jbGFzcyBEdXBsZXhTb2NrZXQgZXh0ZW5kcyBEdXBsZXgge1xuICBjb25zdHJ1Y3RvcihvcHRpb25zKSB7XG4gICAgc3VwZXIob3B0aW9ucyk7XG4gICAgdGhpc1trQ2FsbGJhY2tdID0gbnVsbDtcbiAgICB0aGlzW2tPdGhlclNpZGVdID0gbnVsbDtcbiAgfVxuXG4gIF9yZWFkKCkge1xuICAgIGNvbnN0IGNhbGxiYWNrID0gdGhpc1trQ2FsbGJhY2tdO1xuICAgIGlmIChjYWxsYmFjaykge1xuICAgICAgdGhpc1trQ2FsbGJhY2tdID0gbnVsbDtcbiAgICAgIGNhbGxiYWNrKCk7XG4gICAgfVxuICB9XG5cbiAgX3dyaXRlKGNodW5rLCBlbmNvZGluZywgY2FsbGJhY2spIHtcbiAgICB0aGlzW2tPdGhlclNpZGVdW2tDYWxsYmFja10gPSBjYWxsYmFjaztcbiAgICB0aGlzW2tPdGhlclNpZGVdLnB1c2goY2h1bmspO1xuICB9XG5cbiAgX2ZpbmFsKGNhbGxiYWNrKSB7XG4gICAgdGhpc1trT3RoZXJTaWRlXS5vbignZW5kJywgY2FsbGJhY2spO1xuICAgIHRoaXNba090aGVyU2lkZV0ucHVzaChudWxsKTtcbiAgfVxufVxuXG5jbGFzcyBEdXBsZXhQYWlyIHtcbiAgY29uc3RydWN0b3Iob3B0aW9ucykge1xuICAgIHRoaXMuc29ja2V0MSA9IG5ldyBEdXBsZXhTb2NrZXQob3B0aW9ucyk7XG4gICAgdGhpcy5zb2NrZXQyID0gbmV3IER1cGxleFNvY2tldChvcHRpb25zKTtcbiAgICB0aGlzLnNvY2tldDFba090aGVyU2lkZV0gPSB0aGlzLnNvY2tldDI7XG4gICAgdGhpcy5zb2NrZXQyW2tPdGhlclNpZGVdID0gdGhpcy5zb2NrZXQxO1xuICB9XG59XG5cbm1vZHVsZS5leHBvcnRzID0gRHVwbGV4UGFpcjtcbiJdLCJuYW1lcyI6W10sImlnbm9yZUxpc3QiOlswXSwic291cmNlUm9vdCI6IiJ9\n//# sourceURL=webpack-internal:///(rsc)/./node_modules/native-duplexpair/index.js\n");

/***/ })

};
;