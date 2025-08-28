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
exports.id = "app/api/nextjs/create/route";
exports.ids = ["app/api/nextjs/create/route"];
exports.modules = {

/***/ "(rsc)/./app/api/nextjs/create/route.ts":
/*!****************************************!*\
  !*** ./app/api/nextjs/create/route.ts ***!
  \****************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
eval("__webpack_require__.r(__webpack_exports__);\n/* harmony export */ __webpack_require__.d(__webpack_exports__, {\n/* harmony export */   POST: () => (/* binding */ POST)\n/* harmony export */ });\n/* harmony import */ var next_server__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! next/server */ \"(rsc)/./node_modules/next/dist/api/server.js\");\n/* harmony import */ var execa__WEBPACK_IMPORTED_MODULE_6__ = __webpack_require__(/*! execa */ \"(rsc)/./node_modules/execa/index.js\");\n/* harmony import */ var path__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! path */ \"path\");\n/* harmony import */ var path__WEBPACK_IMPORTED_MODULE_1___default = /*#__PURE__*/__webpack_require__.n(path__WEBPACK_IMPORTED_MODULE_1__);\n/* harmony import */ var os__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! os */ \"os\");\n/* harmony import */ var os__WEBPACK_IMPORTED_MODULE_2___default = /*#__PURE__*/__webpack_require__.n(os__WEBPACK_IMPORTED_MODULE_2__);\n/* harmony import */ var fs_promises__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! fs/promises */ \"fs/promises\");\n/* harmony import */ var fs_promises__WEBPACK_IMPORTED_MODULE_3___default = /*#__PURE__*/__webpack_require__.n(fs_promises__WEBPACK_IMPORTED_MODULE_3__);\n/* harmony import */ var fs__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(/*! fs */ \"fs\");\n/* harmony import */ var fs__WEBPACK_IMPORTED_MODULE_4___default = /*#__PURE__*/__webpack_require__.n(fs__WEBPACK_IMPORTED_MODULE_4__);\n/* harmony import */ var mkdirp__WEBPACK_IMPORTED_MODULE_5__ = __webpack_require__(/*! mkdirp */ \"(rsc)/./node_modules/mkdirp/dist/mjs/index.js\");\n\n\n\n\n\n\n\nasync function POST(req) {\n    try {\n        const body = await req.json();\n        const { projectName } = body;\n        if (!projectName || typeof projectName !== \"string\") {\n            return next_server__WEBPACK_IMPORTED_MODULE_0__.NextResponse.json({\n                error: \"Invalid project name.\"\n            }, {\n                status: 400\n            });\n        }\n        // Create the install directory — here you want to install under your project folder, e.g. inside your repo\n        // Adjust this path to where you want projects installed — **absolute path, writable**\n        const installDir = path__WEBPACK_IMPORTED_MODULE_1___default().join(process.cwd(), '..', \"nextjs\");\n        // Ensure installDir exists\n        await (0,mkdirp__WEBPACK_IMPORTED_MODULE_5__.mkdirp)(installDir);\n        // Destination project folder\n        const projectPath = path__WEBPACK_IMPORTED_MODULE_1___default().join(installDir, projectName);\n        if (fs__WEBPACK_IMPORTED_MODULE_4___default().existsSync(projectPath)) {\n            return next_server__WEBPACK_IMPORTED_MODULE_0__.NextResponse.json({\n                error: `Project folder \"${projectName}\" already exists.`\n            }, {\n                status: 400\n            });\n        }\n        // FIX: Delete npm _npx cache folder to avoid ENOTEMPTY errors\n        const npxCache = path__WEBPACK_IMPORTED_MODULE_1___default().join(os__WEBPACK_IMPORTED_MODULE_2___default().homedir(), \".npm\", \"_npx\");\n        try {\n            await fs_promises__WEBPACK_IMPORTED_MODULE_3___default().rm(npxCache, {\n                recursive: true,\n                force: true\n            });\n        } catch (err) {\n            console.warn(\"Failed to clear npx cache folder:\", err);\n        }\n        // FIX: Clean npm cache forcibly\n        await (0,execa__WEBPACK_IMPORTED_MODULE_6__.execaCommand)(\"npm cache clean --force\");\n        // Run create-next-app in the installDir\n        const { stdout } = await (0,execa__WEBPACK_IMPORTED_MODULE_6__.execaCommand)(`npx create-next-app@latest ${projectName} --yes`, {\n            cwd: installDir,\n            shell: true\n        });\n        return next_server__WEBPACK_IMPORTED_MODULE_0__.NextResponse.json({\n            success: true,\n            message: `Project \"${projectName}\" created successfully.`,\n            stdout,\n            path: projectPath\n        });\n    } catch (error) {\n        console.error('NextJS create failed:', error);\n        // Send back detailed error info\n        return next_server__WEBPACK_IMPORTED_MODULE_0__.NextResponse.json({\n            error: `Step failed: Creating NextJS project - ${error.message || error}`,\n            details: error.stderr || error.stdout || error\n        }, {\n            status: 500\n        });\n    }\n}\n//# sourceURL=[module]\n//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiKHJzYykvLi9hcHAvYXBpL25leHRqcy9jcmVhdGUvcm91dGUudHMiLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7O0FBQTJDO0FBQ047QUFDYjtBQUNKO0FBQ1M7QUFDTDtBQUNRO0FBRXpCLGVBQWVPLEtBQUtDLEdBQVk7SUFDckMsSUFBSTtRQUNGLE1BQU1DLE9BQU8sTUFBTUQsSUFBSUUsSUFBSTtRQUMzQixNQUFNLEVBQUVDLFdBQVcsRUFBRSxHQUFHRjtRQUV4QixJQUFJLENBQUNFLGVBQWUsT0FBT0EsZ0JBQWdCLFVBQVU7WUFDbkQsT0FBT1gscURBQVlBLENBQUNVLElBQUksQ0FBQztnQkFBRUUsT0FBTztZQUF3QixHQUFHO2dCQUFFQyxRQUFRO1lBQUk7UUFDN0U7UUFFQSwyR0FBMkc7UUFDM0csc0ZBQXNGO1FBQ3RGLE1BQU1DLGFBQWFaLGdEQUFTLENBQUNjLFFBQVFDLEdBQUcsSUFBRyxNQUFNO1FBRWpELDJCQUEyQjtRQUMzQixNQUFNWCw4Q0FBTUEsQ0FBQ1E7UUFFYiw2QkFBNkI7UUFDN0IsTUFBTUksY0FBY2hCLGdEQUFTLENBQUNZLFlBQVlIO1FBRTFDLElBQUlOLG9EQUFpQixDQUFDYSxjQUFjO1lBQ2xDLE9BQU9sQixxREFBWUEsQ0FBQ1UsSUFBSSxDQUN0QjtnQkFBRUUsT0FBTyxDQUFDLGdCQUFnQixFQUFFRCxZQUFZLGlCQUFpQixDQUFDO1lBQUMsR0FDM0Q7Z0JBQUVFLFFBQVE7WUFBSTtRQUVsQjtRQUVBLDhEQUE4RDtRQUM5RCxNQUFNTyxXQUFXbEIsZ0RBQVMsQ0FBQ0MsaURBQVUsSUFBSSxRQUFRO1FBQ2pELElBQUk7WUFDRixNQUFNQyxxREFBSyxDQUFDZ0IsVUFBVTtnQkFBRUcsV0FBVztnQkFBTUMsT0FBTztZQUFLO1FBQ3ZELEVBQUUsT0FBT0MsS0FBSztZQUNaQyxRQUFRQyxJQUFJLENBQUMscUNBQXFDRjtRQUNwRDtRQUVBLGdDQUFnQztRQUNoQyxNQUFNeEIsbURBQVlBLENBQUM7UUFFbkIsd0NBQXdDO1FBQ3hDLE1BQU0sRUFBRTJCLE1BQU0sRUFBRSxHQUFHLE1BQU0zQixtREFBWUEsQ0FBQyxDQUFDLDJCQUEyQixFQUFFVSxZQUFZLE1BQU0sQ0FBQyxFQUFFO1lBQ3ZGTSxLQUFLSDtZQUNMZSxPQUFPO1FBQ1Q7UUFFQSxPQUFPN0IscURBQVlBLENBQUNVLElBQUksQ0FBQztZQUMzQm9CLFNBQVM7WUFDVEMsU0FBUyxDQUFDLFNBQVMsRUFBRXBCLFlBQVksdUJBQXVCLENBQUM7WUFDekRpQjtZQUNBMUIsTUFBTWdCO1FBQ1I7SUFFRyxFQUFFLE9BQU9OLE9BQVk7UUFDcEJjLFFBQVFkLEtBQUssQ0FBQyx5QkFBeUJBO1FBRXZDLGdDQUFnQztRQUNoQyxPQUFPWixxREFBWUEsQ0FBQ1UsSUFBSSxDQUFDO1lBQ3ZCRSxPQUFPLENBQUMsdUNBQXVDLEVBQUVBLE1BQU1tQixPQUFPLElBQUluQixPQUFPO1lBQ3pFb0IsU0FBU3BCLE1BQU1xQixNQUFNLElBQUlyQixNQUFNZ0IsTUFBTSxJQUFJaEI7UUFDM0MsR0FBRztZQUFFQyxRQUFRO1FBQUk7SUFDbkI7QUFDRiIsInNvdXJjZXMiOlsiL1VzZXJzL2FudG9ud2VudHplbC9ueHRmbHV0dGVyX2NvcmUvbWFpbi9hcHAvYXBpL25leHRqcy9jcmVhdGUvcm91dGUudHMiXSwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgTmV4dFJlc3BvbnNlIH0gZnJvbSBcIm5leHQvc2VydmVyXCI7XG5pbXBvcnQgeyBleGVjYUNvbW1hbmQgfSBmcm9tIFwiZXhlY2FcIjtcbmltcG9ydCBwYXRoIGZyb20gXCJwYXRoXCI7XG5pbXBvcnQgb3MgZnJvbSBcIm9zXCI7XG5pbXBvcnQgZnMgZnJvbSBcImZzL3Byb21pc2VzXCI7XG5pbXBvcnQgZnNTeW5jIGZyb20gXCJmc1wiO1xuaW1wb3J0IHsgbWtkaXJwIH0gZnJvbSBcIm1rZGlycFwiO1xuXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gUE9TVChyZXE6IFJlcXVlc3QpIHtcbiAgdHJ5IHtcbiAgICBjb25zdCBib2R5ID0gYXdhaXQgcmVxLmpzb24oKTtcbiAgICBjb25zdCB7IHByb2plY3ROYW1lIH0gPSBib2R5O1xuXG4gICAgaWYgKCFwcm9qZWN0TmFtZSB8fCB0eXBlb2YgcHJvamVjdE5hbWUgIT09IFwic3RyaW5nXCIpIHtcbiAgICAgIHJldHVybiBOZXh0UmVzcG9uc2UuanNvbih7IGVycm9yOiBcIkludmFsaWQgcHJvamVjdCBuYW1lLlwiIH0sIHsgc3RhdHVzOiA0MDAgfSk7XG4gICAgfVxuXG4gICAgLy8gQ3JlYXRlIHRoZSBpbnN0YWxsIGRpcmVjdG9yeSDigJQgaGVyZSB5b3Ugd2FudCB0byBpbnN0YWxsIHVuZGVyIHlvdXIgcHJvamVjdCBmb2xkZXIsIGUuZy4gaW5zaWRlIHlvdXIgcmVwb1xuICAgIC8vIEFkanVzdCB0aGlzIHBhdGggdG8gd2hlcmUgeW91IHdhbnQgcHJvamVjdHMgaW5zdGFsbGVkIOKAlCAqKmFic29sdXRlIHBhdGgsIHdyaXRhYmxlKipcbiAgICBjb25zdCBpbnN0YWxsRGlyID0gcGF0aC5qb2luKHByb2Nlc3MuY3dkKCksJy4uJywgXCJuZXh0anNcIik7XG5cbiAgICAvLyBFbnN1cmUgaW5zdGFsbERpciBleGlzdHNcbiAgICBhd2FpdCBta2RpcnAoaW5zdGFsbERpcik7XG5cbiAgICAvLyBEZXN0aW5hdGlvbiBwcm9qZWN0IGZvbGRlclxuICAgIGNvbnN0IHByb2plY3RQYXRoID0gcGF0aC5qb2luKGluc3RhbGxEaXIsIHByb2plY3ROYW1lKTtcblxuICAgIGlmIChmc1N5bmMuZXhpc3RzU3luYyhwcm9qZWN0UGF0aCkpIHtcbiAgICAgIHJldHVybiBOZXh0UmVzcG9uc2UuanNvbihcbiAgICAgICAgeyBlcnJvcjogYFByb2plY3QgZm9sZGVyIFwiJHtwcm9qZWN0TmFtZX1cIiBhbHJlYWR5IGV4aXN0cy5gIH0sXG4gICAgICAgIHsgc3RhdHVzOiA0MDAgfVxuICAgICAgKTtcbiAgICB9XG5cbiAgICAvLyBGSVg6IERlbGV0ZSBucG0gX25weCBjYWNoZSBmb2xkZXIgdG8gYXZvaWQgRU5PVEVNUFRZIGVycm9yc1xuICAgIGNvbnN0IG5weENhY2hlID0gcGF0aC5qb2luKG9zLmhvbWVkaXIoKSwgXCIubnBtXCIsIFwiX25weFwiKTtcbiAgICB0cnkge1xuICAgICAgYXdhaXQgZnMucm0obnB4Q2FjaGUsIHsgcmVjdXJzaXZlOiB0cnVlLCBmb3JjZTogdHJ1ZSB9KTtcbiAgICB9IGNhdGNoIChlcnIpIHtcbiAgICAgIGNvbnNvbGUud2FybihcIkZhaWxlZCB0byBjbGVhciBucHggY2FjaGUgZm9sZGVyOlwiLCBlcnIpO1xuICAgIH1cblxuICAgIC8vIEZJWDogQ2xlYW4gbnBtIGNhY2hlIGZvcmNpYmx5XG4gICAgYXdhaXQgZXhlY2FDb21tYW5kKFwibnBtIGNhY2hlIGNsZWFuIC0tZm9yY2VcIik7XG5cbiAgICAvLyBSdW4gY3JlYXRlLW5leHQtYXBwIGluIHRoZSBpbnN0YWxsRGlyXG4gICAgY29uc3QgeyBzdGRvdXQgfSA9IGF3YWl0IGV4ZWNhQ29tbWFuZChgbnB4IGNyZWF0ZS1uZXh0LWFwcEBsYXRlc3QgJHtwcm9qZWN0TmFtZX0gLS15ZXNgLCB7XG4gICAgICBjd2Q6IGluc3RhbGxEaXIsXG4gICAgICBzaGVsbDogdHJ1ZSxcbiAgICB9KTtcblxuICAgIHJldHVybiBOZXh0UmVzcG9uc2UuanNvbih7XG4gIHN1Y2Nlc3M6IHRydWUsXG4gIG1lc3NhZ2U6IGBQcm9qZWN0IFwiJHtwcm9qZWN0TmFtZX1cIiBjcmVhdGVkIHN1Y2Nlc3NmdWxseS5gLFxuICBzdGRvdXQsXG4gIHBhdGg6IHByb2plY3RQYXRoLFxufSk7XG5cbiAgIH0gY2F0Y2ggKGVycm9yOiBhbnkpIHtcbiAgICBjb25zb2xlLmVycm9yKCdOZXh0SlMgY3JlYXRlIGZhaWxlZDonLCBlcnJvcik7XG5cbiAgICAvLyBTZW5kIGJhY2sgZGV0YWlsZWQgZXJyb3IgaW5mb1xuICAgIHJldHVybiBOZXh0UmVzcG9uc2UuanNvbih7XG4gICAgICBlcnJvcjogYFN0ZXAgZmFpbGVkOiBDcmVhdGluZyBOZXh0SlMgcHJvamVjdCAtICR7ZXJyb3IubWVzc2FnZSB8fCBlcnJvcn1gLFxuICAgICAgZGV0YWlsczogZXJyb3Iuc3RkZXJyIHx8IGVycm9yLnN0ZG91dCB8fCBlcnJvcixcbiAgICB9LCB7IHN0YXR1czogNTAwIH0pO1xuICB9XG59XG4iXSwibmFtZXMiOlsiTmV4dFJlc3BvbnNlIiwiZXhlY2FDb21tYW5kIiwicGF0aCIsIm9zIiwiZnMiLCJmc1N5bmMiLCJta2RpcnAiLCJQT1NUIiwicmVxIiwiYm9keSIsImpzb24iLCJwcm9qZWN0TmFtZSIsImVycm9yIiwic3RhdHVzIiwiaW5zdGFsbERpciIsImpvaW4iLCJwcm9jZXNzIiwiY3dkIiwicHJvamVjdFBhdGgiLCJleGlzdHNTeW5jIiwibnB4Q2FjaGUiLCJob21lZGlyIiwicm0iLCJyZWN1cnNpdmUiLCJmb3JjZSIsImVyciIsImNvbnNvbGUiLCJ3YXJuIiwic3Rkb3V0Iiwic2hlbGwiLCJzdWNjZXNzIiwibWVzc2FnZSIsImRldGFpbHMiLCJzdGRlcnIiXSwiaWdub3JlTGlzdCI6W10sInNvdXJjZVJvb3QiOiIifQ==\n//# sourceURL=webpack-internal:///(rsc)/./app/api/nextjs/create/route.ts\n");

