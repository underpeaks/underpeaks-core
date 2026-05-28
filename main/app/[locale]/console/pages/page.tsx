'use client'

import { useState, useEffect }  from 'react'
import { useTranslations }      from 'next-intl'
import { FiLayout }             from 'react-icons/fi'
import { useAuth }              from '../layout'
import Loader                   from '../Loading'
import { ModelSummary, PageItem, PageVisibility } from './components/types'
import PagesToolbar from './components/PagesToolbar'
import PageRow from './components/PageRow'
import PageDrawer from './components/PageDrawer'
import { logActivity } from '@/app/lib/logActivity'


export default function PagesPage() {
  const t        = useTranslations('pagesPage')
  const { user } = useAuth()

  const [pages,      setPages]      = useState<PageItem[]>([])
  const [models,     setModels]     = useState<ModelSummary[]>([])
  const [loading,    setLoading]    = useState(true)
  const [saving,     setSaving]     = useState(false)
  const [error,      setError]      = useState<string | null>(null)
  const [search,     setSearch]     = useState('')
  const [filterVis,  setFilterVis]  = useState<PageVisibility | 'all'>('all')
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [editPage,   setEditPage]   = useState<PageItem | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  useEffect(() => {
    if (!user) return
    const userId = user.user_id || user.id
    loadPages(userId)
    loadModels(userId)
  }, [user])

  async function loadPages(userId: string) {
    setLoading(true)
    setError(null)
    try {
      const res  = await fetch(`/api/pages?user_id=${userId}`)
      const text = await res.text()
      if (!text) throw new Error(t('errors.loadFailed'))
      const data = JSON.parse(text)
      if (!res.ok) throw new Error(data.error || t('errors.loadFailed'))
      setPages(data.pages ?? [])
    } catch (err: any) {
      setError(err.message || t('errors.loadFailed'))
    } finally {
      setLoading(false)
    }
  }

  async function loadModels(userId: string) {
    try {
      const res  = await fetch(`/api/models/names?user_id=${userId}`)
      const text = await res.text()
      if (!text) return
      const data = JSON.parse(text)
      setModels(data.models ?? [])
    } catch {}
  }

  const handleCreate = async (data: Partial<PageItem>) => {
    setSaving(true)
    setError(null)
    try {
      const userId = user?.user_id || user?.id
      const res    = await fetch('/api/pages', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ user_id: userId, user_email: user?.user_email, ...data }),
      })
      const json = await res.text().then((t) => (t ? JSON.parse(t) : {}))
      if (!res.ok) throw new Error(json.error || t('errors.createFailed'))
      await loadPages(userId!)
    await loadPages(userId!)
      if (userId) {
        await logActivity(userId, 'page_created', { page_name: data.name, page_slug: data.slug })
      }
      setDrawerOpen(false)
    } catch (err: any) {
      setError(err.message || t('errors.createFailed'))
    } finally {
      setSaving(false)
    }
  }

  const handleUpdate = async (data: Partial<PageItem>) => {
    if (!editPage) return
    setSaving(true)
    setError(null)
    try {
      const userId = user?.user_id || user?.id
      const res    = await fetch('/api/pages', {
        method:  'PUT',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ page_id: editPage.page_id, user_id: userId, ...data }),
      })
      const json = await res.text().then((t) => (t ? JSON.parse(t) : {}))
      if (!res.ok) throw new Error(json.error || t('errors.updateFailed'))
      await loadPages(userId!)
    if (userId) {
        await logActivity(userId, 'page_updated', { page_name: data.name, page_slug: data.slug })
      }
      setEditPage(null)
      setDrawerOpen(false)
    } catch (err: any) {
      setError(err.message || t('errors.updateFailed'))
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (pageId: string) => {
    setError(null)
    try {
      const userId = user?.user_id || user?.id
      const res    = await fetch('/api/pages', {
        method:  'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ page_id: pageId, user_id: userId }),
      })
      const json = await res.text().then((t) => (t ? JSON.parse(t) : {}))
      if (!res.ok) throw new Error(json.error || t('errors.deleteFailed'))
      setPages((prev) => prev.filter((p) => p.page_id !== pageId))
     
      
      setDeletingId(null)
      if (userId) {
        await logActivity(userId, 'page_deleted', { page_id: pageId })
      }
    } catch (err: any) {
      setError(err.message || t('errors.deleteFailed'))
    }
  }

  const filtered = pages.filter((p) => {
    const matchSearch = (p.name ?? '').toLowerCase().includes(search.toLowerCase()) ||
                        (p.slug ?? '').toLowerCase().includes(search.toLowerCase())
    const matchVis    = filterVis === 'all' || p.visibility === filterVis
    return matchSearch && matchVis
  })

  if (loading) return <Loader />

  return (
    <div className="flex flex-col h-full bg-gray-100 overflow-hidden">

      <PagesToolbar
        pageCount={pages.length}
        search={search}
        filterVis={filterVis}
        onSearch={setSearch}
        onFilter={setFilterVis}
        onNewPage={() => { setEditPage(null); setDrawerOpen(true) }}
      />

      {error && (
        <div className="shrink-0 mx-6 mt-4 px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
          {error}
        </div>
      )}

      <div className="flex-1 overflow-y-auto p-6">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 gap-3 text-gray-400">
            <FiLayout size={36} className="text-gray-300" />
            <p className="text-sm">{t('emptyState.message')}</p>
            <button
              onClick={() => { setEditPage(null); setDrawerOpen(true) }}
              className="text-xs text-blue-500 hover:underline"
            >
              {t('emptyState.cta')}
            </button>
          </div>
        ) : (
          <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
            <div className="grid grid-cols-[2fr_1fr_1fr_1fr_auto] gap-x-4 px-5 py-2.5 border-b border-gray-100 bg-gray-50">
              <p className="text-[10px] font-bold text-gray-400 uppercase">{t('table.page')}</p>
              <p className="text-[10px] font-bold text-gray-400 uppercase">{t('table.model')}</p>
              <p className="text-[10px] font-bold text-gray-400 uppercase">{t('table.template')}</p>
              <p className="text-[10px] font-bold text-gray-400 uppercase">{t('table.visibility')}</p>
              <p className="text-[10px] font-bold text-gray-400 uppercase">{t('table.actions')}</p>
            </div>

            {filtered.map((page) => (
              <PageRow
                key={page.page_id}
                page={page}
                models={models}
                deletingId={deletingId}
                onEdit={(p) => { setEditPage(p); setDrawerOpen(true) }}
                onDelete={handleDelete}
                onDeleteReq={setDeletingId}
                onDeleteCancel={() => setDeletingId(null)}
              />
            ))}
          </div>
        )}
      </div>

      <PageDrawer
        open={drawerOpen}
        onClose={() => { setDrawerOpen(false); setEditPage(null) }}
        onSave={editPage ? handleUpdate : handleCreate}
        models={models}
        initial={editPage}
        saving={saving}
      />
    </div>
  )
}