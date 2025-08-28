/*
 * ATTENTION: An "eval-source-map" devtool has been used.
 * This devtool is neither made for production nor for readable output files.
 * It uses "eval()" calls to create a separate source file with attached SourceMaps in the browser devtools.
 * If you are trying to read the output file, select a different devtool (https://webpack.js.org/configuration/devtool/)
 * or disable the default devtool with "devtool: false".
 * If you are looking for production-ready output files, see mode: "production" (https://webpack.js.org/configuration/mode/).
 */
(() => {
var exports = {};
exports.id = "app/api/flutter/create/route";
exports.ids = ["app/api/flutter/create/route"];
exports.modules = {

/***/ "(rsc)/./app/api/flutter/create/route.ts":
/*!*****************************************!*\
  !*** ./app/api/flutter/create/route.ts ***!
  \*****************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
eval("__webpack_require__.r(__webpack_exports__);\n/* harmony export */ __webpack_require__.d(__webpack_exports__, {\n/* harmony export */   POST: () => (/* binding */ POST)\n/* harmony export */ });\n/* harmony import */ var next_server__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! next/server */ \"(rsc)/./node_modules/next/dist/api/server.js\");\n/* harmony import */ var execa__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! execa */ \"(rsc)/./node_modules/execa/index.js\");\n/* harmony import */ var path__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! path */ \"path\");\n/* harmony import */ var path__WEBPACK_IMPORTED_MODULE_1___default = /*#__PURE__*/__webpack_require__.n(path__WEBPACK_IMPORTED_MODULE_1__);\n/* harmony import */ var fs_extra__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! fs-extra */ \"(rsc)/./app/node_modules/fs-extra/lib/index.js\");\n/* harmony import */ var fs_extra__WEBPACK_IMPORTED_MODULE_2___default = /*#__PURE__*/__webpack_require__.n(fs_extra__WEBPACK_IMPORTED_MODULE_2__);\n\n\n\n\nasync function POST(req) {\n    try {\n        const { projectName } = await req.json();\n        if (!projectName || typeof projectName !== 'string') {\n            return next_server__WEBPACK_IMPORTED_MODULE_0__.NextResponse.json({\n                error: 'Missing projectName'\n            }, {\n                status: 400\n            });\n        }\n        const rootPath = path__WEBPACK_IMPORTED_MODULE_1___default().join(process.cwd(), \"..\", \"flutter\");\n        const installPath = path__WEBPACK_IMPORTED_MODULE_1___default().join(rootPath, projectName);\n        await fs_extra__WEBPACK_IMPORTED_MODULE_2___default().ensureDir(installPath);\n        // Just use \"flutter\" and assume it is in PATH\n        const flutterExecutable = 'flutter';\n        const createCmd = `${flutterExecutable} create --project-name ${projectName.toLowerCase()} ${installPath}`;\n        const { stdout, stderr } = await (0,execa__WEBPACK_IMPORTED_MODULE_3__.execaCommand)(createCmd, {\n            shell: true\n        });\n        if (stderr) console.warn('Flutter stderr:', stderr);\n        return next_server__WEBPACK_IMPORTED_MODULE_0__.NextResponse.json({\n            success: true,\n            output: stdout\n        });\n    } catch (error) {\n        console.error('Flutter create failed:', error);\n        // Send back detailed error info\n        return next_server__WEBPACK_IMPORTED_MODULE_0__.NextResponse.json({\n            error: `Step failed: Creating Flutter project - ${error.message || error}`,\n            details: error.stderr || error.stdout || error\n        }, {\n            status: 500\n        });\n    }\n}\n//# sourceURL=[module]\n//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiKHJzYykvLi9hcHAvYXBpL2ZsdXR0ZXIvY3JlYXRlL3JvdXRlLnRzIiwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7QUFBd0Q7QUFDbkI7QUFDYjtBQUNFO0FBRW5CLGVBQWVJLEtBQUtDLEdBQWdCO0lBQ3pDLElBQUk7UUFDRixNQUFNLEVBQUVDLFdBQVcsRUFBRSxHQUFHLE1BQU1ELElBQUlFLElBQUk7UUFFdEMsSUFBSSxDQUFDRCxlQUFlLE9BQU9BLGdCQUFnQixVQUFVO1lBQ25ELE9BQU9OLHFEQUFZQSxDQUFDTyxJQUFJLENBQUM7Z0JBQUVDLE9BQU87WUFBc0IsR0FBRztnQkFBRUMsUUFBUTtZQUFJO1FBQzNFO1FBRUQsTUFBTUMsV0FBV1IsZ0RBQVMsQ0FBQ1UsUUFBUUMsR0FBRyxJQUFJLE1BQU07UUFDbkQsTUFBTUMsY0FBY1osZ0RBQVMsQ0FBQ1EsVUFBVUo7UUFHcEMsTUFBTUgseURBQVksQ0FBQ1c7UUFFbkIsOENBQThDO1FBQzlDLE1BQU1FLG9CQUFvQjtRQUMxQixNQUFNQyxZQUFZLEdBQUdELGtCQUFrQix1QkFBdUIsRUFBRVYsWUFBWVksV0FBVyxHQUFHLENBQUMsRUFBRUosYUFBYTtRQUUxRyxNQUFNLEVBQUVLLE1BQU0sRUFBRUMsTUFBTSxFQUFFLEdBQUcsTUFBTW5CLG1EQUFZQSxDQUFDZ0IsV0FBVztZQUFFSSxPQUFPO1FBQUs7UUFFdkUsSUFBSUQsUUFBUUUsUUFBUUMsSUFBSSxDQUFDLG1CQUFtQkg7UUFFNUMsT0FBT3BCLHFEQUFZQSxDQUFDTyxJQUFJLENBQUM7WUFBRWlCLFNBQVM7WUFBTUMsUUFBUU47UUFBTztJQUMzRCxFQUFFLE9BQU9YLE9BQVk7UUFDbkJjLFFBQVFkLEtBQUssQ0FBQywwQkFBMEJBO1FBRXhDLGdDQUFnQztRQUNoQyxPQUFPUixxREFBWUEsQ0FBQ08sSUFBSSxDQUFDO1lBQ3ZCQyxPQUFPLENBQUMsd0NBQXdDLEVBQUVBLE1BQU1rQixPQUFPLElBQUlsQixPQUFPO1lBQzFFbUIsU0FBU25CLE1BQU1ZLE1BQU0sSUFBSVosTUFBTVcsTUFBTSxJQUFJWDtRQUMzQyxHQUFHO1lBQUVDLFFBQVE7UUFBSTtJQUNuQjtBQUNGIiwic291cmNlcyI6WyIvVXNlcnMvYW50b253ZW50emVsL254dGZsdXR0ZXJfY29yZS9tYWluL2FwcC9hcGkvZmx1dHRlci9jcmVhdGUvcm91dGUudHMiXSwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgTmV4dFJlcXVlc3QsIE5leHRSZXNwb25zZSB9IGZyb20gJ25leHQvc2VydmVyJztcbmltcG9ydCB7IGV4ZWNhQ29tbWFuZCB9IGZyb20gJ2V4ZWNhJztcbmltcG9ydCBwYXRoIGZyb20gJ3BhdGgnO1xuaW1wb3J0IGZzIGZyb20gJ2ZzLWV4dHJhJztcblxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIFBPU1QocmVxOiBOZXh0UmVxdWVzdCkge1xuICB0cnkge1xuICAgIGNvbnN0IHsgcHJvamVjdE5hbWUgfSA9IGF3YWl0IHJlcS5qc29uKCk7XG5cbiAgICBpZiAoIXByb2plY3ROYW1lIHx8IHR5cGVvZiBwcm9qZWN0TmFtZSAhPT0gJ3N0cmluZycpIHtcbiAgICAgIHJldHVybiBOZXh0UmVzcG9uc2UuanNvbih7IGVycm9yOiAnTWlzc2luZyBwcm9qZWN0TmFtZScgfSwgeyBzdGF0dXM6IDQwMCB9KTtcbiAgICB9XG5cbiAgIGNvbnN0IHJvb3RQYXRoID0gcGF0aC5qb2luKHByb2Nlc3MuY3dkKCksIFwiLi5cIiwgXCJmbHV0dGVyXCIpO1xuY29uc3QgaW5zdGFsbFBhdGggPSBwYXRoLmpvaW4ocm9vdFBhdGgsIHByb2plY3ROYW1lKTtcblxuXG4gICAgYXdhaXQgZnMuZW5zdXJlRGlyKGluc3RhbGxQYXRoKTtcblxuICAgIC8vIEp1c3QgdXNlIFwiZmx1dHRlclwiIGFuZCBhc3N1bWUgaXQgaXMgaW4gUEFUSFxuICAgIGNvbnN0IGZsdXR0ZXJFeGVjdXRhYmxlID0gJ2ZsdXR0ZXInO1xuICAgIGNvbnN0IGNyZWF0ZUNtZCA9IGAke2ZsdXR0ZXJFeGVjdXRhYmxlfSBjcmVhdGUgLS1wcm9qZWN0LW5hbWUgJHtwcm9qZWN0TmFtZS50b0xvd2VyQ2FzZSgpfSAke2luc3RhbGxQYXRofWA7XG5cbiAgICBjb25zdCB7IHN0ZG91dCwgc3RkZXJyIH0gPSBhd2FpdCBleGVjYUNvbW1hbmQoY3JlYXRlQ21kLCB7IHNoZWxsOiB0cnVlIH0pO1xuXG4gICAgaWYgKHN0ZGVycikgY29uc29sZS53YXJuKCdGbHV0dGVyIHN0ZGVycjonLCBzdGRlcnIpO1xuXG4gICAgcmV0dXJuIE5leHRSZXNwb25zZS5qc29uKHsgc3VjY2VzczogdHJ1ZSwgb3V0cHV0OiBzdGRvdXQgfSk7XG4gIH0gY2F0Y2ggKGVycm9yOiBhbnkpIHtcbiAgICBjb25zb2xlLmVycm9yKCdGbHV0dGVyIGNyZWF0ZSBmYWlsZWQ6JywgZXJyb3IpO1xuXG4gICAgLy8gU2VuZCBiYWNrIGRldGFpbGVkIGVycm9yIGluZm9cbiAgICByZXR1cm4gTmV4dFJlc3BvbnNlLmpzb24oe1xuICAgICAgZXJyb3I6IGBTdGVwIGZhaWxlZDogQ3JlYXRpbmcgRmx1dHRlciBwcm9qZWN0IC0gJHtlcnJvci5tZXNzYWdlIHx8IGVycm9yfWAsXG4gICAgICBkZXRhaWxzOiBlcnJvci5zdGRlcnIgfHwgZXJyb3Iuc3Rkb3V0IHx8IGVycm9yLFxuICAgIH0sIHsgc3RhdHVzOiA1MDAgfSk7XG4gIH1cbn1cbiJdLCJuYW1lcyI6WyJOZXh0UmVzcG9uc2UiLCJleGVjYUNvbW1hbmQiLCJwYXRoIiwiZnMiLCJQT1NUIiwicmVxIiwicHJvamVjdE5hbWUiLCJqc29uIiwiZXJyb3IiLCJzdGF0dXMiLCJyb290UGF0aCIsImpvaW4iLCJwcm9jZXNzIiwiY3dkIiwiaW5zdGFsbFBhdGgiLCJlbnN1cmVEaXIiLCJmbHV0dGVyRXhlY3V0YWJsZSIsImNyZWF0ZUNtZCIsInRvTG93ZXJDYXNlIiwic3Rkb3V0Iiwic3RkZXJyIiwic2hlbGwiLCJjb25zb2xlIiwid2FybiIsInN1Y2Nlc3MiLCJvdXRwdXQiLCJtZXNzYWdlIiwiZGV0YWlscyJdLCJpZ25vcmVMaXN0IjpbXSwic291cmNlUm9vdCI6IiJ9\n//# sourceURL=webpack-internal:///(rsc)/./app/api/flutter/create/route.ts\n");

/***/ }),

