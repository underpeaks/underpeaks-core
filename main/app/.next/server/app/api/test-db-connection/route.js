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
exports.id = "app/api/test-db-connection/route";
exports.ids = ["app/api/test-db-connection/route"];
exports.modules = {

/***/ "(rsc)/./app/api/test-db-connection/route.ts":
/*!*********************************************!*\
  !*** ./app/api/test-db-connection/route.ts ***!
  \*********************************************/
/***/ ((module, __webpack_exports__, __webpack_require__) => {

"use strict";
eval("__webpack_require__.a(module, async (__webpack_handle_async_dependencies__, __webpack_async_result__) => { try {\n__webpack_require__.r(__webpack_exports__);\n/* harmony export */ __webpack_require__.d(__webpack_exports__, {\n/* harmony export */   POST: () => (/* binding */ POST)\n/* harmony export */ });\n/* harmony import */ var next_server__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! next/server */ \"(rsc)/./node_modules/next/dist/api/server.js\");\n/* harmony import */ var _app_db_adapter__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! @/app/db-adapter */ \"(rsc)/./app/db-adapter/index.ts\");\nvar __webpack_async_dependencies__ = __webpack_handle_async_dependencies__([_app_db_adapter__WEBPACK_IMPORTED_MODULE_1__]);\n_app_db_adapter__WEBPACK_IMPORTED_MODULE_1__ = (__webpack_async_dependencies__.then ? (await __webpack_async_dependencies__)() : __webpack_async_dependencies__)[0];\n// /app/api/test-db-connection/route.ts\n\n\nasync function POST(req) {\n    try {\n        const config = await req.json();\n        const adapter = (0,_app_db_adapter__WEBPACK_IMPORTED_MODULE_1__.getAdapter)(config.type, config);\n        const result = await adapter.testConnection(config);\n        return next_server__WEBPACK_IMPORTED_MODULE_0__.NextResponse.json(result);\n    } catch (err) {\n        return next_server__WEBPACK_IMPORTED_MODULE_0__.NextResponse.json({\n            success: false,\n            message: err.message\n        }, {\n            status: 500\n        });\n    }\n}\n\n__webpack_async_result__();\n} catch(e) { __webpack_async_result__(e); } });//# sourceURL=[module]\n//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiKHJzYykvLi9hcHAvYXBpL3Rlc3QtZGItY29ubmVjdGlvbi9yb3V0ZS50cyIsIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7QUFBQSx1Q0FBdUM7QUFFRztBQUNHO0FBR3RDLGVBQWVFLEtBQUtDLEdBQVk7SUFDckMsSUFBSTtRQUNGLE1BQU1DLFNBQW1CLE1BQU1ELElBQUlFLElBQUk7UUFDdkMsTUFBTUMsVUFBVUwsMkRBQVVBLENBQUNHLE9BQU9HLElBQUksRUFBRUg7UUFDeEMsTUFBTUksU0FBUyxNQUFNRixRQUFRRyxjQUFjLENBQUNMO1FBQzVDLE9BQU9KLHFEQUFZQSxDQUFDSyxJQUFJLENBQUNHO0lBQzNCLEVBQUUsT0FBT0UsS0FBVTtRQUNqQixPQUFPVixxREFBWUEsQ0FBQ0ssSUFBSSxDQUFDO1lBQUVNLFNBQVM7WUFBT0MsU0FBU0YsSUFBSUUsT0FBTztRQUFDLEdBQUc7WUFBRUMsUUFBUTtRQUFJO0lBQ25GO0FBQ0YiLCJzb3VyY2VzIjpbIi9Vc2Vycy9hbnRvbndlbnR6ZWwvbnh0Zmx1dHRlcl9jb3JlL21haW4vYXBwL2FwcC9hcGkvdGVzdC1kYi1jb25uZWN0aW9uL3JvdXRlLnRzIl0sInNvdXJjZXNDb250ZW50IjpbIi8vIC9hcHAvYXBpL3Rlc3QtZGItY29ubmVjdGlvbi9yb3V0ZS50c1xuXG5pbXBvcnQgeyBOZXh0UmVzcG9uc2UgfSBmcm9tICduZXh0L3NlcnZlcidcbmltcG9ydCB7IGdldEFkYXB0ZXIgfSBmcm9tICdAL2FwcC9kYi1hZGFwdGVyJ1xuaW1wb3J0IHR5cGUgeyBEQkNvbmZpZyB9IGZyb20gJ0AvYXBwL2RiLWFkYXB0ZXIvdHlwZXMnXG5cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBQT1NUKHJlcTogUmVxdWVzdCkge1xuICB0cnkge1xuICAgIGNvbnN0IGNvbmZpZzogREJDb25maWcgPSBhd2FpdCByZXEuanNvbigpXG4gICAgY29uc3QgYWRhcHRlciA9IGdldEFkYXB0ZXIoY29uZmlnLnR5cGUsIGNvbmZpZylcbiAgICBjb25zdCByZXN1bHQgPSBhd2FpdCBhZGFwdGVyLnRlc3RDb25uZWN0aW9uKGNvbmZpZylcbiAgICByZXR1cm4gTmV4dFJlc3BvbnNlLmpzb24ocmVzdWx0KVxuICB9IGNhdGNoIChlcnI6IGFueSkge1xuICAgIHJldHVybiBOZXh0UmVzcG9uc2UuanNvbih7IHN1Y2Nlc3M6IGZhbHNlLCBtZXNzYWdlOiBlcnIubWVzc2FnZSB9LCB7IHN0YXR1czogNTAwIH0pXG4gIH1cbn1cbiJdLCJuYW1lcyI6WyJOZXh0UmVzcG9uc2UiLCJnZXRBZGFwdGVyIiwiUE9TVCIsInJlcSIsImNvbmZpZyIsImpzb24iLCJhZGFwdGVyIiwidHlwZSIsInJlc3VsdCIsInRlc3RDb25uZWN0aW9uIiwiZXJyIiwic3VjY2VzcyIsIm1lc3NhZ2UiLCJzdGF0dXMiXSwiaWdub3JlTGlzdCI6W10sInNvdXJjZVJvb3QiOiIifQ==\n//# sourceURL=webpack-internal:///(rsc)/./app/api/test-db-connection/route.ts\n");

/***/ }),

/***/ "(rsc)/./app/db-adapter/adapters/firebase-adapter.ts":
/*!*****************************************************!*\
  !*** ./app/db-adapter/adapters/firebase-adapter.ts ***!
  \*****************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
eval("__webpack_require__.r(__webpack_exports__);\n/* harmony export */ __webpack_require__.d(__webpack_exports__, {\n/* harmony export */   FirebaseAdapter: () => (/* binding */ FirebaseAdapter)\n/* harmony export */ });\n/* harmony import */ var firebase_admin__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! firebase-admin */ \"firebase-admin\");\n/* harmony import */ var firebase_admin__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(firebase_admin__WEBPACK_IMPORTED_MODULE_0__);\n// lib/db-adapter/adapters/firebase-adapter.ts\n\nclass FirebaseAdapter {\n    constructor(config){\n        this.config = config;\n        if (!(firebase_admin__WEBPACK_IMPORTED_MODULE_0___default().apps).length) {\n            if (!config.firebaseConfigJson) {\n                throw new Error('Firebase config JSON is required');\n            }\n            // Parse config JSON if it is a string\n            const firebaseConfig = typeof config.firebaseConfigJson === 'string' ? JSON.parse(config.firebaseConfigJson) : config.firebaseConfigJson;\n            firebase_admin__WEBPACK_IMPORTED_MODULE_0___default().initializeApp({\n                credential: firebase_admin__WEBPACK_IMPORTED_MODULE_0___default().credential.cert(firebaseConfig)\n            });\n        }\n        this.firestore = firebase_admin__WEBPACK_IMPORTED_MODULE_0___default().firestore();\n    }\n    async testConnection() {\n        try {\n            // Try to get some collections as a simple test\n            await this.firestore.listCollections();\n            return {\n                success: true,\n                message: 'Connected to Firebase Firestore successfully.'\n            };\n        } catch (error) {\n            return {\n                success: false,\n                message: error.message || 'Failed to connect to Firebase Firestore.'\n            };\n        }\n    }\n    async create(config, collection, data) {\n        const docRef = await this.firestore.collection(collection).add(data);\n        return docRef.id;\n    }\n    async read(config, collection, query = {}) {\n        // Note: Firestore queries can be complex; this example assumes no query filters.\n        // You can extend this to support where clauses etc.\n        const snapshot = await this.firestore.collection(collection).get();\n        const docs = snapshot.docs.map((doc)=>({\n                id: doc.id,\n                ...doc.data()\n            }));\n        return docs;\n    }\n    async update(config, collection, id, data) {\n        await this.firestore.collection(collection).doc(id).update(data);\n        return true;\n    }\n    async delete(config, collection, id) {\n        await this.firestore.collection(collection).doc(id).delete();\n        return true;\n    }\n}\n//# sourceURL=[module]\n//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiKHJzYykvLi9hcHAvZGItYWRhcHRlci9hZGFwdGVycy9maXJlYmFzZS1hZGFwdGVyLnRzIiwibWFwcGluZ3MiOiI7Ozs7OztBQUFBLDhDQUE4QztBQUNYO0FBRzVCLE1BQU1DO0lBR1hDLFlBQVksTUFBd0IsQ0FBRTthQUFsQkMsU0FBQUE7UUFDbEIsSUFBSSxDQUFDSCw0REFBVSxDQUFDSyxNQUFNLEVBQUU7WUFDdEIsSUFBSSxDQUFDRixPQUFPRyxrQkFBa0IsRUFBRTtnQkFDOUIsTUFBTSxJQUFJQyxNQUFNO1lBQ2xCO1lBQ0Esc0NBQXNDO1lBQ3RDLE1BQU1DLGlCQUFpQixPQUFPTCxPQUFPRyxrQkFBa0IsS0FBSyxXQUN4REcsS0FBS0MsS0FBSyxDQUFDUCxPQUFPRyxrQkFBa0IsSUFDcENILE9BQU9HLGtCQUFrQjtZQUU3Qk4sbUVBQW1CLENBQUM7Z0JBQ2xCWSxZQUFZWixnRUFBZ0IsQ0FBQ2EsSUFBSSxDQUFDTDtZQUNwQztRQUNGO1FBRUEsSUFBSSxDQUFDTSxTQUFTLEdBQUdkLCtEQUFlO0lBQ2xDO0lBRUEsTUFBTWUsaUJBQWlFO1FBQ3JFLElBQUk7WUFDRiwrQ0FBK0M7WUFDL0MsTUFBTSxJQUFJLENBQUNELFNBQVMsQ0FBQ0UsZUFBZTtZQUNwQyxPQUFPO2dCQUFFQyxTQUFTO2dCQUFNQyxTQUFTO1lBQWdEO1FBQ25GLEVBQUUsT0FBT0MsT0FBWTtZQUNuQixPQUFPO2dCQUFFRixTQUFTO2dCQUFPQyxTQUFTQyxNQUFNRCxPQUFPLElBQUk7WUFBMkM7UUFDaEc7SUFDRjtJQUVBLE1BQU1FLE9BQU9qQixNQUFnQixFQUFFa0IsVUFBa0IsRUFBRUMsSUFBUyxFQUFnQjtRQUMxRSxNQUFNQyxTQUFTLE1BQU0sSUFBSSxDQUFDVCxTQUFTLENBQUNPLFVBQVUsQ0FBQ0EsWUFBWUcsR0FBRyxDQUFDRjtRQUMvRCxPQUFPQyxPQUFPRSxFQUFFO0lBQ2xCO0lBRUEsTUFBTUMsS0FBS3ZCLE1BQWdCLEVBQUVrQixVQUFrQixFQUFFTSxRQUFhLENBQUMsQ0FBQyxFQUFnQjtRQUM5RSxpRkFBaUY7UUFDakYsb0RBQW9EO1FBQ3BELE1BQU1DLFdBQVcsTUFBTSxJQUFJLENBQUNkLFNBQVMsQ0FBQ08sVUFBVSxDQUFDQSxZQUFZUSxHQUFHO1FBQ2hFLE1BQU1DLE9BQU9GLFNBQVNFLElBQUksQ0FBQ0MsR0FBRyxDQUFDQyxDQUFBQSxNQUFRO2dCQUFFUCxJQUFJTyxJQUFJUCxFQUFFO2dCQUFFLEdBQUdPLElBQUlWLElBQUksRUFBRTtZQUFDO1FBQ25FLE9BQU9RO0lBQ1Q7SUFFQSxNQUFNRyxPQUFPOUIsTUFBZ0IsRUFBRWtCLFVBQWtCLEVBQUVJLEVBQVUsRUFBRUgsSUFBUyxFQUFnQjtRQUN0RixNQUFNLElBQUksQ0FBQ1IsU0FBUyxDQUFDTyxVQUFVLENBQUNBLFlBQVlXLEdBQUcsQ0FBQ1AsSUFBSVEsTUFBTSxDQUFDWDtRQUMzRCxPQUFPO0lBQ1Q7SUFFQSxNQUFNWSxPQUFPL0IsTUFBZ0IsRUFBRWtCLFVBQWtCLEVBQUVJLEVBQVUsRUFBZ0I7UUFDM0UsTUFBTSxJQUFJLENBQUNYLFNBQVMsQ0FBQ08sVUFBVSxDQUFDQSxZQUFZVyxHQUFHLENBQUNQLElBQUlTLE1BQU07UUFDMUQsT0FBTztJQUNUO0FBQ0YiLCJzb3VyY2VzIjpbIi9Vc2Vycy9hbnRvbndlbnR6ZWwvbnh0Zmx1dHRlcl9jb3JlL21haW4vYXBwL2FwcC9kYi1hZGFwdGVyL2FkYXB0ZXJzL2ZpcmViYXNlLWFkYXB0ZXIudHMiXSwic291cmNlc0NvbnRlbnQiOlsiLy8gbGliL2RiLWFkYXB0ZXIvYWRhcHRlcnMvZmlyZWJhc2UtYWRhcHRlci50c1xuaW1wb3J0IGFkbWluIGZyb20gJ2ZpcmViYXNlLWFkbWluJztcbmltcG9ydCB7IERCQWRhcHRlciwgREJDb25maWcgfSBmcm9tICcuLi90eXBlcyc7XG5cbmV4cG9ydCBjbGFzcyBGaXJlYmFzZUFkYXB0ZXIgaW1wbGVtZW50cyBEQkFkYXB0ZXIge1xuICBwcml2YXRlIGZpcmVzdG9yZTogYWRtaW4uZmlyZXN0b3JlLkZpcmVzdG9yZTtcblxuICBjb25zdHJ1Y3Rvcihwcml2YXRlIGNvbmZpZzogREJDb25maWcpIHtcbiAgICBpZiAoIWFkbWluLmFwcHMubGVuZ3RoKSB7XG4gICAgICBpZiAoIWNvbmZpZy5maXJlYmFzZUNvbmZpZ0pzb24pIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdGaXJlYmFzZSBjb25maWcgSlNPTiBpcyByZXF1aXJlZCcpO1xuICAgICAgfVxuICAgICAgLy8gUGFyc2UgY29uZmlnIEpTT04gaWYgaXQgaXMgYSBzdHJpbmdcbiAgICAgIGNvbnN0IGZpcmViYXNlQ29uZmlnID0gdHlwZW9mIGNvbmZpZy5maXJlYmFzZUNvbmZpZ0pzb24gPT09ICdzdHJpbmcnXG4gICAgICAgID8gSlNPTi5wYXJzZShjb25maWcuZmlyZWJhc2VDb25maWdKc29uKVxuICAgICAgICA6IGNvbmZpZy5maXJlYmFzZUNvbmZpZ0pzb247XG5cbiAgICAgIGFkbWluLmluaXRpYWxpemVBcHAoe1xuICAgICAgICBjcmVkZW50aWFsOiBhZG1pbi5jcmVkZW50aWFsLmNlcnQoZmlyZWJhc2VDb25maWcpLFxuICAgICAgfSk7XG4gICAgfVxuXG4gICAgdGhpcy5maXJlc3RvcmUgPSBhZG1pbi5maXJlc3RvcmUoKTtcbiAgfVxuXG4gIGFzeW5jIHRlc3RDb25uZWN0aW9uKCk6IFByb21pc2U8eyBzdWNjZXNzOiBib29sZWFuOyBtZXNzYWdlOiBzdHJpbmcgfT4ge1xuICAgIHRyeSB7XG4gICAgICAvLyBUcnkgdG8gZ2V0IHNvbWUgY29sbGVjdGlvbnMgYXMgYSBzaW1wbGUgdGVzdFxuICAgICAgYXdhaXQgdGhpcy5maXJlc3RvcmUubGlzdENvbGxlY3Rpb25zKCk7XG4gICAgICByZXR1cm4geyBzdWNjZXNzOiB0cnVlLCBtZXNzYWdlOiAnQ29ubmVjdGVkIHRvIEZpcmViYXNlIEZpcmVzdG9yZSBzdWNjZXNzZnVsbHkuJyB9O1xuICAgIH0gY2F0Y2ggKGVycm9yOiBhbnkpIHtcbiAgICAgIHJldHVybiB7IHN1Y2Nlc3M6IGZhbHNlLCBtZXNzYWdlOiBlcnJvci5tZXNzYWdlIHx8ICdGYWlsZWQgdG8gY29ubmVjdCB0byBGaXJlYmFzZSBGaXJlc3RvcmUuJyB9O1xuICAgIH1cbiAgfVxuXG4gIGFzeW5jIGNyZWF0ZShjb25maWc6IERCQ29uZmlnLCBjb2xsZWN0aW9uOiBzdHJpbmcsIGRhdGE6IGFueSk6IFByb21pc2U8YW55PiB7XG4gICAgY29uc3QgZG9jUmVmID0gYXdhaXQgdGhpcy5maXJlc3RvcmUuY29sbGVjdGlvbihjb2xsZWN0aW9uKS5hZGQoZGF0YSk7XG4gICAgcmV0dXJuIGRvY1JlZi5pZDtcbiAgfVxuXG4gIGFzeW5jIHJlYWQoY29uZmlnOiBEQkNvbmZpZywgY29sbGVjdGlvbjogc3RyaW5nLCBxdWVyeTogYW55ID0ge30pOiBQcm9taXNlPGFueT4ge1xuICAgIC8vIE5vdGU6IEZpcmVzdG9yZSBxdWVyaWVzIGNhbiBiZSBjb21wbGV4OyB0aGlzIGV4YW1wbGUgYXNzdW1lcyBubyBxdWVyeSBmaWx0ZXJzLlxuICAgIC8vIFlvdSBjYW4gZXh0ZW5kIHRoaXMgdG8gc3VwcG9ydCB3aGVyZSBjbGF1c2VzIGV0Yy5cbiAgICBjb25zdCBzbmFwc2hvdCA9IGF3YWl0IHRoaXMuZmlyZXN0b3JlLmNvbGxlY3Rpb24oY29sbGVjdGlvbikuZ2V0KCk7XG4gICAgY29uc3QgZG9jcyA9IHNuYXBzaG90LmRvY3MubWFwKGRvYyA9PiAoeyBpZDogZG9jLmlkLCAuLi5kb2MuZGF0YSgpIH0pKTtcbiAgICByZXR1cm4gZG9jcztcbiAgfVxuXG4gIGFzeW5jIHVwZGF0ZShjb25maWc6IERCQ29uZmlnLCBjb2xsZWN0aW9uOiBzdHJpbmcsIGlkOiBzdHJpbmcsIGRhdGE6IGFueSk6IFByb21pc2U8YW55PiB7XG4gICAgYXdhaXQgdGhpcy5maXJlc3RvcmUuY29sbGVjdGlvbihjb2xsZWN0aW9uKS5kb2MoaWQpLnVwZGF0ZShkYXRhKTtcbiAgICByZXR1cm4gdHJ1ZTtcbiAgfVxuXG4gIGFzeW5jIGRlbGV0ZShjb25maWc6IERCQ29uZmlnLCBjb2xsZWN0aW9uOiBzdHJpbmcsIGlkOiBzdHJpbmcpOiBQcm9taXNlPGFueT4ge1xuICAgIGF3YWl0IHRoaXMuZmlyZXN0b3JlLmNvbGxlY3Rpb24oY29sbGVjdGlvbikuZG9jKGlkKS5kZWxldGUoKTtcbiAgICByZXR1cm4gdHJ1ZTtcbiAgfVxufVxuIl0sIm5hbWVzIjpbImFkbWluIiwiRmlyZWJhc2VBZGFwdGVyIiwiY29uc3RydWN0b3IiLCJjb25maWciLCJhcHBzIiwibGVuZ3RoIiwiZmlyZWJhc2VDb25maWdKc29uIiwiRXJyb3IiLCJmaXJlYmFzZUNvbmZpZyIsIkpTT04iLCJwYXJzZSIsImluaXRpYWxpemVBcHAiLCJjcmVkZW50aWFsIiwiY2VydCIsImZpcmVzdG9yZSIsInRlc3RDb25uZWN0aW9uIiwibGlzdENvbGxlY3Rpb25zIiwic3VjY2VzcyIsIm1lc3NhZ2UiLCJlcnJvciIsImNyZWF0ZSIsImNvbGxlY3Rpb24iLCJkYXRhIiwiZG9jUmVmIiwiYWRkIiwiaWQiLCJyZWFkIiwicXVlcnkiLCJzbmFwc2hvdCIsImdldCIsImRvY3MiLCJtYXAiLCJkb2MiLCJ1cGRhdGUiLCJkZWxldGUiXSwiaWdub3JlTGlzdCI6W10sInNvdXJjZVJvb3QiOiIifQ==\n//# sourceURL=webpack-internal:///(rsc)/./app/db-adapter/adapters/firebase-adapter.ts\n");

/***/ }),

