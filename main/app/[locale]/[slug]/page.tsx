
import { notFound }          from 'next/navigation'
import Link                  from 'next/link'
import { FiEyeOff }          from 'react-icons/fi'
import { getConfiguredAdapter } from '@/app/lib/getConfiguredAdapter '

type Props = {
  params: Promise<{ slug: string }>
}

async function getPage(slug: string) {
  try {
    const adapter  = getConfiguredAdapter()
    const dbConfig = adapter.config
    const allPages = await adapter.read!(dbConfig, 'nxf_pages')
    return (allPages ?? []).find(
      (p: any) => p.slug === `/${slug}` || p.slug === slug
    ) ?? null
  } catch {
    return null
  }
}

export default async function PublicDynamicPage({ params }: Props) {
  const { slug } = await params
  const page = await getPage(slug)
 

  // Only serve public client pages here
  if (!page || page.page_type === 'admin') return notFound()

  // Draft and hidden pages return not found publicly
  if (page.status === 'draft' || page.hidden) return notFound()

  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center gap-6 p-8">
      <div className="flex items-center justify-center w-16 h-16 rounded-2xl bg-gray-100">
        <FiEyeOff size={28} className="text-gray-400" />
      </div>
      <div className="text-center max-w-sm">
        <h1 className="text-xl font-bold text-gray-800">{page.title ?? page.name}</h1>
        <p className="text-sm text-gray-400 mt-2">
          This page has not been published yet. Check back soon.
        </p>
      </div>
      <Link href="/" className="text-xs text-blue-500 hover:underline">
        ← Back to home
      </Link>
    </div>
  )
}