/***/ "(rsc)/./node_modules/next/dist/build/webpack/loaders/next-app-loader/index.js?name=app%2Fapi%2Fflutter%2Fcreate%2Froute&page=%2Fapi%2Fflutter%2Fcreate%2Froute&appPaths=&pagePath=private-next-app-dir%2Fapi%2Fflutter%2Fcreate%2Froute.ts&appDir=%2FUsers%2Fantonwentzel%2Fnxtflutter_core%2Fmain%2Fapp&pageExtensions=tsx&pageExtensions=ts&pageExtensions=jsx&pageExtensions=js&rootDir=%2FUsers%2Fantonwentzel%2Fnxtflutter_core%2Fmain&isDev=true&tsconfigPath=tsconfig.json&basePath=&assetPrefix=&nextConfigOutput=&preferredRegion=&middlewareConfig=e30%3D!":
/*!**********************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************!*\
  !*** ./node_modules/next/dist/build/webpack/loaders/next-app-loader/index.js?name=app%2Fapi%2Fflutter%2Fcreate%2Froute&page=%2Fapi%2Fflutter%2Fcreate%2Froute&appPaths=&pagePath=private-next-app-dir%2Fapi%2Fflutter%2Fcreate%2Froute.ts&appDir=%2FUsers%2Fantonwentzel%2Fnxtflutter_core%2Fmain%2Fapp&pageExtensions=tsx&pageExtensions=ts&pageExtensions=jsx&pageExtensions=js&rootDir=%2FUsers%2Fantonwentzel%2Fnxtflutter_core%2Fmain&isDev=true&tsconfigPath=tsconfig.json&basePath=&assetPrefix=&nextConfigOutput=&preferredRegion=&middlewareConfig=e30%3D! ***!
  \**********************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
eval("__webpack_require__.r(__webpack_exports__);\n/* harmony export */ __webpack_require__.d(__webpack_exports__, {\n/* harmony export */   patchFetch: () => (/* binding */ patchFetch),\n/* harmony export */   routeModule: () => (/* binding */ routeModule),\n/* harmony export */   serverHooks: () => (/* binding */ serverHooks),\n/* harmony export */   workAsyncStorage: () => (/* binding */ workAsyncStorage),\n/* harmony export */   workUnitAsyncStorage: () => (/* binding */ workUnitAsyncStorage)\n/* harmony export */ });\n/* harmony import */ var next_dist_server_route_modules_app_route_module_compiled__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! next/dist/server/route-modules/app-route/module.compiled */ \"(rsc)/./node_modules/next/dist/server/route-modules/app-route/module.compiled.js\");\n/* harmony import */ var next_dist_server_route_modules_app_route_module_compiled__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(next_dist_server_route_modules_app_route_module_compiled__WEBPACK_IMPORTED_MODULE_0__);\n/* harmony import */ var next_dist_server_route_kind__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! next/dist/server/route-kind */ \"(rsc)/./node_modules/next/dist/server/route-kind.js\");\n/* harmony import */ var next_dist_server_lib_patch_fetch__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! next/dist/server/lib/patch-fetch */ \"(rsc)/./node_modules/next/dist/server/lib/patch-fetch.js\");\n/* harmony import */ var next_dist_server_lib_patch_fetch__WEBPACK_IMPORTED_MODULE_2___default = /*#__PURE__*/__webpack_require__.n(next_dist_server_lib_patch_fetch__WEBPACK_IMPORTED_MODULE_2__);\n/* harmony import */ var _Users_antonwentzel_nxtflutter_core_main_app_api_flutter_create_route_ts__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ./app/api/flutter/create/route.ts */ \"(rsc)/./app/api/flutter/create/route.ts\");\n\n\n\n\n// We inject the nextConfigOutput here so that we can use them in the route\n// module.\nconst nextConfigOutput = \"\"\nconst routeModule = new next_dist_server_route_modules_app_route_module_compiled__WEBPACK_IMPORTED_MODULE_0__.AppRouteRouteModule({\n    definition: {\n        kind: next_dist_server_route_kind__WEBPACK_IMPORTED_MODULE_1__.RouteKind.APP_ROUTE,\n        page: \"/api/flutter/create/route\",\n        pathname: \"/api/flutter/create\",\n        filename: \"route\",\n        bundlePath: \"app/api/flutter/create/route\"\n    },\n    resolvedPagePath: \"/Users/antonwentzel/nxtflutter_core/main/app/api/flutter/create/route.ts\",\n    nextConfigOutput,\n    userland: _Users_antonwentzel_nxtflutter_core_main_app_api_flutter_create_route_ts__WEBPACK_IMPORTED_MODULE_3__\n});\n// Pull out the exports that we need to expose from the module. This should\n// be eliminated when we've moved the other routes to the new format. These\n// are used to hook into the route.\nconst { workAsyncStorage, workUnitAsyncStorage, serverHooks } = routeModule;\nfunction patchFetch() {\n    return (0,next_dist_server_lib_patch_fetch__WEBPACK_IMPORTED_MODULE_2__.patchFetch)({\n        workAsyncStorage,\n        workUnitAsyncStorage\n    });\n}\n\n\n//# sourceMappingURL=app-route.js.map//# sourceURL=[module]\n//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiKHJzYykvLi9ub2RlX21vZHVsZXMvbmV4dC9kaXN0L2J1aWxkL3dlYnBhY2svbG9hZGVycy9uZXh0LWFwcC1sb2FkZXIvaW5kZXguanM/bmFtZT1hcHAlMkZhcGklMkZmbHV0dGVyJTJGY3JlYXRlJTJGcm91dGUmcGFnZT0lMkZhcGklMkZmbHV0dGVyJTJGY3JlYXRlJTJGcm91dGUmYXBwUGF0aHM9JnBhZ2VQYXRoPXByaXZhdGUtbmV4dC1hcHAtZGlyJTJGYXBpJTJGZmx1dHRlciUyRmNyZWF0ZSUyRnJvdXRlLnRzJmFwcERpcj0lMkZVc2VycyUyRmFudG9ud2VudHplbCUyRm54dGZsdXR0ZXJfY29yZSUyRm1haW4lMkZhcHAmcGFnZUV4dGVuc2lvbnM9dHN4JnBhZ2VFeHRlbnNpb25zPXRzJnBhZ2VFeHRlbnNpb25zPWpzeCZwYWdlRXh0ZW5zaW9ucz1qcyZyb290RGlyPSUyRlVzZXJzJTJGYW50b253ZW50emVsJTJGbnh0Zmx1dHRlcl9jb3JlJTJGbWFpbiZpc0Rldj10cnVlJnRzY29uZmlnUGF0aD10c2NvbmZpZy5qc29uJmJhc2VQYXRoPSZhc3NldFByZWZpeD0mbmV4dENvbmZpZ091dHB1dD0mcHJlZmVycmVkUmVnaW9uPSZtaWRkbGV3YXJlQ29uZmlnPWUzMCUzRCEiLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7QUFBK0Y7QUFDdkM7QUFDcUI7QUFDd0I7QUFDckc7QUFDQTtBQUNBO0FBQ0Esd0JBQXdCLHlHQUFtQjtBQUMzQztBQUNBLGNBQWMsa0VBQVM7QUFDdkI7QUFDQTtBQUNBO0FBQ0E7QUFDQSxLQUFLO0FBQ0w7QUFDQTtBQUNBLFlBQVk7QUFDWixDQUFDO0FBQ0Q7QUFDQTtBQUNBO0FBQ0EsUUFBUSxzREFBc0Q7QUFDOUQ7QUFDQSxXQUFXLDRFQUFXO0FBQ3RCO0FBQ0E7QUFDQSxLQUFLO0FBQ0w7QUFDMEY7O0FBRTFGIiwic291cmNlcyI6WyIiXSwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgQXBwUm91dGVSb3V0ZU1vZHVsZSB9IGZyb20gXCJuZXh0L2Rpc3Qvc2VydmVyL3JvdXRlLW1vZHVsZXMvYXBwLXJvdXRlL21vZHVsZS5jb21waWxlZFwiO1xuaW1wb3J0IHsgUm91dGVLaW5kIH0gZnJvbSBcIm5leHQvZGlzdC9zZXJ2ZXIvcm91dGUta2luZFwiO1xuaW1wb3J0IHsgcGF0Y2hGZXRjaCBhcyBfcGF0Y2hGZXRjaCB9IGZyb20gXCJuZXh0L2Rpc3Qvc2VydmVyL2xpYi9wYXRjaC1mZXRjaFwiO1xuaW1wb3J0ICogYXMgdXNlcmxhbmQgZnJvbSBcIi9Vc2Vycy9hbnRvbndlbnR6ZWwvbnh0Zmx1dHRlcl9jb3JlL21haW4vYXBwL2FwaS9mbHV0dGVyL2NyZWF0ZS9yb3V0ZS50c1wiO1xuLy8gV2UgaW5qZWN0IHRoZSBuZXh0Q29uZmlnT3V0cHV0IGhlcmUgc28gdGhhdCB3ZSBjYW4gdXNlIHRoZW0gaW4gdGhlIHJvdXRlXG4vLyBtb2R1bGUuXG5jb25zdCBuZXh0Q29uZmlnT3V0cHV0ID0gXCJcIlxuY29uc3Qgcm91dGVNb2R1bGUgPSBuZXcgQXBwUm91dGVSb3V0ZU1vZHVsZSh7XG4gICAgZGVmaW5pdGlvbjoge1xuICAgICAgICBraW5kOiBSb3V0ZUtpbmQuQVBQX1JPVVRFLFxuICAgICAgICBwYWdlOiBcIi9hcGkvZmx1dHRlci9jcmVhdGUvcm91dGVcIixcbiAgICAgICAgcGF0aG5hbWU6IFwiL2FwaS9mbHV0dGVyL2NyZWF0ZVwiLFxuICAgICAgICBmaWxlbmFtZTogXCJyb3V0ZVwiLFxuICAgICAgICBidW5kbGVQYXRoOiBcImFwcC9hcGkvZmx1dHRlci9jcmVhdGUvcm91dGVcIlxuICAgIH0sXG4gICAgcmVzb2x2ZWRQYWdlUGF0aDogXCIvVXNlcnMvYW50b253ZW50emVsL254dGZsdXR0ZXJfY29yZS9tYWluL2FwcC9hcGkvZmx1dHRlci9jcmVhdGUvcm91dGUudHNcIixcbiAgICBuZXh0Q29uZmlnT3V0cHV0LFxuICAgIHVzZXJsYW5kXG59KTtcbi8vIFB1bGwgb3V0IHRoZSBleHBvcnRzIHRoYXQgd2UgbmVlZCB0byBleHBvc2UgZnJvbSB0aGUgbW9kdWxlLiBUaGlzIHNob3VsZFxuLy8gYmUgZWxpbWluYXRlZCB3aGVuIHdlJ3ZlIG1vdmVkIHRoZSBvdGhlciByb3V0ZXMgdG8gdGhlIG5ldyBmb3JtYXQuIFRoZXNlXG4vLyBhcmUgdXNlZCB0byBob29rIGludG8gdGhlIHJvdXRlLlxuY29uc3QgeyB3b3JrQXN5bmNTdG9yYWdlLCB3b3JrVW5pdEFzeW5jU3RvcmFnZSwgc2VydmVySG9va3MgfSA9IHJvdXRlTW9kdWxlO1xuZnVuY3Rpb24gcGF0Y2hGZXRjaCgpIHtcbiAgICByZXR1cm4gX3BhdGNoRmV0Y2goe1xuICAgICAgICB3b3JrQXN5bmNTdG9yYWdlLFxuICAgICAgICB3b3JrVW5pdEFzeW5jU3RvcmFnZVxuICAgIH0pO1xufVxuZXhwb3J0IHsgcm91dGVNb2R1bGUsIHdvcmtBc3luY1N0b3JhZ2UsIHdvcmtVbml0QXN5bmNTdG9yYWdlLCBzZXJ2ZXJIb29rcywgcGF0Y2hGZXRjaCwgIH07XG5cbi8vIyBzb3VyY2VNYXBwaW5nVVJMPWFwcC1yb3V0ZS5qcy5tYXAiXSwibmFtZXMiOltdLCJpZ25vcmVMaXN0IjpbXSwic291cmNlUm9vdCI6IiJ9\n//# sourceURL=webpack-internal:///(rsc)/./node_modules/next/dist/build/webpack/loaders/next-app-loader/index.js?name=app%2Fapi%2Fflutter%2Fcreate%2Froute&page=%2Fapi%2Fflutter%2Fcreate%2Froute&appPaths=&pagePath=private-next-app-dir%2Fapi%2Fflutter%2Fcreate%2Froute.ts&appDir=%2FUsers%2Fantonwentzel%2Fnxtflutter_core%2Fmain%2Fapp&pageExtensions=tsx&pageExtensions=ts&pageExtensions=jsx&pageExtensions=js&rootDir=%2FUsers%2Fantonwentzel%2Fnxtflutter_core%2Fmain&isDev=true&tsconfigPath=tsconfig.json&basePath=&assetPrefix=&nextConfigOutput=&preferredRegion=&middlewareConfig=e30%3D!\n");