/***/ "(rsc)/./app/db-adapter/adapters/mariadb-adapter.ts":
/*!****************************************************!*\
  !*** ./app/db-adapter/adapters/mariadb-adapter.ts ***!
  \****************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
eval("__webpack_require__.r(__webpack_exports__);\n/* harmony export */ __webpack_require__.d(__webpack_exports__, {\n/* harmony export */   MariaDBAdapter: () => (/* binding */ MariaDBAdapter)\n/* harmony export */ });\n/* harmony import */ var mariadb__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! mariadb */ \"(rsc)/./node_modules/mariadb/promise.js\");\n// lib/db-adapter/adapters/mariadb-adapter.ts\n\nclass MariaDBAdapter {\n    constructor(config){\n        this.config = config;\n        this.pool = mariadb__WEBPACK_IMPORTED_MODULE_0__.createPool({\n            host: config.host,\n            port: typeof config.port === 'string' ? parseInt(config.port) : config.port,\n            user: config.user,\n            password: config.password,\n            database: config.database,\n            connectionLimit: 5\n        });\n    }\n    async testConnection() {\n        let conn;\n        try {\n            conn = await this.pool.getConnection();\n            await conn.query('SELECT 1');\n            return {\n                success: true,\n                message: 'Connected to MariaDB successfully.'\n            };\n        } catch (error) {\n            return {\n                success: false,\n                message: error.message || 'Failed to connect to MariaDB.'\n            };\n        } finally{\n            if (conn) conn.release();\n        }\n    }\n    async create(config, table, data) {\n        let conn;\n        try {\n            conn = await this.pool.getConnection();\n            const keys = Object.keys(data).join(', ');\n            const placeholders = Object.keys(data).map(()=>'?').join(', ');\n            const values = Object.values(data);\n            const query = `INSERT INTO ${table} (${keys}) VALUES (${placeholders})`;\n            const res = await conn.query(query, values);\n            return res;\n        } finally{\n            if (conn) conn.release();\n        }\n    }\n    async read(config, table, query) {\n        let conn;\n        try {\n            conn = await this.pool.getConnection();\n            const sql = query || `SELECT * FROM ${table}`;\n            const rows = await conn.query(sql);\n            return rows;\n        } finally{\n            if (conn) conn.release();\n        }\n    }\n    async update(config, table, id, data) {\n        let conn;\n        try {\n            conn = await this.pool.getConnection();\n            const setClause = Object.keys(data).map((key)=>`${key} = ?`).join(', ');\n            const values = [\n                ...Object.values(data),\n                id\n            ];\n            const query = `UPDATE ${table} SET ${setClause} WHERE id = ?`;\n            const res = await conn.query(query, values);\n            return res;\n        } finally{\n            if (conn) conn.release();\n        }\n    }\n    async delete(config, table, id) {\n        let conn;\n        try {\n            conn = await this.pool.getConnection();\n            const query = `DELETE FROM ${table} WHERE id = ?`;\n            const res = await conn.query(query, [\n                id\n            ]);\n            return res;\n        } finally{\n            if (conn) conn.release();\n        }\n    }\n}\n//# sourceURL=[module]\n//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiKHJzYykvLi9hcHAvZGItYWRhcHRlci9hZGFwdGVycy9tYXJpYWRiLWFkYXB0ZXIudHMiLCJtYXBwaW5ncyI6Ijs7Ozs7QUFBQSw2Q0FBNkM7QUFDVztBQUdqRCxNQUFNQztJQUdYQyxZQUFZLE1BQXdCLENBQUU7YUFBbEJDLFNBQUFBO1FBQ2xCLElBQUksQ0FBQ0MsSUFBSSxHQUFHSiwrQ0FBa0IsQ0FBQztZQUM3Qk0sTUFBTUgsT0FBT0csSUFBSTtZQUNqQkMsTUFBTSxPQUFPSixPQUFPSSxJQUFJLEtBQUssV0FBV0MsU0FBU0wsT0FBT0ksSUFBSSxJQUFJSixPQUFPSSxJQUFJO1lBQzNFRSxNQUFNTixPQUFPTSxJQUFJO1lBQ2pCQyxVQUFVUCxPQUFPTyxRQUFRO1lBQ3pCQyxVQUFVUixPQUFPUSxRQUFRO1lBQ3pCQyxpQkFBaUI7UUFDbkI7SUFDRjtJQUVBLE1BQU1DLGlCQUFpRTtRQUNyRSxJQUFJQztRQUNKLElBQUk7WUFDRkEsT0FBTyxNQUFNLElBQUksQ0FBQ1YsSUFBSSxDQUFDVyxhQUFhO1lBQ3BDLE1BQU1ELEtBQUtFLEtBQUssQ0FBQztZQUNqQixPQUFPO2dCQUFFQyxTQUFTO2dCQUFNQyxTQUFTO1lBQXFDO1FBQ3hFLEVBQUUsT0FBT0MsT0FBWTtZQUNuQixPQUFPO2dCQUFFRixTQUFTO2dCQUFPQyxTQUFTQyxNQUFNRCxPQUFPLElBQUk7WUFBZ0M7UUFDckYsU0FBVTtZQUNSLElBQUlKLE1BQU1BLEtBQUtNLE9BQU87UUFDeEI7SUFDRjtJQUVBLE1BQU1DLE9BQU9sQixNQUFnQixFQUFFbUIsS0FBYSxFQUFFQyxJQUFTLEVBQWdCO1FBQ3JFLElBQUlUO1FBQ0osSUFBSTtZQUNGQSxPQUFPLE1BQU0sSUFBSSxDQUFDVixJQUFJLENBQUNXLGFBQWE7WUFDcEMsTUFBTVMsT0FBT0MsT0FBT0QsSUFBSSxDQUFDRCxNQUFNRyxJQUFJLENBQUM7WUFDcEMsTUFBTUMsZUFBZUYsT0FBT0QsSUFBSSxDQUFDRCxNQUFNSyxHQUFHLENBQUMsSUFBTSxLQUFLRixJQUFJLENBQUM7WUFDM0QsTUFBTUcsU0FBU0osT0FBT0ksTUFBTSxDQUFDTjtZQUU3QixNQUFNUCxRQUFRLENBQUMsWUFBWSxFQUFFTSxNQUFNLEVBQUUsRUFBRUUsS0FBSyxVQUFVLEVBQUVHLGFBQWEsQ0FBQyxDQUFDO1lBQ3ZFLE1BQU1HLE1BQU0sTUFBTWhCLEtBQUtFLEtBQUssQ0FBQ0EsT0FBT2E7WUFDcEMsT0FBT0M7UUFDVCxTQUFVO1lBQ1IsSUFBSWhCLE1BQU1BLEtBQUtNLE9BQU87UUFDeEI7SUFDRjtJQUVBLE1BQU1XLEtBQUs1QixNQUFnQixFQUFFbUIsS0FBYSxFQUFFTixLQUFjLEVBQWdCO1FBQ3hFLElBQUlGO1FBQ0osSUFBSTtZQUNGQSxPQUFPLE1BQU0sSUFBSSxDQUFDVixJQUFJLENBQUNXLGFBQWE7WUFDcEMsTUFBTWlCLE1BQU1oQixTQUFTLENBQUMsY0FBYyxFQUFFTSxPQUFPO1lBQzdDLE1BQU1XLE9BQU8sTUFBTW5CLEtBQUtFLEtBQUssQ0FBQ2dCO1lBQzlCLE9BQU9DO1FBQ1QsU0FBVTtZQUNSLElBQUluQixNQUFNQSxLQUFLTSxPQUFPO1FBQ3hCO0lBQ0Y7SUFFQSxNQUFNYyxPQUFPL0IsTUFBZ0IsRUFBRW1CLEtBQWEsRUFBRWEsRUFBVSxFQUFFWixJQUFTLEVBQWdCO1FBQ2pGLElBQUlUO1FBQ0osSUFBSTtZQUNGQSxPQUFPLE1BQU0sSUFBSSxDQUFDVixJQUFJLENBQUNXLGFBQWE7WUFDcEMsTUFBTXFCLFlBQVlYLE9BQU9ELElBQUksQ0FBQ0QsTUFDM0JLLEdBQUcsQ0FBQ1MsQ0FBQUEsTUFBTyxHQUFHQSxJQUFJLElBQUksQ0FBQyxFQUN2QlgsSUFBSSxDQUFDO1lBQ1IsTUFBTUcsU0FBUzttQkFBSUosT0FBT0ksTUFBTSxDQUFDTjtnQkFBT1k7YUFBRztZQUUzQyxNQUFNbkIsUUFBUSxDQUFDLE9BQU8sRUFBRU0sTUFBTSxLQUFLLEVBQUVjLFVBQVUsYUFBYSxDQUFDO1lBQzdELE1BQU1OLE1BQU0sTUFBTWhCLEtBQUtFLEtBQUssQ0FBQ0EsT0FBT2E7WUFDcEMsT0FBT0M7UUFDVCxTQUFVO1lBQ1IsSUFBSWhCLE1BQU1BLEtBQUtNLE9BQU87UUFDeEI7SUFDRjtJQUVBLE1BQU1rQixPQUFPbkMsTUFBZ0IsRUFBRW1CLEtBQWEsRUFBRWEsRUFBVSxFQUFnQjtRQUN0RSxJQUFJckI7UUFDSixJQUFJO1lBQ0ZBLE9BQU8sTUFBTSxJQUFJLENBQUNWLElBQUksQ0FBQ1csYUFBYTtZQUNwQyxNQUFNQyxRQUFRLENBQUMsWUFBWSxFQUFFTSxNQUFNLGFBQWEsQ0FBQztZQUNqRCxNQUFNUSxNQUFNLE1BQU1oQixLQUFLRSxLQUFLLENBQUNBLE9BQU87Z0JBQUNtQjthQUFHO1lBQ3hDLE9BQU9MO1FBQ1QsU0FBVTtZQUNSLElBQUloQixNQUFNQSxLQUFLTSxPQUFPO1FBQ3hCO0lBQ0Y7QUFDRiIsInNvdXJjZXMiOlsiL1VzZXJzL2FudG9ud2VudHplbC9ueHRmbHV0dGVyX2NvcmUvbWFpbi9hcHAvYXBwL2RiLWFkYXB0ZXIvYWRhcHRlcnMvbWFyaWFkYi1hZGFwdGVyLnRzIl0sInNvdXJjZXNDb250ZW50IjpbIi8vIGxpYi9kYi1hZGFwdGVyL2FkYXB0ZXJzL21hcmlhZGItYWRhcHRlci50c1xuaW1wb3J0IG1hcmlhZGIsIHsgUG9vbCwgUG9vbENvbm5lY3Rpb24gfSBmcm9tICdtYXJpYWRiJztcbmltcG9ydCB7IERCQWRhcHRlciwgREJDb25maWcgfSBmcm9tICcuLi90eXBlcyc7XG5cbmV4cG9ydCBjbGFzcyBNYXJpYURCQWRhcHRlciBpbXBsZW1lbnRzIERCQWRhcHRlciB7XG4gIHByaXZhdGUgcG9vbDogUG9vbDtcblxuICBjb25zdHJ1Y3Rvcihwcml2YXRlIGNvbmZpZzogREJDb25maWcpIHtcbiAgICB0aGlzLnBvb2wgPSBtYXJpYWRiLmNyZWF0ZVBvb2woe1xuICAgICAgaG9zdDogY29uZmlnLmhvc3QsXG4gICAgICBwb3J0OiB0eXBlb2YgY29uZmlnLnBvcnQgPT09ICdzdHJpbmcnID8gcGFyc2VJbnQoY29uZmlnLnBvcnQpIDogY29uZmlnLnBvcnQsXG4gICAgICB1c2VyOiBjb25maWcudXNlcixcbiAgICAgIHBhc3N3b3JkOiBjb25maWcucGFzc3dvcmQsXG4gICAgICBkYXRhYmFzZTogY29uZmlnLmRhdGFiYXNlLFxuICAgICAgY29ubmVjdGlvbkxpbWl0OiA1LFxuICAgIH0pO1xuICB9XG5cbiAgYXN5bmMgdGVzdENvbm5lY3Rpb24oKTogUHJvbWlzZTx7IHN1Y2Nlc3M6IGJvb2xlYW47IG1lc3NhZ2U6IHN0cmluZyB9PiB7XG4gICAgbGV0IGNvbm46IFBvb2xDb25uZWN0aW9uIHwgdW5kZWZpbmVkO1xuICAgIHRyeSB7XG4gICAgICBjb25uID0gYXdhaXQgdGhpcy5wb29sLmdldENvbm5lY3Rpb24oKTtcbiAgICAgIGF3YWl0IGNvbm4ucXVlcnkoJ1NFTEVDVCAxJyk7XG4gICAgICByZXR1cm4geyBzdWNjZXNzOiB0cnVlLCBtZXNzYWdlOiAnQ29ubmVjdGVkIHRvIE1hcmlhREIgc3VjY2Vzc2Z1bGx5LicgfTtcbiAgICB9IGNhdGNoIChlcnJvcjogYW55KSB7XG4gICAgICByZXR1cm4geyBzdWNjZXNzOiBmYWxzZSwgbWVzc2FnZTogZXJyb3IubWVzc2FnZSB8fCAnRmFpbGVkIHRvIGNvbm5lY3QgdG8gTWFyaWFEQi4nIH07XG4gICAgfSBmaW5hbGx5IHtcbiAgICAgIGlmIChjb25uKSBjb25uLnJlbGVhc2UoKTtcbiAgICB9XG4gIH1cblxuICBhc3luYyBjcmVhdGUoY29uZmlnOiBEQkNvbmZpZywgdGFibGU6IHN0cmluZywgZGF0YTogYW55KTogUHJvbWlzZTxhbnk+IHtcbiAgICBsZXQgY29ubjogUG9vbENvbm5lY3Rpb24gfCB1bmRlZmluZWQ7XG4gICAgdHJ5IHtcbiAgICAgIGNvbm4gPSBhd2FpdCB0aGlzLnBvb2wuZ2V0Q29ubmVjdGlvbigpO1xuICAgICAgY29uc3Qga2V5cyA9IE9iamVjdC5rZXlzKGRhdGEpLmpvaW4oJywgJyk7XG4gICAgICBjb25zdCBwbGFjZWhvbGRlcnMgPSBPYmplY3Qua2V5cyhkYXRhKS5tYXAoKCkgPT4gJz8nKS5qb2luKCcsICcpO1xuICAgICAgY29uc3QgdmFsdWVzID0gT2JqZWN0LnZhbHVlcyhkYXRhKTtcblxuICAgICAgY29uc3QgcXVlcnkgPSBgSU5TRVJUIElOVE8gJHt0YWJsZX0gKCR7a2V5c30pIFZBTFVFUyAoJHtwbGFjZWhvbGRlcnN9KWA7XG4gICAgICBjb25zdCByZXMgPSBhd2FpdCBjb25uLnF1ZXJ5KHF1ZXJ5LCB2YWx1ZXMpO1xuICAgICAgcmV0dXJuIHJlcztcbiAgICB9IGZpbmFsbHkge1xuICAgICAgaWYgKGNvbm4pIGNvbm4ucmVsZWFzZSgpO1xuICAgIH1cbiAgfVxuXG4gIGFzeW5jIHJlYWQoY29uZmlnOiBEQkNvbmZpZywgdGFibGU6IHN0cmluZywgcXVlcnk/OiBzdHJpbmcpOiBQcm9taXNlPGFueT4ge1xuICAgIGxldCBjb25uOiBQb29sQ29ubmVjdGlvbiB8IHVuZGVmaW5lZDtcbiAgICB0cnkge1xuICAgICAgY29ubiA9IGF3YWl0IHRoaXMucG9vbC5nZXRDb25uZWN0aW9uKCk7XG4gICAgICBjb25zdCBzcWwgPSBxdWVyeSB8fCBgU0VMRUNUICogRlJPTSAke3RhYmxlfWA7XG4gICAgICBjb25zdCByb3dzID0gYXdhaXQgY29ubi5xdWVyeShzcWwpO1xuICAgICAgcmV0dXJuIHJvd3M7XG4gICAgfSBmaW5hbGx5IHtcbiAgICAgIGlmIChjb25uKSBjb25uLnJlbGVhc2UoKTtcbiAgICB9XG4gIH1cblxuICBhc3luYyB1cGRhdGUoY29uZmlnOiBEQkNvbmZpZywgdGFibGU6IHN0cmluZywgaWQ6IHN0cmluZywgZGF0YTogYW55KTogUHJvbWlzZTxhbnk+IHtcbiAgICBsZXQgY29ubjogUG9vbENvbm5lY3Rpb24gfCB1bmRlZmluZWQ7XG4gICAgdHJ5IHtcbiAgICAgIGNvbm4gPSBhd2FpdCB0aGlzLnBvb2wuZ2V0Q29ubmVjdGlvbigpO1xuICAgICAgY29uc3Qgc2V0Q2xhdXNlID0gT2JqZWN0LmtleXMoZGF0YSlcbiAgICAgICAgLm1hcChrZXkgPT4gYCR7a2V5fSA9ID9gKVxuICAgICAgICAuam9pbignLCAnKTtcbiAgICAgIGNvbnN0IHZhbHVlcyA9IFsuLi5PYmplY3QudmFsdWVzKGRhdGEpLCBpZF07XG5cbiAgICAgIGNvbnN0IHF1ZXJ5ID0gYFVQREFURSAke3RhYmxlfSBTRVQgJHtzZXRDbGF1c2V9IFdIRVJFIGlkID0gP2A7XG4gICAgICBjb25zdCByZXMgPSBhd2FpdCBjb25uLnF1ZXJ5KHF1ZXJ5LCB2YWx1ZXMpO1xuICAgICAgcmV0dXJuIHJlcztcbiAgICB9IGZpbmFsbHkge1xuICAgICAgaWYgKGNvbm4pIGNvbm4ucmVsZWFzZSgpO1xuICAgIH1cbiAgfVxuXG4gIGFzeW5jIGRlbGV0ZShjb25maWc6IERCQ29uZmlnLCB0YWJsZTogc3RyaW5nLCBpZDogc3RyaW5nKTogUHJvbWlzZTxhbnk+IHtcbiAgICBsZXQgY29ubjogUG9vbENvbm5lY3Rpb24gfCB1bmRlZmluZWQ7XG4gICAgdHJ5IHtcbiAgICAgIGNvbm4gPSBhd2FpdCB0aGlzLnBvb2wuZ2V0Q29ubmVjdGlvbigpO1xuICAgICAgY29uc3QgcXVlcnkgPSBgREVMRVRFIEZST00gJHt0YWJsZX0gV0hFUkUgaWQgPSA/YDtcbiAgICAgIGNvbnN0IHJlcyA9IGF3YWl0IGNvbm4ucXVlcnkocXVlcnksIFtpZF0pO1xuICAgICAgcmV0dXJuIHJlcztcbiAgICB9IGZpbmFsbHkge1xuICAgICAgaWYgKGNvbm4pIGNvbm4ucmVsZWFzZSgpO1xuICAgIH1cbiAgfVxufVxuIl0sIm5hbWVzIjpbIm1hcmlhZGIiLCJNYXJpYURCQWRhcHRlciIsImNvbnN0cnVjdG9yIiwiY29uZmlnIiwicG9vbCIsImNyZWF0ZVBvb2wiLCJob3N0IiwicG9ydCIsInBhcnNlSW50IiwidXNlciIsInBhc3N3b3JkIiwiZGF0YWJhc2UiLCJjb25uZWN0aW9uTGltaXQiLCJ0ZXN0Q29ubmVjdGlvbiIsImNvbm4iLCJnZXRDb25uZWN0aW9uIiwicXVlcnkiLCJzdWNjZXNzIiwibWVzc2FnZSIsImVycm9yIiwicmVsZWFzZSIsImNyZWF0ZSIsInRhYmxlIiwiZGF0YSIsImtleXMiLCJPYmplY3QiLCJqb2luIiwicGxhY2Vob2xkZXJzIiwibWFwIiwidmFsdWVzIiwicmVzIiwicmVhZCIsInNxbCIsInJvd3MiLCJ1cGRhdGUiLCJpZCIsInNldENsYXVzZSIsImtleSIsImRlbGV0ZSJdLCJpZ25vcmVMaXN0IjpbXSwic291cmNlUm9vdCI6IiJ9\n//# sourceURL=webpack-internal:///(rsc)/./app/db-adapter/adapters/mariadb-adapter.ts\n");

/***/ }),