/***/ }),

/***/ "(rsc)/./node_modules/next/dist/build/webpack/loaders/next-app-loader/index.js?name=app%2Fapi%2Fnextjs%2Fcreate%2Froute&page=%2Fapi%2Fnextjs%2Fcreate%2Froute&appPaths=&pagePath=private-next-app-dir%2Fapi%2Fnextjs%2Fcreate%2Froute.ts&appDir=%2FUsers%2Fantonwentzel%2Fnxtflutter_core%2Fmain%2Fapp&pageExtensions=tsx&pageExtensions=ts&pageExtensions=jsx&pageExtensions=js&rootDir=%2FUsers%2Fantonwentzel%2Fnxtflutter_core%2Fmain&isDev=true&tsconfigPath=tsconfig.json&basePath=&assetPrefix=&nextConfigOutput=&preferredRegion=&middlewareConfig=e30%3D!":
/*!*******************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************!*\
  !*** ./node_modules/next/dist/build/webpack/loaders/next-app-loader/index.js?name=app%2Fapi%2Fnextjs%2Fcreate%2Froute&page=%2Fapi%2Fnextjs%2Fcreate%2Froute&appPaths=&pagePath=private-next-app-dir%2Fapi%2Fnextjs%2Fcreate%2Froute.ts&appDir=%2FUsers%2Fantonwentzel%2Fnxtflutter_core%2Fmain%2Fapp&pageExtensions=tsx&pageExtensions=ts&pageExtensions=jsx&pageExtensions=js&rootDir=%2FUsers%2Fantonwentzel%2Fnxtflutter_core%2Fmain&isDev=true&tsconfigPath=tsconfig.json&basePath=&assetPrefix=&nextConfigOutput=&preferredRegion=&middlewareConfig=e30%3D! ***!
  \*******************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
eval("__webpack_require__.r(__webpack_exports__);\n/* harmony export */ __webpack_require__.d(__webpack_exports__, {\n/* harmony export */   patchFetch: () => (/* binding */ patchFetch),\n/* harmony export */   routeModule: () => (/* binding */ routeModule),\n/* harmony export */   serverHooks: () => (/* binding */ serverHooks),\n/* harmony export */   workAsyncStorage: () => (/* binding */ workAsyncStorage),\n/* harmony export */   workUnitAsyncStorage: () => (/* binding */ workUnitAsyncStorage)\n/* harmony export */ });\n/* harmony import */ var next_dist_server_route_modules_app_route_module_compiled__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! next/dist/server/route-modules/app-route/module.compiled */ \"(rsc)/./node_modules/next/dist/server/route-modules/app-route/module.compiled.js\");\n/* harmony import */ var next_dist_server_route_modules_app_route_module_compiled__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(next_dist_server_route_modules_app_route_module_compiled__WEBPACK_IMPORTED_MODULE_0__);\n/* harmony import */ var next_dist_server_route_kind__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! next/dist/server/route-kind */ \"(rsc)/./node_modules/next/dist/server/route-kind.js\");\n/* harmony import */ var next_dist_server_lib_patch_fetch__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! next/dist/server/lib/patch-fetch */ \"(rsc)/./node_modules/next/dist/server/lib/patch-fetch.js\");\n/* harmony import */ var next_dist_server_lib_patch_fetch__WEBPACK_IMPORTED_MODULE_2___default = /*#__PURE__*/__webpack_require__.n(next_dist_server_lib_patch_fetch__WEBPACK_IMPORTED_MODULE_2__);\n/* harmony import */ var _Users_antonwentzel_nxtflutter_core_main_app_api_nextjs_create_route_ts__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ./app/api/nextjs/create/route.ts */ \"(rsc)/./app/api/nextjs/create/route.ts\");\n\n\n\n\n// We inject the nextConfigOutput here so that we can use them in the route\n// module.\nconst nextConfigOutput = \"\"\nconst routeModule = new next_dist_server_route_modules_app_route_module_compiled__WEBPACK_IMPORTED_MODULE_0__.AppRouteRouteModule({\n    definition: {\n        kind: next_dist_server_route_kind__WEBPACK_IMPORTED_MODULE_1__.RouteKind.APP_ROUTE,\n        page: \"/api/nextjs/create/route\",\n        pathname: \"/api/nextjs/create\",\n        filename: \"route\",\n        bundlePath: \"app/api/nextjs/create/route\"\n    },\n    resolvedPagePath: \"/Users/antonwentzel/nxtflutter_core/main/app/api/nextjs/create/route.ts\",\n    nextConfigOutput,\n    userland: _Users_antonwentzel_nxtflutter_core_main_app_api_nextjs_create_route_ts__WEBPACK_IMPORTED_MODULE_3__\n});\n// Pull out the exports that we need to expose from the module. This should\n// be eliminated when we've moved the other routes to the new format. These\n// are used to hook into the route.\nconst { workAsyncStorage, workUnitAsyncStorage, serverHooks } = routeModule;\nfunction patchFetch() {\n    return (0,next_dist_server_lib_patch_fetch__WEBPACK_IMPORTED_MODULE_2__.patchFetch)({\n        workAsyncStorage,\n        workUnitAsyncStorage\n    });\n}\n\n\n//# sourceMappingURL=app-route.js.map//# sourceURL=[module]\n//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiKHJzYykvLi9ub2RlX21vZHVsZXMvbmV4dC9kaXN0L2J1aWxkL3dlYnBhY2svbG9hZGVycy9uZXh0LWFwcC1sb2FkZXIvaW5kZXguanM/bmFtZT1hcHAlMkZhcGklMkZuZXh0anMlMkZjcmVhdGUlMkZyb3V0ZSZwYWdlPSUyRmFwaSUyRm5leHRqcyUyRmNyZWF0ZSUyRnJvdXRlJmFwcFBhdGhzPSZwYWdlUGF0aD1wcml2YXRlLW5leHQtYXBwLWRpciUyRmFwaSUyRm5leHRqcyUyRmNyZWF0ZSUyRnJvdXRlLnRzJmFwcERpcj0lMkZVc2VycyUyRmFudG9ud2VudHplbCUyRm54dGZsdXR0ZXJfY29yZSUyRm1haW4lMkZhcHAmcGFnZUV4dGVuc2lvbnM9dHN4JnBhZ2VFeHRlbnNpb25zPXRzJnBhZ2VFeHRlbnNpb25zPWpzeCZwYWdlRXh0ZW5zaW9ucz1qcyZyb290RGlyPSUyRlVzZXJzJTJGYW50b253ZW50emVsJTJGbnh0Zmx1dHRlcl9jb3JlJTJGbWFpbiZpc0Rldj10cnVlJnRzY29uZmlnUGF0aD10c2NvbmZpZy5qc29uJmJhc2VQYXRoPSZhc3NldFByZWZpeD0mbmV4dENvbmZpZ091dHB1dD0mcHJlZmVycmVkUmVnaW9uPSZtaWRkbGV3YXJlQ29uZmlnPWUzMCUzRCEiLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7QUFBK0Y7QUFDdkM7QUFDcUI7QUFDdUI7QUFDcEc7QUFDQTtBQUNBO0FBQ0Esd0JBQXdCLHlHQUFtQjtBQUMzQztBQUNBLGNBQWMsa0VBQVM7QUFDdkI7QUFDQTtBQUNBO0FBQ0E7QUFDQSxLQUFLO0FBQ0w7QUFDQTtBQUNBLFlBQVk7QUFDWixDQUFDO0FBQ0Q7QUFDQTtBQUNBO0FBQ0EsUUFBUSxzREFBc0Q7QUFDOUQ7QUFDQSxXQUFXLDRFQUFXO0FBQ3RCO0FBQ0E7QUFDQSxLQUFLO0FBQ0w7QUFDMEY7O0FBRTFGIiwic291cmNlcyI6WyIiXSwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgQXBwUm91dGVSb3V0ZU1vZHVsZSB9IGZyb20gXCJuZXh0L2Rpc3Qvc2VydmVyL3JvdXRlLW1vZHVsZXMvYXBwLXJvdXRlL21vZHVsZS5jb21waWxlZFwiO1xuaW1wb3J0IHsgUm91dGVLaW5kIH0gZnJvbSBcIm5leHQvZGlzdC9zZXJ2ZXIvcm91dGUta2luZFwiO1xuaW1wb3J0IHsgcGF0Y2hGZXRjaCBhcyBfcGF0Y2hGZXRjaCB9IGZyb20gXCJuZXh0L2Rpc3Qvc2VydmVyL2xpYi9wYXRjaC1mZXRjaFwiO1xuaW1wb3J0ICogYXMgdXNlcmxhbmQgZnJvbSBcIi9Vc2Vycy9hbnRvbndlbnR6ZWwvbnh0Zmx1dHRlcl9jb3JlL21haW4vYXBwL2FwaS9uZXh0anMvY3JlYXRlL3JvdXRlLnRzXCI7XG4vLyBXZSBpbmplY3QgdGhlIG5leHRDb25maWdPdXRwdXQgaGVyZSBzbyB0aGF0IHdlIGNhbiB1c2UgdGhlbSBpbiB0aGUgcm91dGVcbi8vIG1vZHVsZS5cbmNvbnN0IG5leHRDb25maWdPdXRwdXQgPSBcIlwiXG5jb25zdCByb3V0ZU1vZHVsZSA9IG5ldyBBcHBSb3V0ZVJvdXRlTW9kdWxlKHtcbiAgICBkZWZpbml0aW9uOiB7XG4gICAgICAgIGtpbmQ6IFJvdXRlS2luZC5BUFBfUk9VVEUsXG4gICAgICAgIHBhZ2U6IFwiL2FwaS9uZXh0anMvY3JlYXRlL3JvdXRlXCIsXG4gICAgICAgIHBhdGhuYW1lOiBcIi9hcGkvbmV4dGpzL2NyZWF0ZVwiLFxuICAgICAgICBmaWxlbmFtZTogXCJyb3V0ZVwiLFxuICAgICAgICBidW5kbGVQYXRoOiBcImFwcC9hcGkvbmV4dGpzL2NyZWF0ZS9yb3V0ZVwiXG4gICAgfSxcbiAgICByZXNvbHZlZFBhZ2VQYXRoOiBcIi9Vc2Vycy9hbnRvbndlbnR6ZWwvbnh0Zmx1dHRlcl9jb3JlL21haW4vYXBwL2FwaS9uZXh0anMvY3JlYXRlL3JvdXRlLnRzXCIsXG4gICAgbmV4dENvbmZpZ091dHB1dCxcbiAgICB1c2VybGFuZFxufSk7XG4vLyBQdWxsIG91dCB0aGUgZXhwb3J0cyB0aGF0IHdlIG5lZWQgdG8gZXhwb3NlIGZyb20gdGhlIG1vZHVsZS4gVGhpcyBzaG91bGRcbi8vIGJlIGVsaW1pbmF0ZWQgd2hlbiB3ZSd2ZSBtb3ZlZCB0aGUgb3RoZXIgcm91dGVzIHRvIHRoZSBuZXcgZm9ybWF0LiBUaGVzZVxuLy8gYXJlIHVzZWQgdG8gaG9vayBpbnRvIHRoZSByb3V0ZS5cbmNvbnN0IHsgd29ya0FzeW5jU3RvcmFnZSwgd29ya1VuaXRBc3luY1N0b3JhZ2UsIHNlcnZlckhvb2tzIH0gPSByb3V0ZU1vZHVsZTtcbmZ1bmN0aW9uIHBhdGNoRmV0Y2goKSB7XG4gICAgcmV0dXJuIF9wYXRjaEZldGNoKHtcbiAgICAgICAgd29ya0FzeW5jU3RvcmFnZSxcbiAgICAgICAgd29ya1VuaXRBc3luY1N0b3JhZ2VcbiAgICB9KTtcbn1cbmV4cG9ydCB7IHJvdXRlTW9kdWxlLCB3b3JrQXN5bmNTdG9yYWdlLCB3b3JrVW5pdEFzeW5jU3RvcmFnZSwgc2VydmVySG9va3MsIHBhdGNoRmV0Y2gsICB9O1xuXG4vLyMgc291cmNlTWFwcGluZ1VSTD1hcHAtcm91dGUuanMubWFwIl0sIm5hbWVzIjpbXSwiaWdub3JlTGlzdCI6W10sInNvdXJjZVJvb3QiOiIifQ==\n//# sourceURL=webpack-internal:///(rsc)/./node_modules/next/dist/build/webpack/loaders/next-app-loader/index.js?name=app%2Fapi%2Fnextjs%2Fcreate%2Froute&page=%2Fapi%2Fnextjs%2Fcreate%2Froute&appPaths=&pagePath=private-next-app-dir%2Fapi%2Fnextjs%2Fcreate%2Froute.ts&appDir=%2FUsers%2Fantonwentzel%2Fnxtflutter_core%2Fmain%2Fapp&pageExtensions=tsx&pageExtensions=ts&pageExtensions=jsx&pageExtensions=js&rootDir=%2FUsers%2Fantonwentzel%2Fnxtflutter_core%2Fmain&isDev=true&tsconfigPath=tsconfig.json&basePath=&assetPrefix=&nextConfigOutput=&preferredRegion=&middlewareConfig=e30%3D!\n");

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