/***/ }),

/***/ "(rsc)/./node_modules/next/dist/build/webpack/loaders/next-flight-client-entry-loader.js?server=true!":
/*!******************************************************************************************************!*\
  !*** ./node_modules/next/dist/build/webpack/loaders/next-flight-client-entry-loader.js?server=true! ***!
  \******************************************************************************************************/
/***/ (() => {



/***/ }),

/***/ "(ssr)/./node_modules/next/dist/build/webpack/loaders/next-flight-client-entry-loader.js?server=true!":
/*!******************************************************************************************************!*\
  !*** ./node_modules/next/dist/build/webpack/loaders/next-flight-client-entry-loader.js?server=true! ***!
  \******************************************************************************************************/
/***/ (() => {



/***/ }),

/***/ "../app-render/after-task-async-storage.external":
/*!***********************************************************************************!*\
  !*** external "next/dist/server/app-render/after-task-async-storage.external.js" ***!
  \***********************************************************************************/
/***/ ((module) => {

"use strict";
module.exports = require("next/dist/server/app-render/after-task-async-storage.external.js");

/***/ }),

/***/ "../app-render/work-async-storage.external":
/*!*****************************************************************************!*\
  !*** external "next/dist/server/app-render/work-async-storage.external.js" ***!
  \*****************************************************************************/