/***/ "(rsc)/./app/db-adapter/adapters/mongodb-adapter.ts":
/*!****************************************************!*\
  !*** ./app/db-adapter/adapters/mongodb-adapter.ts ***!
  \****************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
eval("__webpack_require__.r(__webpack_exports__);\n/* harmony export */ __webpack_require__.d(__webpack_exports__, {\n/* harmony export */   MongoDBAdapter: () => (/* binding */ MongoDBAdapter)\n/* harmony export */ });\n/* harmony import */ var mongodb__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! mongodb */ \"mongodb\");\n/* harmony import */ var mongodb__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(mongodb__WEBPACK_IMPORTED_MODULE_0__);\n// lib/db-adapter/adapters/mongodb-adapter.ts\n\nclass MongoDBAdapter {\n    constructor(config){\n        this.config = config;\n        if (!config.connectionString) {\n            throw new Error('MongoDB connection string is required');\n        }\n        this.client = new mongodb__WEBPACK_IMPORTED_MODULE_0__.MongoClient(config.connectionString);\n    }\n    async getDb() {\n        if (!this.db) {\n            await this.client.connect();\n            this.db = this.client.db(this.config.database);\n        }\n        return this.db;\n    }\n    async testConnection() {\n        try {\n            await this.client.connect();\n            await this.client.db().command({\n                ping: 1\n            });\n            await this.client.close();\n            return {\n                success: true,\n                message: 'Connected to MongoDB successfully.'\n            };\n        } catch (error) {\n            return {\n                success: false,\n                message: error.message || 'Failed to connect to MongoDB.'\n            };\n        }\n    }\n    async create(config, collection, data) {\n        const db = await this.getDb();\n        const result = await db.collection(collection).insertOne(data);\n        return result.insertedId;\n    }\n    async read(config, collection, query = {}) {\n        const db = await this.getDb();\n        const cursor = db.collection(collection).find(query);\n        return cursor.toArray();\n    }\n    async update(config, collection, id, data) {\n        const db = await this.getDb();\n        const result = await db.collection(collection).updateOne({\n            _id: new mongodb__WEBPACK_IMPORTED_MODULE_0__.ObjectId(id)\n        }, {\n            $set: data\n        });\n        return result.modifiedCount > 0;\n    }\n    async delete(config, collection, id) {\n        const db = await this.getDb();\n        const result = await db.collection(collection).deleteOne({\n            _id: new mongodb__WEBPACK_IMPORTED_MODULE_0__.ObjectId(id)\n        });\n        return result.deletedCount > 0;\n    }\n}\n//# sourceURL=[module]\n//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiKHJzYykvLi9hcHAvZGItYWRhcHRlci9hZGFwdGVycy9tb25nb2RiLWFkYXB0ZXIudHMiLCJtYXBwaW5ncyI6Ijs7Ozs7O0FBQUEsNkNBQTZDO0FBQ087QUFHN0MsTUFBTUU7SUFJWEMsWUFBWSxNQUF3QixDQUFFO2FBQWxCQyxTQUFBQTtRQUNsQixJQUFJLENBQUNBLE9BQU9DLGdCQUFnQixFQUFFO1lBQzVCLE1BQU0sSUFBSUMsTUFBTTtRQUNsQjtRQUNBLElBQUksQ0FBQ0MsTUFBTSxHQUFHLElBQUlQLGdEQUFXQSxDQUFDSSxPQUFPQyxnQkFBZ0I7SUFDdkQ7SUFFQSxNQUFjRyxRQUFRO1FBQ3BCLElBQUksQ0FBQyxJQUFJLENBQUNDLEVBQUUsRUFBRTtZQUNaLE1BQU0sSUFBSSxDQUFDRixNQUFNLENBQUNHLE9BQU87WUFDekIsSUFBSSxDQUFDRCxFQUFFLEdBQUcsSUFBSSxDQUFDRixNQUFNLENBQUNFLEVBQUUsQ0FBQyxJQUFJLENBQUNMLE1BQU0sQ0FBQ08sUUFBUTtRQUMvQztRQUNBLE9BQU8sSUFBSSxDQUFDRixFQUFFO0lBQ2hCO0lBRUEsTUFBTUcsaUJBQWlFO1FBQ3JFLElBQUk7WUFDRixNQUFNLElBQUksQ0FBQ0wsTUFBTSxDQUFDRyxPQUFPO1lBQ3pCLE1BQU0sSUFBSSxDQUFDSCxNQUFNLENBQUNFLEVBQUUsR0FBR0ksT0FBTyxDQUFDO2dCQUFFQyxNQUFNO1lBQUU7WUFDekMsTUFBTSxJQUFJLENBQUNQLE1BQU0sQ0FBQ1EsS0FBSztZQUN2QixPQUFPO2dCQUFFQyxTQUFTO2dCQUFNQyxTQUFTO1lBQXFDO1FBQ3hFLEVBQUUsT0FBT0MsT0FBWTtZQUNuQixPQUFPO2dCQUFFRixTQUFTO2dCQUFPQyxTQUFTQyxNQUFNRCxPQUFPLElBQUk7WUFBZ0M7UUFDckY7SUFDRjtJQUVBLE1BQU1FLE9BQU9mLE1BQWdCLEVBQUVnQixVQUFrQixFQUFFQyxJQUFTLEVBQWdCO1FBQzFFLE1BQU1aLEtBQUssTUFBTSxJQUFJLENBQUNELEtBQUs7UUFDM0IsTUFBTWMsU0FBUyxNQUFNYixHQUFHVyxVQUFVLENBQUNBLFlBQVlHLFNBQVMsQ0FBQ0Y7UUFDekQsT0FBT0MsT0FBT0UsVUFBVTtJQUMxQjtJQUVBLE1BQU1DLEtBQUtyQixNQUFnQixFQUFFZ0IsVUFBa0IsRUFBRU0sUUFBYSxDQUFDLENBQUMsRUFBZ0I7UUFDOUUsTUFBTWpCLEtBQUssTUFBTSxJQUFJLENBQUNELEtBQUs7UUFDM0IsTUFBTW1CLFNBQVNsQixHQUFHVyxVQUFVLENBQUNBLFlBQVlRLElBQUksQ0FBQ0Y7UUFDOUMsT0FBT0MsT0FBT0UsT0FBTztJQUN2QjtJQUVBLE1BQU1DLE9BQU8xQixNQUFnQixFQUFFZ0IsVUFBa0IsRUFBRVcsRUFBVSxFQUFFVixJQUFTLEVBQWdCO1FBQ3RGLE1BQU1aLEtBQUssTUFBTSxJQUFJLENBQUNELEtBQUs7UUFDM0IsTUFBTWMsU0FBUyxNQUFNYixHQUFHVyxVQUFVLENBQUNBLFlBQVlZLFNBQVMsQ0FDdEQ7WUFBRUMsS0FBSyxJQUFJaEMsNkNBQVFBLENBQUM4QjtRQUFJLEdBQ3hCO1lBQUVHLE1BQU1iO1FBQUs7UUFFZixPQUFPQyxPQUFPYSxhQUFhLEdBQUc7SUFDaEM7SUFFQSxNQUFNQyxPQUFPaEMsTUFBZ0IsRUFBRWdCLFVBQWtCLEVBQUVXLEVBQVUsRUFBZ0I7UUFDM0UsTUFBTXRCLEtBQUssTUFBTSxJQUFJLENBQUNELEtBQUs7UUFDM0IsTUFBTWMsU0FBUyxNQUFNYixHQUFHVyxVQUFVLENBQUNBLFlBQVlpQixTQUFTLENBQUM7WUFBRUosS0FBSyxJQUFJaEMsNkNBQVFBLENBQUM4QjtRQUFJO1FBQ2pGLE9BQU9ULE9BQU9nQixZQUFZLEdBQUc7SUFDL0I7QUFDRiIsInNvdXJjZXMiOlsiL1VzZXJzL2FudG9ud2VudHplbC9ueHRmbHV0dGVyX2NvcmUvbWFpbi9hcHAvYXBwL2RiLWFkYXB0ZXIvYWRhcHRlcnMvbW9uZ29kYi1hZGFwdGVyLnRzIl0sInNvdXJjZXNDb250ZW50IjpbIi8vIGxpYi9kYi1hZGFwdGVyL2FkYXB0ZXJzL21vbmdvZGItYWRhcHRlci50c1xuaW1wb3J0IHsgTW9uZ29DbGllbnQsIERiLCBPYmplY3RJZCB9IGZyb20gJ21vbmdvZGInO1xuaW1wb3J0IHsgREJBZGFwdGVyLCBEQkNvbmZpZyB9IGZyb20gJy4uL3R5cGVzJztcblxuZXhwb3J0IGNsYXNzIE1vbmdvREJBZGFwdGVyIGltcGxlbWVudHMgREJBZGFwdGVyIHtcbiAgcHJpdmF0ZSBjbGllbnQ6IE1vbmdvQ2xpZW50O1xuICBwcml2YXRlIGRiPzogRGI7XG5cbiAgY29uc3RydWN0b3IocHJpdmF0ZSBjb25maWc6IERCQ29uZmlnKSB7XG4gICAgaWYgKCFjb25maWcuY29ubmVjdGlvblN0cmluZykge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKCdNb25nb0RCIGNvbm5lY3Rpb24gc3RyaW5nIGlzIHJlcXVpcmVkJyk7XG4gICAgfVxuICAgIHRoaXMuY2xpZW50ID0gbmV3IE1vbmdvQ2xpZW50KGNvbmZpZy5jb25uZWN0aW9uU3RyaW5nKTtcbiAgfVxuXG4gIHByaXZhdGUgYXN5bmMgZ2V0RGIoKSB7XG4gICAgaWYgKCF0aGlzLmRiKSB7XG4gICAgICBhd2FpdCB0aGlzLmNsaWVudC5jb25uZWN0KCk7XG4gICAgICB0aGlzLmRiID0gdGhpcy5jbGllbnQuZGIodGhpcy5jb25maWcuZGF0YWJhc2UpO1xuICAgIH1cbiAgICByZXR1cm4gdGhpcy5kYjtcbiAgfVxuXG4gIGFzeW5jIHRlc3RDb25uZWN0aW9uKCk6IFByb21pc2U8eyBzdWNjZXNzOiBib29sZWFuOyBtZXNzYWdlOiBzdHJpbmcgfT4ge1xuICAgIHRyeSB7XG4gICAgICBhd2FpdCB0aGlzLmNsaWVudC5jb25uZWN0KCk7XG4gICAgICBhd2FpdCB0aGlzLmNsaWVudC5kYigpLmNvbW1hbmQoeyBwaW5nOiAxIH0pO1xuICAgICAgYXdhaXQgdGhpcy5jbGllbnQuY2xvc2UoKTtcbiAgICAgIHJldHVybiB7IHN1Y2Nlc3M6IHRydWUsIG1lc3NhZ2U6ICdDb25uZWN0ZWQgdG8gTW9uZ29EQiBzdWNjZXNzZnVsbHkuJyB9O1xuICAgIH0gY2F0Y2ggKGVycm9yOiBhbnkpIHtcbiAgICAgIHJldHVybiB7IHN1Y2Nlc3M6IGZhbHNlLCBtZXNzYWdlOiBlcnJvci5tZXNzYWdlIHx8ICdGYWlsZWQgdG8gY29ubmVjdCB0byBNb25nb0RCLicgfTtcbiAgICB9XG4gIH1cblxuICBhc3luYyBjcmVhdGUoY29uZmlnOiBEQkNvbmZpZywgY29sbGVjdGlvbjogc3RyaW5nLCBkYXRhOiBhbnkpOiBQcm9taXNlPGFueT4ge1xuICAgIGNvbnN0IGRiID0gYXdhaXQgdGhpcy5nZXREYigpO1xuICAgIGNvbnN0IHJlc3VsdCA9IGF3YWl0IGRiLmNvbGxlY3Rpb24oY29sbGVjdGlvbikuaW5zZXJ0T25lKGRhdGEpO1xuICAgIHJldHVybiByZXN1bHQuaW5zZXJ0ZWRJZDtcbiAgfVxuXG4gIGFzeW5jIHJlYWQoY29uZmlnOiBEQkNvbmZpZywgY29sbGVjdGlvbjogc3RyaW5nLCBxdWVyeTogYW55ID0ge30pOiBQcm9taXNlPGFueT4ge1xuICAgIGNvbnN0IGRiID0gYXdhaXQgdGhpcy5nZXREYigpO1xuICAgIGNvbnN0IGN1cnNvciA9IGRiLmNvbGxlY3Rpb24oY29sbGVjdGlvbikuZmluZChxdWVyeSk7XG4gICAgcmV0dXJuIGN1cnNvci50b0FycmF5KCk7XG4gIH1cblxuICBhc3luYyB1cGRhdGUoY29uZmlnOiBEQkNvbmZpZywgY29sbGVjdGlvbjogc3RyaW5nLCBpZDogc3RyaW5nLCBkYXRhOiBhbnkpOiBQcm9taXNlPGFueT4ge1xuICAgIGNvbnN0IGRiID0gYXdhaXQgdGhpcy5nZXREYigpO1xuICAgIGNvbnN0IHJlc3VsdCA9IGF3YWl0IGRiLmNvbGxlY3Rpb24oY29sbGVjdGlvbikudXBkYXRlT25lKFxuICAgICAgeyBfaWQ6IG5ldyBPYmplY3RJZChpZCkgfSxcbiAgICAgIHsgJHNldDogZGF0YSB9XG4gICAgKTtcbiAgICByZXR1cm4gcmVzdWx0Lm1vZGlmaWVkQ291bnQgPiAwO1xuICB9XG5cbiAgYXN5bmMgZGVsZXRlKGNvbmZpZzogREJDb25maWcsIGNvbGxlY3Rpb246IHN0cmluZywgaWQ6IHN0cmluZyk6IFByb21pc2U8YW55PiB7XG4gICAgY29uc3QgZGIgPSBhd2FpdCB0aGlzLmdldERiKCk7XG4gICAgY29uc3QgcmVzdWx0ID0gYXdhaXQgZGIuY29sbGVjdGlvbihjb2xsZWN0aW9uKS5kZWxldGVPbmUoeyBfaWQ6IG5ldyBPYmplY3RJZChpZCkgfSk7XG4gICAgcmV0dXJuIHJlc3VsdC5kZWxldGVkQ291bnQgPiAwO1xuICB9XG59XG4iXSwibmFtZXMiOlsiTW9uZ29DbGllbnQiLCJPYmplY3RJZCIsIk1vbmdvREJBZGFwdGVyIiwiY29uc3RydWN0b3IiLCJjb25maWciLCJjb25uZWN0aW9uU3RyaW5nIiwiRXJyb3IiLCJjbGllbnQiLCJnZXREYiIsImRiIiwiY29ubmVjdCIsImRhdGFiYXNlIiwidGVzdENvbm5lY3Rpb24iLCJjb21tYW5kIiwicGluZyIsImNsb3NlIiwic3VjY2VzcyIsIm1lc3NhZ2UiLCJlcnJvciIsImNyZWF0ZSIsImNvbGxlY3Rpb24iLCJkYXRhIiwicmVzdWx0IiwiaW5zZXJ0T25lIiwiaW5zZXJ0ZWRJZCIsInJlYWQiLCJxdWVyeSIsImN1cnNvciIsImZpbmQiLCJ0b0FycmF5IiwidXBkYXRlIiwiaWQiLCJ1cGRhdGVPbmUiLCJfaWQiLCIkc2V0IiwibW9kaWZpZWRDb3VudCIsImRlbGV0ZSIsImRlbGV0ZU9uZSIsImRlbGV0ZWRDb3VudCJdLCJpZ25vcmVMaXN0IjpbXSwic291cmNlUm9vdCI6IiJ9\n//# sourceURL=webpack-internal:///(rsc)/./app/db-adapter/adapters/mongodb-adapter.ts\n");

/***/ }),

/***/ "(rsc)/./app/db-adapter/adapters/mysql-adapter.ts":
/*!**************************************************!*\
  !*** ./app/db-adapter/adapters/mysql-adapter.ts ***!
  \**************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
eval("__webpack_require__.r(__webpack_exports__);\n/* harmony export */ __webpack_require__.d(__webpack_exports__, {\n/* harmony export */   MySQLAdapter: () => (/* binding */ MySQLAdapter)\n/* harmony export */ });\n/* harmony import */ var mysql2_promise__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! mysql2/promise */ \"(rsc)/./node_modules/mysql2/promise.js\");\n// lib/db-adapter/adapters/mysql-adapter.ts\n\nclass MySQLAdapter {\n    constructor(config){\n        this.config = config;\n    }\n    async testConnection() {\n        try {\n            const connection = await mysql2_promise__WEBPACK_IMPORTED_MODULE_0__.createConnection({\n                host: this.config.host,\n                port: this.config.port ? Number(this.config.port) : 3306,\n                user: this.config.user,\n                password: this.config.password,\n                database: this.config.database\n            });\n            await connection.end();\n            return {\n                success: true,\n                message: 'Connected to MySQL successfully.'\n            };\n        } catch (err) {\n            return {\n                success: false,\n                message: err.message || 'Failed to connect to MySQL.'\n            };\n        }\n    }\n    async create(config, table, data) {\n        const connection = await mysql2_promise__WEBPACK_IMPORTED_MODULE_0__.createConnection({\n            host: config.host,\n            port: config.port ? Number(config.port) : 3306,\n            user: config.user,\n            password: config.password,\n            database: config.database\n        });\n        const keys = Object.keys(data);\n        const values = Object.values(data);\n        const placeholders = keys.map(()=>'?').join(', ');\n        const query = `INSERT INTO \\`${table}\\` (${keys.join(', ')}) VALUES (${placeholders})`;\n        try {\n            const [result] = await connection.execute(query, values);\n            return result;\n        } finally{\n            await connection.end();\n        }\n    }\n    async read(config, table, customQuery) {\n        const connection = await mysql2_promise__WEBPACK_IMPORTED_MODULE_0__.createConnection({\n            host: config.host,\n            port: config.port ? Number(config.port) : 3306,\n            user: config.user,\n            password: config.password,\n            database: config.database\n        });\n        const query = customQuery || `SELECT * FROM \\`${table}\\``;\n        try {\n            const [rows] = await connection.execute(query);\n            return rows;\n        } finally{\n            await connection.end();\n        }\n    }\n    async update(config, table, id, data) {\n        const connection = await mysql2_promise__WEBPACK_IMPORTED_MODULE_0__.createConnection({\n            host: config.host,\n            port: config.port ? Number(config.port) : 3306,\n            user: config.user,\n            password: config.password,\n            database: config.database\n        });\n        const keys = Object.keys(data);\n        const values = Object.values(data);\n        const setClause = keys.map((key)=>`\\`${key}\\` = ?`).join(', ');\n        const query = `UPDATE \\`${table}\\` SET ${setClause} WHERE id = ?`;\n        try {\n            const [result] = await connection.execute(query, [\n                ...values,\n                id\n            ]);\n            return result;\n        } finally{\n            await connection.end();\n        }\n    }\n    async delete(config, table, id) {\n        const connection = await mysql2_promise__WEBPACK_IMPORTED_MODULE_0__.createConnection({\n            host: config.host,\n            port: config.port ? Number(config.port) : 3306,\n            user: config.user,\n            password: config.password,\n            database: config.database\n        });\n        const query = `DELETE FROM \\`${table}\\` WHERE id = ?`;\n        try {\n            const [result] = await connection.execute(query, [\n                id\n            ]);\n            return result;\n        } finally{\n            await connection.end();\n        }\n    }\n}\n//# sourceURL=[module]\n//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiKHJzYykvLi9hcHAvZGItYWRhcHRlci9hZGFwdGVycy9teXNxbC1hZGFwdGVyLnRzIiwibWFwcGluZ3MiOiI7Ozs7O0FBQUEsMkNBQTJDO0FBQ1I7QUFHNUIsTUFBTUM7SUFDWEMsWUFBWSxNQUF3QixDQUFFO2FBQWxCQyxTQUFBQTtJQUFtQjtJQUV2QyxNQUFNQyxpQkFBaUU7UUFDckUsSUFBSTtZQUNGLE1BQU1DLGFBQWEsTUFBTUwsNERBQXNCLENBQUM7Z0JBQzlDTyxNQUFNLElBQUksQ0FBQ0osTUFBTSxDQUFDSSxJQUFJO2dCQUN0QkMsTUFBTSxJQUFJLENBQUNMLE1BQU0sQ0FBQ0ssSUFBSSxHQUFHQyxPQUFPLElBQUksQ0FBQ04sTUFBTSxDQUFDSyxJQUFJLElBQUk7Z0JBQ3BERSxNQUFNLElBQUksQ0FBQ1AsTUFBTSxDQUFDTyxJQUFJO2dCQUN0QkMsVUFBVSxJQUFJLENBQUNSLE1BQU0sQ0FBQ1EsUUFBUTtnQkFDOUJDLFVBQVUsSUFBSSxDQUFDVCxNQUFNLENBQUNTLFFBQVE7WUFDaEM7WUFDQSxNQUFNUCxXQUFXUSxHQUFHO1lBQ3BCLE9BQU87Z0JBQUVDLFNBQVM7Z0JBQU1DLFNBQVM7WUFBbUM7UUFDdEUsRUFBRSxPQUFPQyxLQUFVO1lBQ2pCLE9BQU87Z0JBQUVGLFNBQVM7Z0JBQU9DLFNBQVNDLElBQUlELE9BQU8sSUFBSTtZQUE4QjtRQUNqRjtJQUNGO0lBRUEsTUFBTUUsT0FBT2QsTUFBZ0IsRUFBRWUsS0FBYSxFQUFFQyxJQUFTLEVBQWdCO1FBQ3JFLE1BQU1kLGFBQWEsTUFBTUwsNERBQXNCLENBQUM7WUFDOUNPLE1BQU1KLE9BQU9JLElBQUk7WUFDakJDLE1BQU1MLE9BQU9LLElBQUksR0FBR0MsT0FBT04sT0FBT0ssSUFBSSxJQUFJO1lBQzFDRSxNQUFNUCxPQUFPTyxJQUFJO1lBQ2pCQyxVQUFVUixPQUFPUSxRQUFRO1lBQ3pCQyxVQUFVVCxPQUFPUyxRQUFRO1FBQzNCO1FBRUEsTUFBTVEsT0FBT0MsT0FBT0QsSUFBSSxDQUFDRDtRQUN6QixNQUFNRyxTQUFTRCxPQUFPQyxNQUFNLENBQUNIO1FBQzdCLE1BQU1JLGVBQWVILEtBQUtJLEdBQUcsQ0FBQyxJQUFNLEtBQUtDLElBQUksQ0FBQztRQUM5QyxNQUFNQyxRQUFRLENBQUMsY0FBYyxFQUFFUixNQUFNLElBQUksRUFBRUUsS0FBS0ssSUFBSSxDQUFDLE1BQU0sVUFBVSxFQUFFRixhQUFhLENBQUMsQ0FBQztRQUV0RixJQUFJO1lBQ0YsTUFBTSxDQUFDSSxPQUFPLEdBQUcsTUFBTXRCLFdBQVd1QixPQUFPLENBQUNGLE9BQU9KO1lBQ2pELE9BQU9LO1FBQ1QsU0FBVTtZQUNSLE1BQU10QixXQUFXUSxHQUFHO1FBQ3RCO0lBQ0Y7SUFFQSxNQUFNZ0IsS0FBSzFCLE1BQWdCLEVBQUVlLEtBQWEsRUFBRVksV0FBb0IsRUFBZ0I7UUFDOUUsTUFBTXpCLGFBQWEsTUFBTUwsNERBQXNCLENBQUM7WUFDOUNPLE1BQU1KLE9BQU9JLElBQUk7WUFDakJDLE1BQU1MLE9BQU9LLElBQUksR0FBR0MsT0FBT04sT0FBT0ssSUFBSSxJQUFJO1lBQzFDRSxNQUFNUCxPQUFPTyxJQUFJO1lBQ2pCQyxVQUFVUixPQUFPUSxRQUFRO1lBQ3pCQyxVQUFVVCxPQUFPUyxRQUFRO1FBQzNCO1FBRUEsTUFBTWMsUUFBUUksZUFBZSxDQUFDLGdCQUFnQixFQUFFWixNQUFNLEVBQUUsQ0FBQztRQUV6RCxJQUFJO1lBQ0YsTUFBTSxDQUFDYSxLQUFLLEdBQUcsTUFBTTFCLFdBQVd1QixPQUFPLENBQUNGO1lBQ3hDLE9BQU9LO1FBQ1QsU0FBVTtZQUNSLE1BQU0xQixXQUFXUSxHQUFHO1FBQ3RCO0lBQ0Y7SUFFQSxNQUFNbUIsT0FBTzdCLE1BQWdCLEVBQUVlLEtBQWEsRUFBRWUsRUFBVSxFQUFFZCxJQUFTLEVBQWdCO1FBQ2pGLE1BQU1kLGFBQWEsTUFBTUwsNERBQXNCLENBQUM7WUFDOUNPLE1BQU1KLE9BQU9JLElBQUk7WUFDakJDLE1BQU1MLE9BQU9LLElBQUksR0FBR0MsT0FBT04sT0FBT0ssSUFBSSxJQUFJO1lBQzFDRSxNQUFNUCxPQUFPTyxJQUFJO1lBQ2pCQyxVQUFVUixPQUFPUSxRQUFRO1lBQ3pCQyxVQUFVVCxPQUFPUyxRQUFRO1FBQzNCO1FBRUEsTUFBTVEsT0FBT0MsT0FBT0QsSUFBSSxDQUFDRDtRQUN6QixNQUFNRyxTQUFTRCxPQUFPQyxNQUFNLENBQUNIO1FBQzdCLE1BQU1lLFlBQVlkLEtBQUtJLEdBQUcsQ0FBQ1csQ0FBQUEsTUFBTyxDQUFDLEVBQUUsRUFBRUEsSUFBSSxNQUFNLENBQUMsRUFBRVYsSUFBSSxDQUFDO1FBQ3pELE1BQU1DLFFBQVEsQ0FBQyxTQUFTLEVBQUVSLE1BQU0sT0FBTyxFQUFFZ0IsVUFBVSxhQUFhLENBQUM7UUFFakUsSUFBSTtZQUNGLE1BQU0sQ0FBQ1AsT0FBTyxHQUFHLE1BQU10QixXQUFXdUIsT0FBTyxDQUFDRixPQUFPO21CQUFJSjtnQkFBUVc7YUFBRztZQUNoRSxPQUFPTjtRQUNULFNBQVU7WUFDUixNQUFNdEIsV0FBV1EsR0FBRztRQUN0QjtJQUNGO0lBRUEsTUFBTXVCLE9BQU9qQyxNQUFnQixFQUFFZSxLQUFhLEVBQUVlLEVBQVUsRUFBZ0I7UUFDdEUsTUFBTTVCLGFBQWEsTUFBTUwsNERBQXNCLENBQUM7WUFDOUNPLE1BQU1KLE9BQU9JLElBQUk7WUFDakJDLE1BQU1MLE9BQU9LLElBQUksR0FBR0MsT0FBT04sT0FBT0ssSUFBSSxJQUFJO1lBQzFDRSxNQUFNUCxPQUFPTyxJQUFJO1lBQ2pCQyxVQUFVUixPQUFPUSxRQUFRO1lBQ3pCQyxVQUFVVCxPQUFPUyxRQUFRO1FBQzNCO1FBRUEsTUFBTWMsUUFBUSxDQUFDLGNBQWMsRUFBRVIsTUFBTSxlQUFlLENBQUM7UUFFckQsSUFBSTtZQUNGLE1BQU0sQ0FBQ1MsT0FBTyxHQUFHLE1BQU10QixXQUFXdUIsT0FBTyxDQUFDRixPQUFPO2dCQUFDTzthQUFHO1lBQ3JELE9BQU9OO1FBQ1QsU0FBVTtZQUNSLE1BQU10QixXQUFXUSxHQUFHO1FBQ3RCO0lBQ0Y7QUFDRiIsInNvdXJjZXMiOlsiL1VzZXJzL2FudG9ud2VudHplbC9ueHRmbHV0dGVyX2NvcmUvbWFpbi9hcHAvYXBwL2RiLWFkYXB0ZXIvYWRhcHRlcnMvbXlzcWwtYWRhcHRlci50cyJdLCJzb3VyY2VzQ29udGVudCI6WyIvLyBsaWIvZGItYWRhcHRlci9hZGFwdGVycy9teXNxbC1hZGFwdGVyLnRzXG5pbXBvcnQgbXlzcWwgZnJvbSAnbXlzcWwyL3Byb21pc2UnO1xuaW1wb3J0IHsgREJBZGFwdGVyLCBEQkNvbmZpZyB9IGZyb20gJy4uL3R5cGVzJztcblxuZXhwb3J0IGNsYXNzIE15U1FMQWRhcHRlciBpbXBsZW1lbnRzIERCQWRhcHRlciB7XG4gIGNvbnN0cnVjdG9yKHByaXZhdGUgY29uZmlnOiBEQkNvbmZpZykge31cblxuICBhc3luYyB0ZXN0Q29ubmVjdGlvbigpOiBQcm9taXNlPHsgc3VjY2VzczogYm9vbGVhbjsgbWVzc2FnZTogc3RyaW5nIH0+IHtcbiAgICB0cnkge1xuICAgICAgY29uc3QgY29ubmVjdGlvbiA9IGF3YWl0IG15c3FsLmNyZWF0ZUNvbm5lY3Rpb24oe1xuICAgICAgICBob3N0OiB0aGlzLmNvbmZpZy5ob3N0LFxuICAgICAgICBwb3J0OiB0aGlzLmNvbmZpZy5wb3J0ID8gTnVtYmVyKHRoaXMuY29uZmlnLnBvcnQpIDogMzMwNixcbiAgICAgICAgdXNlcjogdGhpcy5jb25maWcudXNlcixcbiAgICAgICAgcGFzc3dvcmQ6IHRoaXMuY29uZmlnLnBhc3N3b3JkLFxuICAgICAgICBkYXRhYmFzZTogdGhpcy5jb25maWcuZGF0YWJhc2UsXG4gICAgICB9KTtcbiAgICAgIGF3YWl0IGNvbm5lY3Rpb24uZW5kKCk7XG4gICAgICByZXR1cm4geyBzdWNjZXNzOiB0cnVlLCBtZXNzYWdlOiAnQ29ubmVjdGVkIHRvIE15U1FMIHN1Y2Nlc3NmdWxseS4nIH07XG4gICAgfSBjYXRjaCAoZXJyOiBhbnkpIHtcbiAgICAgIHJldHVybiB7IHN1Y2Nlc3M6IGZhbHNlLCBtZXNzYWdlOiBlcnIubWVzc2FnZSB8fCAnRmFpbGVkIHRvIGNvbm5lY3QgdG8gTXlTUUwuJyB9O1xuICAgIH1cbiAgfVxuXG4gIGFzeW5jIGNyZWF0ZShjb25maWc6IERCQ29uZmlnLCB0YWJsZTogc3RyaW5nLCBkYXRhOiBhbnkpOiBQcm9taXNlPGFueT4ge1xuICAgIGNvbnN0IGNvbm5lY3Rpb24gPSBhd2FpdCBteXNxbC5jcmVhdGVDb25uZWN0aW9uKHtcbiAgICAgIGhvc3Q6IGNvbmZpZy5ob3N0LFxuICAgICAgcG9ydDogY29uZmlnLnBvcnQgPyBOdW1iZXIoY29uZmlnLnBvcnQpIDogMzMwNixcbiAgICAgIHVzZXI6IGNvbmZpZy51c2VyLFxuICAgICAgcGFzc3dvcmQ6IGNvbmZpZy5wYXNzd29yZCxcbiAgICAgIGRhdGFiYXNlOiBjb25maWcuZGF0YWJhc2UsXG4gICAgfSk7XG5cbiAgICBjb25zdCBrZXlzID0gT2JqZWN0LmtleXMoZGF0YSk7XG4gICAgY29uc3QgdmFsdWVzID0gT2JqZWN0LnZhbHVlcyhkYXRhKTtcbiAgICBjb25zdCBwbGFjZWhvbGRlcnMgPSBrZXlzLm1hcCgoKSA9PiAnPycpLmpvaW4oJywgJyk7XG4gICAgY29uc3QgcXVlcnkgPSBgSU5TRVJUIElOVE8gXFxgJHt0YWJsZX1cXGAgKCR7a2V5cy5qb2luKCcsICcpfSkgVkFMVUVTICgke3BsYWNlaG9sZGVyc30pYDtcblxuICAgIHRyeSB7XG4gICAgICBjb25zdCBbcmVzdWx0XSA9IGF3YWl0IGNvbm5lY3Rpb24uZXhlY3V0ZShxdWVyeSwgdmFsdWVzKTtcbiAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgfSBmaW5hbGx5IHtcbiAgICAgIGF3YWl0IGNvbm5lY3Rpb24uZW5kKCk7XG4gICAgfVxuICB9XG5cbiAgYXN5bmMgcmVhZChjb25maWc6IERCQ29uZmlnLCB0YWJsZTogc3RyaW5nLCBjdXN0b21RdWVyeT86IHN0cmluZyk6IFByb21pc2U8YW55PiB7XG4gICAgY29uc3QgY29ubmVjdGlvbiA9IGF3YWl0IG15c3FsLmNyZWF0ZUNvbm5lY3Rpb24oe1xuICAgICAgaG9zdDogY29uZmlnLmhvc3QsXG4gICAgICBwb3J0OiBjb25maWcucG9ydCA/IE51bWJlcihjb25maWcucG9ydCkgOiAzMzA2LFxuICAgICAgdXNlcjogY29uZmlnLnVzZXIsXG4gICAgICBwYXNzd29yZDogY29uZmlnLnBhc3N3b3JkLFxuICAgICAgZGF0YWJhc2U6IGNvbmZpZy5kYXRhYmFzZSxcbiAgICB9KTtcblxuICAgIGNvbnN0IHF1ZXJ5ID0gY3VzdG9tUXVlcnkgfHwgYFNFTEVDVCAqIEZST00gXFxgJHt0YWJsZX1cXGBgO1xuXG4gICAgdHJ5IHtcbiAgICAgIGNvbnN0IFtyb3dzXSA9IGF3YWl0IGNvbm5lY3Rpb24uZXhlY3V0ZShxdWVyeSk7XG4gICAgICByZXR1cm4gcm93cztcbiAgICB9IGZpbmFsbHkge1xuICAgICAgYXdhaXQgY29ubmVjdGlvbi5lbmQoKTtcbiAgICB9XG4gIH1cblxuICBhc3luYyB1cGRhdGUoY29uZmlnOiBEQkNvbmZpZywgdGFibGU6IHN0cmluZywgaWQ6IHN0cmluZywgZGF0YTogYW55KTogUHJvbWlzZTxhbnk+IHtcbiAgICBjb25zdCBjb25uZWN0aW9uID0gYXdhaXQgbXlzcWwuY3JlYXRlQ29ubmVjdGlvbih7XG4gICAgICBob3N0OiBjb25maWcuaG9zdCxcbiAgICAgIHBvcnQ6IGNvbmZpZy5wb3J0ID8gTnVtYmVyKGNvbmZpZy5wb3J0KSA6IDMzMDYsXG4gICAgICB1c2VyOiBjb25maWcudXNlcixcbiAgICAgIHBhc3N3b3JkOiBjb25maWcucGFzc3dvcmQsXG4gICAgICBkYXRhYmFzZTogY29uZmlnLmRhdGFiYXNlLFxuICAgIH0pO1xuXG4gICAgY29uc3Qga2V5cyA9IE9iamVjdC5rZXlzKGRhdGEpO1xuICAgIGNvbnN0IHZhbHVlcyA9IE9iamVjdC52YWx1ZXMoZGF0YSk7XG4gICAgY29uc3Qgc2V0Q2xhdXNlID0ga2V5cy5tYXAoa2V5ID0+IGBcXGAke2tleX1cXGAgPSA/YCkuam9pbignLCAnKTtcbiAgICBjb25zdCBxdWVyeSA9IGBVUERBVEUgXFxgJHt0YWJsZX1cXGAgU0VUICR7c2V0Q2xhdXNlfSBXSEVSRSBpZCA9ID9gO1xuXG4gICAgdHJ5IHtcbiAgICAgIGNvbnN0IFtyZXN1bHRdID0gYXdhaXQgY29ubmVjdGlvbi5leGVjdXRlKHF1ZXJ5LCBbLi4udmFsdWVzLCBpZF0pO1xuICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICB9IGZpbmFsbHkge1xuICAgICAgYXdhaXQgY29ubmVjdGlvbi5lbmQoKTtcbiAgICB9XG4gIH1cblxuICBhc3luYyBkZWxldGUoY29uZmlnOiBEQkNvbmZpZywgdGFibGU6IHN0cmluZywgaWQ6IHN0cmluZyk6IFByb21pc2U8YW55PiB7XG4gICAgY29uc3QgY29ubmVjdGlvbiA9IGF3YWl0IG15c3FsLmNyZWF0ZUNvbm5lY3Rpb24oe1xuICAgICAgaG9zdDogY29uZmlnLmhvc3QsXG4gICAgICBwb3J0OiBjb25maWcucG9ydCA/IE51bWJlcihjb25maWcucG9ydCkgOiAzMzA2LFxuICAgICAgdXNlcjogY29uZmlnLnVzZXIsXG4gICAgICBwYXNzd29yZDogY29uZmlnLnBhc3N3b3JkLFxuICAgICAgZGF0YWJhc2U6IGNvbmZpZy5kYXRhYmFzZSxcbiAgICB9KTtcblxuICAgIGNvbnN0IHF1ZXJ5ID0gYERFTEVURSBGUk9NIFxcYCR7dGFibGV9XFxgIFdIRVJFIGlkID0gP2A7XG5cbiAgICB0cnkge1xuICAgICAgY29uc3QgW3Jlc3VsdF0gPSBhd2FpdCBjb25uZWN0aW9uLmV4ZWN1dGUocXVlcnksIFtpZF0pO1xuICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICB9IGZpbmFsbHkge1xuICAgICAgYXdhaXQgY29ubmVjdGlvbi5lbmQoKTtcbiAgICB9XG4gIH1cbn1cbiJdLCJuYW1lcyI6WyJteXNxbCIsIk15U1FMQWRhcHRlciIsImNvbnN0cnVjdG9yIiwiY29uZmlnIiwidGVzdENvbm5lY3Rpb24iLCJjb25uZWN0aW9uIiwiY3JlYXRlQ29ubmVjdGlvbiIsImhvc3QiLCJwb3J0IiwiTnVtYmVyIiwidXNlciIsInBhc3N3b3JkIiwiZGF0YWJhc2UiLCJlbmQiLCJzdWNjZXNzIiwibWVzc2FnZSIsImVyciIsImNyZWF0ZSIsInRhYmxlIiwiZGF0YSIsImtleXMiLCJPYmplY3QiLCJ2YWx1ZXMiLCJwbGFjZWhvbGRlcnMiLCJtYXAiLCJqb2luIiwicXVlcnkiLCJyZXN1bHQiLCJleGVjdXRlIiwicmVhZCIsImN1c3RvbVF1ZXJ5Iiwicm93cyIsInVwZGF0ZSIsImlkIiwic2V0Q2xhdXNlIiwia2V5IiwiZGVsZXRlIl0sImlnbm9yZUxpc3QiOltdLCJzb3VyY2VSb290IjoiIn0=\n//# sourceURL=webpack-internal:///(rsc)/./app/db-adapter/adapters/mysql-adapter.ts\n");

