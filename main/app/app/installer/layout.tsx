// installer/layout.tsx
export default function InstallerLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-white text-black font-sans">
        

          {children}
        
      </body>
    </html>
  )
}