/***/ ((module) => {

"use strict";
module.exports = require("next/dist/server/app-render/work-async-storage.external.js");

/***/ }),

/***/ "./work-unit-async-storage.external":
/*!**********************************************************************************!*\
  !*** external "next/dist/server/app-render/work-unit-async-storage.external.js" ***!
  \**********************************************************************************/
/***/ ((module) => {

"use strict";
module.exports = require("next/dist/server/app-render/work-unit-async-storage.external.js");

/***/ }),

/***/ "assert":
/*!*************************!*\
  !*** external "assert" ***!
  \*************************/
/***/ ((module) => {

"use strict";
module.exports = require("assert");

/***/ }),

/***/ "child_process":
/*!********************************!*\
  !*** external "child_process" ***!
  \********************************/
/***/ ((module) => {

"use strict";
module.exports = require("child_process");

/***/ }),

/***/ "constants":
/*!****************************!*\
  !*** external "constants" ***!
  \****************************/
/***/ ((module) => {

"use strict";
module.exports = require("constants");

/***/ }),

/***/ "fs":
/*!*********************!*\
  !*** external "fs" ***!
  \*********************/
/***/ ((module) => {

"use strict";
module.exports = require("fs");

/***/ }),

/***/ "next/dist/compiled/next-server/app-page.runtime.dev.js":
/*!*************************************************************************!*\
  !*** external "next/dist/compiled/next-server/app-page.runtime.dev.js" ***!
  \*************************************************************************/
