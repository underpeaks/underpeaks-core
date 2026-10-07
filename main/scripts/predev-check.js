// main/scripts/predev-check.js
// Runs automatically before `npm run dev` (via the "predev" npm script).
// Plain Node, no dependencies, so it works even if node_modules is missing.

const fs   = require('fs')
const path = require('path')

const MIN_NODE   = [18, 18]   // hard minimum (Next.js 15 requires 18.18+)
const RECOMMENDED_NODE_MAJOR = 20
const DISCORD_URL = 'https://discord.gg/XRNXyNHBg'
const ISSUES_URL  = 'https://github.com/underpeaks/underpeaks-core/issues'

const root     = path.resolve(__dirname, '..')
const problems = []
const warnings = []

// 1. Node version
const [major, minor] = process.versions.node.split('.').map((n) => parseInt(n, 10))
if (major < MIN_NODE[0] || (major === MIN_NODE[0] && minor < MIN_NODE[1])) {
  problems.push(
    `Node.js ${MIN_NODE.join('.')} or newer is required (you have ${process.versions.node}).\n` +
    '  Fix: install the latest LTS from https://nodejs.org, then run "npm install" again.'
  )
} else if (major < RECOMMENDED_NODE_MAJOR) {
  warnings.push(
    `Node.js ${process.versions.node} works, but ${RECOMMENDED_NODE_MAJOR}+ is recommended.\n` +
    '  Fix: install the latest LTS from https://nodejs.org.'
  )
}

// 2. Dependencies installed
const nodeModules = path.join(root, 'node_modules')
if (!fs.existsSync(nodeModules) || !fs.existsSync(path.join(nodeModules, 'next'))) {
  problems.push(
    'Dependencies are not installed (or the install was incomplete).\n' +
    '  Fix: run "npm install", wait for it to finish, then run "npm run dev" again.'
  )
} else {
  // 3. Type definitions (missing ones cause "Cannot find type definition file")
  for (const pkg of ['@types/node', '@types/express']) {
    if (!fs.existsSync(path.join(nodeModules, pkg))) {
      warnings.push(
        `Missing ${pkg}.\n` +
        '  Fix: delete the node_modules folder and run "npm install" again.'
      )
    }
  }
}

if (warnings.length) {
  console.warn('\n[Underpeaks] Warnings:\n')
  warnings.forEach((w) => console.warn('  - ' + w + '\n'))
}

if (problems.length) {
  console.error('\n[Underpeaks] The server cannot start yet:\n')
  problems.forEach((p) => console.error('  - ' + p + '\n'))
  console.error('Still stuck? See "Troubleshooting" in the README, join Discord:')
  console.error('  ' + DISCORD_URL)
  console.error('or log an issue:')
  console.error('  ' + ISSUES_URL + '\n')
  process.exit(1)
}

console.log(
  `\n[Underpeaks] Pre-start checks passed (Node ${process.versions.node}, dependencies installed).\n`
)