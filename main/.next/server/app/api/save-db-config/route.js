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
exports.id = "app/api/save-db-config/route";
exports.ids = ["app/api/save-db-config/route"];
exports.modules = {

/***/ "(rsc)/./app/api/save-db-config/route.ts":
/*!*****************************************!*\
  !*** ./app/api/save-db-config/route.ts ***!
  \*****************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
eval("__webpack_require__.r(__webpack_exports__);\n/* harmony export */ __webpack_require__.d(__webpack_exports__, {\n/* harmony export */   POST: () => (/* binding */ POST)\n/* harmony export */ });\n/* harmony import */ var fs_promises__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! fs/promises */ \"fs/promises\");\n/* harmony import */ var fs_promises__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(fs_promises__WEBPACK_IMPORTED_MODULE_0__);\n/* harmony import */ var path__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! path */ \"path\");\n/* harmony import */ var path__WEBPACK_IMPORTED_MODULE_1___default = /*#__PURE__*/__webpack_require__.n(path__WEBPACK_IMPORTED_MODULE_1__);\n\n\nconst ENV_FILE_PATH = path__WEBPACK_IMPORTED_MODULE_1___default().resolve(process.cwd(), '.env.local');\n// Escape newlines in private_key inside a JSON object\nfunction serializeJsonValue(value) {\n    if (typeof value === 'object' && value !== null) {\n        const clone = JSON.parse(JSON.stringify(value)) // deep clone\n        ;\n        if (typeof clone.private_key === 'string') {\n            clone.private_key = clone.private_key.replace(/\\n/g, '\\\\n');\n        }\n        return JSON.stringify(clone);\n    }\n    return String(value);\n}\nasync function writeEnvFileFromObject(envObject) {\n    const lines = [];\n    for (const [key, value] of Object.entries(envObject)){\n        if (value === undefined || value === null) continue;\n        if (key.toLowerCase() === 'firebaseconfigjson' || key === 'FIREBASE_CONFIG_JSON') {\n            const serialized = serializeJsonValue(value);\n            lines.push(`DB_FIREBASECONFIGJSON=${serialized}`);\n        } else {\n            const envKey = `DB_${key.toUpperCase()}`;\n            const serialized = serializeJsonValue(value);\n            lines.push(`${envKey}=${serialized}`);\n        }\n    }\n    await (0,fs_promises__WEBPACK_IMPORTED_MODULE_0__.writeFile)(ENV_FILE_PATH, lines.join('\\n'), 'utf-8');\n}\nasync function POST(req) {\n    try {\n        const body = await req.json();\n        // Directly overwrite .env.local with the new values only\n        await writeEnvFileFromObject(body);\n        return new Response(JSON.stringify({\n            success: true\n        }), {\n            status: 200\n        });\n    } catch (error) {\n        console.error('Error writing .env.local:', error);\n        return new Response(JSON.stringify({\n            error: error.message\n        }), {\n            status: 500\n        });\n    }\n}\n//# sourceURL=[module]\n//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiKHJzYykvLi9hcHAvYXBpL3NhdmUtZGItY29uZmlnL3JvdXRlLnRzIiwibWFwcGluZ3MiOiI7Ozs7Ozs7O0FBQXVDO0FBQ2hCO0FBRXZCLE1BQU1FLGdCQUFnQkQsbURBQVksQ0FBQ0csUUFBUUMsR0FBRyxJQUFJO0FBRWxELHNEQUFzRDtBQUN0RCxTQUFTQyxtQkFBbUJDLEtBQVU7SUFDcEMsSUFBSSxPQUFPQSxVQUFVLFlBQVlBLFVBQVUsTUFBTTtRQUMvQyxNQUFNQyxRQUFRQyxLQUFLQyxLQUFLLENBQUNELEtBQUtFLFNBQVMsQ0FBQ0osUUFBUSxhQUFhOztRQUM3RCxJQUFJLE9BQU9DLE1BQU1JLFdBQVcsS0FBSyxVQUFVO1lBQ3pDSixNQUFNSSxXQUFXLEdBQUdKLE1BQU1JLFdBQVcsQ0FBQ0MsT0FBTyxDQUFDLE9BQU87UUFDdkQ7UUFDQSxPQUFPSixLQUFLRSxTQUFTLENBQUNIO0lBQ3hCO0lBQ0EsT0FBT00sT0FBT1A7QUFDaEI7QUFFQSxlQUFlUSx1QkFBdUJDLFNBQThCO0lBQ2xFLE1BQU1DLFFBQWtCLEVBQUU7SUFFMUIsS0FBSyxNQUFNLENBQUNDLEtBQUtYLE1BQU0sSUFBSVksT0FBT0MsT0FBTyxDQUFDSixXQUFZO1FBQ3BELElBQUlULFVBQVVjLGFBQWFkLFVBQVUsTUFBTTtRQUUzQyxJQUFJVyxJQUFJSSxXQUFXLE9BQU8sd0JBQXdCSixRQUFRLHdCQUF3QjtZQUNoRixNQUFNSyxhQUFhakIsbUJBQW1CQztZQUN0Q1UsTUFBTU8sSUFBSSxDQUFDLENBQUMsc0JBQXNCLEVBQUVELFlBQVk7UUFDbEQsT0FBTztZQUNMLE1BQU1FLFNBQVMsQ0FBQyxHQUFHLEVBQUVQLElBQUlRLFdBQVcsSUFBSTtZQUN4QyxNQUFNSCxhQUFhakIsbUJBQW1CQztZQUN0Q1UsTUFBTU8sSUFBSSxDQUFDLEdBQUdDLE9BQU8sQ0FBQyxFQUFFRixZQUFZO1FBQ3RDO0lBQ0Y7SUFFQSxNQUFNdkIsc0RBQVNBLENBQUNFLGVBQWVlLE1BQU1VLElBQUksQ0FBQyxPQUFPO0FBQ25EO0FBRU8sZUFBZUMsS0FBS0MsR0FBWTtJQUNyQyxJQUFJO1FBQ0YsTUFBTUMsT0FBTyxNQUFNRCxJQUFJRSxJQUFJO1FBRTNCLHlEQUF5RDtRQUN6RCxNQUFNaEIsdUJBQXVCZTtRQUU3QixPQUFPLElBQUlFLFNBQVN2QixLQUFLRSxTQUFTLENBQUM7WUFBRXNCLFNBQVM7UUFBSyxJQUFJO1lBQUVDLFFBQVE7UUFBSTtJQUN2RSxFQUFFLE9BQU9DLE9BQVk7UUFDbkJDLFFBQVFELEtBQUssQ0FBQyw2QkFBNkJBO1FBQzNDLE9BQU8sSUFBSUgsU0FBU3ZCLEtBQUtFLFNBQVMsQ0FBQztZQUFFd0IsT0FBT0EsTUFBTUUsT0FBTztRQUFDLElBQUk7WUFBRUgsUUFBUTtRQUFJO0lBQzlFO0FBQ0YiLCJzb3VyY2VzIjpbIi9Vc2Vycy9hbnRvbndlbnR6ZWwvbnh0Zmx1dHRlcl9jb3JlL21haW4vYXBwL2FwaS9zYXZlLWRiLWNvbmZpZy9yb3V0ZS50cyJdLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyB3cml0ZUZpbGUgfSBmcm9tICdmcy9wcm9taXNlcydcbmltcG9ydCBwYXRoIGZyb20gJ3BhdGgnXG5cbmNvbnN0IEVOVl9GSUxFX1BBVEggPSBwYXRoLnJlc29sdmUocHJvY2Vzcy5jd2QoKSwgJy5lbnYubG9jYWwnKVxuXG4vLyBFc2NhcGUgbmV3bGluZXMgaW4gcHJpdmF0ZV9rZXkgaW5zaWRlIGEgSlNPTiBvYmplY3RcbmZ1bmN0aW9uIHNlcmlhbGl6ZUpzb25WYWx1ZSh2YWx1ZTogYW55KTogc3RyaW5nIHtcbiAgaWYgKHR5cGVvZiB2YWx1ZSA9PT0gJ29iamVjdCcgJiYgdmFsdWUgIT09IG51bGwpIHtcbiAgICBjb25zdCBjbG9uZSA9IEpTT04ucGFyc2UoSlNPTi5zdHJpbmdpZnkodmFsdWUpKSAvLyBkZWVwIGNsb25lXG4gICAgaWYgKHR5cGVvZiBjbG9uZS5wcml2YXRlX2tleSA9PT0gJ3N0cmluZycpIHtcbiAgICAgIGNsb25lLnByaXZhdGVfa2V5ID0gY2xvbmUucHJpdmF0ZV9rZXkucmVwbGFjZSgvXFxuL2csICdcXFxcbicpXG4gICAgfVxuICAgIHJldHVybiBKU09OLnN0cmluZ2lmeShjbG9uZSlcbiAgfVxuICByZXR1cm4gU3RyaW5nKHZhbHVlKVxufVxuXG5hc3luYyBmdW5jdGlvbiB3cml0ZUVudkZpbGVGcm9tT2JqZWN0KGVudk9iamVjdDogUmVjb3JkPHN0cmluZywgYW55Pikge1xuICBjb25zdCBsaW5lczogc3RyaW5nW10gPSBbXVxuXG4gIGZvciAoY29uc3QgW2tleSwgdmFsdWVdIG9mIE9iamVjdC5lbnRyaWVzKGVudk9iamVjdCkpIHtcbiAgICBpZiAodmFsdWUgPT09IHVuZGVmaW5lZCB8fCB2YWx1ZSA9PT0gbnVsbCkgY29udGludWVcblxuICAgIGlmIChrZXkudG9Mb3dlckNhc2UoKSA9PT0gJ2ZpcmViYXNlY29uZmlnanNvbicgfHwga2V5ID09PSAnRklSRUJBU0VfQ09ORklHX0pTT04nKSB7XG4gICAgICBjb25zdCBzZXJpYWxpemVkID0gc2VyaWFsaXplSnNvblZhbHVlKHZhbHVlKVxuICAgICAgbGluZXMucHVzaChgREJfRklSRUJBU0VDT05GSUdKU09OPSR7c2VyaWFsaXplZH1gKVxuICAgIH0gZWxzZSB7XG4gICAgICBjb25zdCBlbnZLZXkgPSBgREJfJHtrZXkudG9VcHBlckNhc2UoKX1gXG4gICAgICBjb25zdCBzZXJpYWxpemVkID0gc2VyaWFsaXplSnNvblZhbHVlKHZhbHVlKVxuICAgICAgbGluZXMucHVzaChgJHtlbnZLZXl9PSR7c2VyaWFsaXplZH1gKVxuICAgIH1cbiAgfVxuXG4gIGF3YWl0IHdyaXRlRmlsZShFTlZfRklMRV9QQVRILCBsaW5lcy5qb2luKCdcXG4nKSwgJ3V0Zi04Jylcbn1cblxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIFBPU1QocmVxOiBSZXF1ZXN0KSB7XG4gIHRyeSB7XG4gICAgY29uc3QgYm9keSA9IGF3YWl0IHJlcS5qc29uKClcblxuICAgIC8vIERpcmVjdGx5IG92ZXJ3cml0ZSAuZW52LmxvY2FsIHdpdGggdGhlIG5ldyB2YWx1ZXMgb25seVxuICAgIGF3YWl0IHdyaXRlRW52RmlsZUZyb21PYmplY3QoYm9keSlcblxuICAgIHJldHVybiBuZXcgUmVzcG9uc2UoSlNPTi5zdHJpbmdpZnkoeyBzdWNjZXNzOiB0cnVlIH0pLCB7IHN0YXR1czogMjAwIH0pXG4gIH0gY2F0Y2ggKGVycm9yOiBhbnkpIHtcbiAgICBjb25zb2xlLmVycm9yKCdFcnJvciB3cml0aW5nIC5lbnYubG9jYWw6JywgZXJyb3IpXG4gICAgcmV0dXJuIG5ldyBSZXNwb25zZShKU09OLnN0cmluZ2lmeSh7IGVycm9yOiBlcnJvci5tZXNzYWdlIH0pLCB7IHN0YXR1czogNTAwIH0pXG4gIH1cbn1cbiJdLCJuYW1lcyI6WyJ3cml0ZUZpbGUiLCJwYXRoIiwiRU5WX0ZJTEVfUEFUSCIsInJlc29sdmUiLCJwcm9jZXNzIiwiY3dkIiwic2VyaWFsaXplSnNvblZhbHVlIiwidmFsdWUiLCJjbG9uZSIsIkpTT04iLCJwYXJzZSIsInN0cmluZ2lmeSIsInByaXZhdGVfa2V5IiwicmVwbGFjZSIsIlN0cmluZyIsIndyaXRlRW52RmlsZUZyb21PYmplY3QiLCJlbnZPYmplY3QiLCJsaW5lcyIsImtleSIsIk9iamVjdCIsImVudHJpZXMiLCJ1bmRlZmluZWQiLCJ0b0xvd2VyQ2FzZSIsInNlcmlhbGl6ZWQiLCJwdXNoIiwiZW52S2V5IiwidG9VcHBlckNhc2UiLCJqb2luIiwiUE9TVCIsInJlcSIsImJvZHkiLCJqc29uIiwiUmVzcG9uc2UiLCJzdWNjZXNzIiwic3RhdHVzIiwiZXJyb3IiLCJjb25zb2xlIiwibWVzc2FnZSJdLCJpZ25vcmVMaXN0IjpbXSwic291cmNlUm9vdCI6IiJ9\n//# sourceURL=webpack-internal:///(rsc)/./app/api/save-db-config/route.ts\n");

