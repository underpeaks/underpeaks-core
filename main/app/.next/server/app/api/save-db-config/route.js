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
eval("__webpack_require__.r(__webpack_exports__);\n/* harmony export */ __webpack_require__.d(__webpack_exports__, {\n/* harmony export */   POST: () => (/* binding */ POST)\n/* harmony export */ });\n/* harmony import */ var fs_promises__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! fs/promises */ \"fs/promises\");\n/* harmony import */ var fs_promises__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(fs_promises__WEBPACK_IMPORTED_MODULE_0__);\n/* harmony import */ var path__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! path */ \"path\");\n/* harmony import */ var path__WEBPACK_IMPORTED_MODULE_1___default = /*#__PURE__*/__webpack_require__.n(path__WEBPACK_IMPORTED_MODULE_1__);\n\n\nconst ENV_FILE_PATH = path__WEBPACK_IMPORTED_MODULE_1___default().resolve(process.cwd(), '.env.local');\n// Escape newlines in private_key inside a JSON object\nfunction serializeJsonValue(value) {\n    if (typeof value === 'object' && value !== null) {\n        const clone = JSON.parse(JSON.stringify(value)) // deep clone\n        ;\n        if (typeof clone.private_key === 'string') {\n            clone.private_key = clone.private_key.replace(/\\n/g, '\\\\n');\n        }\n        return JSON.stringify(clone);\n    }\n    return String(value);\n}\nasync function writeEnvFileFromObject(envObject) {\n    const lines = [];\n    for (const [key, value] of Object.entries(envObject)){\n        if (value === undefined || value === null) continue;\n        if (key.toLowerCase() === 'firebaseconfigjson' || key === 'FIREBASE_CONFIG_JSON') {\n            const serialized = serializeJsonValue(value);\n            lines.push(`DB_FIREBASECONFIGJSON=${serialized}`);\n        } else {\n            const envKey = `DB_${key.toUpperCase()}`;\n            const serialized = serializeJsonValue(value);\n            lines.push(`${envKey}=${serialized}`);\n        }\n    }\n    await (0,fs_promises__WEBPACK_IMPORTED_MODULE_0__.writeFile)(ENV_FILE_PATH, lines.join('\\n'), 'utf-8');\n}\nasync function POST(req) {\n    try {\n        const body = await req.json();\n        // Directly overwrite .env.local with the new values only\n        await writeEnvFileFromObject(body);\n        return new Response(JSON.stringify({\n            success: true\n        }), {\n            status: 200\n        });\n    } catch (error) {\n        console.error('Error writing .env.local:', error);\n        return new Response(JSON.stringify({\n            error: error.message\n        }), {\n            status: 500\n        });\n    }\n}\n//# sourceURL=[module]\n//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiKHJzYykvLi9hcHAvYXBpL3NhdmUtZGItY29uZmlnL3JvdXRlLnRzIiwibWFwcGluZ3MiOiI7Ozs7Ozs7O0FBQXVDO0FBQ2hCO0FBRXZCLE1BQU1FLGdCQUFnQkQsbURBQVksQ0FBQ0csUUFBUUMsR0FBRyxJQUFJO0FBRWxELHNEQUFzRDtBQUN0RCxTQUFTQyxtQkFBbUJDLEtBQVU7SUFDcEMsSUFBSSxPQUFPQSxVQUFVLFlBQVlBLFVBQVUsTUFBTTtRQUMvQyxNQUFNQyxRQUFRQyxLQUFLQyxLQUFLLENBQUNELEtBQUtFLFNBQVMsQ0FBQ0osUUFBUSxhQUFhOztRQUM3RCxJQUFJLE9BQU9DLE1BQU1JLFdBQVcsS0FBSyxVQUFVO1lBQ3pDSixNQUFNSSxXQUFXLEdBQUdKLE1BQU1JLFdBQVcsQ0FBQ0MsT0FBTyxDQUFDLE9BQU87UUFDdkQ7UUFDQSxPQUFPSixLQUFLRSxTQUFTLENBQUNIO0lBQ3hCO0lBQ0EsT0FBT00sT0FBT1A7QUFDaEI7QUFFQSxlQUFlUSx1QkFBdUJDLFNBQThCO0lBQ2xFLE1BQU1DLFFBQWtCLEVBQUU7SUFFMUIsS0FBSyxNQUFNLENBQUNDLEtBQUtYLE1BQU0sSUFBSVksT0FBT0MsT0FBTyxDQUFDSixXQUFZO1FBQ3BELElBQUlULFVBQVVjLGFBQWFkLFVBQVUsTUFBTTtRQUUzQyxJQUFJVyxJQUFJSSxXQUFXLE9BQU8sd0JBQXdCSixRQUFRLHdCQUF3QjtZQUNoRixNQUFNSyxhQUFhakIsbUJBQW1CQztZQUN0Q1UsTUFBTU8sSUFBSSxDQUFDLENBQUMsc0JBQXNCLEVBQUVELFlBQVk7UUFDbEQsT0FBTztZQUNMLE1BQU1FLFNBQVMsQ0FBQyxHQUFHLEVBQUVQLElBQUlRLFdBQVcsSUFBSTtZQUN4QyxNQUFNSCxhQUFhakIsbUJBQW1CQztZQUN0Q1UsTUFBTU8sSUFBSSxDQUFDLEdBQUdDLE9BQU8sQ0FBQyxFQUFFRixZQUFZO1FBQ3RDO0lBQ0Y7SUFFQSxNQUFNdkIsc0RBQVNBLENBQUNFLGVBQWVlLE1BQU1VLElBQUksQ0FBQyxPQUFPO0FBQ25EO0FBRU8sZUFBZUMsS0FBS0MsR0FBWTtJQUNyQyxJQUFJO1FBQ0YsTUFBTUMsT0FBTyxNQUFNRCxJQUFJRSxJQUFJO1FBRTNCLHlEQUF5RDtRQUN6RCxNQUFNaEIsdUJBQXVCZTtRQUU3QixPQUFPLElBQUlFLFNBQVN2QixLQUFLRSxTQUFTLENBQUM7WUFBRXNCLFNBQVM7UUFBSyxJQUFJO1lBQUVDLFFBQVE7UUFBSTtJQUN2RSxFQUFFLE9BQU9DLE9BQVk7UUFDbkJDLFFBQVFELEtBQUssQ0FBQyw2QkFBNkJBO1FBQzNDLE9BQU8sSUFBSUgsU0FBU3ZCLEtBQUtFLFNBQVMsQ0FBQztZQUFFd0IsT0FBT0EsTUFBTUUsT0FBTztRQUFDLElBQUk7WUFBRUgsUUFBUTtRQUFJO0lBQzlFO0FBQ0YiLCJzb3VyY2VzIjpbIi9Vc2Vycy9hbnRvbndlbnR6ZWwvbnh0Zmx1dHRlcl9jb3JlL21haW4vYXBwL2FwcC9hcGkvc2F2ZS1kYi1jb25maWcvcm91dGUudHMiXSwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgd3JpdGVGaWxlIH0gZnJvbSAnZnMvcHJvbWlzZXMnXG5pbXBvcnQgcGF0aCBmcm9tICdwYXRoJ1xuXG5jb25zdCBFTlZfRklMRV9QQVRIID0gcGF0aC5yZXNvbHZlKHByb2Nlc3MuY3dkKCksICcuZW52LmxvY2FsJylcblxuLy8gRXNjYXBlIG5ld2xpbmVzIGluIHByaXZhdGVfa2V5IGluc2lkZSBhIEpTT04gb2JqZWN0XG5mdW5jdGlvbiBzZXJpYWxpemVKc29uVmFsdWUodmFsdWU6IGFueSk6IHN0cmluZyB7XG4gIGlmICh0eXBlb2YgdmFsdWUgPT09ICdvYmplY3QnICYmIHZhbHVlICE9PSBudWxsKSB7XG4gICAgY29uc3QgY2xvbmUgPSBKU09OLnBhcnNlKEpTT04uc3RyaW5naWZ5KHZhbHVlKSkgLy8gZGVlcCBjbG9uZVxuICAgIGlmICh0eXBlb2YgY2xvbmUucHJpdmF0ZV9rZXkgPT09ICdzdHJpbmcnKSB7XG4gICAgICBjbG9uZS5wcml2YXRlX2tleSA9IGNsb25lLnByaXZhdGVfa2V5LnJlcGxhY2UoL1xcbi9nLCAnXFxcXG4nKVxuICAgIH1cbiAgICByZXR1cm4gSlNPTi5zdHJpbmdpZnkoY2xvbmUpXG4gIH1cbiAgcmV0dXJuIFN0cmluZyh2YWx1ZSlcbn1cblxuYXN5bmMgZnVuY3Rpb24gd3JpdGVFbnZGaWxlRnJvbU9iamVjdChlbnZPYmplY3Q6IFJlY29yZDxzdHJpbmcsIGFueT4pIHtcbiAgY29uc3QgbGluZXM6IHN0cmluZ1tdID0gW11cblxuICBmb3IgKGNvbnN0IFtrZXksIHZhbHVlXSBvZiBPYmplY3QuZW50cmllcyhlbnZPYmplY3QpKSB7XG4gICAgaWYgKHZhbHVlID09PSB1bmRlZmluZWQgfHwgdmFsdWUgPT09IG51bGwpIGNvbnRpbnVlXG5cbiAgICBpZiAoa2V5LnRvTG93ZXJDYXNlKCkgPT09ICdmaXJlYmFzZWNvbmZpZ2pzb24nIHx8IGtleSA9PT0gJ0ZJUkVCQVNFX0NPTkZJR19KU09OJykge1xuICAgICAgY29uc3Qgc2VyaWFsaXplZCA9IHNlcmlhbGl6ZUpzb25WYWx1ZSh2YWx1ZSlcbiAgICAgIGxpbmVzLnB1c2goYERCX0ZJUkVCQVNFQ09ORklHSlNPTj0ke3NlcmlhbGl6ZWR9YClcbiAgICB9IGVsc2Uge1xuICAgICAgY29uc3QgZW52S2V5ID0gYERCXyR7a2V5LnRvVXBwZXJDYXNlKCl9YFxuICAgICAgY29uc3Qgc2VyaWFsaXplZCA9IHNlcmlhbGl6ZUpzb25WYWx1ZSh2YWx1ZSlcbiAgICAgIGxpbmVzLnB1c2goYCR7ZW52S2V5fT0ke3NlcmlhbGl6ZWR9YClcbiAgICB9XG4gIH1cblxuICBhd2FpdCB3cml0ZUZpbGUoRU5WX0ZJTEVfUEFUSCwgbGluZXMuam9pbignXFxuJyksICd1dGYtOCcpXG59XG5cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBQT1NUKHJlcTogUmVxdWVzdCkge1xuICB0cnkge1xuICAgIGNvbnN0IGJvZHkgPSBhd2FpdCByZXEuanNvbigpXG5cbiAgICAvLyBEaXJlY3RseSBvdmVyd3JpdGUgLmVudi5sb2NhbCB3aXRoIHRoZSBuZXcgdmFsdWVzIG9ubHlcbiAgICBhd2FpdCB3cml0ZUVudkZpbGVGcm9tT2JqZWN0KGJvZHkpXG5cbiAgICByZXR1cm4gbmV3IFJlc3BvbnNlKEpTT04uc3RyaW5naWZ5KHsgc3VjY2VzczogdHJ1ZSB9KSwgeyBzdGF0dXM6IDIwMCB9KVxuICB9IGNhdGNoIChlcnJvcjogYW55KSB7XG4gICAgY29uc29sZS5lcnJvcignRXJyb3Igd3JpdGluZyAuZW52LmxvY2FsOicsIGVycm9yKVxuICAgIHJldHVybiBuZXcgUmVzcG9uc2UoSlNPTi5zdHJpbmdpZnkoeyBlcnJvcjogZXJyb3IubWVzc2FnZSB9KSwgeyBzdGF0dXM6IDUwMCB9KVxuICB9XG59XG4iXSwibmFtZXMiOlsid3JpdGVGaWxlIiwicGF0aCIsIkVOVl9GSUxFX1BBVEgiLCJyZXNvbHZlIiwicHJvY2VzcyIsImN3ZCIsInNlcmlhbGl6ZUpzb25WYWx1ZSIsInZhbHVlIiwiY2xvbmUiLCJKU09OIiwicGFyc2UiLCJzdHJpbmdpZnkiLCJwcml2YXRlX2tleSIsInJlcGxhY2UiLCJTdHJpbmciLCJ3cml0ZUVudkZpbGVGcm9tT2JqZWN0IiwiZW52T2JqZWN0IiwibGluZXMiLCJrZXkiLCJPYmplY3QiLCJlbnRyaWVzIiwidW5kZWZpbmVkIiwidG9Mb3dlckNhc2UiLCJzZXJpYWxpemVkIiwicHVzaCIsImVudktleSIsInRvVXBwZXJDYXNlIiwiam9pbiIsIlBPU1QiLCJyZXEiLCJib2R5IiwianNvbiIsIlJlc3BvbnNlIiwic3VjY2VzcyIsInN0YXR1cyIsImVycm9yIiwiY29uc29sZSIsIm1lc3NhZ2UiXSwiaWdub3JlTGlzdCI6W10sInNvdXJjZVJvb3QiOiIifQ==\n//# sourceURL=webpack-internal:///(rsc)/./app/api/save-db-config/route.ts\n");