/***/ }),

/***/ "(rsc)/./app/db-adapter/adapters/planetscale-adapter.ts":
/*!********************************************************!*\
  !*** ./app/db-adapter/adapters/planetscale-adapter.ts ***!
  \********************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
eval("__webpack_require__.r(__webpack_exports__);\n/* harmony export */ __webpack_require__.d(__webpack_exports__, {\n/* harmony export */   PlanetScaleAdapter: () => (/* binding */ PlanetScaleAdapter)\n/* harmony export */ });\n/* harmony import */ var _planetscale_database__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! @planetscale/database */ \"(rsc)/./node_modules/@planetscale/database/dist/index.js\");\n// lib/db-adapter/adapters/planetscale-adapter.ts\n\nclass PlanetScaleAdapter {\n    constructor(config){\n        this.config = config;\n        this.connection = (0,_planetscale_database__WEBPACK_IMPORTED_MODULE_0__.connect)({\n            host: config.host,\n            username: config.user,\n            password: config.password\n        });\n    }\n    async testConnection() {\n        try {\n            const result = await this.connection.execute('SELECT 1');\n            return {\n                success: true,\n                message: 'Successfully connected to PlanetScale.'\n            };\n        } catch (error) {\n            return {\n                success: false,\n                message: error.message || 'Failed to connect to PlanetScale.'\n            };\n        }\n    }\n    async create(config, table, data) {\n        const keys = Object.keys(data).join(', ');\n        const placeholders = Object.keys(data).map(()=>'?').join(', ');\n        const values = Object.values(data);\n        const query = `INSERT INTO ${table} (${keys}) VALUES (${placeholders})`;\n        const result = await this.connection.execute(query, values);\n        return result;\n    }\n    async read(config, table, query) {\n        const sql = query || `SELECT * FROM ${table}`;\n        const result = await this.connection.execute(sql);\n        return result.rows;\n    }\n    async update(config, table, id, data) {\n        const setClause = Object.keys(data).map((key)=>`${key} = ?`).join(', ');\n        const values = [\n            ...Object.values(data),\n            id\n        ];\n        const query = `UPDATE ${table} SET ${setClause} WHERE id = ?`;\n        const result = await this.connection.execute(query, values);\n        return result;\n    }\n    async delete(config, table, id) {\n        const query = `DELETE FROM ${table} WHERE id = ?`;\n        const result = await this.connection.execute(query, [\n            id\n        ]);\n        return result;\n    }\n}\n//# sourceURL=[module]\n//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiKHJzYykvLi9hcHAvZGItYWRhcHRlci9hZGFwdGVycy9wbGFuZXRzY2FsZS1hZGFwdGVyLnRzIiwibWFwcGluZ3MiOiI7Ozs7O0FBQUEsaURBQWlEO0FBRVc7QUFFckQsTUFBTUM7SUFHWEMsWUFBWSxNQUF3QixDQUFFO2FBQWxCQyxTQUFBQTtRQUNsQixJQUFJLENBQUNDLFVBQVUsR0FBR0osOERBQU9BLENBQUM7WUFDeEJLLE1BQU1GLE9BQU9FLElBQUk7WUFDakJDLFVBQVVILE9BQU9JLElBQUk7WUFDckJDLFVBQVVMLE9BQU9LLFFBQVE7UUFDM0I7SUFDRjtJQUVBLE1BQU1DLGlCQUFpRTtRQUNyRSxJQUFJO1lBQ0YsTUFBTUMsU0FBUyxNQUFNLElBQUksQ0FBQ04sVUFBVSxDQUFDTyxPQUFPLENBQUM7WUFDN0MsT0FBTztnQkFDTEMsU0FBUztnQkFDVEMsU0FBUztZQUNYO1FBQ0YsRUFBRSxPQUFPQyxPQUFZO1lBQ25CLE9BQU87Z0JBQ0xGLFNBQVM7Z0JBQ1RDLFNBQVNDLE1BQU1ELE9BQU8sSUFBSTtZQUM1QjtRQUNGO0lBQ0Y7SUFFQSxNQUFNRSxPQUFPWixNQUFnQixFQUFFYSxLQUFhLEVBQUVDLElBQVMsRUFBZ0I7UUFDckUsTUFBTUMsT0FBT0MsT0FBT0QsSUFBSSxDQUFDRCxNQUFNRyxJQUFJLENBQUM7UUFDcEMsTUFBTUMsZUFBZUYsT0FBT0QsSUFBSSxDQUFDRCxNQUM5QkssR0FBRyxDQUFDLElBQU0sS0FDVkYsSUFBSSxDQUFDO1FBQ1IsTUFBTUcsU0FBU0osT0FBT0ksTUFBTSxDQUFDTjtRQUU3QixNQUFNTyxRQUFRLENBQUMsWUFBWSxFQUFFUixNQUFNLEVBQUUsRUFBRUUsS0FBSyxVQUFVLEVBQUVHLGFBQWEsQ0FBQyxDQUFDO1FBQ3ZFLE1BQU1YLFNBQVMsTUFBTSxJQUFJLENBQUNOLFVBQVUsQ0FBQ08sT0FBTyxDQUFDYSxPQUFPRDtRQUNwRCxPQUFPYjtJQUNUO0lBRUEsTUFBTWUsS0FBS3RCLE1BQWdCLEVBQUVhLEtBQWEsRUFBRVEsS0FBYyxFQUFnQjtRQUN4RSxNQUFNRSxNQUFNRixTQUFTLENBQUMsY0FBYyxFQUFFUixPQUFPO1FBQzdDLE1BQU1OLFNBQVMsTUFBTSxJQUFJLENBQUNOLFVBQVUsQ0FBQ08sT0FBTyxDQUFDZTtRQUM3QyxPQUFPaEIsT0FBT2lCLElBQUk7SUFDcEI7SUFFQSxNQUFNQyxPQUFPekIsTUFBZ0IsRUFBRWEsS0FBYSxFQUFFYSxFQUFVLEVBQUVaLElBQVMsRUFBZ0I7UUFDakYsTUFBTWEsWUFBWVgsT0FBT0QsSUFBSSxDQUFDRCxNQUMzQkssR0FBRyxDQUFDUyxDQUFBQSxNQUFPLEdBQUdBLElBQUksSUFBSSxDQUFDLEVBQ3ZCWCxJQUFJLENBQUM7UUFDUixNQUFNRyxTQUFTO2VBQUlKLE9BQU9JLE1BQU0sQ0FBQ047WUFBT1k7U0FBRztRQUMzQyxNQUFNTCxRQUFRLENBQUMsT0FBTyxFQUFFUixNQUFNLEtBQUssRUFBRWMsVUFBVSxhQUFhLENBQUM7UUFDN0QsTUFBTXBCLFNBQVMsTUFBTSxJQUFJLENBQUNOLFVBQVUsQ0FBQ08sT0FBTyxDQUFDYSxPQUFPRDtRQUNwRCxPQUFPYjtJQUNUO0lBRUEsTUFBTXNCLE9BQU83QixNQUFnQixFQUFFYSxLQUFhLEVBQUVhLEVBQVUsRUFBZ0I7UUFDdEUsTUFBTUwsUUFBUSxDQUFDLFlBQVksRUFBRVIsTUFBTSxhQUFhLENBQUM7UUFDakQsTUFBTU4sU0FBUyxNQUFNLElBQUksQ0FBQ04sVUFBVSxDQUFDTyxPQUFPLENBQUNhLE9BQU87WUFBQ0s7U0FBRztRQUN4RCxPQUFPbkI7SUFDVDtBQUNGIiwic291cmNlcyI6WyIvVXNlcnMvYW50b253ZW50emVsL254dGZsdXR0ZXJfY29yZS9tYWluL2FwcC9hcHAvZGItYWRhcHRlci9hZGFwdGVycy9wbGFuZXRzY2FsZS1hZGFwdGVyLnRzIl0sInNvdXJjZXNDb250ZW50IjpbIi8vIGxpYi9kYi1hZGFwdGVyL2FkYXB0ZXJzL3BsYW5ldHNjYWxlLWFkYXB0ZXIudHNcbmltcG9ydCB7IERCQWRhcHRlciwgREJDb25maWcgfSBmcm9tICcuLi90eXBlcyc7XG5pbXBvcnQgeyBjb25uZWN0LCBDb25uZWN0aW9uIH0gZnJvbSAnQHBsYW5ldHNjYWxlL2RhdGFiYXNlJztcblxuZXhwb3J0IGNsYXNzIFBsYW5ldFNjYWxlQWRhcHRlciBpbXBsZW1lbnRzIERCQWRhcHRlciB7XG4gIHByaXZhdGUgY29ubmVjdGlvbjogQ29ubmVjdGlvbjtcblxuICBjb25zdHJ1Y3Rvcihwcml2YXRlIGNvbmZpZzogREJDb25maWcpIHtcbiAgICB0aGlzLmNvbm5lY3Rpb24gPSBjb25uZWN0KHtcbiAgICAgIGhvc3Q6IGNvbmZpZy5ob3N0LFxuICAgICAgdXNlcm5hbWU6IGNvbmZpZy51c2VyLFxuICAgICAgcGFzc3dvcmQ6IGNvbmZpZy5wYXNzd29yZCxcbiAgICB9KTtcbiAgfVxuXG4gIGFzeW5jIHRlc3RDb25uZWN0aW9uKCk6IFByb21pc2U8eyBzdWNjZXNzOiBib29sZWFuOyBtZXNzYWdlOiBzdHJpbmcgfT4ge1xuICAgIHRyeSB7XG4gICAgICBjb25zdCByZXN1bHQgPSBhd2FpdCB0aGlzLmNvbm5lY3Rpb24uZXhlY3V0ZSgnU0VMRUNUIDEnKTtcbiAgICAgIHJldHVybiB7XG4gICAgICAgIHN1Y2Nlc3M6IHRydWUsXG4gICAgICAgIG1lc3NhZ2U6ICdTdWNjZXNzZnVsbHkgY29ubmVjdGVkIHRvIFBsYW5ldFNjYWxlLicsXG4gICAgICB9O1xuICAgIH0gY2F0Y2ggKGVycm9yOiBhbnkpIHtcbiAgICAgIHJldHVybiB7XG4gICAgICAgIHN1Y2Nlc3M6IGZhbHNlLFxuICAgICAgICBtZXNzYWdlOiBlcnJvci5tZXNzYWdlIHx8ICdGYWlsZWQgdG8gY29ubmVjdCB0byBQbGFuZXRTY2FsZS4nLFxuICAgICAgfTtcbiAgICB9XG4gIH1cblxuICBhc3luYyBjcmVhdGUoY29uZmlnOiBEQkNvbmZpZywgdGFibGU6IHN0cmluZywgZGF0YTogYW55KTogUHJvbWlzZTxhbnk+IHtcbiAgICBjb25zdCBrZXlzID0gT2JqZWN0LmtleXMoZGF0YSkuam9pbignLCAnKTtcbiAgICBjb25zdCBwbGFjZWhvbGRlcnMgPSBPYmplY3Qua2V5cyhkYXRhKVxuICAgICAgLm1hcCgoKSA9PiAnPycpXG4gICAgICAuam9pbignLCAnKTtcbiAgICBjb25zdCB2YWx1ZXMgPSBPYmplY3QudmFsdWVzKGRhdGEpO1xuXG4gICAgY29uc3QgcXVlcnkgPSBgSU5TRVJUIElOVE8gJHt0YWJsZX0gKCR7a2V5c30pIFZBTFVFUyAoJHtwbGFjZWhvbGRlcnN9KWA7XG4gICAgY29uc3QgcmVzdWx0ID0gYXdhaXQgdGhpcy5jb25uZWN0aW9uLmV4ZWN1dGUocXVlcnksIHZhbHVlcyk7XG4gICAgcmV0dXJuIHJlc3VsdDtcbiAgfVxuXG4gIGFzeW5jIHJlYWQoY29uZmlnOiBEQkNvbmZpZywgdGFibGU6IHN0cmluZywgcXVlcnk/OiBzdHJpbmcpOiBQcm9taXNlPGFueT4ge1xuICAgIGNvbnN0IHNxbCA9IHF1ZXJ5IHx8IGBTRUxFQ1QgKiBGUk9NICR7dGFibGV9YDtcbiAgICBjb25zdCByZXN1bHQgPSBhd2FpdCB0aGlzLmNvbm5lY3Rpb24uZXhlY3V0ZShzcWwpO1xuICAgIHJldHVybiByZXN1bHQucm93cztcbiAgfVxuXG4gIGFzeW5jIHVwZGF0ZShjb25maWc6IERCQ29uZmlnLCB0YWJsZTogc3RyaW5nLCBpZDogc3RyaW5nLCBkYXRhOiBhbnkpOiBQcm9taXNlPGFueT4ge1xuICAgIGNvbnN0IHNldENsYXVzZSA9IE9iamVjdC5rZXlzKGRhdGEpXG4gICAgICAubWFwKGtleSA9PiBgJHtrZXl9ID0gP2ApXG4gICAgICAuam9pbignLCAnKTtcbiAgICBjb25zdCB2YWx1ZXMgPSBbLi4uT2JqZWN0LnZhbHVlcyhkYXRhKSwgaWRdO1xuICAgIGNvbnN0IHF1ZXJ5ID0gYFVQREFURSAke3RhYmxlfSBTRVQgJHtzZXRDbGF1c2V9IFdIRVJFIGlkID0gP2A7XG4gICAgY29uc3QgcmVzdWx0ID0gYXdhaXQgdGhpcy5jb25uZWN0aW9uLmV4ZWN1dGUocXVlcnksIHZhbHVlcyk7XG4gICAgcmV0dXJuIHJlc3VsdDtcbiAgfVxuXG4gIGFzeW5jIGRlbGV0ZShjb25maWc6IERCQ29uZmlnLCB0YWJsZTogc3RyaW5nLCBpZDogc3RyaW5nKTogUHJvbWlzZTxhbnk+IHtcbiAgICBjb25zdCBxdWVyeSA9IGBERUxFVEUgRlJPTSAke3RhYmxlfSBXSEVSRSBpZCA9ID9gO1xuICAgIGNvbnN0IHJlc3VsdCA9IGF3YWl0IHRoaXMuY29ubmVjdGlvbi5leGVjdXRlKHF1ZXJ5LCBbaWRdKTtcbiAgICByZXR1cm4gcmVzdWx0O1xuICB9XG59XG4iXSwibmFtZXMiOlsiY29ubmVjdCIsIlBsYW5ldFNjYWxlQWRhcHRlciIsImNvbnN0cnVjdG9yIiwiY29uZmlnIiwiY29ubmVjdGlvbiIsImhvc3QiLCJ1c2VybmFtZSIsInVzZXIiLCJwYXNzd29yZCIsInRlc3RDb25uZWN0aW9uIiwicmVzdWx0IiwiZXhlY3V0ZSIsInN1Y2Nlc3MiLCJtZXNzYWdlIiwiZXJyb3IiLCJjcmVhdGUiLCJ0YWJsZSIsImRhdGEiLCJrZXlzIiwiT2JqZWN0Iiwiam9pbiIsInBsYWNlaG9sZGVycyIsIm1hcCIsInZhbHVlcyIsInF1ZXJ5IiwicmVhZCIsInNxbCIsInJvd3MiLCJ1cGRhdGUiLCJpZCIsInNldENsYXVzZSIsImtleSIsImRlbGV0ZSJdLCJpZ25vcmVMaXN0IjpbXSwic291cmNlUm9vdCI6IiJ9\n//# sourceURL=webpack-internal:///(rsc)/./app/db-adapter/adapters/planetscale-adapter.ts\n");

/***/ }),

/***/ "(rsc)/./app/db-adapter/adapters/postgres-adapter.ts":
/*!*****************************************************!*\
  !*** ./app/db-adapter/adapters/postgres-adapter.ts ***!
  \*****************************************************/