/***/ }),

/***/ "(rsc)/./node_modules/next/dist/build/webpack/loaders/next-app-loader/index.js?name=app%2Fapi%2Fsave-db-config%2Froute&page=%2Fapi%2Fsave-db-config%2Froute&appPaths=&pagePath=private-next-app-dir%2Fapi%2Fsave-db-config%2Froute.ts&appDir=%2FUsers%2Fantonwentzel%2Fnxtflutter_core%2Fmain%2Fapp&pageExtensions=tsx&pageExtensions=ts&pageExtensions=jsx&pageExtensions=js&rootDir=%2FUsers%2Fantonwentzel%2Fnxtflutter_core%2Fmain&isDev=true&tsconfigPath=tsconfig.json&basePath=&assetPrefix=&nextConfigOutput=&preferredRegion=&middlewareConfig=e30%3D!":
/*!****************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************!*\
  !*** ./node_modules/next/dist/build/webpack/loaders/next-app-loader/index.js?name=app%2Fapi%2Fsave-db-config%2Froute&page=%2Fapi%2Fsave-db-config%2Froute&appPaths=&pagePath=private-next-app-dir%2Fapi%2Fsave-db-config%2Froute.ts&appDir=%2FUsers%2Fantonwentzel%2Fnxtflutter_core%2Fmain%2Fapp&pageExtensions=tsx&pageExtensions=ts&pageExtensions=jsx&pageExtensions=js&rootDir=%2FUsers%2Fantonwentzel%2Fnxtflutter_core%2Fmain&isDev=true&tsconfigPath=tsconfig.json&basePath=&assetPrefix=&nextConfigOutput=&preferredRegion=&middlewareConfig=e30%3D! ***!
  \****************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
eval("__webpack_require__.r(__webpack_exports__);\n/* harmony export */ __webpack_require__.d(__webpack_exports__, {\n/* harmony export */   patchFetch: () => (/* binding */ patchFetch),\n/* harmony export */   routeModule: () => (/* binding */ routeModule),\n/* harmony export */   serverHooks: () => (/* binding */ serverHooks),\n/* harmony export */   workAsyncStorage: () => (/* binding */ workAsyncStorage),\n/* harmony export */   workUnitAsyncStorage: () => (/* binding */ workUnitAsyncStorage)\n/* harmony export */ });\n/* harmony import */ var next_dist_server_route_modules_app_route_module_compiled__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! next/dist/server/route-modules/app-route/module.compiled */ \"(rsc)/./node_modules/next/dist/server/route-modules/app-route/module.compiled.js\");\n/* harmony import */ var next_dist_server_route_modules_app_route_module_compiled__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(next_dist_server_route_modules_app_route_module_compiled__WEBPACK_IMPORTED_MODULE_0__);\n/* harmony import */ var next_dist_server_route_kind__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! next/dist/server/route-kind */ \"(rsc)/./node_modules/next/dist/server/route-kind.js\");\n/* harmony import */ var next_dist_server_lib_patch_fetch__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! next/dist/server/lib/patch-fetch */ \"(rsc)/./node_modules/next/dist/server/lib/patch-fetch.js\");\n/* harmony import */ var next_dist_server_lib_patch_fetch__WEBPACK_IMPORTED_MODULE_2___default = /*#__PURE__*/__webpack_require__.n(next_dist_server_lib_patch_fetch__WEBPACK_IMPORTED_MODULE_2__);\n/* harmony import */ var _Users_antonwentzel_nxtflutter_core_main_app_api_save_db_config_route_ts__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ./app/api/save-db-config/route.ts */ \"(rsc)/./app/api/save-db-config/route.ts\");\n\n\n\n\n// We inject the nextConfigOutput here so that we can use them in the route\n// module.\nconst nextConfigOutput = \"\"\nconst routeModule = new next_dist_server_route_modules_app_route_module_compiled__WEBPACK_IMPORTED_MODULE_0__.AppRouteRouteModule({\n    definition: {\n        kind: next_dist_server_route_kind__WEBPACK_IMPORTED_MODULE_1__.RouteKind.APP_ROUTE,\n        page: \"/api/save-db-config/route\",\n        pathname: \"/api/save-db-config\",\n        filename: \"route\",\n        bundlePath: \"app/api/save-db-config/route\"\n    },\n    resolvedPagePath: \"/Users/antonwentzel/nxtflutter_core/main/app/api/save-db-config/route.ts\",\n    nextConfigOutput,\n    userland: _Users_antonwentzel_nxtflutter_core_main_app_api_save_db_config_route_ts__WEBPACK_IMPORTED_MODULE_3__\n});\n// Pull out the exports that we need to expose from the module. This should\n// be eliminated when we've moved the other routes to the new format. These\n// are used to hook into the route.\nconst { workAsyncStorage, workUnitAsyncStorage, serverHooks } = routeModule;\nfunction patchFetch() {\n    return (0,next_dist_server_lib_patch_fetch__WEBPACK_IMPORTED_MODULE_2__.patchFetch)({\n        workAsyncStorage,\n        workUnitAsyncStorage\n    });\n}\n\n\n//# sourceMappingURL=app-route.js.map//# sourceURL=[module]\n//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiKHJzYykvLi9ub2RlX21vZHVsZXMvbmV4dC9kaXN0L2J1aWxkL3dlYnBhY2svbG9hZGVycy9uZXh0LWFwcC1sb2FkZXIvaW5kZXguanM/bmFtZT1hcHAlMkZhcGklMkZzYXZlLWRiLWNvbmZpZyUyRnJvdXRlJnBhZ2U9JTJGYXBpJTJGc2F2ZS1kYi1jb25maWclMkZyb3V0ZSZhcHBQYXRocz0mcGFnZVBhdGg9cHJpdmF0ZS1uZXh0LWFwcC1kaXIlMkZhcGklMkZzYXZlLWRiLWNvbmZpZyUyRnJvdXRlLnRzJmFwcERpcj0lMkZVc2VycyUyRmFudG9ud2VudHplbCUyRm54dGZsdXR0ZXJfY29yZSUyRm1haW4lMkZhcHAmcGFnZUV4dGVuc2lvbnM9dHN4JnBhZ2VFeHRlbnNpb25zPXRzJnBhZ2VFeHRlbnNpb25zPWpzeCZwYWdlRXh0ZW5zaW9ucz1qcyZyb290RGlyPSUyRlVzZXJzJTJGYW50b253ZW50emVsJTJGbnh0Zmx1dHRlcl9jb3JlJTJGbWFpbiZpc0Rldj10cnVlJnRzY29uZmlnUGF0aD10c2NvbmZpZy5qc29uJmJhc2VQYXRoPSZhc3NldFByZWZpeD0mbmV4dENvbmZpZ091dHB1dD0mcHJlZmVycmVkUmVnaW9uPSZtaWRkbGV3YXJlQ29uZmlnPWUzMCUzRCEiLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7QUFBK0Y7QUFDdkM7QUFDcUI7QUFDd0I7QUFDckc7QUFDQTtBQUNBO0FBQ0Esd0JBQXdCLHlHQUFtQjtBQUMzQztBQUNBLGNBQWMsa0VBQVM7QUFDdkI7QUFDQTtBQUNBO0FBQ0E7QUFDQSxLQUFLO0FBQ0w7QUFDQTtBQUNBLFlBQVk7QUFDWixDQUFDO0FBQ0Q7QUFDQTtBQUNBO0FBQ0EsUUFBUSxzREFBc0Q7QUFDOUQ7QUFDQSxXQUFXLDRFQUFXO0FBQ3RCO0FBQ0E7QUFDQSxLQUFLO0FBQ0w7QUFDMEY7O0FBRTFGIiwic291cmNlcyI6WyIiXSwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgQXBwUm91dGVSb3V0ZU1vZHVsZSB9IGZyb20gXCJuZXh0L2Rpc3Qvc2VydmVyL3JvdXRlLW1vZHVsZXMvYXBwLXJvdXRlL21vZHVsZS5jb21waWxlZFwiO1xuaW1wb3J0IHsgUm91dGVLaW5kIH0gZnJvbSBcIm5leHQvZGlzdC9zZXJ2ZXIvcm91dGUta2luZFwiO1xuaW1wb3J0IHsgcGF0Y2hGZXRjaCBhcyBfcGF0Y2hGZXRjaCB9IGZyb20gXCJuZXh0L2Rpc3Qvc2VydmVyL2xpYi9wYXRjaC1mZXRjaFwiO1xuaW1wb3J0ICogYXMgdXNlcmxhbmQgZnJvbSBcIi9Vc2Vycy9hbnRvbndlbnR6ZWwvbnh0Zmx1dHRlcl9jb3JlL21haW4vYXBwL2FwaS9zYXZlLWRiLWNvbmZpZy9yb3V0ZS50c1wiO1xuLy8gV2UgaW5qZWN0IHRoZSBuZXh0Q29uZmlnT3V0cHV0IGhlcmUgc28gdGhhdCB3ZSBjYW4gdXNlIHRoZW0gaW4gdGhlIHJvdXRlXG4vLyBtb2R1bGUuXG5jb25zdCBuZXh0Q29uZmlnT3V0cHV0ID0gXCJcIlxuY29uc3Qgcm91dGVNb2R1bGUgPSBuZXcgQXBwUm91dGVSb3V0ZU1vZHVsZSh7XG4gICAgZGVmaW5pdGlvbjoge1xuICAgICAgICBraW5kOiBSb3V0ZUtpbmQuQVBQX1JPVVRFLFxuICAgICAgICBwYWdlOiBcIi9hcGkvc2F2ZS1kYi1jb25maWcvcm91dGVcIixcbiAgICAgICAgcGF0aG5hbWU6IFwiL2FwaS9zYXZlLWRiLWNvbmZpZ1wiLFxuICAgICAgICBmaWxlbmFtZTogXCJyb3V0ZVwiLFxuICAgICAgICBidW5kbGVQYXRoOiBcImFwcC9hcGkvc2F2ZS1kYi1jb25maWcvcm91dGVcIlxuICAgIH0sXG4gICAgcmVzb2x2ZWRQYWdlUGF0aDogXCIvVXNlcnMvYW50b253ZW50emVsL254dGZsdXR0ZXJfY29yZS9tYWluL2FwcC9hcGkvc2F2ZS1kYi1jb25maWcvcm91dGUudHNcIixcbiAgICBuZXh0Q29uZmlnT3V0cHV0LFxuICAgIHVzZXJsYW5kXG59KTtcbi8vIFB1bGwgb3V0IHRoZSBleHBvcnRzIHRoYXQgd2UgbmVlZCB0byBleHBvc2UgZnJvbSB0aGUgbW9kdWxlLiBUaGlzIHNob3VsZFxuLy8gYmUgZWxpbWluYXRlZCB3aGVuIHdlJ3ZlIG1vdmVkIHRoZSBvdGhlciByb3V0ZXMgdG8gdGhlIG5ldyBmb3JtYXQuIFRoZXNlXG4vLyBhcmUgdXNlZCB0byBob29rIGludG8gdGhlIHJvdXRlLlxuY29uc3QgeyB3b3JrQXN5bmNTdG9yYWdlLCB3b3JrVW5pdEFzeW5jU3RvcmFnZSwgc2VydmVySG9va3MgfSA9IHJvdXRlTW9kdWxlO1xuZnVuY3Rpb24gcGF0Y2hGZXRjaCgpIHtcbiAgICByZXR1cm4gX3BhdGNoRmV0Y2goe1xuICAgICAgICB3b3JrQXN5bmNTdG9yYWdlLFxuICAgICAgICB3b3JrVW5pdEFzeW5jU3RvcmFnZVxuICAgIH0pO1xufVxuZXhwb3J0IHsgcm91dGVNb2R1bGUsIHdvcmtBc3luY1N0b3JhZ2UsIHdvcmtVbml0QXN5bmNTdG9yYWdlLCBzZXJ2ZXJIb29rcywgcGF0Y2hGZXRjaCwgIH07XG5cbi8vIyBzb3VyY2VNYXBwaW5nVVJMPWFwcC1yb3V0ZS5qcy5tYXAiXSwibmFtZXMiOltdLCJpZ25vcmVMaXN0IjpbXSwic291cmNlUm9vdCI6IiJ9\n//# sourceURL=webpack-internal:///(rsc)/./node_modules/next/dist/build/webpack/loaders/next-app-loader/index.js?name=app%2Fapi%2Fsave-db-config%2Froute&page=%2Fapi%2Fsave-db-config%2Froute&appPaths=&pagePath=private-next-app-dir%2Fapi%2Fsave-db-config%2Froute.ts&appDir=%2FUsers%2Fantonwentzel%2Fnxtflutter_core%2Fmain%2Fapp&pageExtensions=tsx&pageExtensions=ts&pageExtensions=jsx&pageExtensions=js&rootDir=%2FUsers%2Fantonwentzel%2Fnxtflutter_core%2Fmain&isDev=true&tsconfigPath=tsconfig.json&basePath=&assetPrefix=&nextConfigOutput=&preferredRegion=&middlewareConfig=e30%3D!\n");

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
var __webpack_require__ = require("../../../webpack-runtime.js");
__webpack_require__.C(exports);
var __webpack_exec__ = (moduleId) => (__webpack_require__(__webpack_require__.s = moduleId))
var __webpack_exports__ = __webpack_require__.X(0, ["vendor-chunks/next","vendor-chunks/@opentelemetry"], () => (__webpack_exec__("(rsc)/./node_modules/next/dist/build/webpack/loaders/next-app-loader/index.js?name=app%2Fapi%2Fsave-db-config%2Froute&page=%2Fapi%2Fsave-db-config%2Froute&appPaths=&pagePath=private-next-app-dir%2Fapi%2Fsave-db-config%2Froute.ts&appDir=%2FUsers%2Fantonwentzel%2Fnxtflutter_core%2Fmain%2Fapp&pageExtensions=tsx&pageExtensions=ts&pageExtensions=jsx&pageExtensions=js&rootDir=%2FUsers%2Fantonwentzel%2Fnxtflutter_core%2Fmain&isDev=true&tsconfigPath=tsconfig.json&basePath=&assetPrefix=&nextConfigOutput=&preferredRegion=&middlewareConfig=e30%3D!")));
module.exports = __webpack_exports__;

})();