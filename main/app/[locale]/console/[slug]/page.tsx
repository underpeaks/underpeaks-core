import { getStorageAdapter } from '@/app/lib/getConfiguredAdapter '
import { notFound }          from 'next/navigation'
import Link                  from 'next/link'
import { FiArrowLeft, FiLayout, FiClock } from 'react-icons/fi'
import { TEMPLATE_LABELS } from '../pages/components/types'

interface Props {
  params: { slug: string; locale: string }
}

async function getPage(slug: string) {
  try {
    const adapter  = getStorageAdapter()
    const dbConfig = adapter.config
    const allPages = await adapter.read!(dbConfig, 'nxf_pages')
    return (allPages ?? []).find(
      (p: any) => p.slug === `/${slug}` || p.slug === slug
    ) ?? null
  } catch {
    return null
  }
}



export default async function ConsoleDynamicPage({ params }: Props) {
  const page = await getPage(params.slug)

  if (!page) return notFound()

  // Block access to non-admin pages via the console route
  if (page.page_type === 'client') return notFound()

  const templateLabel = TEMPLATE_LABELS[page.template_type ?? page.template ?? 'custom'] ?? 'Custom'

  return (
    <div className="flex flex-col h-full bg-gray-100 overflow-hidden">

      {/* Toolbar */}
      <div className="shrink-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link
            href="/console/pages"
            className="flex items-center justify-center w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 transition text-gray-500"
          >
            <FiArrowLeft size={15} />
          </Link>
          <div>
            <h1 className="text-base font-bold text-gray-900">{page.title ?? page.name}</h1>
            <p className="text-xs text-gray-400 mt-0.5">
              {page.slug} · {templateLabel}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 border border-amber-200 text-amber-600 text-xs font-medium rounded-full">
            <FiClock size={11} />
            Page Builder Coming Soon
          </span>
        </div>
      </div>

      {/* Placeholder body */}
      <div className="flex-1 flex flex-col items-center justify-center gap-6 p-6">

        <div className="flex items-center justify-center w-20 h-20 rounded-2xl bg-white border border-gray-200 shadow-sm">
          <FiLayout size={36} className="text-gray-300" />
        </div>

        <div className="text-center max-w-sm">
          <h2 className="text-lg font-bold text-gray-800">Page Builder</h2>
          <p className="text-sm text-gray-400 mt-2 leading-relaxed">
            The page builder is coming soon. When it's ready, this page will render
            using the <span className="font-medium text-gray-600">{templateLabel}</span> template
            {page.model_id ? ' with your attached model data.' : '.'}
          </p>
        </div>

        {/* Page config summary */}
        <div className="w-full max-w-sm bg-white border border-gray-200 rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 bg-gray-50">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Page Config</p>
          </div>
          <div className="divide-y divide-gray-100">
            {[
              { label: 'Slug',       value: page.slug },
              { label: 'Template',   value: templateLabel },
              { label: 'Type',       value: page.page_type ?? 'admin' },
              { label: 'Visibility', value: page.visibility ?? 'public' },
              { label: 'Status',     value: page.status ?? 'draft' },
            ].map(({ label, value }) => (
              <div key={label} className="flex items-center justify-between px-4 py-2.5">
                <span className="text-xs text-gray-400">{label}</span>
                <span className="text-xs font-medium text-gray-700 capitalize">{value}</span>
              </div>
            ))}
          </div>
        </div>

        <Link
          href="/console/pages"
          className="text-xs text-blue-500 hover:underline"
        >
          ← Back to Pages
        </Link>
      </div>
    </div>
  )
}