/***/ ((module, __webpack_exports__, __webpack_require__) => {

"use strict";
eval("__webpack_require__.a(module, async (__webpack_handle_async_dependencies__, __webpack_async_result__) => { try {\n__webpack_require__.r(__webpack_exports__);\n/* harmony export */ __webpack_require__.d(__webpack_exports__, {\n/* harmony export */   PostgresAdapter: () => (/* binding */ PostgresAdapter)\n/* harmony export */ });\n/* harmony import */ var pg__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! pg */ \"pg\");\nvar __webpack_async_dependencies__ = __webpack_handle_async_dependencies__([pg__WEBPACK_IMPORTED_MODULE_0__]);\npg__WEBPACK_IMPORTED_MODULE_0__ = (__webpack_async_dependencies__.then ? (await __webpack_async_dependencies__)() : __webpack_async_dependencies__)[0];\n// lib/db-adapter/adapters/postgres-adapter.ts\n\nclass PostgresAdapter {\n    constructor(config){\n        this.config = config;\n    }\n    async testConnection() {\n        const client = new pg__WEBPACK_IMPORTED_MODULE_0__.Client({\n            host: this.config.host,\n            port: this.config.port ? Number(this.config.port) : 5432,\n            user: this.config.user,\n            password: this.config.password,\n            database: this.config.database\n        });\n        try {\n            await client.connect();\n            await client.end();\n            return {\n                success: true,\n                message: 'Connected to PostgreSQL successfully.'\n            };\n        } catch (err) {\n            return {\n                success: false,\n                message: err.message || 'Failed to connect to PostgreSQL.'\n            };\n        }\n    }\n    async create(config, table, data) {\n        const client = new pg__WEBPACK_IMPORTED_MODULE_0__.Client({\n            host: config.host,\n            port: config.port ? Number(config.port) : 5432,\n            user: config.user,\n            password: config.password,\n            database: config.database\n        });\n        const keys = Object.keys(data);\n        const values = Object.values(data);\n        const placeholders = keys.map((_, i)=>`$${i + 1}`).join(', ');\n        const query = `INSERT INTO ${table} (${keys.join(', ')}) VALUES (${placeholders}) RETURNING *`;\n        try {\n            await client.connect();\n            const result = await client.query(query, values);\n            return result.rows[0];\n        } finally{\n            await client.end();\n        }\n    }\n    async read(config, table, query) {\n        const client = new pg__WEBPACK_IMPORTED_MODULE_0__.Client({\n            host: config.host,\n            port: config.port ? Number(config.port) : 5432,\n            user: config.user,\n            password: config.password,\n            database: config.database\n        });\n        try {\n            await client.connect();\n            const result = await client.query(query || `SELECT * FROM ${table}`);\n            return result.rows;\n        } finally{\n            await client.end();\n        }\n    }\n    async update(config, table, id, data) {\n        const client = new pg__WEBPACK_IMPORTED_MODULE_0__.Client({\n            host: config.host,\n            port: config.port ? Number(config.port) : 5432,\n            user: config.user,\n            password: config.password,\n            database: config.database\n        });\n        const keys = Object.keys(data);\n        const values = Object.values(data);\n        const setClause = keys.map((key, i)=>`${key} = $${i + 1}`).join(', ');\n        const query = `UPDATE ${table} SET ${setClause} WHERE id = $${keys.length + 1} RETURNING *`;\n        try {\n            await client.connect();\n            const result = await client.query(query, [\n                ...values,\n                id\n            ]);\n            return result.rows[0];\n        } finally{\n            await client.end();\n        }\n    }\n    async delete(config, table, id) {\n        const client = new pg__WEBPACK_IMPORTED_MODULE_0__.Client({\n            host: config.host,\n            port: config.port ? Number(config.port) : 5432,\n            user: config.user,\n            password: config.password,\n            database: config.database\n        });\n        const query = `DELETE FROM ${table} WHERE id = $1 RETURNING *`;\n        try {\n            await client.connect();\n            const result = await client.query(query, [\n                id\n            ]);\n            return result.rows[0];\n        } finally{\n            await client.end();\n        }\n    }\n}\n\n__webpack_async_result__();\n} catch(e) { __webpack_async_result__(e); } });//# sourceURL=[module]\n//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiKHJzYykvLi9hcHAvZGItYWRhcHRlci9hZGFwdGVycy9wb3N0Z3Jlcy1hZGFwdGVyLnRzIiwibWFwcGluZ3MiOiI7Ozs7Ozs7O0FBQUEsOENBQThDO0FBQ2xCO0FBR3JCLE1BQU1DO0lBQ1hDLFlBQVksTUFBd0IsQ0FBRTthQUFsQkMsU0FBQUE7SUFBbUI7SUFFdkMsTUFBTUMsaUJBQWlFO1FBQ3JFLE1BQU1DLFNBQVMsSUFBSUwsc0NBQU1BLENBQUM7WUFDeEJNLE1BQU0sSUFBSSxDQUFDSCxNQUFNLENBQUNHLElBQUk7WUFDdEJDLE1BQU0sSUFBSSxDQUFDSixNQUFNLENBQUNJLElBQUksR0FBR0MsT0FBTyxJQUFJLENBQUNMLE1BQU0sQ0FBQ0ksSUFBSSxJQUFJO1lBQ3BERSxNQUFNLElBQUksQ0FBQ04sTUFBTSxDQUFDTSxJQUFJO1lBQ3RCQyxVQUFVLElBQUksQ0FBQ1AsTUFBTSxDQUFDTyxRQUFRO1lBQzlCQyxVQUFVLElBQUksQ0FBQ1IsTUFBTSxDQUFDUSxRQUFRO1FBQ2hDO1FBRUEsSUFBSTtZQUNGLE1BQU1OLE9BQU9PLE9BQU87WUFDcEIsTUFBTVAsT0FBT1EsR0FBRztZQUNoQixPQUFPO2dCQUFFQyxTQUFTO2dCQUFNQyxTQUFTO1lBQXdDO1FBQzNFLEVBQUUsT0FBT0MsS0FBVTtZQUNqQixPQUFPO2dCQUFFRixTQUFTO2dCQUFPQyxTQUFTQyxJQUFJRCxPQUFPLElBQUk7WUFBbUM7UUFDdEY7SUFDRjtJQUVBLE1BQU1FLE9BQU9kLE1BQWdCLEVBQUVlLEtBQWEsRUFBRUMsSUFBUyxFQUFnQjtRQUNyRSxNQUFNZCxTQUFTLElBQUlMLHNDQUFNQSxDQUFDO1lBQ3hCTSxNQUFNSCxPQUFPRyxJQUFJO1lBQ2pCQyxNQUFNSixPQUFPSSxJQUFJLEdBQUdDLE9BQU9MLE9BQU9JLElBQUksSUFBSTtZQUMxQ0UsTUFBTU4sT0FBT00sSUFBSTtZQUNqQkMsVUFBVVAsT0FBT08sUUFBUTtZQUN6QkMsVUFBVVIsT0FBT1EsUUFBUTtRQUMzQjtRQUVBLE1BQU1TLE9BQU9DLE9BQU9ELElBQUksQ0FBQ0Q7UUFDekIsTUFBTUcsU0FBU0QsT0FBT0MsTUFBTSxDQUFDSDtRQUM3QixNQUFNSSxlQUFlSCxLQUFLSSxHQUFHLENBQUMsQ0FBQ0MsR0FBR0MsSUFBTSxDQUFDLENBQUMsRUFBRUEsSUFBSSxHQUFHLEVBQUVDLElBQUksQ0FBQztRQUUxRCxNQUFNQyxRQUFRLENBQUMsWUFBWSxFQUFFVixNQUFNLEVBQUUsRUFBRUUsS0FBS08sSUFBSSxDQUFDLE1BQU0sVUFBVSxFQUFFSixhQUFhLGFBQWEsQ0FBQztRQUU5RixJQUFJO1lBQ0YsTUFBTWxCLE9BQU9PLE9BQU87WUFDcEIsTUFBTWlCLFNBQVMsTUFBTXhCLE9BQU91QixLQUFLLENBQUNBLE9BQU9OO1lBQ3pDLE9BQU9PLE9BQU9DLElBQUksQ0FBQyxFQUFFO1FBQ3ZCLFNBQVU7WUFDUixNQUFNekIsT0FBT1EsR0FBRztRQUNsQjtJQUNGO0lBRUEsTUFBTWtCLEtBQUs1QixNQUFnQixFQUFFZSxLQUFhLEVBQUVVLEtBQWMsRUFBZ0I7UUFDeEUsTUFBTXZCLFNBQVMsSUFBSUwsc0NBQU1BLENBQUM7WUFDeEJNLE1BQU1ILE9BQU9HLElBQUk7WUFDakJDLE1BQU1KLE9BQU9JLElBQUksR0FBR0MsT0FBT0wsT0FBT0ksSUFBSSxJQUFJO1lBQzFDRSxNQUFNTixPQUFPTSxJQUFJO1lBQ2pCQyxVQUFVUCxPQUFPTyxRQUFRO1lBQ3pCQyxVQUFVUixPQUFPUSxRQUFRO1FBQzNCO1FBRUEsSUFBSTtZQUNGLE1BQU1OLE9BQU9PLE9BQU87WUFDcEIsTUFBTWlCLFNBQVMsTUFBTXhCLE9BQU91QixLQUFLLENBQUNBLFNBQVMsQ0FBQyxjQUFjLEVBQUVWLE9BQU87WUFDbkUsT0FBT1csT0FBT0MsSUFBSTtRQUNwQixTQUFVO1lBQ1IsTUFBTXpCLE9BQU9RLEdBQUc7UUFDbEI7SUFDRjtJQUVBLE1BQU1tQixPQUFPN0IsTUFBZ0IsRUFBRWUsS0FBYSxFQUFFZSxFQUFVLEVBQUVkLElBQVMsRUFBZ0I7UUFDakYsTUFBTWQsU0FBUyxJQUFJTCxzQ0FBTUEsQ0FBQztZQUN4Qk0sTUFBTUgsT0FBT0csSUFBSTtZQUNqQkMsTUFBTUosT0FBT0ksSUFBSSxHQUFHQyxPQUFPTCxPQUFPSSxJQUFJLElBQUk7WUFDMUNFLE1BQU1OLE9BQU9NLElBQUk7WUFDakJDLFVBQVVQLE9BQU9PLFFBQVE7WUFDekJDLFVBQVVSLE9BQU9RLFFBQVE7UUFDM0I7UUFFQSxNQUFNUyxPQUFPQyxPQUFPRCxJQUFJLENBQUNEO1FBQ3pCLE1BQU1HLFNBQVNELE9BQU9DLE1BQU0sQ0FBQ0g7UUFDN0IsTUFBTWUsWUFBWWQsS0FBS0ksR0FBRyxDQUFDLENBQUNXLEtBQUtULElBQU0sR0FBR1MsSUFBSSxJQUFJLEVBQUVULElBQUksR0FBRyxFQUFFQyxJQUFJLENBQUM7UUFFbEUsTUFBTUMsUUFBUSxDQUFDLE9BQU8sRUFBRVYsTUFBTSxLQUFLLEVBQUVnQixVQUFVLGFBQWEsRUFBRWQsS0FBS2dCLE1BQU0sR0FBRyxFQUFFLFlBQVksQ0FBQztRQUUzRixJQUFJO1lBQ0YsTUFBTS9CLE9BQU9PLE9BQU87WUFDcEIsTUFBTWlCLFNBQVMsTUFBTXhCLE9BQU91QixLQUFLLENBQUNBLE9BQU87bUJBQUlOO2dCQUFRVzthQUFHO1lBQ3hELE9BQU9KLE9BQU9DLElBQUksQ0FBQyxFQUFFO1FBQ3ZCLFNBQVU7WUFDUixNQUFNekIsT0FBT1EsR0FBRztRQUNsQjtJQUNGO0lBRUEsTUFBTXdCLE9BQU9sQyxNQUFnQixFQUFFZSxLQUFhLEVBQUVlLEVBQVUsRUFBZ0I7UUFDdEUsTUFBTTVCLFNBQVMsSUFBSUwsc0NBQU1BLENBQUM7WUFDeEJNLE1BQU1ILE9BQU9HLElBQUk7WUFDakJDLE1BQU1KLE9BQU9JLElBQUksR0FBR0MsT0FBT0wsT0FBT0ksSUFBSSxJQUFJO1lBQzFDRSxNQUFNTixPQUFPTSxJQUFJO1lBQ2pCQyxVQUFVUCxPQUFPTyxRQUFRO1lBQ3pCQyxVQUFVUixPQUFPUSxRQUFRO1FBQzNCO1FBRUEsTUFBTWlCLFFBQVEsQ0FBQyxZQUFZLEVBQUVWLE1BQU0sMEJBQTBCLENBQUM7UUFFOUQsSUFBSTtZQUNGLE1BQU1iLE9BQU9PLE9BQU87WUFDcEIsTUFBTWlCLFNBQVMsTUFBTXhCLE9BQU91QixLQUFLLENBQUNBLE9BQU87Z0JBQUNLO2FBQUc7WUFDN0MsT0FBT0osT0FBT0MsSUFBSSxDQUFDLEVBQUU7UUFDdkIsU0FBVTtZQUNSLE1BQU16QixPQUFPUSxHQUFHO1FBQ2xCO0lBQ0Y7QUFDRiIsInNvdXJjZXMiOlsiL1VzZXJzL2FudG9ud2VudHplbC9ueHRmbHV0dGVyX2NvcmUvbWFpbi9hcHAvYXBwL2RiLWFkYXB0ZXIvYWRhcHRlcnMvcG9zdGdyZXMtYWRhcHRlci50cyJdLCJzb3VyY2VzQ29udGVudCI6WyIvLyBsaWIvZGItYWRhcHRlci9hZGFwdGVycy9wb3N0Z3Jlcy1hZGFwdGVyLnRzXG5pbXBvcnQgeyBDbGllbnQgfSBmcm9tICdwZyc7XG5pbXBvcnQgeyBEQkFkYXB0ZXIsIERCQ29uZmlnIH0gZnJvbSAnLi4vdHlwZXMnO1xuXG5leHBvcnQgY2xhc3MgUG9zdGdyZXNBZGFwdGVyIGltcGxlbWVudHMgREJBZGFwdGVyIHtcbiAgY29uc3RydWN0b3IocHJpdmF0ZSBjb25maWc6IERCQ29uZmlnKSB7fVxuXG4gIGFzeW5jIHRlc3RDb25uZWN0aW9uKCk6IFByb21pc2U8eyBzdWNjZXNzOiBib29sZWFuOyBtZXNzYWdlOiBzdHJpbmcgfT4ge1xuICAgIGNvbnN0IGNsaWVudCA9IG5ldyBDbGllbnQoe1xuICAgICAgaG9zdDogdGhpcy5jb25maWcuaG9zdCxcbiAgICAgIHBvcnQ6IHRoaXMuY29uZmlnLnBvcnQgPyBOdW1iZXIodGhpcy5jb25maWcucG9ydCkgOiA1NDMyLFxuICAgICAgdXNlcjogdGhpcy5jb25maWcudXNlcixcbiAgICAgIHBhc3N3b3JkOiB0aGlzLmNvbmZpZy5wYXNzd29yZCxcbiAgICAgIGRhdGFiYXNlOiB0aGlzLmNvbmZpZy5kYXRhYmFzZSxcbiAgICB9KTtcblxuICAgIHRyeSB7XG4gICAgICBhd2FpdCBjbGllbnQuY29ubmVjdCgpO1xuICAgICAgYXdhaXQgY2xpZW50LmVuZCgpO1xuICAgICAgcmV0dXJuIHsgc3VjY2VzczogdHJ1ZSwgbWVzc2FnZTogJ0Nvbm5lY3RlZCB0byBQb3N0Z3JlU1FMIHN1Y2Nlc3NmdWxseS4nIH07XG4gICAgfSBjYXRjaCAoZXJyOiBhbnkpIHtcbiAgICAgIHJldHVybiB7IHN1Y2Nlc3M6IGZhbHNlLCBtZXNzYWdlOiBlcnIubWVzc2FnZSB8fCAnRmFpbGVkIHRvIGNvbm5lY3QgdG8gUG9zdGdyZVNRTC4nIH07XG4gICAgfVxuICB9XG5cbiAgYXN5bmMgY3JlYXRlKGNvbmZpZzogREJDb25maWcsIHRhYmxlOiBzdHJpbmcsIGRhdGE6IGFueSk6IFByb21pc2U8YW55PiB7XG4gICAgY29uc3QgY2xpZW50ID0gbmV3IENsaWVudCh7XG4gICAgICBob3N0OiBjb25maWcuaG9zdCxcbiAgICAgIHBvcnQ6IGNvbmZpZy5wb3J0ID8gTnVtYmVyKGNvbmZpZy5wb3J0KSA6IDU0MzIsXG4gICAgICB1c2VyOiBjb25maWcudXNlcixcbiAgICAgIHBhc3N3b3JkOiBjb25maWcucGFzc3dvcmQsXG4gICAgICBkYXRhYmFzZTogY29uZmlnLmRhdGFiYXNlLFxuICAgIH0pO1xuXG4gICAgY29uc3Qga2V5cyA9IE9iamVjdC5rZXlzKGRhdGEpO1xuICAgIGNvbnN0IHZhbHVlcyA9IE9iamVjdC52YWx1ZXMoZGF0YSk7XG4gICAgY29uc3QgcGxhY2Vob2xkZXJzID0ga2V5cy5tYXAoKF8sIGkpID0+IGAkJHtpICsgMX1gKS5qb2luKCcsICcpO1xuXG4gICAgY29uc3QgcXVlcnkgPSBgSU5TRVJUIElOVE8gJHt0YWJsZX0gKCR7a2V5cy5qb2luKCcsICcpfSkgVkFMVUVTICgke3BsYWNlaG9sZGVyc30pIFJFVFVSTklORyAqYDtcblxuICAgIHRyeSB7XG4gICAgICBhd2FpdCBjbGllbnQuY29ubmVjdCgpO1xuICAgICAgY29uc3QgcmVzdWx0ID0gYXdhaXQgY2xpZW50LnF1ZXJ5KHF1ZXJ5LCB2YWx1ZXMpO1xuICAgICAgcmV0dXJuIHJlc3VsdC5yb3dzWzBdO1xuICAgIH0gZmluYWxseSB7XG4gICAgICBhd2FpdCBjbGllbnQuZW5kKCk7XG4gICAgfVxuICB9XG5cbiAgYXN5bmMgcmVhZChjb25maWc6IERCQ29uZmlnLCB0YWJsZTogc3RyaW5nLCBxdWVyeT86IHN0cmluZyk6IFByb21pc2U8YW55PiB7XG4gICAgY29uc3QgY2xpZW50ID0gbmV3IENsaWVudCh7XG4gICAgICBob3N0OiBjb25maWcuaG9zdCxcbiAgICAgIHBvcnQ6IGNvbmZpZy5wb3J0ID8gTnVtYmVyKGNvbmZpZy5wb3J0KSA6IDU0MzIsXG4gICAgICB1c2VyOiBjb25maWcudXNlcixcbiAgICAgIHBhc3N3b3JkOiBjb25maWcucGFzc3dvcmQsXG4gICAgICBkYXRhYmFzZTogY29uZmlnLmRhdGFiYXNlLFxuICAgIH0pO1xuXG4gICAgdHJ5IHtcbiAgICAgIGF3YWl0IGNsaWVudC5jb25uZWN0KCk7XG4gICAgICBjb25zdCByZXN1bHQgPSBhd2FpdCBjbGllbnQucXVlcnkocXVlcnkgfHwgYFNFTEVDVCAqIEZST00gJHt0YWJsZX1gKTtcbiAgICAgIHJldHVybiByZXN1bHQucm93cztcbiAgICB9IGZpbmFsbHkge1xuICAgICAgYXdhaXQgY2xpZW50LmVuZCgpO1xuICAgIH1cbiAgfVxuXG4gIGFzeW5jIHVwZGF0ZShjb25maWc6IERCQ29uZmlnLCB0YWJsZTogc3RyaW5nLCBpZDogc3RyaW5nLCBkYXRhOiBhbnkpOiBQcm9taXNlPGFueT4ge1xuICAgIGNvbnN0IGNsaWVudCA9IG5ldyBDbGllbnQoe1xuICAgICAgaG9zdDogY29uZmlnLmhvc3QsXG4gICAgICBwb3J0OiBjb25maWcucG9ydCA/IE51bWJlcihjb25maWcucG9ydCkgOiA1NDMyLFxuICAgICAgdXNlcjogY29uZmlnLnVzZXIsXG4gICAgICBwYXNzd29yZDogY29uZmlnLnBhc3N3b3JkLFxuICAgICAgZGF0YWJhc2U6IGNvbmZpZy5kYXRhYmFzZSxcbiAgICB9KTtcblxuICAgIGNvbnN0IGtleXMgPSBPYmplY3Qua2V5cyhkYXRhKTtcbiAgICBjb25zdCB2YWx1ZXMgPSBPYmplY3QudmFsdWVzKGRhdGEpO1xuICAgIGNvbnN0IHNldENsYXVzZSA9IGtleXMubWFwKChrZXksIGkpID0+IGAke2tleX0gPSAkJHtpICsgMX1gKS5qb2luKCcsICcpO1xuXG4gICAgY29uc3QgcXVlcnkgPSBgVVBEQVRFICR7dGFibGV9IFNFVCAke3NldENsYXVzZX0gV0hFUkUgaWQgPSAkJHtrZXlzLmxlbmd0aCArIDF9IFJFVFVSTklORyAqYDtcblxuICAgIHRyeSB7XG4gICAgICBhd2FpdCBjbGllbnQuY29ubmVjdCgpO1xuICAgICAgY29uc3QgcmVzdWx0ID0gYXdhaXQgY2xpZW50LnF1ZXJ5KHF1ZXJ5LCBbLi4udmFsdWVzLCBpZF0pO1xuICAgICAgcmV0dXJuIHJlc3VsdC5yb3dzWzBdO1xuICAgIH0gZmluYWxseSB7XG4gICAgICBhd2FpdCBjbGllbnQuZW5kKCk7XG4gICAgfVxuICB9XG5cbiAgYXN5bmMgZGVsZXRlKGNvbmZpZzogREJDb25maWcsIHRhYmxlOiBzdHJpbmcsIGlkOiBzdHJpbmcpOiBQcm9taXNlPGFueT4ge1xuICAgIGNvbnN0IGNsaWVudCA9IG5ldyBDbGllbnQoe1xuICAgICAgaG9zdDogY29uZmlnLmhvc3QsXG4gICAgICBwb3J0OiBjb25maWcucG9ydCA/IE51bWJlcihjb25maWcucG9ydCkgOiA1NDMyLFxuICAgICAgdXNlcjogY29uZmlnLnVzZXIsXG4gICAgICBwYXNzd29yZDogY29uZmlnLnBhc3N3b3JkLFxuICAgICAgZGF0YWJhc2U6IGNvbmZpZy5kYXRhYmFzZSxcbiAgICB9KTtcblxuICAgIGNvbnN0IHF1ZXJ5ID0gYERFTEVURSBGUk9NICR7dGFibGV9IFdIRVJFIGlkID0gJDEgUkVUVVJOSU5HICpgO1xuXG4gICAgdHJ5IHtcbiAgICAgIGF3YWl0IGNsaWVudC5jb25uZWN0KCk7XG4gICAgICBjb25zdCByZXN1bHQgPSBhd2FpdCBjbGllbnQucXVlcnkocXVlcnksIFtpZF0pO1xuICAgICAgcmV0dXJuIHJlc3VsdC5yb3dzWzBdO1xuICAgIH0gZmluYWxseSB7XG4gICAgICBhd2FpdCBjbGllbnQuZW5kKCk7XG4gICAgfVxuICB9XG59XG4iXSwibmFtZXMiOlsiQ2xpZW50IiwiUG9zdGdyZXNBZGFwdGVyIiwiY29uc3RydWN0b3IiLCJjb25maWciLCJ0ZXN0Q29ubmVjdGlvbiIsImNsaWVudCIsImhvc3QiLCJwb3J0IiwiTnVtYmVyIiwidXNlciIsInBhc3N3b3JkIiwiZGF0YWJhc2UiLCJjb25uZWN0IiwiZW5kIiwic3VjY2VzcyIsIm1lc3NhZ2UiLCJlcnIiLCJjcmVhdGUiLCJ0YWJsZSIsImRhdGEiLCJrZXlzIiwiT2JqZWN0IiwidmFsdWVzIiwicGxhY2Vob2xkZXJzIiwibWFwIiwiXyIsImkiLCJqb2luIiwicXVlcnkiLCJyZXN1bHQiLCJyb3dzIiwicmVhZCIsInVwZGF0ZSIsImlkIiwic2V0Q2xhdXNlIiwia2V5IiwibGVuZ3RoIiwiZGVsZXRlIl0sImlnbm9yZUxpc3QiOltdLCJzb3VyY2VSb290IjoiIn0=\n//# sourceURL=webpack-internal:///(rsc)/./app/db-adapter/adapters/postgres-adapter.ts\n");

/***/ }),