/***/ "child_process":
/*!********************************!*\
  !*** external "child_process" ***!
  \********************************/
/***/ ((module) => {

"use strict";
module.exports = require("child_process");

/***/ }),

/***/ "fs":
/*!*********************!*\
  !*** external "fs" ***!
  \*********************/
/***/ ((module) => {

"use strict";
module.exports = require("fs");

/***/ }),

/***/ "fs/promises":
/*!******************************!*\
  !*** external "fs/promises" ***!
  \******************************/
/***/ ((module) => {

"use strict";
module.exports = require("fs/promises");

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

/***/ "os":
/*!*********************!*\
  !*** external "os" ***!
  \*********************/
/***/ ((module) => {

"use strict";
module.exports = require("os");

/***/ }),

/***/ "path":
/*!***********************!*\
  !*** external "path" ***!
  \***********************/
/***/ ((module) => {

"use strict";
module.exports = require("path");

/***/ })

};
;

// load runtime
var __webpack_require__ = require("../../../../webpack-runtime.js");
__webpack_require__.C(exports);
var __webpack_exec__ = (moduleId) => (__webpack_require__(__webpack_require__.s = moduleId))
var __webpack_exports__ = __webpack_require__.X(0, ["vendor-chunks/next","vendor-chunks/@opentelemetry","vendor-chunks/execa","vendor-chunks/get-stream","vendor-chunks/cross-spawn","vendor-chunks/figures","vendor-chunks/@sindresorhus","vendor-chunks/human-signals","vendor-chunks/pretty-ms","vendor-chunks/which","vendor-chunks/isexe","vendor-chunks/yoctocolors","vendor-chunks/@sec-ant","vendor-chunks/npm-run-path","vendor-chunks/unicorn-magic","vendor-chunks/is-stream","vendor-chunks/parse-ms","vendor-chunks/strip-final-newline","vendor-chunks/path-key","vendor-chunks/shebang-command","vendor-chunks/is-plain-obj","vendor-chunks/shebang-regex","vendor-chunks/mkdirp"], () => (__webpack_exec__("(rsc)/./node_modules/next/dist/build/webpack/loaders/next-app-loader/index.js?name=app%2Fapi%2Fnextjs%2Fcreate%2Froute&page=%2Fapi%2Fnextjs%2Fcreate%2Froute&appPaths=&pagePath=private-next-app-dir%2Fapi%2Fnextjs%2Fcreate%2Froute.ts&appDir=%2FUsers%2Fantonwentzel%2Fnxtflutter_core%2Fmain%2Fapp&pageExtensions=tsx&pageExtensions=ts&pageExtensions=jsx&pageExtensions=js&rootDir=%2FUsers%2Fantonwentzel%2Fnxtflutter_core%2Fmain&isDev=true&tsconfigPath=tsconfig.json&basePath=&assetPrefix=&nextConfigOutput=&preferredRegion=&middlewareConfig=e30%3D!")));
module.exports = __webpack_exports__;

})();