/***/ ((module) => {

"use strict";
module.exports = require("next/dist/compiled/next-server/app-page.runtime.dev.js");

/***/ }),

/***/ "next/dist/compiled/next-server/app-route.runtime.dev.js":
/*!**************************************************************************!*\
  !*** external "next/dist/compiled/next-server/app-route.runtime.dev.js" ***!
  \**************************************************************************/
/***/ ((module) => {

"use strict";
module.exports = require("next/dist/compiled/next-server/app-route.runtime.dev.js");

/***/ }),

/***/ "node:buffer":
/*!******************************!*\
  !*** external "node:buffer" ***!
  \******************************/
/***/ ((module) => {

"use strict";
module.exports = require("node:buffer");

/***/ }),

/***/ "node:child_process":
/*!*************************************!*\
  !*** external "node:child_process" ***!
  \*************************************/
/***/ ((module) => {

"use strict";
module.exports = require("node:child_process");

/***/ }),

/***/ "node:events":
/*!******************************!*\
  !*** external "node:events" ***!
  \******************************/
/***/ ((module) => {

"use strict";
module.exports = require("node:events");

/***/ }),

/***/ "node:fs":
/*!**************************!*\
  !*** external "node:fs" ***!
  \**************************/
/***/ ((module) => {

"use strict";
module.exports = require("node:fs");

/***/ }),