/***/ "(rsc)/./app/db-adapter/adapters/sqlserver-adapter.ts":
/*!******************************************************!*\
  !*** ./app/db-adapter/adapters/sqlserver-adapter.ts ***!
  \******************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
eval("__webpack_require__.r(__webpack_exports__);\n/* harmony export */ __webpack_require__.d(__webpack_exports__, {\n/* harmony export */   SQLServerAdapter: () => (/* binding */ SQLServerAdapter)\n/* harmony export */ });\n/* harmony import */ var mssql__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! mssql */ \"(rsc)/./node_modules/mssql/index.js\");\n/* harmony import */ var mssql__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(mssql__WEBPACK_IMPORTED_MODULE_0__);\n// lib/db-adapter/adapters/sqlserver-adapter.ts\n\nclass SQLServerAdapter {\n    constructor(config){\n        this.config = config;\n    }\n    getConnectionPool() {\n        return new (mssql__WEBPACK_IMPORTED_MODULE_0___default().ConnectionPool)({\n            user: this.config.user,\n            password: this.config.password,\n            server: this.config.host,\n            database: this.config.database,\n            port: this.config.port ? Number(this.config.port) : 1433,\n            options: {\n                encrypt: false,\n                trustServerCertificate: true\n            }\n        });\n    }\n    async testConnection() {\n        try {\n            const pool = await this.getConnectionPool().connect();\n            await pool.close();\n            return {\n                success: true,\n                message: 'Connected to SQL Server successfully.'\n            };\n        } catch (err) {\n            return {\n                success: false,\n                message: err.message || 'Failed to connect to SQL Server.'\n            };\n        }\n    }\n    async create(config, table, data) {\n        const pool = await this.getConnectionPool().connect();\n        const keys = Object.keys(data);\n        const values = Object.values(data);\n        const placeholders = keys.map((_, i)=>`@param${i}`).join(', ');\n        const request = pool.request();\n        keys.forEach((key, i)=>{\n            request.input(`param${i}`, values[i]);\n        });\n        const query = `INSERT INTO [${table}] (${keys.join(', ')}) VALUES (${placeholders})`;\n        const result = await request.query(query);\n        await pool.close();\n        return result;\n    }\n    async read(config, table, customQuery) {\n        const pool = await this.getConnectionPool().connect();\n        const query = customQuery || `SELECT * FROM [${table}]`;\n        const result = await pool.request().query(query);\n        await pool.close();\n        return result.recordset;\n    }\n    async update(config, table, id, data) {\n        const pool = await this.getConnectionPool().connect();\n        const keys = Object.keys(data);\n        const values = Object.values(data);\n        const setClause = keys.map((key, i)=>`[${key}] = @param${i}`).join(', ');\n        const request = pool.request();\n        keys.forEach((key, i)=>{\n            request.input(`param${i}`, values[i]);\n        });\n        request.input('id', id);\n        const query = `UPDATE [${table}] SET ${setClause} WHERE id = @id`;\n        const result = await request.query(query);\n        await pool.close();\n        return result;\n    }\n    async delete(config, table, id) {\n        const pool = await this.getConnectionPool().connect();\n        const result = await pool.request().input('id', id).query(`DELETE FROM [${table}] WHERE id = @id`);\n        await pool.close();\n        return result;\n    }\n}\n//# sourceURL=[module]\n//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiKHJzYykvLi9hcHAvZGItYWRhcHRlci9hZGFwdGVycy9zcWxzZXJ2ZXItYWRhcHRlci50cyIsIm1hcHBpbmdzIjoiOzs7Ozs7QUFBQSwrQ0FBK0M7QUFDdkI7QUFHakIsTUFBTUM7SUFDWEMsWUFBWSxNQUF3QixDQUFFO2FBQWxCQyxTQUFBQTtJQUFtQjtJQUUvQkMsb0JBQW9CO1FBQzFCLE9BQU8sSUFBSUosNkRBQWtCLENBQUM7WUFDNUJNLE1BQU0sSUFBSSxDQUFDSCxNQUFNLENBQUNHLElBQUk7WUFDdEJDLFVBQVUsSUFBSSxDQUFDSixNQUFNLENBQUNJLFFBQVE7WUFDOUJDLFFBQVEsSUFBSSxDQUFDTCxNQUFNLENBQUNNLElBQUk7WUFDeEJDLFVBQVUsSUFBSSxDQUFDUCxNQUFNLENBQUNPLFFBQVE7WUFDOUJDLE1BQU0sSUFBSSxDQUFDUixNQUFNLENBQUNRLElBQUksR0FBR0MsT0FBTyxJQUFJLENBQUNULE1BQU0sQ0FBQ1EsSUFBSSxJQUFJO1lBQ3BERSxTQUFTO2dCQUNQQyxTQUFTO2dCQUNUQyx3QkFBd0I7WUFDMUI7UUFDRjtJQUNGO0lBRUEsTUFBTUMsaUJBQWlFO1FBQ3JFLElBQUk7WUFDRixNQUFNQyxPQUFPLE1BQU0sSUFBSSxDQUFDYixpQkFBaUIsR0FBR2MsT0FBTztZQUNuRCxNQUFNRCxLQUFLRSxLQUFLO1lBQ2hCLE9BQU87Z0JBQUVDLFNBQVM7Z0JBQU1DLFNBQVM7WUFBd0M7UUFDM0UsRUFBRSxPQUFPQyxLQUFVO1lBQ2pCLE9BQU87Z0JBQUVGLFNBQVM7Z0JBQU9DLFNBQVNDLElBQUlELE9BQU8sSUFBSTtZQUFtQztRQUN0RjtJQUNGO0lBRUEsTUFBTUUsT0FBT3BCLE1BQWdCLEVBQUVxQixLQUFhLEVBQUVDLElBQVMsRUFBZ0I7UUFDckUsTUFBTVIsT0FBTyxNQUFNLElBQUksQ0FBQ2IsaUJBQWlCLEdBQUdjLE9BQU87UUFDbkQsTUFBTVEsT0FBT0MsT0FBT0QsSUFBSSxDQUFDRDtRQUN6QixNQUFNRyxTQUFTRCxPQUFPQyxNQUFNLENBQUNIO1FBQzdCLE1BQU1JLGVBQWVILEtBQUtJLEdBQUcsQ0FBQyxDQUFDQyxHQUFHQyxJQUFNLENBQUMsTUFBTSxFQUFFQSxHQUFHLEVBQUVDLElBQUksQ0FBQztRQUUzRCxNQUFNQyxVQUFVakIsS0FBS2lCLE9BQU87UUFDNUJSLEtBQUtTLE9BQU8sQ0FBQyxDQUFDQyxLQUFLSjtZQUNqQkUsUUFBUUcsS0FBSyxDQUFDLENBQUMsS0FBSyxFQUFFTCxHQUFHLEVBQUVKLE1BQU0sQ0FBQ0ksRUFBRTtRQUN0QztRQUVBLE1BQU1NLFFBQVEsQ0FBQyxhQUFhLEVBQUVkLE1BQU0sR0FBRyxFQUFFRSxLQUFLTyxJQUFJLENBQUMsTUFBTSxVQUFVLEVBQUVKLGFBQWEsQ0FBQyxDQUFDO1FBQ3BGLE1BQU1VLFNBQVMsTUFBTUwsUUFBUUksS0FBSyxDQUFDQTtRQUNuQyxNQUFNckIsS0FBS0UsS0FBSztRQUNoQixPQUFPb0I7SUFDVDtJQUVBLE1BQU1DLEtBQUtyQyxNQUFnQixFQUFFcUIsS0FBYSxFQUFFaUIsV0FBb0IsRUFBZ0I7UUFDOUUsTUFBTXhCLE9BQU8sTUFBTSxJQUFJLENBQUNiLGlCQUFpQixHQUFHYyxPQUFPO1FBQ25ELE1BQU1vQixRQUFRRyxlQUFlLENBQUMsZUFBZSxFQUFFakIsTUFBTSxDQUFDLENBQUM7UUFDdkQsTUFBTWUsU0FBUyxNQUFNdEIsS0FBS2lCLE9BQU8sR0FBR0ksS0FBSyxDQUFDQTtRQUMxQyxNQUFNckIsS0FBS0UsS0FBSztRQUNoQixPQUFPb0IsT0FBT0csU0FBUztJQUN6QjtJQUVBLE1BQU1DLE9BQU94QyxNQUFnQixFQUFFcUIsS0FBYSxFQUFFb0IsRUFBVSxFQUFFbkIsSUFBUyxFQUFnQjtRQUNqRixNQUFNUixPQUFPLE1BQU0sSUFBSSxDQUFDYixpQkFBaUIsR0FBR2MsT0FBTztRQUNuRCxNQUFNUSxPQUFPQyxPQUFPRCxJQUFJLENBQUNEO1FBQ3pCLE1BQU1HLFNBQVNELE9BQU9DLE1BQU0sQ0FBQ0g7UUFFN0IsTUFBTW9CLFlBQVluQixLQUFLSSxHQUFHLENBQUMsQ0FBQ00sS0FBS0osSUFBTSxDQUFDLENBQUMsRUFBRUksSUFBSSxVQUFVLEVBQUVKLEdBQUcsRUFBRUMsSUFBSSxDQUFDO1FBQ3JFLE1BQU1DLFVBQVVqQixLQUFLaUIsT0FBTztRQUM1QlIsS0FBS1MsT0FBTyxDQUFDLENBQUNDLEtBQUtKO1lBQ2pCRSxRQUFRRyxLQUFLLENBQUMsQ0FBQyxLQUFLLEVBQUVMLEdBQUcsRUFBRUosTUFBTSxDQUFDSSxFQUFFO1FBQ3RDO1FBRUFFLFFBQVFHLEtBQUssQ0FBQyxNQUFNTztRQUNwQixNQUFNTixRQUFRLENBQUMsUUFBUSxFQUFFZCxNQUFNLE1BQU0sRUFBRXFCLFVBQVUsZUFBZSxDQUFDO1FBRWpFLE1BQU1OLFNBQVMsTUFBTUwsUUFBUUksS0FBSyxDQUFDQTtRQUNuQyxNQUFNckIsS0FBS0UsS0FBSztRQUNoQixPQUFPb0I7SUFDVDtJQUVBLE1BQU1PLE9BQU8zQyxNQUFnQixFQUFFcUIsS0FBYSxFQUFFb0IsRUFBVSxFQUFnQjtRQUN0RSxNQUFNM0IsT0FBTyxNQUFNLElBQUksQ0FBQ2IsaUJBQWlCLEdBQUdjLE9BQU87UUFDbkQsTUFBTXFCLFNBQVMsTUFBTXRCLEtBQ2xCaUIsT0FBTyxHQUNQRyxLQUFLLENBQUMsTUFBTU8sSUFDWk4sS0FBSyxDQUFDLENBQUMsYUFBYSxFQUFFZCxNQUFNLGdCQUFnQixDQUFDO1FBQ2hELE1BQU1QLEtBQUtFLEtBQUs7UUFDaEIsT0FBT29CO0lBQ1Q7QUFDRiIsInNvdXJjZXMiOlsiL1VzZXJzL2FudG9ud2VudHplbC9ueHRmbHV0dGVyX2NvcmUvbWFpbi9hcHAvYXBwL2RiLWFkYXB0ZXIvYWRhcHRlcnMvc3Fsc2VydmVyLWFkYXB0ZXIudHMiXSwic291cmNlc0NvbnRlbnQiOlsiLy8gbGliL2RiLWFkYXB0ZXIvYWRhcHRlcnMvc3Fsc2VydmVyLWFkYXB0ZXIudHNcbmltcG9ydCBzcWwgZnJvbSAnbXNzcWwnO1xuaW1wb3J0IHsgREJBZGFwdGVyLCBEQkNvbmZpZyB9IGZyb20gJy4uL3R5cGVzJztcblxuZXhwb3J0IGNsYXNzIFNRTFNlcnZlckFkYXB0ZXIgaW1wbGVtZW50cyBEQkFkYXB0ZXIge1xuICBjb25zdHJ1Y3Rvcihwcml2YXRlIGNvbmZpZzogREJDb25maWcpIHt9XG5cbiAgcHJpdmF0ZSBnZXRDb25uZWN0aW9uUG9vbCgpIHtcbiAgICByZXR1cm4gbmV3IHNxbC5Db25uZWN0aW9uUG9vbCh7XG4gICAgICB1c2VyOiB0aGlzLmNvbmZpZy51c2VyISxcbiAgICAgIHBhc3N3b3JkOiB0aGlzLmNvbmZpZy5wYXNzd29yZCEsXG4gICAgICBzZXJ2ZXI6IHRoaXMuY29uZmlnLmhvc3QhLFxuICAgICAgZGF0YWJhc2U6IHRoaXMuY29uZmlnLmRhdGFiYXNlISxcbiAgICAgIHBvcnQ6IHRoaXMuY29uZmlnLnBvcnQgPyBOdW1iZXIodGhpcy5jb25maWcucG9ydCkgOiAxNDMzLFxuICAgICAgb3B0aW9uczoge1xuICAgICAgICBlbmNyeXB0OiBmYWxzZSwgLy8gc2V0IHRvIHRydWUgaWYgeW91J3JlIHVzaW5nIEF6dXJlXG4gICAgICAgIHRydXN0U2VydmVyQ2VydGlmaWNhdGU6IHRydWUsXG4gICAgICB9LFxuICAgIH0pO1xuICB9XG5cbiAgYXN5bmMgdGVzdENvbm5lY3Rpb24oKTogUHJvbWlzZTx7IHN1Y2Nlc3M6IGJvb2xlYW47IG1lc3NhZ2U6IHN0cmluZyB9PiB7XG4gICAgdHJ5IHtcbiAgICAgIGNvbnN0IHBvb2wgPSBhd2FpdCB0aGlzLmdldENvbm5lY3Rpb25Qb29sKCkuY29ubmVjdCgpO1xuICAgICAgYXdhaXQgcG9vbC5jbG9zZSgpO1xuICAgICAgcmV0dXJuIHsgc3VjY2VzczogdHJ1ZSwgbWVzc2FnZTogJ0Nvbm5lY3RlZCB0byBTUUwgU2VydmVyIHN1Y2Nlc3NmdWxseS4nIH07XG4gICAgfSBjYXRjaCAoZXJyOiBhbnkpIHtcbiAgICAgIHJldHVybiB7IHN1Y2Nlc3M6IGZhbHNlLCBtZXNzYWdlOiBlcnIubWVzc2FnZSB8fCAnRmFpbGVkIHRvIGNvbm5lY3QgdG8gU1FMIFNlcnZlci4nIH07XG4gICAgfVxuICB9XG5cbiAgYXN5bmMgY3JlYXRlKGNvbmZpZzogREJDb25maWcsIHRhYmxlOiBzdHJpbmcsIGRhdGE6IGFueSk6IFByb21pc2U8YW55PiB7XG4gICAgY29uc3QgcG9vbCA9IGF3YWl0IHRoaXMuZ2V0Q29ubmVjdGlvblBvb2woKS5jb25uZWN0KCk7XG4gICAgY29uc3Qga2V5cyA9IE9iamVjdC5rZXlzKGRhdGEpO1xuICAgIGNvbnN0IHZhbHVlcyA9IE9iamVjdC52YWx1ZXMoZGF0YSk7XG4gICAgY29uc3QgcGxhY2Vob2xkZXJzID0ga2V5cy5tYXAoKF8sIGkpID0+IGBAcGFyYW0ke2l9YCkuam9pbignLCAnKTtcblxuICAgIGNvbnN0IHJlcXVlc3QgPSBwb29sLnJlcXVlc3QoKTtcbiAgICBrZXlzLmZvckVhY2goKGtleSwgaSkgPT4ge1xuICAgICAgcmVxdWVzdC5pbnB1dChgcGFyYW0ke2l9YCwgdmFsdWVzW2ldKTtcbiAgICB9KTtcblxuICAgIGNvbnN0IHF1ZXJ5ID0gYElOU0VSVCBJTlRPIFske3RhYmxlfV0gKCR7a2V5cy5qb2luKCcsICcpfSkgVkFMVUVTICgke3BsYWNlaG9sZGVyc30pYDtcbiAgICBjb25zdCByZXN1bHQgPSBhd2FpdCByZXF1ZXN0LnF1ZXJ5KHF1ZXJ5KTtcbiAgICBhd2FpdCBwb29sLmNsb3NlKCk7XG4gICAgcmV0dXJuIHJlc3VsdDtcbiAgfVxuXG4gIGFzeW5jIHJlYWQoY29uZmlnOiBEQkNvbmZpZywgdGFibGU6IHN0cmluZywgY3VzdG9tUXVlcnk/OiBzdHJpbmcpOiBQcm9taXNlPGFueT4ge1xuICAgIGNvbnN0IHBvb2wgPSBhd2FpdCB0aGlzLmdldENvbm5lY3Rpb25Qb29sKCkuY29ubmVjdCgpO1xuICAgIGNvbnN0IHF1ZXJ5ID0gY3VzdG9tUXVlcnkgfHwgYFNFTEVDVCAqIEZST00gWyR7dGFibGV9XWA7XG4gICAgY29uc3QgcmVzdWx0ID0gYXdhaXQgcG9vbC5yZXF1ZXN0KCkucXVlcnkocXVlcnkpO1xuICAgIGF3YWl0IHBvb2wuY2xvc2UoKTtcbiAgICByZXR1cm4gcmVzdWx0LnJlY29yZHNldDtcbiAgfVxuXG4gIGFzeW5jIHVwZGF0ZShjb25maWc6IERCQ29uZmlnLCB0YWJsZTogc3RyaW5nLCBpZDogc3RyaW5nLCBkYXRhOiBhbnkpOiBQcm9taXNlPGFueT4ge1xuICAgIGNvbnN0IHBvb2wgPSBhd2FpdCB0aGlzLmdldENvbm5lY3Rpb25Qb29sKCkuY29ubmVjdCgpO1xuICAgIGNvbnN0IGtleXMgPSBPYmplY3Qua2V5cyhkYXRhKTtcbiAgICBjb25zdCB2YWx1ZXMgPSBPYmplY3QudmFsdWVzKGRhdGEpO1xuXG4gICAgY29uc3Qgc2V0Q2xhdXNlID0ga2V5cy5tYXAoKGtleSwgaSkgPT4gYFske2tleX1dID0gQHBhcmFtJHtpfWApLmpvaW4oJywgJyk7XG4gICAgY29uc3QgcmVxdWVzdCA9IHBvb2wucmVxdWVzdCgpO1xuICAgIGtleXMuZm9yRWFjaCgoa2V5LCBpKSA9PiB7XG4gICAgICByZXF1ZXN0LmlucHV0KGBwYXJhbSR7aX1gLCB2YWx1ZXNbaV0pO1xuICAgIH0pO1xuXG4gICAgcmVxdWVzdC5pbnB1dCgnaWQnLCBpZCk7XG4gICAgY29uc3QgcXVlcnkgPSBgVVBEQVRFIFske3RhYmxlfV0gU0VUICR7c2V0Q2xhdXNlfSBXSEVSRSBpZCA9IEBpZGA7XG5cbiAgICBjb25zdCByZXN1bHQgPSBhd2FpdCByZXF1ZXN0LnF1ZXJ5KHF1ZXJ5KTtcbiAgICBhd2FpdCBwb29sLmNsb3NlKCk7XG4gICAgcmV0dXJuIHJlc3VsdDtcbiAgfVxuXG4gIGFzeW5jIGRlbGV0ZShjb25maWc6IERCQ29uZmlnLCB0YWJsZTogc3RyaW5nLCBpZDogc3RyaW5nKTogUHJvbWlzZTxhbnk+IHtcbiAgICBjb25zdCBwb29sID0gYXdhaXQgdGhpcy5nZXRDb25uZWN0aW9uUG9vbCgpLmNvbm5lY3QoKTtcbiAgICBjb25zdCByZXN1bHQgPSBhd2FpdCBwb29sXG4gICAgICAucmVxdWVzdCgpXG4gICAgICAuaW5wdXQoJ2lkJywgaWQpXG4gICAgICAucXVlcnkoYERFTEVURSBGUk9NIFske3RhYmxlfV0gV0hFUkUgaWQgPSBAaWRgKTtcbiAgICBhd2FpdCBwb29sLmNsb3NlKCk7XG4gICAgcmV0dXJuIHJlc3VsdDtcbiAgfVxufVxuIl0sIm5hbWVzIjpbInNxbCIsIlNRTFNlcnZlckFkYXB0ZXIiLCJjb25zdHJ1Y3RvciIsImNvbmZpZyIsImdldENvbm5lY3Rpb25Qb29sIiwiQ29ubmVjdGlvblBvb2wiLCJ1c2VyIiwicGFzc3dvcmQiLCJzZXJ2ZXIiLCJob3N0IiwiZGF0YWJhc2UiLCJwb3J0IiwiTnVtYmVyIiwib3B0aW9ucyIsImVuY3J5cHQiLCJ0cnVzdFNlcnZlckNlcnRpZmljYXRlIiwidGVzdENvbm5lY3Rpb24iLCJwb29sIiwiY29ubmVjdCIsImNsb3NlIiwic3VjY2VzcyIsIm1lc3NhZ2UiLCJlcnIiLCJjcmVhdGUiLCJ0YWJsZSIsImRhdGEiLCJrZXlzIiwiT2JqZWN0IiwidmFsdWVzIiwicGxhY2Vob2xkZXJzIiwibWFwIiwiXyIsImkiLCJqb2luIiwicmVxdWVzdCIsImZvckVhY2giLCJrZXkiLCJpbnB1dCIsInF1ZXJ5IiwicmVzdWx0IiwicmVhZCIsImN1c3RvbVF1ZXJ5IiwicmVjb3Jkc2V0IiwidXBkYXRlIiwiaWQiLCJzZXRDbGF1c2UiLCJkZWxldGUiXSwiaWdub3JlTGlzdCI6W10sInNvdXJjZVJvb3QiOiIifQ==\n//# sourceURL=webpack-internal:///(rsc)/./app/db-adapter/adapters/sqlserver-adapter.ts\n");

/***/ }),

