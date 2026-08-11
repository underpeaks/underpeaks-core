// 'use client'

// import { FiCode, FiClock } from 'react-icons/fi'
// import type { ClientTemplateProps } from '../../types'
// import PhoneFrame from '@/app/[locale]/preview/PhoneFrame'

// export default function CustomTemplate({ page }: ClientTemplateProps) {
//   return (
//     <PhoneFrame title={page.name ?? page.title ?? 'Custom'} subtitle="Custom page" slug={page.slug}>
//       <div className="w-full h-full flex flex-col items-center justify-center gap-4 px-8 text-center
//                       bg-gradient-to-br from-gray-50 to-white">

//         <div className="w-16 h-16 rounded-2xl bg-[var(--color-primary)]/10 flex items-center justify-center">
//           <FiCode size={28} className="text-[var(--color-primary)]" />
//         </div>

//         <div>
//           <p className="text-lg font-bold text-gray-900">Custom Page</p>
//           <p className="text-xs text-gray-500 mt-2 leading-relaxed">
//             {page.seo_description ?? 'This is a blank custom template. The full page builder is part of the hosted plan and will let you drag and drop any layout you can imagine.'}
//           </p>
//         </div>

//         <div className="flex items-center gap-1.5 mt-4 px-3 py-1.5 bg-amber-50 border border-amber-200 rounded-full text-xs text-amber-700">
//           <FiClock size={11} /> Page Builder coming in hosted plan
//         </div>

//         <div className="grid grid-cols-2 gap-2 mt-4 w-full max-w-xs text-[10px]">
//           <div className="p-3 bg-white border border-gray-200 rounded-lg">
//             <p className="text-gray-400">Slug</p>
//             <p className="font-mono text-gray-700 mt-0.5 truncate">{page.slug}</p>
//           </div>
//           <div className="p-3 bg-white border border-gray-200 rounded-lg">
//             <p className="text-gray-400">Type</p>
//             <p className="text-gray-700 mt-0.5 capitalize">{page.page_type ?? 'admin'}</p>
//           </div>
//         </div>
//       </div>
//     </PhoneFrame>
//   )
// }