/***/ "node:os":
/*!**************************!*\
  !*** external "node:os" ***!
  \**************************/
/***/ ((module) => {

"use strict";
module.exports = require("node:os");

/***/ }),

/***/ "node:path":
/*!****************************!*\
  !*** external "node:path" ***!
  \****************************/
/***/ ((module) => {

"use strict";
module.exports = require("node:path");

/***/ }),

/***/ "node:process":
/*!*******************************!*\
  !*** external "node:process" ***!
  \*******************************/
/***/ ((module) => {

"use strict";
module.exports = require("node:process");

/***/ }),

/***/ "node:stream":
/*!******************************!*\
  !*** external "node:stream" ***!
  \******************************/
/***/ ((module) => {

"use strict";
module.exports = require("node:stream");

/***/ }),

/***/ "node:stream/promises":
/*!***************************************!*\
  !*** external "node:stream/promises" ***!
  \***************************************/
/***/ ((module) => {

"use strict";
module.exports = require("node:stream/promises");

/***/ }),

/***/ "node:string_decoder":
/*!**************************************!*\
  !*** external "node:string_decoder" ***!
  \**************************************/
/***/ ((module) => {

"use strict";
module.exports = require("node:string_decoder");

/***/ }),

/***/ "node:timers/promises":
/*!***************************************!*\
  !*** external "node:timers/promises" ***!
  \***************************************/