/***/ "(rsc)/./app/db-adapter/adapters/supabase-adapter.ts":
/*!*****************************************************!*\
  !*** ./app/db-adapter/adapters/supabase-adapter.ts ***!
  \*****************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
eval("__webpack_require__.r(__webpack_exports__);\n/* harmony export */ __webpack_require__.d(__webpack_exports__, {\n/* harmony export */   SupabaseAdapter: () => (/* binding */ SupabaseAdapter)\n/* harmony export */ });\n/* harmony import */ var _supabase_supabase_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! @supabase/supabase-js */ \"(rsc)/./node_modules/@supabase/supabase-js/dist/module/index.js\");\n// lib/db-adapter/adapters/supabase-adapter.ts\n\nclass SupabaseAdapter {\n    constructor(config){\n        this.config = config;\n        if (!config.url || !config.anonKey) {\n            throw new Error('Supabase URL and anonKey are required');\n        }\n        this.client = (0,_supabase_supabase_js__WEBPACK_IMPORTED_MODULE_0__.createClient)(config.url, config.anonKey);\n    }\n    async testConnection() {\n        try {\n            const response = await fetch(`${this.config.url}/rest/v1/?limit=1`, {\n                headers: {\n                    apikey: this.config.anonKey,\n                    Authorization: `Bearer ${this.config.anonKey}`\n                }\n            });\n            if (!response.ok) {\n                return {\n                    success: false,\n                    message: `Connection failed: Supabase responded with status ${response.status}`\n                };\n            }\n            return {\n                success: true,\n                message: 'Connected to Supabase successfully.'\n            };\n        } catch (error) {\n            return {\n                success: false,\n                message: error.message || 'Failed to connect to Supabase.'\n            };\n        }\n    }\n    async create(config, table, data) {\n        const { data: inserted, error } = await this.client.from(table).insert(data);\n        if (error) throw error;\n        return inserted;\n    }\n    async read(config, table, query) {\n        let qb = this.client.from(table).select('*');\n        // You can expand this query logic if needed:\n        if (query) {\n            Object.entries(query).forEach(([key, value])=>{\n                qb = qb.eq(key, value);\n            });\n        }\n        const { data, error } = await qb;\n        if (error) throw error;\n        return data;\n    }\n    async update(config, table, id, data) {\n        const { data: updated, error } = await this.client.from(table).update(data).eq('id', id);\n        if (error) throw error;\n        return updated;\n    }\n    async delete(config, table, id) {\n        const { data: deleted, error } = await this.client.from(table).delete().eq('id', id);\n        if (error) throw error;\n        return deleted;\n    }\n}\n//# sourceURL=[module]\n//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiKHJzYykvLi9hcHAvZGItYWRhcHRlci9hZGFwdGVycy9zdXBhYmFzZS1hZGFwdGVyLnRzIiwibWFwcGluZ3MiOiI7Ozs7O0FBQUEsOENBQThDO0FBRXVCO0FBRzlELE1BQU1DO0lBR1hDLFlBQVksTUFBd0IsQ0FBRTthQUFsQkMsU0FBQUE7UUFDbEIsSUFBSSxDQUFDQSxPQUFPQyxHQUFHLElBQUksQ0FBQ0QsT0FBT0UsT0FBTyxFQUFFO1lBQ2xDLE1BQU0sSUFBSUMsTUFBTTtRQUNsQjtRQUVBLElBQUksQ0FBQ0MsTUFBTSxHQUFHUCxtRUFBWUEsQ0FBQ0csT0FBT0MsR0FBRyxFQUFFRCxPQUFPRSxPQUFPO0lBQ3ZEO0lBRUEsTUFBTUcsaUJBQWlFO1FBQ3JFLElBQUk7WUFDRixNQUFNQyxXQUFXLE1BQU1DLE1BQU0sR0FBRyxJQUFJLENBQUNQLE1BQU0sQ0FBQ0MsR0FBRyxDQUFDLGlCQUFpQixDQUFDLEVBQUU7Z0JBQ2xFTyxTQUFTO29CQUNQQyxRQUFRLElBQUksQ0FBQ1QsTUFBTSxDQUFDRSxPQUFPO29CQUMzQlEsZUFBZSxDQUFDLE9BQU8sRUFBRSxJQUFJLENBQUNWLE1BQU0sQ0FBQ0UsT0FBTyxFQUFFO2dCQUNoRDtZQUNGO1lBRUEsSUFBSSxDQUFDSSxTQUFTSyxFQUFFLEVBQUU7Z0JBQ2hCLE9BQU87b0JBQ0xDLFNBQVM7b0JBQ1RDLFNBQVMsQ0FBQyxrREFBa0QsRUFBRVAsU0FBU1EsTUFBTSxFQUFFO2dCQUNqRjtZQUNGO1lBRUEsT0FBTztnQkFBRUYsU0FBUztnQkFBTUMsU0FBUztZQUFzQztRQUN6RSxFQUFFLE9BQU9FLE9BQVk7WUFDbkIsT0FBTztnQkFDTEgsU0FBUztnQkFDVEMsU0FBU0UsTUFBTUYsT0FBTyxJQUFJO1lBQzVCO1FBQ0Y7SUFDRjtJQUVBLE1BQU1HLE9BQU9oQixNQUFnQixFQUFFaUIsS0FBYSxFQUFFQyxJQUFTLEVBQWdCO1FBQ3JFLE1BQU0sRUFBRUEsTUFBTUMsUUFBUSxFQUFFSixLQUFLLEVBQUUsR0FBRyxNQUFNLElBQUksQ0FBQ1gsTUFBTSxDQUFDZ0IsSUFBSSxDQUFDSCxPQUFPSSxNQUFNLENBQUNIO1FBQ3ZFLElBQUlILE9BQU8sTUFBTUE7UUFDakIsT0FBT0k7SUFDVDtJQUVBLE1BQU1HLEtBQUt0QixNQUFnQixFQUFFaUIsS0FBYSxFQUFFTSxLQUFXLEVBQWdCO1FBQ3JFLElBQUlDLEtBQUssSUFBSSxDQUFDcEIsTUFBTSxDQUFDZ0IsSUFBSSxDQUFDSCxPQUFPUSxNQUFNLENBQUM7UUFFeEMsNkNBQTZDO1FBQzdDLElBQUlGLE9BQU87WUFDVEcsT0FBT0MsT0FBTyxDQUFDSixPQUFPSyxPQUFPLENBQUMsQ0FBQyxDQUFDQyxLQUFLQyxNQUFNO2dCQUN6Q04sS0FBS0EsR0FBR08sRUFBRSxDQUFDRixLQUFLQztZQUNsQjtRQUNGO1FBRUEsTUFBTSxFQUFFWixJQUFJLEVBQUVILEtBQUssRUFBRSxHQUFHLE1BQU1TO1FBQzlCLElBQUlULE9BQU8sTUFBTUE7UUFDakIsT0FBT0c7SUFDVDtJQUVBLE1BQU1jLE9BQU9oQyxNQUFnQixFQUFFaUIsS0FBYSxFQUFFZ0IsRUFBVSxFQUFFZixJQUFTLEVBQWdCO1FBQ2pGLE1BQU0sRUFBRUEsTUFBTWdCLE9BQU8sRUFBRW5CLEtBQUssRUFBRSxHQUFHLE1BQU0sSUFBSSxDQUFDWCxNQUFNLENBQUNnQixJQUFJLENBQUNILE9BQU9lLE1BQU0sQ0FBQ2QsTUFBTWEsRUFBRSxDQUFDLE1BQU1FO1FBQ3JGLElBQUlsQixPQUFPLE1BQU1BO1FBQ2pCLE9BQU9tQjtJQUNUO0lBRUEsTUFBTUMsT0FBT25DLE1BQWdCLEVBQUVpQixLQUFhLEVBQUVnQixFQUFVLEVBQWdCO1FBQ3RFLE1BQU0sRUFBRWYsTUFBTWtCLE9BQU8sRUFBRXJCLEtBQUssRUFBRSxHQUFHLE1BQU0sSUFBSSxDQUFDWCxNQUFNLENBQUNnQixJQUFJLENBQUNILE9BQU9rQixNQUFNLEdBQUdKLEVBQUUsQ0FBQyxNQUFNRTtRQUNqRixJQUFJbEIsT0FBTyxNQUFNQTtRQUNqQixPQUFPcUI7SUFDVDtBQUNGIiwic291cmNlcyI6WyIvVXNlcnMvYW50b253ZW50emVsL254dGZsdXR0ZXJfY29yZS9tYWluL2FwcC9hcHAvZGItYWRhcHRlci9hZGFwdGVycy9zdXBhYmFzZS1hZGFwdGVyLnRzIl0sInNvdXJjZXNDb250ZW50IjpbIi8vIGxpYi9kYi1hZGFwdGVyL2FkYXB0ZXJzL3N1cGFiYXNlLWFkYXB0ZXIudHNcblxuaW1wb3J0IHsgY3JlYXRlQ2xpZW50LCBTdXBhYmFzZUNsaWVudCB9IGZyb20gJ0BzdXBhYmFzZS9zdXBhYmFzZS1qcyc7XG5pbXBvcnQgeyBEQkFkYXB0ZXIsIERCQ29uZmlnIH0gZnJvbSAnLi4vdHlwZXMnO1xuXG5leHBvcnQgY2xhc3MgU3VwYWJhc2VBZGFwdGVyIGltcGxlbWVudHMgREJBZGFwdGVyIHtcbiAgcHJpdmF0ZSBjbGllbnQ6IFN1cGFiYXNlQ2xpZW50O1xuXG4gIGNvbnN0cnVjdG9yKHByaXZhdGUgY29uZmlnOiBEQkNvbmZpZykge1xuICAgIGlmICghY29uZmlnLnVybCB8fCAhY29uZmlnLmFub25LZXkpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcignU3VwYWJhc2UgVVJMIGFuZCBhbm9uS2V5IGFyZSByZXF1aXJlZCcpO1xuICAgIH1cblxuICAgIHRoaXMuY2xpZW50ID0gY3JlYXRlQ2xpZW50KGNvbmZpZy51cmwsIGNvbmZpZy5hbm9uS2V5KTtcbiAgfVxuXG4gIGFzeW5jIHRlc3RDb25uZWN0aW9uKCk6IFByb21pc2U8eyBzdWNjZXNzOiBib29sZWFuOyBtZXNzYWdlOiBzdHJpbmcgfT4ge1xuICAgIHRyeSB7XG4gICAgICBjb25zdCByZXNwb25zZSA9IGF3YWl0IGZldGNoKGAke3RoaXMuY29uZmlnLnVybH0vcmVzdC92MS8/bGltaXQ9MWAsIHtcbiAgICAgICAgaGVhZGVyczoge1xuICAgICAgICAgIGFwaWtleTogdGhpcy5jb25maWcuYW5vbktleSxcbiAgICAgICAgICBBdXRob3JpemF0aW9uOiBgQmVhcmVyICR7dGhpcy5jb25maWcuYW5vbktleX1gLFxuICAgICAgICB9LFxuICAgICAgfSk7XG5cbiAgICAgIGlmICghcmVzcG9uc2Uub2spIHtcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICBzdWNjZXNzOiBmYWxzZSxcbiAgICAgICAgICBtZXNzYWdlOiBgQ29ubmVjdGlvbiBmYWlsZWQ6IFN1cGFiYXNlIHJlc3BvbmRlZCB3aXRoIHN0YXR1cyAke3Jlc3BvbnNlLnN0YXR1c31gLFxuICAgICAgICB9O1xuICAgICAgfVxuXG4gICAgICByZXR1cm4geyBzdWNjZXNzOiB0cnVlLCBtZXNzYWdlOiAnQ29ubmVjdGVkIHRvIFN1cGFiYXNlIHN1Y2Nlc3NmdWxseS4nIH07XG4gICAgfSBjYXRjaCAoZXJyb3I6IGFueSkge1xuICAgICAgcmV0dXJuIHtcbiAgICAgICAgc3VjY2VzczogZmFsc2UsXG4gICAgICAgIG1lc3NhZ2U6IGVycm9yLm1lc3NhZ2UgfHwgJ0ZhaWxlZCB0byBjb25uZWN0IHRvIFN1cGFiYXNlLicsXG4gICAgICB9O1xuICAgIH1cbiAgfVxuXG4gIGFzeW5jIGNyZWF0ZShjb25maWc6IERCQ29uZmlnLCB0YWJsZTogc3RyaW5nLCBkYXRhOiBhbnkpOiBQcm9taXNlPGFueT4ge1xuICAgIGNvbnN0IHsgZGF0YTogaW5zZXJ0ZWQsIGVycm9yIH0gPSBhd2FpdCB0aGlzLmNsaWVudC5mcm9tKHRhYmxlKS5pbnNlcnQoZGF0YSk7XG4gICAgaWYgKGVycm9yKSB0aHJvdyBlcnJvcjtcbiAgICByZXR1cm4gaW5zZXJ0ZWQ7XG4gIH1cblxuICBhc3luYyByZWFkKGNvbmZpZzogREJDb25maWcsIHRhYmxlOiBzdHJpbmcsIHF1ZXJ5PzogYW55KTogUHJvbWlzZTxhbnk+IHtcbiAgICBsZXQgcWIgPSB0aGlzLmNsaWVudC5mcm9tKHRhYmxlKS5zZWxlY3QoJyonKTtcblxuICAgIC8vIFlvdSBjYW4gZXhwYW5kIHRoaXMgcXVlcnkgbG9naWMgaWYgbmVlZGVkOlxuICAgIGlmIChxdWVyeSkge1xuICAgICAgT2JqZWN0LmVudHJpZXMocXVlcnkpLmZvckVhY2goKFtrZXksIHZhbHVlXSkgPT4ge1xuICAgICAgICBxYiA9IHFiLmVxKGtleSwgdmFsdWUgYXMgc3RyaW5nKTtcbiAgICAgIH0pO1xuICAgIH1cblxuICAgIGNvbnN0IHsgZGF0YSwgZXJyb3IgfSA9IGF3YWl0IHFiO1xuICAgIGlmIChlcnJvcikgdGhyb3cgZXJyb3I7XG4gICAgcmV0dXJuIGRhdGE7XG4gIH1cblxuICBhc3luYyB1cGRhdGUoY29uZmlnOiBEQkNvbmZpZywgdGFibGU6IHN0cmluZywgaWQ6IHN0cmluZywgZGF0YTogYW55KTogUHJvbWlzZTxhbnk+IHtcbiAgICBjb25zdCB7IGRhdGE6IHVwZGF0ZWQsIGVycm9yIH0gPSBhd2FpdCB0aGlzLmNsaWVudC5mcm9tKHRhYmxlKS51cGRhdGUoZGF0YSkuZXEoJ2lkJywgaWQpO1xuICAgIGlmIChlcnJvcikgdGhyb3cgZXJyb3I7XG4gICAgcmV0dXJuIHVwZGF0ZWQ7XG4gIH1cblxuICBhc3luYyBkZWxldGUoY29uZmlnOiBEQkNvbmZpZywgdGFibGU6IHN0cmluZywgaWQ6IHN0cmluZyk6IFByb21pc2U8YW55PiB7XG4gICAgY29uc3QgeyBkYXRhOiBkZWxldGVkLCBlcnJvciB9ID0gYXdhaXQgdGhpcy5jbGllbnQuZnJvbSh0YWJsZSkuZGVsZXRlKCkuZXEoJ2lkJywgaWQpO1xuICAgIGlmIChlcnJvcikgdGhyb3cgZXJyb3I7XG4gICAgcmV0dXJuIGRlbGV0ZWQ7XG4gIH1cbn1cbiJdLCJuYW1lcyI6WyJjcmVhdGVDbGllbnQiLCJTdXBhYmFzZUFkYXB0ZXIiLCJjb25zdHJ1Y3RvciIsImNvbmZpZyIsInVybCIsImFub25LZXkiLCJFcnJvciIsImNsaWVudCIsInRlc3RDb25uZWN0aW9uIiwicmVzcG9uc2UiLCJmZXRjaCIsImhlYWRlcnMiLCJhcGlrZXkiLCJBdXRob3JpemF0aW9uIiwib2siLCJzdWNjZXNzIiwibWVzc2FnZSIsInN0YXR1cyIsImVycm9yIiwiY3JlYXRlIiwidGFibGUiLCJkYXRhIiwiaW5zZXJ0ZWQiLCJmcm9tIiwiaW5zZXJ0IiwicmVhZCIsInF1ZXJ5IiwicWIiLCJzZWxlY3QiLCJPYmplY3QiLCJlbnRyaWVzIiwiZm9yRWFjaCIsImtleSIsInZhbHVlIiwiZXEiLCJ1cGRhdGUiLCJpZCIsInVwZGF0ZWQiLCJkZWxldGUiLCJkZWxldGVkIl0sImlnbm9yZUxpc3QiOltdLCJzb3VyY2VSb290IjoiIn0=\n//# sourceURL=webpack-internal:///(rsc)/./app/db-adapter/adapters/supabase-adapter.ts\n");

/***/ }),

/***/ "(rsc)/./app/db-adapter/index.ts":
/*!*********************************!*\
  !*** ./app/db-adapter/index.ts ***!
  \*********************************/
/***/ ((module, __webpack_exports__, __webpack_require__) => {

"use strict";
eval("__webpack_require__.a(module, async (__webpack_handle_async_dependencies__, __webpack_async_result__) => { try {\n__webpack_require__.r(__webpack_exports__);\n/* harmony export */ __webpack_require__.d(__webpack_exports__, {\n/* harmony export */   getAdapter: () => (/* binding */ getAdapter)\n/* harmony export */ });\n/* harmony import */ var _adapters_postgres_adapter__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./adapters/postgres-adapter */ \"(rsc)/./app/db-adapter/adapters/postgres-adapter.ts\");\n/* harmony import */ var _adapters_mysql_adapter__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./adapters/mysql-adapter */ \"(rsc)/./app/db-adapter/adapters/mysql-adapter.ts\");\n/* harmony import */ var _adapters_sqlserver_adapter__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ./adapters/sqlserver-adapter */ \"(rsc)/./app/db-adapter/adapters/sqlserver-adapter.ts\");\n/* harmony import */ var _adapters_mongodb_adapter__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ./adapters/mongodb-adapter */ \"(rsc)/./app/db-adapter/adapters/mongodb-adapter.ts\");\n/* harmony import */ var _adapters_firebase_adapter__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(/*! ./adapters/firebase-adapter */ \"(rsc)/./app/db-adapter/adapters/firebase-adapter.ts\");\n/* harmony import */ var _adapters_supabase_adapter__WEBPACK_IMPORTED_MODULE_5__ = __webpack_require__(/*! ./adapters/supabase-adapter */ \"(rsc)/./app/db-adapter/adapters/supabase-adapter.ts\");\n/* harmony import */ var _adapters_mariadb_adapter__WEBPACK_IMPORTED_MODULE_6__ = __webpack_require__(/*! ./adapters/mariadb-adapter */ \"(rsc)/./app/db-adapter/adapters/mariadb-adapter.ts\");\n/* harmony import */ var _adapters_planetscale_adapter__WEBPACK_IMPORTED_MODULE_7__ = __webpack_require__(/*! ./adapters/planetscale-adapter */ \"(rsc)/./app/db-adapter/adapters/planetscale-adapter.ts\");\nvar __webpack_async_dependencies__ = __webpack_handle_async_dependencies__([_adapters_postgres_adapter__WEBPACK_IMPORTED_MODULE_0__]);\n_adapters_postgres_adapter__WEBPACK_IMPORTED_MODULE_0__ = (__webpack_async_dependencies__.then ? (await __webpack_async_dependencies__)() : __webpack_async_dependencies__)[0];\n// /lib/db-adapter/index.ts\n\n\n\n\n\n\n\n\nfunction getAdapter(type, config) {\n    switch(type){\n        case 'postgres':\n            return new _adapters_postgres_adapter__WEBPACK_IMPORTED_MODULE_0__.PostgresAdapter(config);\n        case 'mysql':\n            return new _adapters_mysql_adapter__WEBPACK_IMPORTED_MODULE_1__.MySQLAdapter(config);\n        case 'sqlserver':\n            return new _adapters_sqlserver_adapter__WEBPACK_IMPORTED_MODULE_2__.SQLServerAdapter(config);\n        case 'mongodb':\n            return new _adapters_mongodb_adapter__WEBPACK_IMPORTED_MODULE_3__.MongoDBAdapter(config);\n        case 'firebase':\n            return new _adapters_firebase_adapter__WEBPACK_IMPORTED_MODULE_4__.FirebaseAdapter(config);\n        case 'supabase':\n            return new _adapters_supabase_adapter__WEBPACK_IMPORTED_MODULE_5__.SupabaseAdapter(config);\n        case 'mariadb':\n            return new _adapters_mariadb_adapter__WEBPACK_IMPORTED_MODULE_6__.MariaDBAdapter(config);\n        case 'planetscale':\n            return new _adapters_planetscale_adapter__WEBPACK_IMPORTED_MODULE_7__.PlanetScaleAdapter(config);\n        default:\n            throw new Error(`Unsupported DB type: ${config.dbType}`);\n    }\n}\n\n__webpack_async_result__();\n} catch(e) { __webpack_async_result__(e); } });//# sourceURL=[module]\n//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiKHJzYykvLi9hcHAvZGItYWRhcHRlci9pbmRleC50cyIsIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7QUFBQSwyQkFBMkI7QUFFbUM7QUFDTjtBQUNRO0FBQ0o7QUFDRTtBQUNBO0FBQ0Y7QUFDUTtBQUU3RCxTQUFTUSxXQUFXQyxJQUFZLEVBQUVDLE1BQWdCO0lBQ3RELE9BQVFEO1FBQ1AsS0FBSztZQUNILE9BQU8sSUFBSVQsdUVBQWVBLENBQUNVO1FBQzdCLEtBQUs7WUFDSCxPQUFPLElBQUlULGlFQUFZQSxDQUFDUztRQUMxQixLQUFLO1lBQ0gsT0FBTyxJQUFJUix5RUFBZ0JBLENBQUNRO1FBQzlCLEtBQUs7WUFDSCxPQUFPLElBQUlQLHFFQUFjQSxDQUFDTztRQUM1QixLQUFLO1lBQ0gsT0FBTyxJQUFJTix1RUFBZUEsQ0FBQ007UUFDN0IsS0FBSztZQUNILE9BQU8sSUFBSUwsdUVBQWVBLENBQUNLO1FBQzdCLEtBQUs7WUFDSCxPQUFPLElBQUlKLHFFQUFjQSxDQUFDSTtRQUM1QixLQUFLO1lBQ0gsT0FBTyxJQUFJSCw2RUFBa0JBLENBQUNHO1FBQ2hDO1lBQ0UsTUFBTSxJQUFJQyxNQUFNLENBQUMscUJBQXFCLEVBQUVELE9BQU9FLE1BQU0sRUFBRTtJQUMzRDtBQUNGIiwic291cmNlcyI6WyIvVXNlcnMvYW50b253ZW50emVsL254dGZsdXR0ZXJfY29yZS9tYWluL2FwcC9hcHAvZGItYWRhcHRlci9pbmRleC50cyJdLCJzb3VyY2VzQ29udGVudCI6WyIvLyAvbGliL2RiLWFkYXB0ZXIvaW5kZXgudHNcbmltcG9ydCB7IERCQ29uZmlnLCBEQkFkYXB0ZXIgfSBmcm9tICcuL3R5cGVzJztcbmltcG9ydCB7IFBvc3RncmVzQWRhcHRlciB9IGZyb20gJy4vYWRhcHRlcnMvcG9zdGdyZXMtYWRhcHRlcic7XG5pbXBvcnQgeyBNeVNRTEFkYXB0ZXIgfSBmcm9tICcuL2FkYXB0ZXJzL215c3FsLWFkYXB0ZXInO1xuaW1wb3J0IHsgU1FMU2VydmVyQWRhcHRlciB9IGZyb20gJy4vYWRhcHRlcnMvc3Fsc2VydmVyLWFkYXB0ZXInO1xuaW1wb3J0IHsgTW9uZ29EQkFkYXB0ZXIgfSBmcm9tICcuL2FkYXB0ZXJzL21vbmdvZGItYWRhcHRlcic7XG5pbXBvcnQgeyBGaXJlYmFzZUFkYXB0ZXIgfSBmcm9tICcuL2FkYXB0ZXJzL2ZpcmViYXNlLWFkYXB0ZXInO1xuaW1wb3J0IHsgU3VwYWJhc2VBZGFwdGVyIH0gZnJvbSAnLi9hZGFwdGVycy9zdXBhYmFzZS1hZGFwdGVyJztcbmltcG9ydCB7IE1hcmlhREJBZGFwdGVyIH0gZnJvbSAnLi9hZGFwdGVycy9tYXJpYWRiLWFkYXB0ZXInO1xuaW1wb3J0IHsgUGxhbmV0U2NhbGVBZGFwdGVyIH0gZnJvbSAnLi9hZGFwdGVycy9wbGFuZXRzY2FsZS1hZGFwdGVyJztcblxuZXhwb3J0IGZ1bmN0aW9uIGdldEFkYXB0ZXIodHlwZTogc3RyaW5nLCBjb25maWc6IERCQ29uZmlnKTogREJBZGFwdGVyIHtcbiAgIHN3aXRjaCAodHlwZSkge1xuICAgIGNhc2UgJ3Bvc3RncmVzJzpcbiAgICAgIHJldHVybiBuZXcgUG9zdGdyZXNBZGFwdGVyKGNvbmZpZyk7XG4gICAgY2FzZSAnbXlzcWwnOlxuICAgICAgcmV0dXJuIG5ldyBNeVNRTEFkYXB0ZXIoY29uZmlnKTtcbiAgICBjYXNlICdzcWxzZXJ2ZXInOlxuICAgICAgcmV0dXJuIG5ldyBTUUxTZXJ2ZXJBZGFwdGVyKGNvbmZpZyk7XG4gICAgY2FzZSAnbW9uZ29kYic6XG4gICAgICByZXR1cm4gbmV3IE1vbmdvREJBZGFwdGVyKGNvbmZpZyk7XG4gICAgY2FzZSAnZmlyZWJhc2UnOlxuICAgICAgcmV0dXJuIG5ldyBGaXJlYmFzZUFkYXB0ZXIoY29uZmlnKTtcbiAgICBjYXNlICdzdXBhYmFzZSc6XG4gICAgICByZXR1cm4gbmV3IFN1cGFiYXNlQWRhcHRlcihjb25maWcpO1xuICAgIGNhc2UgJ21hcmlhZGInOlxuICAgICAgcmV0dXJuIG5ldyBNYXJpYURCQWRhcHRlcihjb25maWcpO1xuICAgIGNhc2UgJ3BsYW5ldHNjYWxlJzpcbiAgICAgIHJldHVybiBuZXcgUGxhbmV0U2NhbGVBZGFwdGVyKGNvbmZpZyk7XG4gICAgZGVmYXVsdDpcbiAgICAgIHRocm93IG5ldyBFcnJvcihgVW5zdXBwb3J0ZWQgREIgdHlwZTogJHtjb25maWcuZGJUeXBlfWApO1xuICB9XG59XG4iXSwibmFtZXMiOlsiUG9zdGdyZXNBZGFwdGVyIiwiTXlTUUxBZGFwdGVyIiwiU1FMU2VydmVyQWRhcHRlciIsIk1vbmdvREJBZGFwdGVyIiwiRmlyZWJhc2VBZGFwdGVyIiwiU3VwYWJhc2VBZGFwdGVyIiwiTWFyaWFEQkFkYXB0ZXIiLCJQbGFuZXRTY2FsZUFkYXB0ZXIiLCJnZXRBZGFwdGVyIiwidHlwZSIsImNvbmZpZyIsIkVycm9yIiwiZGJUeXBlIl0sImlnbm9yZUxpc3QiOltdLCJzb3VyY2VSb290IjoiIn0=\n//# sourceURL=webpack-internal:///(rsc)/./app/db-adapter/index.ts\n");

/***/ }),

