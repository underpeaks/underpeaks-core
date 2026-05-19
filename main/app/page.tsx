/**
 * page.tsx  (root route — '/')
 *
 * The entry point of the application. This is the first page Next.js renders
 * when a user visits the root URL ('/').
 *
 * What this page does:
 *   It does not render any visible UI at all. Its only job is to immediately
 *   redirect the user to the correct starting point based on whether the
 *   application has been configured yet:
 *
 *     ┌─────────────────────────────────────────────────────────┐
 *     │  Visit '/'                                              │
 *     │       │                                                 │
 *     │       ▼                                                 │
 *     │  hasValidConfig()?                                      │
 *     │       │                                                 │
 *     │    YES │                      NO │                      │
 *     │       ▼                          ▼                      │
 *     │  redirect('/signin')    redirect('/installer')          │
 *     └─────────────────────────────────────────────────────────┘
 *
 * Why redirect from the root instead of landing here?
 *   The root '/' path is intentionally kept empty of UI. This keeps the
 *   routing logic centralised — the app always decides where to send the
 *   user based on its current state, rather than having a page that sometimes
 *   shows content and sometimes doesn't.
 *
 * How redirect() works in Next.js App Router:
 *   redirect() is a Next.js server function that immediately stops rendering
 *   and sends an HTTP 307 (temporary redirect) response to the browser.
 *   Any code after a redirect() call is unreachable — the function throws
 *   internally to halt execution.
 *
 * Server Component:
 *   This file has no 'use client' directive, so it runs exclusively on the
 *   server. This is intentional — reading the config and deciding where to
 *   send the user is server-side logic that should never run in the browser.
 */

import { redirect }        from 'next/navigation'
import { hasValidConfig }  from './config'
import '@/app/[locale]/layout'

/**
 * Home
 *
 * The default export for the root route ('/'). Next.js automatically renders
 * this component when the user visits the application's root URL.
 *
 * Because both branches end in a redirect() call, this component never
 * returns any JSX. The return type is technically `never` since redirect()
 * always throws before a return value is produced.
 *
 * Redirect targets:
 *   '/signin'    — The application has been installed and configured.
 *                  Send the user to the sign-in page so they can log in.
 *
 *   '/installer' — No valid config.json was found, meaning the installation
 *                  wizard has not been completed. Send the user there first
 *                  so they can configure the application before using it.
 */
export default function Home() {
  if (hasValidConfig()) {
    // config.json exists and contains a valid dbType — installation is done.
    // Redirect to the sign-in page as the normal application entry point.
    redirect('/signin')
  }

  // config.json is missing, empty, or invalid — the app has not been set up.
  // Redirect to the installer wizard so the user can complete configuration.
  redirect('/installer')
}