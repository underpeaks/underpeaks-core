// 'use client'

// import { FiSettings, FiEdit2, FiMapPin, FiCalendar, FiMail } from 'react-icons/fi'
// import type { ClientTemplateProps } from '../../types'
// import PhoneFrame from '@/app/[locale]/preview/PhoneFrame'

// export default function ProfileTemplate({ page }: ClientTemplateProps) {
//   return (
//     <PhoneFrame title={page.name ?? page.title ?? 'Profile'} subtitle="User profile page" slug={page.slug}>
//       <div className="w-full h-full overflow-y-auto bg-gray-50">

//         {/* Cover */}
//         <div className="h-32 bg-gradient-to-br from-[var(--color-primary)] to-[var(--color-primary)]/60 relative">
//           <button className="absolute top-12 right-4 p-2 bg-white/20 backdrop-blur rounded-full">
//             <FiSettings size={14} className="text-white" />
//           </button>
//         </div>

//         {/* Profile content */}
//         <div className="px-6 -mt-12">
//           <div className="flex items-end justify-between mb-3">
//             <div className="w-20 h-20 rounded-2xl bg-white p-1 shadow">
//               <div className="w-full h-full rounded-xl bg-gradient-to-br from-amber-300 to-orange-500
//                               flex items-center justify-center text-white text-xl font-bold">
//                 AJ
//               </div>
//             </div>
//             <button className="mt-12 px-3 py-1.5 bg-white border border-gray-200 rounded-lg
//                                text-xs font-medium flex items-center gap-1">
//               <FiEdit2 size={11} /> Edit
//             </button>
//           </div>

//           <p className="text-lg font-bold text-gray-900">Alex Jones</p>
//           <p className="text-xs text-gray-500">@alexjones</p>

//           <p className="text-xs text-gray-600 mt-2 leading-relaxed">
//             Designer, builder, occasional surfer. Currently working on something exciting.
//           </p>

//           <div className="flex flex-wrap gap-3 mt-3 text-[10px] text-gray-400">
//             <div className="flex items-center gap-1"><FiMapPin size={10} /> Cape Town, ZA</div>
//             <div className="flex items-center gap-1"><FiCalendar size={10} /> Joined Mar 2024</div>
//             <div className="flex items-center gap-1"><FiMail size={10} /> alex@example.com</div>
//           </div>

//           {/* Stats */}
//           <div className="grid grid-cols-3 gap-2 mt-4 bg-white rounded-xl p-3">
//             <div className="text-center"><p className="text-base font-bold text-gray-900">142</p><p className="text-[10px] text-gray-400">Posts</p></div>
//             <div className="text-center"><p className="text-base font-bold text-gray-900">3.2k</p><p className="text-[10px] text-gray-400">Followers</p></div>
//             <div className="text-center"><p className="text-base font-bold text-gray-900">820</p><p className="text-[10px] text-gray-400">Following</p></div>
//           </div>

//           {/* Tabs */}
//           <div className="flex gap-1 mt-4 border-b border-gray-200">
//             {['Posts', 'Saved', 'About'].map((tab, i) => (
//               <button
//                 key={tab}
//                 className={`flex-1 pb-2 text-xs font-medium ${
//                   i === 0 ? 'text-[var(--color-primary)] border-b-2 border-[var(--color-primary)]' : 'text-gray-400'
//                 }`}
//               >
//                 {tab}
//               </button>
//             ))}
//           </div>

//           {/* Sample post */}
//           <div className="mt-3 mb-6 bg-white p-3 rounded-xl">
//             <p className="text-xs font-semibold text-gray-800">Sample post</p>
//             <p className="text-[10px] text-gray-500 mt-1">Posted 2 hours ago · 42 likes</p>
//           </div>
//         </div>
//       </div>
//     </PhoneFrame>
//   )
// }