/***/ "(rsc)/./node_modules/mysql2/lib sync recursive ^cardinal.*$":
/*!****************************************************!*\
  !*** ./node_modules/mysql2/lib/ sync ^cardinal.*$ ***!
  \****************************************************/
/***/ ((module) => {

function webpackEmptyContext(req) {
	var e = new Error("Cannot find module '" + req + "'");
	e.code = 'MODULE_NOT_FOUND';
	throw e;
}
webpackEmptyContext.keys = () => ([]);
webpackEmptyContext.resolve = webpackEmptyContext;
webpackEmptyContext.id = "(rsc)/./node_modules/mysql2/lib sync recursive ^cardinal.*$";
module.exports = webpackEmptyContext;

/***/ }),

/***/ "(rsc)/./node_modules/next/dist/build/webpack/loaders/next-app-loader/index.js?name=app%2Fapi%2Ftest-db-connection%2Froute&page=%2Fapi%2Ftest-db-connection%2Froute&appPaths=&pagePath=private-next-app-dir%2Fapi%2Ftest-db-connection%2Froute.ts&appDir=%2FUsers%2Fantonwentzel%2Fnxtflutter_core%2Fmain%2Fapp%2Fapp&pageExtensions=tsx&pageExtensions=ts&pageExtensions=jsx&pageExtensions=js&rootDir=%2FUsers%2Fantonwentzel%2Fnxtflutter_core%2Fmain%2Fapp&isDev=true&tsconfigPath=tsconfig.json&basePath=&assetPrefix=&nextConfigOutput=&preferredRegion=&middlewareConfig=e30%3D!":
/*!****************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************!*\
  !*** ./node_modules/next/dist/build/webpack/loaders/next-app-loader/index.js?name=app%2Fapi%2Ftest-db-connection%2Froute&page=%2Fapi%2Ftest-db-connection%2Froute&appPaths=&pagePath=private-next-app-dir%2Fapi%2Ftest-db-connection%2Froute.ts&appDir=%2FUsers%2Fantonwentzel%2Fnxtflutter_core%2Fmain%2Fapp%2Fapp&pageExtensions=tsx&pageExtensions=ts&pageExtensions=jsx&pageExtensions=js&rootDir=%2FUsers%2Fantonwentzel%2Fnxtflutter_core%2Fmain%2Fapp&isDev=true&tsconfigPath=tsconfig.json&basePath=&assetPrefix=&nextConfigOutput=&preferredRegion=&middlewareConfig=e30%3D! ***!
  \****************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************/
/***/ ((module, __webpack_exports__, __webpack_require__) => {

"use strict";
eval("__webpack_require__.a(module, async (__webpack_handle_async_dependencies__, __webpack_async_result__) => { try {\n__webpack_require__.r(__webpack_exports__);\n/* harmony export */ __webpack_require__.d(__webpack_exports__, {\n/* harmony export */   patchFetch: () => (/* binding */ patchFetch),\n/* harmony export */   routeModule: () => (/* binding */ routeModule),\n/* harmony export */   serverHooks: () => (/* binding */ serverHooks),\n/* harmony export */   workAsyncStorage: () => (/* binding */ workAsyncStorage),\n/* harmony export */   workUnitAsyncStorage: () => (/* binding */ workUnitAsyncStorage)\n/* harmony export */ });\n/* harmony import */ var next_dist_server_route_modules_app_route_module_compiled__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! next/dist/server/route-modules/app-route/module.compiled */ \"(rsc)/./node_modules/next/dist/server/route-modules/app-route/module.compiled.js\");\n/* harmony import */ var next_dist_server_route_modules_app_route_module_compiled__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(next_dist_server_route_modules_app_route_module_compiled__WEBPACK_IMPORTED_MODULE_0__);\n/* harmony import */ var next_dist_server_route_kind__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! next/dist/server/route-kind */ \"(rsc)/./node_modules/next/dist/server/route-kind.js\");\n/* harmony import */ var next_dist_server_lib_patch_fetch__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! next/dist/server/lib/patch-fetch */ \"(rsc)/./node_modules/next/dist/server/lib/patch-fetch.js\");\n/* harmony import */ var next_dist_server_lib_patch_fetch__WEBPACK_IMPORTED_MODULE_2___default = /*#__PURE__*/__webpack_require__.n(next_dist_server_lib_patch_fetch__WEBPACK_IMPORTED_MODULE_2__);\n/* harmony import */ var _Users_antonwentzel_nxtflutter_core_main_app_app_api_test_db_connection_route_ts__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ./app/api/test-db-connection/route.ts */ \"(rsc)/./app/api/test-db-connection/route.ts\");\nvar __webpack_async_dependencies__ = __webpack_handle_async_dependencies__([_Users_antonwentzel_nxtflutter_core_main_app_app_api_test_db_connection_route_ts__WEBPACK_IMPORTED_MODULE_3__]);\n_Users_antonwentzel_nxtflutter_core_main_app_app_api_test_db_connection_route_ts__WEBPACK_IMPORTED_MODULE_3__ = (__webpack_async_dependencies__.then ? (await __webpack_async_dependencies__)() : __webpack_async_dependencies__)[0];\n\n\n\n\n// We inject the nextConfigOutput here so that we can use them in the route\n// module.\nconst nextConfigOutput = \"\"\nconst routeModule = new next_dist_server_route_modules_app_route_module_compiled__WEBPACK_IMPORTED_MODULE_0__.AppRouteRouteModule({\n    definition: {\n        kind: next_dist_server_route_kind__WEBPACK_IMPORTED_MODULE_1__.RouteKind.APP_ROUTE,\n        page: \"/api/test-db-connection/route\",\n        pathname: \"/api/test-db-connection\",\n        filename: \"route\",\n        bundlePath: \"app/api/test-db-connection/route\"\n    },\n    resolvedPagePath: \"/Users/antonwentzel/nxtflutter_core/main/app/app/api/test-db-connection/route.ts\",\n    nextConfigOutput,\n    userland: _Users_antonwentzel_nxtflutter_core_main_app_app_api_test_db_connection_route_ts__WEBPACK_IMPORTED_MODULE_3__\n});\n// Pull out the exports that we need to expose from the module. This should\n// be eliminated when we've moved the other routes to the new format. These\n// are used to hook into the route.\nconst { workAsyncStorage, workUnitAsyncStorage, serverHooks } = routeModule;\nfunction patchFetch() {\n    return (0,next_dist_server_lib_patch_fetch__WEBPACK_IMPORTED_MODULE_2__.patchFetch)({\n        workAsyncStorage,\n        workUnitAsyncStorage\n    });\n}\n\n\n//# sourceMappingURL=app-route.js.map\n__webpack_async_result__();\n} catch(e) { __webpack_async_result__(e); } });//# sourceURL=[module]\n//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiKHJzYykvLi9ub2RlX21vZHVsZXMvbmV4dC9kaXN0L2J1aWxkL3dlYnBhY2svbG9hZGVycy9uZXh0LWFwcC1sb2FkZXIvaW5kZXguanM/bmFtZT1hcHAlMkZhcGklMkZ0ZXN0LWRiLWNvbm5lY3Rpb24lMkZyb3V0ZSZwYWdlPSUyRmFwaSUyRnRlc3QtZGItY29ubmVjdGlvbiUyRnJvdXRlJmFwcFBhdGhzPSZwYWdlUGF0aD1wcml2YXRlLW5leHQtYXBwLWRpciUyRmFwaSUyRnRlc3QtZGItY29ubmVjdGlvbiUyRnJvdXRlLnRzJmFwcERpcj0lMkZVc2VycyUyRmFudG9ud2VudHplbCUyRm54dGZsdXR0ZXJfY29yZSUyRm1haW4lMkZhcHAlMkZhcHAmcGFnZUV4dGVuc2lvbnM9dHN4JnBhZ2VFeHRlbnNpb25zPXRzJnBhZ2VFeHRlbnNpb25zPWpzeCZwYWdlRXh0ZW5zaW9ucz1qcyZyb290RGlyPSUyRlVzZXJzJTJGYW50b253ZW50emVsJTJGbnh0Zmx1dHRlcl9jb3JlJTJGbWFpbiUyRmFwcCZpc0Rldj10cnVlJnRzY29uZmlnUGF0aD10c2NvbmZpZy5qc29uJmJhc2VQYXRoPSZhc3NldFByZWZpeD0mbmV4dENvbmZpZ091dHB1dD0mcHJlZmVycmVkUmVnaW9uPSZtaWRkbGV3YXJlQ29uZmlnPWUzMCUzRCEiLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFBK0Y7QUFDdkM7QUFDcUI7QUFDZ0M7QUFDN0c7QUFDQTtBQUNBO0FBQ0Esd0JBQXdCLHlHQUFtQjtBQUMzQztBQUNBLGNBQWMsa0VBQVM7QUFDdkI7QUFDQTtBQUNBO0FBQ0E7QUFDQSxLQUFLO0FBQ0w7QUFDQTtBQUNBLFlBQVk7QUFDWixDQUFDO0FBQ0Q7QUFDQTtBQUNBO0FBQ0EsUUFBUSxzREFBc0Q7QUFDOUQ7QUFDQSxXQUFXLDRFQUFXO0FBQ3RCO0FBQ0E7QUFDQSxLQUFLO0FBQ0w7QUFDMEY7O0FBRTFGLHFDIiwic291cmNlcyI6WyIiXSwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgQXBwUm91dGVSb3V0ZU1vZHVsZSB9IGZyb20gXCJuZXh0L2Rpc3Qvc2VydmVyL3JvdXRlLW1vZHVsZXMvYXBwLXJvdXRlL21vZHVsZS5jb21waWxlZFwiO1xuaW1wb3J0IHsgUm91dGVLaW5kIH0gZnJvbSBcIm5leHQvZGlzdC9zZXJ2ZXIvcm91dGUta2luZFwiO1xuaW1wb3J0IHsgcGF0Y2hGZXRjaCBhcyBfcGF0Y2hGZXRjaCB9IGZyb20gXCJuZXh0L2Rpc3Qvc2VydmVyL2xpYi9wYXRjaC1mZXRjaFwiO1xuaW1wb3J0ICogYXMgdXNlcmxhbmQgZnJvbSBcIi9Vc2Vycy9hbnRvbndlbnR6ZWwvbnh0Zmx1dHRlcl9jb3JlL21haW4vYXBwL2FwcC9hcGkvdGVzdC1kYi1jb25uZWN0aW9uL3JvdXRlLnRzXCI7XG4vLyBXZSBpbmplY3QgdGhlIG5leHRDb25maWdPdXRwdXQgaGVyZSBzbyB0aGF0IHdlIGNhbiB1c2UgdGhlbSBpbiB0aGUgcm91dGVcbi8vIG1vZHVsZS5cbmNvbnN0IG5leHRDb25maWdPdXRwdXQgPSBcIlwiXG5jb25zdCByb3V0ZU1vZHVsZSA9IG5ldyBBcHBSb3V0ZVJvdXRlTW9kdWxlKHtcbiAgICBkZWZpbml0aW9uOiB7XG4gICAgICAgIGtpbmQ6IFJvdXRlS2luZC5BUFBfUk9VVEUsXG4gICAgICAgIHBhZ2U6IFwiL2FwaS90ZXN0LWRiLWNvbm5lY3Rpb24vcm91dGVcIixcbiAgICAgICAgcGF0aG5hbWU6IFwiL2FwaS90ZXN0LWRiLWNvbm5lY3Rpb25cIixcbiAgICAgICAgZmlsZW5hbWU6IFwicm91dGVcIixcbiAgICAgICAgYnVuZGxlUGF0aDogXCJhcHAvYXBpL3Rlc3QtZGItY29ubmVjdGlvbi9yb3V0ZVwiXG4gICAgfSxcbiAgICByZXNvbHZlZFBhZ2VQYXRoOiBcIi9Vc2Vycy9hbnRvbndlbnR6ZWwvbnh0Zmx1dHRlcl9jb3JlL21haW4vYXBwL2FwcC9hcGkvdGVzdC1kYi1jb25uZWN0aW9uL3JvdXRlLnRzXCIsXG4gICAgbmV4dENvbmZpZ091dHB1dCxcbiAgICB1c2VybGFuZFxufSk7XG4vLyBQdWxsIG91dCB0aGUgZXhwb3J0cyB0aGF0IHdlIG5lZWQgdG8gZXhwb3NlIGZyb20gdGhlIG1vZHVsZS4gVGhpcyBzaG91bGRcbi8vIGJlIGVsaW1pbmF0ZWQgd2hlbiB3ZSd2ZSBtb3ZlZCB0aGUgb3RoZXIgcm91dGVzIHRvIHRoZSBuZXcgZm9ybWF0LiBUaGVzZVxuLy8gYXJlIHVzZWQgdG8gaG9vayBpbnRvIHRoZSByb3V0ZS5cbmNvbnN0IHsgd29ya0FzeW5jU3RvcmFnZSwgd29ya1VuaXRBc3luY1N0b3JhZ2UsIHNlcnZlckhvb2tzIH0gPSByb3V0ZU1vZHVsZTtcbmZ1bmN0aW9uIHBhdGNoRmV0Y2goKSB7XG4gICAgcmV0dXJuIF9wYXRjaEZldGNoKHtcbiAgICAgICAgd29ya0FzeW5jU3RvcmFnZSxcbiAgICAgICAgd29ya1VuaXRBc3luY1N0b3JhZ2VcbiAgICB9KTtcbn1cbmV4cG9ydCB7IHJvdXRlTW9kdWxlLCB3b3JrQXN5bmNTdG9yYWdlLCB3b3JrVW5pdEFzeW5jU3RvcmFnZSwgc2VydmVySG9va3MsIHBhdGNoRmV0Y2gsICB9O1xuXG4vLyMgc291cmNlTWFwcGluZ1VSTD1hcHAtcm91dGUuanMubWFwIl0sIm5hbWVzIjpbXSwiaWdub3JlTGlzdCI6W10sInNvdXJjZVJvb3QiOiIifQ==\n//# sourceURL=webpack-internal:///(rsc)/./node_modules/next/dist/build/webpack/loaders/next-app-loader/index.js?name=app%2Fapi%2Ftest-db-connection%2Froute&page=%2Fapi%2Ftest-db-connection%2Froute&appPaths=&pagePath=private-next-app-dir%2Fapi%2Ftest-db-connection%2Froute.ts&appDir=%2FUsers%2Fantonwentzel%2Fnxtflutter_core%2Fmain%2Fapp%2Fapp&pageExtensions=tsx&pageExtensions=ts&pageExtensions=jsx&pageExtensions=js&rootDir=%2FUsers%2Fantonwentzel%2Fnxtflutter_core%2Fmain%2Fapp&isDev=true&tsconfigPath=tsconfig.json&basePath=&assetPrefix=&nextConfigOutput=&preferredRegion=&middlewareConfig=e30%3D!\n");

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

/***/ "?32c4":
/*!****************************!*\
  !*** bufferutil (ignored) ***!
  \****************************/
/***/ (() => {

/* (ignored) */

/***/ }),

/***/ "?66e9":
/*!********************************!*\
  !*** utf-8-validate (ignored) ***!
  \********************************/
/***/ (() => {

/* (ignored) */

/***/ }),

/***/ "?d272":
/*!********************************!*\
  !*** supports-color (ignored) ***!
  \********************************/
/***/ (() => {

/* (ignored) */

/***/ }),

/***/ "assert":
/*!*************************!*\
  !*** external "assert" ***!
  \*************************/
/***/ ((module) => {

"use strict";
module.exports = require("assert");

/***/ }),

/***/ "buffer":
/*!*************************!*\
  !*** external "buffer" ***!
  \*************************/
/***/ ((module) => {

"use strict";
module.exports = require("buffer");

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

/***/ "crypto":
/*!*************************!*\
  !*** external "crypto" ***!
  \*************************/
/***/ ((module) => {

"use strict";
module.exports = require("crypto");

/***/ }),

/***/ "dgram":
/*!************************!*\
  !*** external "dgram" ***!
  \************************/
/***/ ((module) => {

"use strict";
module.exports = require("dgram");

/***/ }),

/***/ "dns":
/*!**********************!*\
  !*** external "dns" ***!
  \**********************/
/***/ ((module) => {

"use strict";
module.exports = require("dns");

/***/ }),

/***/ "events":
/*!*************************!*\
  !*** external "events" ***!
  \*************************/
/***/ ((module) => {

"use strict";
module.exports = require("events");

/***/ }),

/***/ "firebase-admin":
/*!*********************************!*\
  !*** external "firebase-admin" ***!
  \*********************************/
/***/ ((module) => {

"use strict";
module.exports = require("firebase-admin");

/***/ }),

/***/ "fs":
/*!*********************!*\
  !*** external "fs" ***!
  \*********************/
/***/ ((module) => {

"use strict";
module.exports = require("fs");

/***/ }),

/***/ "http":
/*!***********************!*\
  !*** external "http" ***!
  \***********************/
/***/ ((module) => {

"use strict";
module.exports = require("http");

/***/ }),

/***/ "https":
/*!************************!*\
  !*** external "https" ***!
  \************************/
/***/ ((module) => {

"use strict";
module.exports = require("https");

/***/ }),

/***/ "mongodb":
/*!**************************!*\
  !*** external "mongodb" ***!
  \**************************/
/***/ ((module) => {

"use strict";
module.exports = require("mongodb");

/***/ }),

/***/ "net":
/*!**********************!*\
  !*** external "net" ***!
  \**********************/
/***/ ((module) => {

"use strict";
module.exports = require("net");

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

/***/ "node:crypto":
/*!******************************!*\
  !*** external "node:crypto" ***!
  \******************************/
/***/ ((module) => {

"use strict";
module.exports = require("node:crypto");

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

/***/ "node:fs/promises":
/*!***********************************!*\
  !*** external "node:fs/promises" ***!
  \***********************************/
/***/ ((module) => {

"use strict";
module.exports = require("node:fs/promises");

/***/ }),

/***/ "node:http":
/*!****************************!*\
  !*** external "node:http" ***!
  \****************************/
/***/ ((module) => {

"use strict";
module.exports = require("node:http");

/***/ }),

/***/ "node:https":
/*!*****************************!*\
  !*** external "node:https" ***!
  \*****************************/
/***/ ((module) => {

"use strict";
module.exports = require("node:https");

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

/***/ "node:zlib":
/*!****************************!*\
  !*** external "node:zlib" ***!
  \****************************/
/***/ ((module) => {

"use strict";
module.exports = require("node:zlib");

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

/***/ }),

/***/ "pg":
/*!*********************!*\
  !*** external "pg" ***!
  \*********************/
/***/ ((module) => {

"use strict";
module.exports = import("pg");;

/***/ }),

/***/ "process":
/*!**************************!*\
  !*** external "process" ***!
  \**************************/
/***/ ((module) => {

"use strict";
module.exports = require("process");

/***/ }),

/***/ "punycode":
/*!***************************!*\
  !*** external "punycode" ***!
  \***************************/
/***/ ((module) => {

"use strict";
module.exports = require("punycode");

/***/ }),

/***/ "stream":
/*!*************************!*\
  !*** external "stream" ***!
  \*************************/
/***/ ((module) => {

"use strict";
module.exports = require("stream");

/***/ }),

/***/ "string_decoder":
/*!*********************************!*\
  !*** external "string_decoder" ***!
  \*********************************/
/***/ ((module) => {

"use strict";
module.exports = require("string_decoder");

/***/ }),

/***/ "timers":
/*!*************************!*\
  !*** external "timers" ***!
  \*************************/
/***/ ((module) => {

"use strict";
module.exports = require("timers");

/***/ }),

/***/ "tls":
/*!**********************!*\
  !*** external "tls" ***!
  \**********************/
/***/ ((module) => {

"use strict";
module.exports = require("tls");

/***/ }),

/***/ "tty":
/*!**********************!*\
  !*** external "tty" ***!
  \**********************/
/***/ ((module) => {

"use strict";
module.exports = require("tty");

/***/ }),

/***/ "url":
/*!**********************!*\
  !*** external "url" ***!
  \**********************/
/***/ ((module) => {

"use strict";
module.exports = require("url");

/***/ }),

/***/ "util":
/*!***********************!*\
  !*** external "util" ***!
  \***********************/
/***/ ((module) => {

"use strict";
module.exports = require("util");

/***/ }),

/***/ "zlib":
/*!***********************!*\
  !*** external "zlib" ***!
  \***********************/
/***/ ((module) => {

"use strict";
module.exports = require("zlib");

/***/ })

};
;

// load runtime
var __webpack_require__ = require("../../../webpack-runtime.js");
__webpack_require__.C(exports);
var __webpack_exec__ = (moduleId) => (__webpack_require__(__webpack_require__.s = moduleId))
var __webpack_exports__ = __webpack_require__.X(0, ["vendor-chunks/next","vendor-chunks/@opentelemetry","vendor-chunks/tslib","vendor-chunks/@azure","vendor-chunks/tedious","vendor-chunks/mysql2","vendor-chunks/mariadb","vendor-chunks/@typespec","vendor-chunks/@supabase","vendor-chunks/semver","vendor-chunks/mssql","vendor-chunks/iconv-lite","vendor-chunks/ws","vendor-chunks/jsonwebtoken","vendor-chunks/tarn","vendor-chunks/@planetscale","vendor-chunks/whatwg-url","vendor-chunks/jws","vendor-chunks/debug","vendor-chunks/@tediousjs","vendor-chunks/aws-ssl-profiles","vendor-chunks/isows","vendor-chunks/tr46","vendor-chunks/sqlstring","vendor-chunks/seq-queue","vendor-chunks/rfdc","vendor-chunks/named-placeholders","vendor-chunks/inherits","vendor-chunks/ecdsa-sig-formatter","vendor-chunks/agent-base","vendor-chunks/long","vendor-chunks/webidl-conversions","vendor-chunks/string_decoder","vendor-chunks/sprintf-js","vendor-chunks/safer-buffer","vendor-chunks/safe-buffer","vendor-chunks/process","vendor-chunks/native-duplexpair","vendor-chunks/ms","vendor-chunks/lru.min","vendor-chunks/lodash.once","vendor-chunks/lodash.isstring","vendor-chunks/lodash.isplainobject","vendor-chunks/lodash.isnumber","vendor-chunks/lodash.isinteger","vendor-chunks/lodash.isboolean","vendor-chunks/lodash.includes","vendor-chunks/jwa","vendor-chunks/js-md4","vendor-chunks/is-property","vendor-chunks/http-proxy-agent","vendor-chunks/generate-function","vendor-chunks/event-target-shim","vendor-chunks/denque","vendor-chunks/buffer-equal-constant-time","vendor-chunks/abort-controller","vendor-chunks/@js-joda"], () => (__webpack_exec__("(rsc)/./node_modules/next/dist/build/webpack/loaders/next-app-loader/index.js?name=app%2Fapi%2Ftest-db-connection%2Froute&page=%2Fapi%2Ftest-db-connection%2Froute&appPaths=&pagePath=private-next-app-dir%2Fapi%2Ftest-db-connection%2Froute.ts&appDir=%2FUsers%2Fantonwentzel%2Fnxtflutter_core%2Fmain%2Fapp%2Fapp&pageExtensions=tsx&pageExtensions=ts&pageExtensions=jsx&pageExtensions=js&rootDir=%2FUsers%2Fantonwentzel%2Fnxtflutter_core%2Fmain%2Fapp&isDev=true&tsconfigPath=tsconfig.json&basePath=&assetPrefix=&nextConfigOutput=&preferredRegion=&middlewareConfig=e30%3D!")));
module.exports = __webpack_exports__;

})();