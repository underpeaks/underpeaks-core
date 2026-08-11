// /**
//  * Desktop full-screen preview route
//  * Location: app/preview/[slug]/page.tsx
//  *
//  * Uses the template registry — supports any preview-capable template
//  * registered in templateRegistry.ts. No hardcoded list.
//  */

// import { cookies }            from 'next/headers'
// import { notFound, redirect } from 'next/navigation'
// import { getTemplate }        from '@/app/[locale]/console/[slug]/components/templateRegistry'
// import LockedPlaceholder      from '@/app/[locale]/console/[slug]/components/LockedPlaceholder'
// import type {
//   PageRecord, ModelRecord,
// } from '@/app/[locale]/console/[slug]/types'
// import { getConfiguredAdapter } from '@/app/lib/getConfiguredAdapter'

// interface PreviewPageProps {
//   params: Promise<{ locale: string; slug: string }>
// }

// async function verifyAuth(token: string): Promise<boolean> {
//   if (!token) return false
//   try {
//     const adapter   = await getConfiguredAdapter()
//     const dbConfig  = (adapter as any).dbConfig
//     const sessions  = await adapter.readAll!(dbConfig, 'nxf_system_tokens', { access_token: token })
//     if (!sessions || sessions.length === 0) return false
//     const session = sessions[0] as any
//     if (session.expires_at && new Date(session.expires_at).getTime() < Date.now()) return false
//     return true
//   } catch {
//     return false
//   }
// }

// async function loadPage(slug: string): Promise<{ page: PageRecord | null; model: ModelRecord | null }> {
//   try {
//     const adapter   = await getConfiguredAdapter()
//     const dbConfig  = (adapter as any).dbConfig

//     const normalized = slug.startsWith('/') ? slug : `/${slug}`

//     const pages = await adapter.readAll!(dbConfig, 'nxf_pages', { slug: normalized })
//     if (!pages || pages.length === 0) return { page: null, model: null }

//     const page = pages[0] as PageRecord

//     let model: ModelRecord | null = null
//     if (page.model_id) {
//       const models = await adapter.readAll!(dbConfig, 'nxf_system_models', { sm_id: page.model_id })
//       if (models && models.length > 0) {
//         const raw = models[0] as any
//         let schema = raw.schema
//         if (Array.isArray(schema)) {
//           schema = { version: '1.0', columns: schema, hooks: [], integrations: [] }
//         } else if (schema && !schema.columns) {
//           schema = { version: '1.0', columns: [], hooks: [], integrations: [] }
//         }
//         model = { ...raw, schema }
//       }
//     }

//     return { page, model }
//   } catch (err) {
//     console.error('[preview/[slug]] loadPage:', err)
//     return { page: null, model: null }
//   }
// }

// export default async function PreviewPage({ params }: PreviewPageProps) {
//   const { locale, slug } = await params

//   const cookieStore = await cookies()
//   const token       = cookieStore.get('access_token')?.value ?? ''
//   const authorized  = await verifyAuth(token)
//   if (!authorized) redirect('/signin')

//   const { page, model } = await loadPage(slug)
//   if (!page) notFound()

//   const registryEntry = getTemplate(page.template_type)
//   if (!registryEntry) notFound()

//   // Template doesn't support full-screen preview
//   if (!registryEntry.fullScreenPreview) {
//     return (
//       <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-6 text-center">
//         <h1 className="text-xl font-bold text-[var(--color-text)] mb-2">
//           Preview not available for {registryEntry.name}
//         </h1>
//         <p className="text-sm text-[var(--color-text-muted)] max-w-md">
//           Full-screen preview is only available for mockup templates.
//           Data templates render inside the console.
//         </p>
//       </div>
//     )
//   }

//   // Locked template — render upgrade placeholder
//   if (registryEntry.locked) {
//     return <LockedPlaceholder templateName={registryEntry.name} page={page} />
//   }

//   const Template = registryEntry.component

//   return (
//     <div className="min-h-screen bg-gray-50">
//       <Template
//         page={page}
//         model={model ?? undefined}
//         projectId={page.project_id ?? ''}
//         tenantId={page.tenant_id ?? ''}
//         authToken={token}
//         isPreview={true}
//       />
//     </div>
//   )
// }