// app/console/layout.tsx
'use client'

import { useState } from 'react'
import { TopNavbar, Sidebar } from '../components' // Adjust path if needed
import { useUser } from '@supabase/auth-helpers-react' // Add auth helper
import { useRouter } from 'next/navigation' // Add router

export default function ConsoleLayout({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false)
  const user = useUser() // Get user session
  const router = useRouter()
  
  // Sidebar widths matching your Sidebar component's widths (px)
  const sidebarWidth = collapsed ? 80 : 256

  // Redirect if not authenticated
  if (!user) {
    // You might want to show a loading state here
    router.replace('/signin')
    return null
  }

  return (
    <div className="flex flex-col min-h-screen">
      {/* Top Navbar */}
      <header className="w-full h-16 border-b shadow">
        <TopNavbar user={user} />
      </header>

      {/* Sidebar + Main */}
      <div className="flex flex-1">
        <aside
          style={{ width: sidebarWidth, transition: 'width 0.3s' }}
          className="border-r h-[calc(100vh-4rem)] overflow-auto"
        >
          <Sidebar collapsed={collapsed} setCollapsed={setCollapsed}  />
        </aside>

        <main
          style={{ marginLeft: 0, flexGrow: 1, transition: 'margin-left 0.3s' }}
          className="p-6 overflow-auto"
        >
          {children}
        </main>
      </div>
    </div>
  )
}