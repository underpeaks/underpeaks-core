// app/layout.tsx
import './globals.css'
import 'flag-icons/css/flag-icons.min.css'

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html>
      <head>
        <link rel="icon" href="/images/favicon/NXT_Flutter_favicon.png" type="image/png" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Inter+Tight:wght@400;500;600;700&family=Inter:wght@400;500&family=JetBrains+Mono:wght@400;500&display=swap"
        />
      </head>
      <body style={{ margin: 0 }}>
        {children}
      </body>
    </html>
  )
}