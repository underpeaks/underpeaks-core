// // middleware.ts
// import { NextRequest, NextResponse } from 'next/server';
// import { configExists } from './config';

// export function middleware(request: NextRequest) {
//   const configIsPresent = configExists();
//   const isInstallerPath = request.nextUrl.pathname.startsWith('/installer');

//   if (!configIsPresent && !isInstallerPath) {
//     const url = request.nextUrl.clone();
//     url.pathname = '/installer';
//     return NextResponse.redirect(url);
//   }

//   if (configIsPresent && isInstallerPath) {
//     const url = request.nextUrl.clone();
//     url.pathname = '/signin';
//     return NextResponse.redirect(url);
//   }

//   return NextResponse.next();
// }

// export const config = {
//   matcher: ['/', '/((?!_next|favicon.ico|api).*)'],
// };