/***/ ((module) => {

"use strict";
module.exports = require("node:timers/promises");

/***/ }),

/***/ "node:tty":
/*!***************************!*\
  !*** external "node:tty" ***!
  \***************************/
/***/ ((module) => {

"use strict";
module.exports = require("node:tty");

/***/ }),

/***/ "node:url":
/*!***************************!*\
  !*** external "node:url" ***!
  \***************************/
/***/ ((module) => {

"use strict";
module.exports = require("node:url");

/***/ }),

/***/ "node:util":
/*!****************************!*\
  !*** external "node:util" ***!
  \****************************/
/***/ ((module) => {

"use strict";
module.exports = require("node:util");

/***/ }),

/***/ "node:v8":
/*!**************************!*\
  !*** external "node:v8" ***!
  \**************************/
/***/ ((module) => {

"use strict";
module.exports = require("node:v8");

/***/ }),

/***/ "path":
/*!***********************!*\
  !*** external "path" ***!
  \***********************/
/***/ ((module) => {

"use strict";
module.exports = require("path");

/***/ }),

/***/ "stream":
/*!*************************!*\
  !*** external "stream" ***!
  \*************************/
/***/ ((module) => {

"use strict";
module.exports = require("stream");

/***/ }),

/***/ "util":
/*!***********************!*\
  !*** external "util" ***!
  \***********************/
