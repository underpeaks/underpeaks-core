'use client';

/**
 * ConsoleIndexRedirect Component
 *
 * This is a "redirect-only" component — it renders nothing visible and exists
 * purely to send the user to the correct default page when they land on the
 * root console URL (e.g. /console).
 *
 * Why is this needed?
 * ───────────────────
 * Next.js serves whatever is in a `page.tsx` file for a given route. If a
 * user visits /console directly (e.g. by typing it in the address bar, or
 * clicking a "Go to console" link), there is no meaningful content to show at
 * that exact path — the real content lives at /console/dashboard,
 * /console/settings, etc.
 *
 * Rather than showing a blank page or a 404, this component immediately
 * redirects the user to /console/dashboard, which is the intended entry point
 * for the console.
 *
 * How it works:
 * ─────────────
 * 1. The component mounts in the browser ('use client' ensures this runs
 *    client-side only, where the router is available).
 * 2. The useEffect fires once after mount (router is stable, so the
 *    dependency array [router] effectively means "run once").
 * 3. router.replace() is used instead of router.push() so that /console is
 *    NOT added to the browser's history stack — the user cannot press the
 *    back button to return to the blank /console route.
 * 4. The component returns null, so nothing is rendered in the DOM while
 *    the redirect is happening.
 *
 * Note on the import:
 * ───────────────────
 * The `import '@/app/[locale]/layout'` line pulls in the locale layout's
 * side-effects (e.g. global styles or context setup) without rendering it
 * directly. This ensures any layout-level initialisation still runs even
 * though this page renders no UI of its own.
 */

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import '@/app/[locale]/layout';

/**
 * ConsoleIndexRedirect
 *
 * Silently redirects the user from /console to /console/dashboard on mount.
 * Renders nothing — returns null.
 */
export default function ConsoleIndexRedirect() {
  /**
   * router — Next.js router used to perform the programmatic redirect.
   * We use `replace` (not `push`) so this intermediate route is not added
   * to the browser history and the back button skips over it.
   */
  const router = useRouter();

  /**
   * Trigger the redirect once, immediately after the component mounts.
   * The dependency array contains `router` as required by React's rules of
   * hooks, but in practice `router` is a stable reference and this effect
   * will only ever run once.
   */
  useEffect(() => {
    router.replace('/console/dashboard');
  }, [router]);

  /**
   * Return null — this component has no visual output.
   * The user will be redirected before they see anything.
   */
  return null;
}