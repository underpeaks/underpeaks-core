import { AuthProvider } from './providers/AuthProvider'

import './globals.css'
import 'flag-icons/css/flag-icons.min.css';


export default async function RootLayout({ children }: { children: React.ReactNode }) {
   const res = await fetch(`${process.env.NEXT_PUBLIC_APP_DOMAIN}/api/get-system-config`, {
    cache: 'no-store'
  })

  const config = await res.json()

  return (
    <html lang="en">
      <head>
        <link rel="icon" href={config.faviconUrl} />
      </head>
      <body>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  )
}