/***/ }),

/***/ "(rsc)/./node_modules/next/dist/build/webpack/loaders/next-app-loader/index.js?name=app%2Fapi%2Fsave-db-config%2Froute&page=%2Fapi%2Fsave-db-config%2Froute&appPaths=&pagePath=private-next-app-dir%2Fapi%2Fsave-db-config%2Froute.ts&appDir=%2FUsers%2Fantonwentzel%2Fnxtflutter_core%2Fmain%2Fapp%2Fapp&pageExtensions=tsx&pageExtensions=ts&pageExtensions=jsx&pageExtensions=js&rootDir=%2FUsers%2Fantonwentzel%2Fnxtflutter_core%2Fmain%2Fapp&isDev=true&tsconfigPath=tsconfig.json&basePath=&assetPrefix=&nextConfigOutput=&preferredRegion=&middlewareConfig=e30%3D!":
/*!****************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************!*\
  !*** ./node_modules/next/dist/build/webpack/loaders/next-app-loader/index.js?name=app%2Fapi%2Fsave-db-config%2Froute&page=%2Fapi%2Fsave-db-config%2Froute&appPaths=&pagePath=private-next-app-dir%2Fapi%2Fsave-db-config%2Froute.ts&appDir=%2FUsers%2Fantonwentzel%2Fnxtflutter_core%2Fmain%2Fapp%2Fapp&pageExtensions=tsx&pageExtensions=ts&pageExtensions=jsx&pageExtensions=js&rootDir=%2FUsers%2Fantonwentzel%2Fnxtflutter_core%2Fmain%2Fapp&isDev=true&tsconfigPath=tsconfig.json&basePath=&assetPrefix=&nextConfigOutput=&preferredRegion=&middlewareConfig=e30%3D! ***!
  \****************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
eval("__webpack_require__.r(__webpack_exports__);\n/* harmony export */ __webpack_require__.d(__webpack_exports__, {\n/* harmony export */   patchFetch: () => (/* binding */ patchFetch),\n/* harmony export */   routeModule: () => (/* binding */ routeModule),\n/* harmony export */   serverHooks: () => (/* binding */ serverHooks),\n/* harmony export */   workAsyncStorage: () => (/* binding */ workAsyncStorage),\n/* harmony export */   workUnitAsyncStorage: () => (/* binding */ workUnitAsyncStorage)\n/* harmony export */ });\n/* harmony import */ var next_dist_server_route_modules_app_route_module_compiled__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! next/dist/server/route-modules/app-route/module.compiled */ \"(rsc)/./node_modules/next/dist/server/route-modules/app-route/module.compiled.js\");\n/* harmony import */ var next_dist_server_route_modules_app_route_module_compiled__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(next_dist_server_route_modules_app_route_module_compiled__WEBPACK_IMPORTED_MODULE_0__);\n/* harmony import */ var next_dist_server_route_kind__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! next/dist/server/route-kind */ \"(rsc)/./node_modules/next/dist/server/route-kind.js\");\n/* harmony import */ var next_dist_server_lib_patch_fetch__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! next/dist/server/lib/patch-fetch */ \"(rsc)/./node_modules/next/dist/server/lib/patch-fetch.js\");\n/* harmony import */ var next_dist_server_lib_patch_fetch__WEBPACK_IMPORTED_MODULE_2___default = /*#__PURE__*/__webpack_require__.n(next_dist_server_lib_patch_fetch__WEBPACK_IMPORTED_MODULE_2__);\n/* harmony import */ var _Users_antonwentzel_nxtflutter_core_main_app_app_api_save_db_config_route_ts__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ./app/api/save-db-config/route.ts */ \"(rsc)/./app/api/save-db-config/route.ts\");\n\n\n\n\n// We inject the nextConfigOutput here so that we can use them in the route\n// module.\nconst nextConfigOutput = \"\"\nconst routeModule = new next_dist_server_route_modules_app_route_module_compiled__WEBPACK_IMPORTED_MODULE_0__.AppRouteRouteModule({\n    definition: {\n        kind: next_dist_server_route_kind__WEBPACK_IMPORTED_MODULE_1__.RouteKind.APP_ROUTE,\n        page: \"/api/save-db-config/route\",\n        pathname: \"/api/save-db-config\",\n        filename: \"route\",\n        bundlePath: \"app/api/save-db-config/route\"\n    },\n    resolvedPagePath: \"/Users/antonwentzel/nxtflutter_core/main/app/app/api/save-db-config/route.ts\",\n    nextConfigOutput,\n    userland: _Users_antonwentzel_nxtflutter_core_main_app_app_api_save_db_config_route_ts__WEBPACK_IMPORTED_MODULE_3__\n});\n// Pull out the exports that we need to expose from the module. This should\n// be eliminated when we've moved the other routes to the new format. These\n// are used to hook into the route.\nconst { workAsyncStorage, workUnitAsyncStorage, serverHooks } = routeModule;\nfunction patchFetch() {\n    return (0,next_dist_server_lib_patch_fetch__WEBPACK_IMPORTED_MODULE_2__.patchFetch)({\n        workAsyncStorage,\n        workUnitAsyncStorage\n    });\n}\n\n\n//# sourceMappingURL=app-route.js.map//# sourceURL=[module]\n//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiKHJzYykvLi9ub2RlX21vZHVsZXMvbmV4dC9kaXN0L2J1aWxkL3dlYnBhY2svbG9hZGVycy9uZXh0LWFwcC1sb2FkZXIvaW5kZXguanM/bmFtZT1hcHAlMkZhcGklMkZzYXZlLWRiLWNvbmZpZyUyRnJvdXRlJnBhZ2U9JTJGYXBpJTJGc2F2ZS1kYi1jb25maWclMkZyb3V0ZSZhcHBQYXRocz0mcGFnZVBhdGg9cHJpdmF0ZS1uZXh0LWFwcC1kaXIlMkZhcGklMkZzYXZlLWRiLWNvbmZpZyUyRnJvdXRlLnRzJmFwcERpcj0lMkZVc2VycyUyRmFudG9ud2VudHplbCUyRm54dGZsdXR0ZXJfY29yZSUyRm1haW4lMkZhcHAlMkZhcHAmcGFnZUV4dGVuc2lvbnM9dHN4JnBhZ2VFeHRlbnNpb25zPXRzJnBhZ2VFeHRlbnNpb25zPWpzeCZwYWdlRXh0ZW5zaW9ucz1qcyZyb290RGlyPSUyRlVzZXJzJTJGYW50b253ZW50emVsJTJGbnh0Zmx1dHRlcl9jb3JlJTJGbWFpbiUyRmFwcCZpc0Rldj10cnVlJnRzY29uZmlnUGF0aD10c2NvbmZpZy5qc29uJmJhc2VQYXRoPSZhc3NldFByZWZpeD0mbmV4dENvbmZpZ091dHB1dD0mcHJlZmVycmVkUmVnaW9uPSZtaWRkbGV3YXJlQ29uZmlnPWUzMCUzRCEiLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7QUFBK0Y7QUFDdkM7QUFDcUI7QUFDNEI7QUFDekc7QUFDQTtBQUNBO0FBQ0Esd0JBQXdCLHlHQUFtQjtBQUMzQztBQUNBLGNBQWMsa0VBQVM7QUFDdkI7QUFDQTtBQUNBO0FBQ0E7QUFDQSxLQUFLO0FBQ0w7QUFDQTtBQUNBLFlBQVk7QUFDWixDQUFDO0FBQ0Q7QUFDQTtBQUNBO0FBQ0EsUUFBUSxzREFBc0Q7QUFDOUQ7QUFDQSxXQUFXLDRFQUFXO0FBQ3RCO0FBQ0E7QUFDQSxLQUFLO0FBQ0w7QUFDMEY7O0FBRTFGIiwic291cmNlcyI6WyIiXSwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgQXBwUm91dGVSb3V0ZU1vZHVsZSB9IGZyb20gXCJuZXh0L2Rpc3Qvc2VydmVyL3JvdXRlLW1vZHVsZXMvYXBwLXJvdXRlL21vZHVsZS5jb21waWxlZFwiO1xuaW1wb3J0IHsgUm91dGVLaW5kIH0gZnJvbSBcIm5leHQvZGlzdC9zZXJ2ZXIvcm91dGUta2luZFwiO1xuaW1wb3J0IHsgcGF0Y2hGZXRjaCBhcyBfcGF0Y2hGZXRjaCB9IGZyb20gXCJuZXh0L2Rpc3Qvc2VydmVyL2xpYi9wYXRjaC1mZXRjaFwiO1xuaW1wb3J0ICogYXMgdXNlcmxhbmQgZnJvbSBcIi9Vc2Vycy9hbnRvbndlbnR6ZWwvbnh0Zmx1dHRlcl9jb3JlL21haW4vYXBwL2FwcC9hcGkvc2F2ZS1kYi1jb25maWcvcm91dGUudHNcIjtcbi8vIFdlIGluamVjdCB0aGUgbmV4dENvbmZpZ091dHB1dCBoZXJlIHNvIHRoYXQgd2UgY2FuIHVzZSB0aGVtIGluIHRoZSByb3V0ZVxuLy8gbW9kdWxlLlxuY29uc3QgbmV4dENvbmZpZ091dHB1dCA9IFwiXCJcbmNvbnN0IHJvdXRlTW9kdWxlID0gbmV3IEFwcFJvdXRlUm91dGVNb2R1bGUoe1xuICAgIGRlZmluaXRpb246IHtcbiAgICAgICAga2luZDogUm91dGVLaW5kLkFQUF9ST1VURSxcbiAgICAgICAgcGFnZTogXCIvYXBpL3NhdmUtZGItY29uZmlnL3JvdXRlXCIsXG4gICAgICAgIHBhdGhuYW1lOiBcIi9hcGkvc2F2ZS1kYi1jb25maWdcIixcbiAgICAgICAgZmlsZW5hbWU6IFwicm91dGVcIixcbiAgICAgICAgYnVuZGxlUGF0aDogXCJhcHAvYXBpL3NhdmUtZGItY29uZmlnL3JvdXRlXCJcbiAgICB9LFxuICAgIHJlc29sdmVkUGFnZVBhdGg6IFwiL1VzZXJzL2FudG9ud2VudHplbC9ueHRmbHV0dGVyX2NvcmUvbWFpbi9hcHAvYXBwL2FwaS9zYXZlLWRiLWNvbmZpZy9yb3V0ZS50c1wiLFxuICAgIG5leHRDb25maWdPdXRwdXQsXG4gICAgdXNlcmxhbmRcbn0pO1xuLy8gUHVsbCBvdXQgdGhlIGV4cG9ydHMgdGhhdCB3ZSBuZWVkIHRvIGV4cG9zZSBmcm9tIHRoZSBtb2R1bGUuIFRoaXMgc2hvdWxkXG4vLyBiZSBlbGltaW5hdGVkIHdoZW4gd2UndmUgbW92ZWQgdGhlIG90aGVyIHJvdXRlcyB0byB0aGUgbmV3IGZvcm1hdC4gVGhlc2Vcbi8vIGFyZSB1c2VkIHRvIGhvb2sgaW50byB0aGUgcm91dGUuXG5jb25zdCB7IHdvcmtBc3luY1N0b3JhZ2UsIHdvcmtVbml0QXN5bmNTdG9yYWdlLCBzZXJ2ZXJIb29rcyB9ID0gcm91dGVNb2R1bGU7XG5mdW5jdGlvbiBwYXRjaEZldGNoKCkge1xuICAgIHJldHVybiBfcGF0Y2hGZXRjaCh7XG4gICAgICAgIHdvcmtBc3luY1N0b3JhZ2UsXG4gICAgICAgIHdvcmtVbml0QXN5bmNTdG9yYWdlXG4gICAgfSk7XG59XG5leHBvcnQgeyByb3V0ZU1vZHVsZSwgd29ya0FzeW5jU3RvcmFnZSwgd29ya1VuaXRBc3luY1N0b3JhZ2UsIHNlcnZlckhvb2tzLCBwYXRjaEZldGNoLCAgfTtcblxuLy8jIHNvdXJjZU1hcHBpbmdVUkw9YXBwLXJvdXRlLmpzLm1hcCJdLCJuYW1lcyI6W10sImlnbm9yZUxpc3QiOltdLCJzb3VyY2VSb290IjoiIn0=\n//# sourceURL=webpack-internal:///(rsc)/./node_modules/next/dist/build/webpack/loaders/next-app-loader/index.js?name=app%2Fapi%2Fsave-db-config%2Froute&page=%2Fapi%2Fsave-db-config%2Froute&appPaths=&pagePath=private-next-app-dir%2Fapi%2Fsave-db-config%2Froute.ts&appDir=%2FUsers%2Fantonwentzel%2Fnxtflutter_core%2Fmain%2Fapp%2Fapp&pageExtensions=tsx&pageExtensions=ts&pageExtensions=jsx&pageExtensions=js&rootDir=%2FUsers%2Fantonwentzel%2Fnxtflutter_core%2Fmain%2Fapp&isDev=true&tsconfigPath=tsconfig.json&basePath=&assetPrefix=&nextConfigOutput=&preferredRegion=&middlewareConfig=e30%3D!\n");

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
var __webpack_exports__ = __webpack_require__.X(0, ["vendor-chunks/next","vendor-chunks/@opentelemetry"], () => (__webpack_exec__("(rsc)/./node_modules/next/dist/build/webpack/loaders/next-app-loader/index.js?name=app%2Fapi%2Fsave-db-config%2Froute&page=%2Fapi%2Fsave-db-config%2Froute&appPaths=&pagePath=private-next-app-dir%2Fapi%2Fsave-db-config%2Froute.ts&appDir=%2FUsers%2Fantonwentzel%2Fnxtflutter_core%2Fmain%2Fapp%2Fapp&pageExtensions=tsx&pageExtensions=ts&pageExtensions=jsx&pageExtensions=js&rootDir=%2FUsers%2Fantonwentzel%2Fnxtflutter_core%2Fmain%2Fapp&isDev=true&tsconfigPath=tsconfig.json&basePath=&assetPrefix=&nextConfigOutput=&preferredRegion=&middlewareConfig=e30%3D!")));
module.exports = __webpack_exports__;

})();