'use client'

import { useState, useEffect }                        from 'react'
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd'
import { FiPlus, FiMenu, FiChevronDown }              from 'react-icons/fi'
import { useTranslations }                            from 'next-intl'
import { useAuth }                                    from '../layout'
import Loader                                         from '../Loading'
import { AdminPage, MenuItem } from './components/types'
import MenuRow from './components/MenuRow'
import MenuItemDrawer from './components/MenuItemDrawer'
import { getIcon } from '../../components_cus/getIcon'
import { logActivity } from '@/app/lib/logActivity'


export default function MenuPage() {
  const t        = useTranslations('menuPage')
  const { user } = useAuth()

  const [items,      setItems]      = useState<MenuItem[]>([])
  const [pages,      setPages]      = useState<AdminPage[]>([])
  const [loading,    setLoading]    = useState(true)
  const [saving,     setSaving]     = useState(false)
  const [error,      setError]      = useState<string | null>(null)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [editItem,   setEditItem]   = useState<MenuItem | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  useEffect(() => {
    if (!user) return
    const userId = user.user_id || user.id
    loadItems(userId)
    loadPages(userId)
  }, [user])

  async function loadItems(userId: string) {
    setLoading(true)
    setError(null)
    try {
      const res  = await fetch(`/api/menu?user_id=${userId}`)
      const text = await res.text()
      if (!text) throw new Error(t('errors.loadFailed'))
      const data = JSON.parse(text)
      if (!res.ok) throw new Error(data.error || t('errors.loadFailed'))
      setItems(data.items ?? [])
    } catch (err: any) {
      setError(err.message || t('errors.loadFailed'))
    } finally {
      setLoading(false)
    }
  }

  async function loadPages(userId: string) {
    try {
      const res  = await fetch(`/api/menu/pages?user_id=${userId}`)
      const text = await res.text()
      if (!text) return
      const data = JSON.parse(text)
      setPages(data.pages ?? [])
    } catch {}
  }

  const handleCreate = async (data: Partial<MenuItem>) => {
    setSaving(true)
    setError(null)
    try {
      const userId = user?.user_id || user?.id
      const order  = items.filter((i) => !i.parent_id).length
      const res    = await fetch('/api/menu', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ user_id: userId, user_email: user?.user_email, order, ...data }),
      })
      const json = await res.text().then((t) => (t ? JSON.parse(t) : {}))
      if (!res.ok) throw new Error(json.error || t('errors.createFailed'))
      await loadItems(userId!)
      window.dispatchEvent(new CustomEvent('nxf:menu:updated'))
       if (userId) {
        await logActivity(userId, 'menu_item_created', { label: data.label })
      }
      setDrawerOpen(false)
    } catch (err: any) {
      setError(err.message || t('errors.createFailed'))
    } finally {
      setSaving(false)
    }
  }

  const handleUpdate = async (data: Partial<MenuItem>) => {
    if (!editItem) return
    setSaving(true)
    setError(null)
    try {
      const userId = user?.user_id || user?.id
      const res    = await fetch('/api/menu', {
        method:  'PUT',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ menu_id: editItem.menu_id, user_id: userId, ...data }),
      })
      const json = await res.text().then((t) => (t ? JSON.parse(t) : {}))
      if (!res.ok) throw new Error(json.error || t('errors.updateFailed'))
      await loadItems(userId!)
     
      setEditItem(null)
       window.dispatchEvent(new CustomEvent('nxf:menu:updated'))
        if (userId) {
        await logActivity(userId, 'menu_item_updated', { label: data.label })
      }
      setDrawerOpen(false)
    } catch (err: any) {
      setError(err.message || t('errors.updateFailed'))
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (menuId: string) => {
    setError(null)
    try {
      const userId = user?.user_id || user?.id
      const res    = await fetch('/api/menu', {
        method:  'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ menu_id: menuId, user_id: userId }),
      })
      const json = await res.text().then((t) => (t ? JSON.parse(t) : {}))
      if (!res.ok) throw new Error(json.error || t('errors.deleteFailed'))
      setItems((prev) => prev.filter((i) => i.menu_id !== menuId && i.parent_id !== menuId))
      setDeletingId(null) 
      window.dispatchEvent(new CustomEvent('nxf:menu:updated'))
         if (userId) {
        await logActivity(userId, 'menu_item_deleted', { menu_id: menuId })
      }
    } catch (err: any) {
      setError(err.message || t('errors.deleteFailed'))
    }
  }

  const handleToggleVisible = async (id: string) => {
    const item   = items.find((i) => i.menu_id === id)!
    const userId = user?.user_id || user?.id
    await fetch('/api/menu', {
      method:  'PUT',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ menu_id: id, user_id: userId, visible: !item.visible }),
    })
    setItems((prev) => prev.map((i) => i.menu_id === id ? { ...i, visible: !i.visible } : i))
  }

  const handleDragEnd = async (result: DropResult) => {
    const { source, destination, draggableId } = result
    if (!destination) return
    if (source.droppableId === destination.droppableId && source.index === destination.index) return

    const sourceParentId      = source.droppableId      === 'top-level' ? null : source.droppableId
    const destinationParentId = destination.droppableId === 'top-level' ? null : destination.droppableId

    const destinationPeers = items
      .filter((i) => i.parent_id === destinationParentId)
      .sort((a, b) => a.order - b.order)

    const sourcePeers = source.droppableId === destination.droppableId
      ? destinationPeers
      : items.filter((i) => i.parent_id === sourceParentId).sort((a, b) => a.order - b.order)

    const reordered   = sourcePeers.filter((i) => i.menu_id !== draggableId)
    const draggedItem = items.find((i) => i.menu_id === draggableId)!
    reordered.splice(destination.index, 0, draggedItem)

    const updates = reordered.map((item, index) => ({ ...item, order: index, parent_id: destinationParentId }))

    setItems((prev) => {
      const untouched = prev.filter(
        (i) => i.parent_id !== sourceParentId && i.parent_id !== destinationParentId && i.menu_id !== draggableId
      )
      return [...untouched, ...updates]
    })

    const userId = user?.user_id || user?.id
    await Promise.all(
      updates.map((item) =>
        fetch('/api/menu', {
          method:  'PUT',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify({ menu_id: item.menu_id, user_id: userId, order: item.order, parent_id: item.parent_id }),
        })
      )
    )
  }

  const topLevel   = items.filter((i) => !i.parent_id).sort((a, b) => a.order - b.order)
  const childrenOf = (pid: string) => items.filter((i) => i.parent_id === pid).sort((a, b) => a.order - b.order)
  const parentOpts = items.filter((i) => !i.parent_id)

  if (loading) return <Loader />

  return (
    <div className="flex flex-col h-[calc(100vh-64px)] bg-gray-100 overflow-hidden">

      {/* Toolbar */}
      <div className="shrink-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-base font-bold text-gray-900">{t('toolbar.title')}</h1>
          <p className="text-xs text-gray-400 mt-0.5">{t('toolbar.subtitle', { count: items.length })}</p>
        </div>
        <button
          onClick={() => { setEditItem(null); setDrawerOpen(true) }}
          className="flex items-center gap-1.5 px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded-md hover:bg-gray-700 transition"
        >
          <FiPlus size={15} /> {t('toolbar.addItem')}
        </button>
      </div>

      {error && (
        <div className="shrink-0 mx-6 mt-4 px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
          {error}
        </div>
      )}

      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-3xl mx-auto flex flex-col gap-6">

          {/* Nav Preview */}
          <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
            <div className="px-4 py-2.5 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{t('preview.title')}</p>
              <p className="text-[10px] text-gray-400">{t('preview.subtitle')}</p>
            </div>
            <div className="px-4 py-3 flex items-center gap-1 flex-wrap">
              {topLevel.filter((i) => i.visible).map((item) => {
                const children = childrenOf(item.menu_id).filter((c) => c.visible)
                return (
                  <div key={item.menu_id} className="relative group/nav">
                    <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-md hover:bg-gray-100 cursor-pointer transition">
                      <span className="text-gray-500">{getIcon(item.icon, 13)}</span>
                      <span className="text-sm text-gray-700 font-medium">{item.label}</span>
                      {children.length > 0 && <FiChevronDown size={11} className="text-gray-400" />}
                    </div>
                    {children.length > 0 && (
                      <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-md shadow-lg py-1 min-w-[140px] hidden group-hover/nav:block z-10">
                        {children.map((child) => (
                          <div key={child.menu_id} className="flex items-center gap-2 px-3 py-2 hover:bg-gray-50 cursor-pointer">
                            <span className="text-gray-400">{getIcon(child.icon, 12)}</span>
                            <span className="text-xs text-gray-700">{child.label}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )
              })}
              {topLevel.filter((i) => i.visible).length === 0 && (
                <p className="text-xs text-gray-400">{t('preview.empty')}</p>
              )}
            </div>
          </div>

          {/* Items list */}
          <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
            <div className="px-4 py-2.5 border-b border-gray-100 bg-gray-50">
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{t('list.title')}</p>
            </div>

            {items.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 gap-3 text-gray-400">
                <FiMenu size={32} className="text-gray-300" />
                <p className="text-sm">{t('list.empty')}</p>
                <button
                  onClick={() => { setEditItem(null); setDrawerOpen(true) }}
                  className="text-xs text-blue-500 hover:underline"
                >
                  {t('list.emptyAction')}
                </button>
              </div>
            ) : (
              <DragDropContext onDragEnd={handleDragEnd}>
                <Droppable droppableId="top-level">
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      className={`transition-colors ${snapshot.isDraggingOver ? 'bg-blue-50/40' : ''}`}
                    >
                      {topLevel.map((item, index) => (
                        <Draggable key={item.menu_id} draggableId={item.menu_id} index={index}>
                          {(provided, snapshot) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              className={`transition-shadow ${snapshot.isDragging ? 'shadow-lg rounded-lg' : ''}`}
                            >
                              <MenuRow
                                item={item}
                                isChild={false}
                                pages={pages}
                                onEdit={(i) => { setEditItem(i); setDrawerOpen(true) }}
                                onDelete={handleDelete}
                                onToggleVisible={handleToggleVisible}
                                deletingId={deletingId}
                                setDeletingId={setDeletingId}
                                dragHandleProps={provided.dragHandleProps}
                                t={t}
                              />

                              <Droppable droppableId={item.menu_id}>
                                {(childProvided, childSnapshot) => (
                                  <div
                                    ref={childProvided.innerRef}
                                    {...childProvided.droppableProps}
                                    className={`transition-colors ${childSnapshot.isDraggingOver ? 'bg-blue-50/40' : ''}`}
                                  >
                                    {childrenOf(item.menu_id).map((child, childIndex) => (
                                      <Draggable key={child.menu_id} draggableId={child.menu_id} index={childIndex}>
                                        {(childDraggable, childDragging) => (
                                          <div
                                            ref={childDraggable.innerRef}
                                            {...childDraggable.draggableProps}
                                            className={`transition-shadow ${childDragging.isDragging ? 'shadow-lg rounded-lg' : ''}`}
                                          >
                                            <MenuRow
                                              item={child}
                                              isChild={true}
                                              pages={pages}
                                              onEdit={(i) => { setEditItem(i); setDrawerOpen(true) }}
                                              onDelete={handleDelete}
                                              onToggleVisible={handleToggleVisible}
                                              deletingId={deletingId}
                                              setDeletingId={setDeletingId}
                                              dragHandleProps={childDraggable.dragHandleProps}
                                              t={t}
                                            />
                                          </div>
                                        )}
                                      </Draggable>
                                    ))}
                                    {childProvided.placeholder}
                                  </div>
                                )}
                              </Droppable>
                            </div>
                          )}
                        </Draggable>
                      ))}
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>
              </DragDropContext>
            )}
          </div>
        </div>
      </div>

      <MenuItemDrawer
        open={drawerOpen}
        onClose={() => { setDrawerOpen(false); setEditItem(null) }}
        onSave={editItem ? handleUpdate : handleCreate}
        existing={editItem}
        parentOptions={parentOpts}
        pages={pages}
        saving={saving}
        t={t}
      />
    </div>
  )
}