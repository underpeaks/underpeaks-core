'use client'

import { FiUser, FiClock, FiHeart, FiMessageCircle, FiShare2 } from "react-icons/fi"
import { ClientTemplateProps } from "../../types"
import PhoneFrame from "@/app/[locale]/preview/PhoneFrame"



export default function BlogPostTemplate({ page }: ClientTemplateProps) {
  return (
    <PhoneFrame title={page.name ?? page.title ?? 'Blog Post'} subtitle="Blog post layout" slug={page.slug}>
      <div className="w-full h-full overflow-y-auto bg-white">

        {/* Featured image */}
        <div className="aspect-video bg-gradient-to-br from-[var(--color-primary)]/60 to-[var(--color-primary)]" />

        <div className="px-6 py-6">
          {/* Meta */}
          <div className="flex items-center gap-3 text-[10px] text-gray-400 mb-3">
            <div className="flex items-center gap-1"><FiUser size={10} /> By Alex Jones</div>
            <div className="flex items-center gap-1"><FiClock size={10} /> 5 min read</div>
          </div>

          {/* Title */}
          <p className="text-2xl font-bold text-gray-900 leading-tight">
            {page.seo_title ?? page.name ?? 'A Compelling Article Title'}
          </p>

          {/* Body */}
          <div className="mt-4 space-y-3 text-sm text-gray-600 leading-relaxed">
            <p>
              {page.seo_description ?? 'This is where your article content will appear. Use this template for blog posts, news articles, and long-form content.'}
            </p>
            <p>
              Each paragraph is rendered with comfortable line spacing for easy reading.
              You can include images, quotes, and code blocks via the page builder in the hosted version.
            </p>
            <div className="border-l-4 border-[var(--color-primary)] pl-3 py-1 italic text-gray-700">
              "Pull quotes draw attention to key points and break up the text."
            </div>
            <p>
              Continue with more content. Sub-headings, lists, and formatting are all supported
              when the full editor lands in the Studio version.
            </p>
          </div>

          {/* Engagement */}
          <div className="flex items-center gap-4 mt-6 pt-4 border-t border-gray-100">
            <button className="flex items-center gap-1.5 text-gray-400">
              <FiHeart size={14} /> <span className="text-xs">128</span>
            </button>
            <button className="flex items-center gap-1.5 text-gray-400">
              <FiMessageCircle size={14} /> <span className="text-xs">24</span>
            </button>
            <button className="flex items-center gap-1.5 text-gray-400 ml-auto">
              <FiShare2 size={14} /> <span className="text-xs">Share</span>
            </button>
          </div>
        </div>
      </div>
    </PhoneFrame>
  )
}