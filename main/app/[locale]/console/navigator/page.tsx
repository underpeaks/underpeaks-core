// File: app/[locale]/console/navigator/page.tsx (Core version — replace Studio's if building for Core repo)

'use client'

import { useState, useEffect } from 'react'
import { FiPlus, FiTrash2 } from 'react-icons/fi'
import { useAuth } from '../layout'
import Loader from '../Loading'

interface PageNode {
  page_id: string
  name:    string
  slug:    string
}

interface PageRoute {
  route_id:     string
  from_page_id: string
  to_page_id:   string
  trigger:      string
  label:        string | null
}

export default function NavigatorPage() {
  const { user } = useAuth()

  const [pages,   setPages]   = useState<PageNode[]>([])
  const [routes,  setRoutes]  = useState<PageRoute[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) return
    loadData()
  }, [user])

  async function loadData() {
    setLoading(true)
    try {
      const [pagesRes, routesRes] = await Promise.all([
        fetch('/api/pages'),
        fetch('/api/page-routes'),
      ])
      const pagesData  = await pagesRes.json()
      const routesData = await routesRes.json()
      setPages((pagesData.pages ?? []).map((p: any) => ({ page_id: p.page_id, name: p.name, slug: p.slug })))
      setRoutes(routesData.routes ?? [])
    } finally {
      setLoading(false)
    }
  }

  async function addRoute() {
    if (pages.length < 2) return
    const res = await fetch('/api/page-routes', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ from_page_id: pages[0].page_id, to_page_id: pages[1].page_id, trigger: 'tap', label: '' }),
    })
    const data = await res.json()
    if (res.ok) setRoutes((prev) => [...prev, data.route])
  }

  async function updateRoute(routeId: string, field: string, value: string) {
    setRoutes((prev) => prev.map((r) => r.route_id === routeId ? { ...r, [field]: value } : r))
    await fetch(`/api/page-routes/${routeId}`, {
      method:  'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ [field]: value }),
    })
  }

  async function deleteRoute(routeId: string) {
    await fetch(`/api/page-routes/${routeId}`, { method: 'DELETE' })
    setRoutes((prev) => prev.filter((r) => r.route_id !== routeId))
  }

  if (loading) return <Loader />

  return (
    <div className="flex flex-col h-[calc(100vh-64px)] bg-gray-100">
      <div className="shrink-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-base font-bold text-gray-900">Navigator</h1>
          <p className="text-xs text-gray-400 mt-0.5">Connect pages to define how your app navigates between them.</p>
        </div>
        <button
          onClick={addRoute}
          disabled={pages.length < 2}
          className="flex items-center gap-1.5 px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded-md hover:bg-gray-700 disabled:opacity-40 transition"
        >
          <FiPlus size={15} /> Add Connection
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-3xl mx-auto bg-white border border-gray-200 rounded-lg overflow-hidden">
          {routes.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3 text-gray-400">
              <p className="text-sm">No connections yet.</p>
              <button onClick={addRoute} disabled={pages.length < 2} className="text-xs text-blue-500 hover:underline disabled:opacity-40">
                Add your first connection
              </button>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {routes.map((route) => (
                <div key={route.route_id} className="flex items-center gap-3 px-5 py-3.5">
                  <select
                    value={route.from_page_id}
                    onChange={(e) => updateRoute(route.route_id, 'from_page_id', e.target.value)}
                    className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-md bg-gray-50"
                  >
                    {pages.map((p) => <option key={p.page_id} value={p.page_id}>{p.name}</option>)}
                  </select>
                  <span className="text-gray-300 text-sm shrink-0">→</span>
                  <select
                    value={route.to_page_id}
                    onChange={(e) => updateRoute(route.route_id, 'to_page_id', e.target.value)}
                    className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-md bg-gray-50"
                  >
                    {pages.map((p) => <option key={p.page_id} value={p.page_id}>{p.name}</option>)}
                  </select>
                  <select
                    value={route.trigger}
                    onChange={(e) => updateRoute(route.route_id, 'trigger', e.target.value)}
                    className="w-28 px-3 py-2 text-sm border border-gray-200 rounded-md bg-gray-50 shrink-0"
                  >
                    <option value="tap">Tap</option>
                    <option value="button">Button</option>
                    <option value="back">Back</option>
                    <option value="swipe">Swipe</option>
                  </select>
                  <button onClick={() => deleteRoute(route.route_id)} className="p-2 text-gray-400 hover:text-red-500 transition shrink-0">
                    <FiTrash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}