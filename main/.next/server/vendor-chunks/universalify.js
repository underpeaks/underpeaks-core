"use strict";
/*
 * ATTENTION: An "eval-source-map" devtool has been used.
 * This devtool is neither made for production nor for readable output files.
 * It uses "eval()" calls to create a separate source file with attached SourceMaps in the browser devtools.
 * If you are trying to read the output file, select a different devtool (https://webpack.js.org/configuration/devtool/)
 * or disable the default devtool with "devtool: false".
 * If you are looking for production-ready output files, see mode: "production" (https://webpack.js.org/configuration/mode/).
 */
exports.id = "vendor-chunks/universalify";
exports.ids = ["vendor-chunks/universalify"];
exports.modules = {

/***/ "(rsc)/./node_modules/universalify/index.js":
/*!********************************************!*\
  !*** ./node_modules/universalify/index.js ***!
  \********************************************/
/***/ ((__unused_webpack_module, exports) => {

eval("\n\nexports.fromCallback = function (fn) {\n  return Object.defineProperty(function (...args) {\n    if (typeof args[args.length - 1] === 'function') fn.apply(this, args)\n    else {\n      return new Promise((resolve, reject) => {\n        args.push((err, res) => (err != null) ? reject(err) : resolve(res))\n        fn.apply(this, args)\n      })\n    }\n  }, 'name', { value: fn.name })\n}\n\nexports.fromPromise = function (fn) {\n  return Object.defineProperty(function (...args) {\n    const cb = args[args.length - 1]\n    if (typeof cb !== 'function') return fn.apply(this, args)\n    else {\n      args.pop()\n      fn.apply(this, args).then(r => cb(null, r), cb)\n    }\n  }, 'name', { value: fn.name })\n}\n//# sourceURL=[module]\n//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiKHJzYykvLi9ub2RlX21vZHVsZXMvdW5pdmVyc2FsaWZ5L2luZGV4LmpzIiwibWFwcGluZ3MiOiJBQUFZOztBQUVaLG9CQUFvQjtBQUNwQjtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxPQUFPO0FBQ1A7QUFDQSxHQUFHLFlBQVksZ0JBQWdCO0FBQy9COztBQUVBLG1CQUFtQjtBQUNuQjtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLEdBQUcsWUFBWSxnQkFBZ0I7QUFDL0IiLCJzb3VyY2VzIjpbIkQ6XFxOWFRGTFVUVEVSX0NPUkVcXE5YVEZsdXR0ZXJfQ29yZVxcbWFpblxcbm9kZV9tb2R1bGVzXFx1bml2ZXJzYWxpZnlcXGluZGV4LmpzIl0sInNvdXJjZXNDb250ZW50IjpbIid1c2Ugc3RyaWN0J1xuXG5leHBvcnRzLmZyb21DYWxsYmFjayA9IGZ1bmN0aW9uIChmbikge1xuICByZXR1cm4gT2JqZWN0LmRlZmluZVByb3BlcnR5KGZ1bmN0aW9uICguLi5hcmdzKSB7XG4gICAgaWYgKHR5cGVvZiBhcmdzW2FyZ3MubGVuZ3RoIC0gMV0gPT09ICdmdW5jdGlvbicpIGZuLmFwcGx5KHRoaXMsIGFyZ3MpXG4gICAgZWxzZSB7XG4gICAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUsIHJlamVjdCkgPT4ge1xuICAgICAgICBhcmdzLnB1c2goKGVyciwgcmVzKSA9PiAoZXJyICE9IG51bGwpID8gcmVqZWN0KGVycikgOiByZXNvbHZlKHJlcykpXG4gICAgICAgIGZuLmFwcGx5KHRoaXMsIGFyZ3MpXG4gICAgICB9KVxuICAgIH1cbiAgfSwgJ25hbWUnLCB7IHZhbHVlOiBmbi5uYW1lIH0pXG59XG5cbmV4cG9ydHMuZnJvbVByb21pc2UgPSBmdW5jdGlvbiAoZm4pIHtcbiAgcmV0dXJuIE9iamVjdC5kZWZpbmVQcm9wZXJ0eShmdW5jdGlvbiAoLi4uYXJncykge1xuICAgIGNvbnN0IGNiID0gYXJnc1thcmdzLmxlbmd0aCAtIDFdXG4gICAgaWYgKHR5cGVvZiBjYiAhPT0gJ2Z1bmN0aW9uJykgcmV0dXJuIGZuLmFwcGx5KHRoaXMsIGFyZ3MpXG4gICAgZWxzZSB7XG4gICAgICBhcmdzLnBvcCgpXG4gICAgICBmbi5hcHBseSh0aGlzLCBhcmdzKS50aGVuKHIgPT4gY2IobnVsbCwgciksIGNiKVxuICAgIH1cbiAgfSwgJ25hbWUnLCB7IHZhbHVlOiBmbi5uYW1lIH0pXG59XG4iXSwibmFtZXMiOltdLCJpZ25vcmVMaXN0IjpbMF0sInNvdXJjZVJvb3QiOiIifQ==\n//# sourceURL=webpack-internal:///(rsc)/./node_modules/universalify/index.js\n");

/***/ })

};
;