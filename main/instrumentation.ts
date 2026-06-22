// instrumentation.ts (Core root — same level as package.json)
export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { startPhoneHome } = await import('./app/lib/licensePhoneHome')
    startPhoneHome()
  }
}