/***/ ((module) => {

"use strict";
module.exports = require("util");

/***/ })

};
;

// load runtime
var __webpack_require__ = require("../../../../webpack-runtime.js");
__webpack_require__.C(exports);
var __webpack_exec__ = (moduleId) => (__webpack_require__(__webpack_require__.s = moduleId))
var __webpack_exports__ = __webpack_require__.X(0, ["vendor-chunks/next","vendor-chunks/@opentelemetry","vendor-chunks/execa","vendor-chunks/get-stream","vendor-chunks/cross-spawn","vendor-chunks/figures","vendor-chunks/@sindresorhus","vendor-chunks/human-signals","vendor-chunks/pretty-ms","vendor-chunks/which","vendor-chunks/isexe","vendor-chunks/yoctocolors","vendor-chunks/@sec-ant","vendor-chunks/npm-run-path","vendor-chunks/unicorn-magic","vendor-chunks/is-stream","vendor-chunks/parse-ms","vendor-chunks/strip-final-newline","vendor-chunks/path-key","vendor-chunks/shebang-command","vendor-chunks/is-plain-obj","vendor-chunks/shebang-regex","vendor-chunks/fs-extra","vendor-chunks/graceful-fs","vendor-chunks/jsonfile","vendor-chunks/universalify"], () => (__webpack_exec__("(rsc)/./node_modules/next/dist/build/webpack/loaders/next-app-loader/index.js?name=app%2Fapi%2Fflutter%2Fcreate%2Froute&page=%2Fapi%2Fflutter%2Fcreate%2Froute&appPaths=&pagePath=private-next-app-dir%2Fapi%2Fflutter%2Fcreate%2Froute.ts&appDir=%2FUsers%2Fantonwentzel%2Fnxtflutter_core%2Fmain%2Fapp&pageExtensions=tsx&pageExtensions=ts&pageExtensions=jsx&pageExtensions=js&rootDir=%2FUsers%2Fantonwentzel%2Fnxtflutter_core%2Fmain&isDev=true&tsconfigPath=tsconfig.json&basePath=&assetPrefix=&nextConfigOutput=&preferredRegion=&middlewareConfig=e30%3D!")));
module.exports = __webpack_exports__;

})();