// core/known-issues.ts  (same folder as LocaleSwitcher.tsx)
// To add a known issue, add one object to KNOWN_ISSUES. No UI code changes needed.

export const DISCORD_URL      = 'https://discord.gg/XRNXyNHBg'
export const GITHUB_ISSUES_URL = 'https://github.com/underpeaks/underpeaks-core/issues'

export interface KnownIssue {
  id:        string
  title:     string
  keywords:  string[]
  symptoms:  string
  steps:     string[]
  code?:     string[]
}

export const KNOWN_ISSUES: KnownIssue[] = [
  {
    id:       'restart-after-install',
    title:    'Sign-in sends me straight back to the sign-in page after installing',
    keywords: ['401', 'unauthorized', 'logged out', 'kicked out', 'sign in', 'signin', 'session', 'redirect', 'restart', 'env', '.env.local', 'localhost'],
    symptoms: 'You sign in and land back on the sign-in page. The browser console shows POST /api/session 401 (Unauthorized).',
    steps: [
      'The installer saves your settings to .env.local, but Next.js only reads that file when the server starts. A server that was already running during the install is still using the old settings.',
      'Stop the dev server with Ctrl+C.',
      'Start it again with npm run dev.',
      'Sign in again.',
      'This only happens when running on localhost.',
    ],
    code: [
      'Ctrl+C',
      'npm run dev',
    ],
  },
  {
    id:       'stuck-db-screen',
    title:    "The installer won't get past the database screen",
    keywords: ['database', 'stuck', 'continue', 'test connection', 'installer', 'env', '.env.local', 'reload', 'restart', 'localhost', 'loop'],
    symptoms: 'The connection test or Continue on the database step does not move you on, or the installer keeps sending you back to this screen.',
    steps: [
      'The installer saves your database settings to .env.local, but the running server does not always reload that file. This only happens when running on localhost.',
      'Stop the dev server with Ctrl+C.',
      'Start it again with npm run dev.',
      'Open http://localhost:3000 and restart the installer from the beginning, then enter your database details again.',
      'Do not edit .env.local by hand while the installer is running.',
    ],
    code: [
      'Ctrl+C',
      'npm run dev',
    ],
  },
  {
    id:       'express-types',
    title:    "Cannot find type definition file for 'express' or 'node'",
    keywords: ['typescript', 'types', 'express', 'node', 'ts2688', 'npm install', 'node_modules'],
    symptoms: "error TS2688: Cannot find type definition file for 'express'.",
    steps: [
      'Dependencies are missing or the install was incomplete.',
      'Delete the node_modules folder, run npm install again, then npm run dev.',
      'Make sure you are on the latest version of Core.',
    ],
    code: [
      'Windows (PowerShell):  cmd /c rmdir /s /q node_modules',
      'macOS / Linux:         rm -rf node_modules',
      'Then:                  npm install',
    ],
  },
  {
    id:       'node-version',
    title:    'The server cannot start: Node.js version too old',
    keywords: ['node', 'nodejs', 'version', 'engine', 'upgrade', 'lts'],
    symptoms: 'The terminal says the server cannot start yet and shows your Node.js version.',
    steps: [
      'Core needs Node.js 18.18 or newer. Node.js 20 or newer is recommended.',
      'Install the latest LTS version from nodejs.org.',
      'Close and reopen your terminal, run npm install, then npm run dev.',
    ],
  },
  {
    id:       'slow-install',
    title:    'npm install is very slow or seems stuck',
    keywords: ['slow', 'install', 'stuck', 'hang', 'npm', 'disk', 'antivirus'],
    symptoms: 'npm install takes many minutes with no visible progress.',
    steps: [
      'The first install can take several minutes, especially on slower disks.',
      'Close heavy apps such as video editors and screen recorders.',
      'On Windows, installing on an SSD and excluding the project folder from antivirus scanning helps a lot.',
      'Let it finish. Do not cancel it halfway, or run it again from a clean node_modules folder.',
    ],
  },
  {
    id:       'slow-first-start',
    title:    'The first start or first sign-in is very slow',
    keywords: ['slow', 'first start', 'compile', 'loading', 'sign in', 'login', 'timeout'],
    symptoms: 'The page takes a long time to load, or sign-in takes a minute or more the first time.',
    steps: [
      'The first run compiles the app. Wait for the terminal to show Ready before opening the browser.',
      'Later starts and page loads are much faster.',
      'If it is still very slow, close other heavy apps and try again.',
    ],
  },
  {
    id:       'db-connect',
    title:    "The installer can't connect to my database",
    keywords: ['database', 'connection', 'connect', 'postgres', 'mysql', 'mongodb', 'supabase', 'firebase', 'ip', 'firewall'],
    symptoms: 'The database connection test fails in the installer.',
    steps: [
      'Double-check the host, port, username, password and database name.',
      'Make sure the database is reachable from the machine running Core.',
      'Cloud databases often need your IP address to be allowed in their firewall settings.',
      'For Supabase and Firebase, check that you copied the project URL and keys exactly.',
    ],
  },
  {
    id:       'blank-missing-tables',
    title:    'My blank project is missing the Pages and Menu tables',
    keywords: ['blank', 'pages', 'menu', 'tables', 'missing', 'project type'],
    symptoms: 'After installing a blank project, Pages or Menu do not work.',
    steps: [
      'Update to the latest version of Core.',
      'Run the installer again on a fresh, empty database.',
    ],
  },
  {
    id:       'license-unreachable',
    title:    'Could not reach Studio to validate your license key',
    keywords: ['license', 'key', 'studio', 'validate', 'network', 'connection', 'activate'],
    symptoms: 'Could not reach Studio to validate your license key. Check your connection.',
    steps: [
      'Check that you have an internet connection.',
      'Make sure NEXT_PUBLIC_STUDIO_URL in your environment file points to https://studio.underpeaks.com.',
      'Restart the dev server after changing environment values.',
    ],
  },
  {
    id:       'license-invalid',
    title:    'Invalid license key',
    keywords: ['license', 'key', 'invalid', 'activate', 'nxf_live'],
    symptoms: 'Invalid license key. Please check and try again.',
    steps: [
      'Copy the key again from your Underpeaks Studio account (Settings, License Keys).',
      'Make sure there are no extra spaces before or after the key.',
      'Keys start with nxf_live_.',
      'No account yet? Creating one is free and takes about 30 seconds.',
    ],
  },
]