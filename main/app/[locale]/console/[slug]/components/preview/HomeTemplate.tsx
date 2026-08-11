// 'use client'

// import { FiSearch, FiBell, FiUser, FiHome, FiHeart, FiShoppingBag, FiSettings } from 'react-icons/fi'
// import type { ClientTemplateProps } from '../../types'
// import PhoneFrame from '@/app/[locale]/preview/PhoneFrame'

// export default function HomeTemplate({ page }: ClientTemplateProps) {
//   return (
//     <PhoneFrame title={page.name ?? page.title ?? 'Home'} subtitle="Home screen" slug={page.slug}>
//       <div className="w-full h-full flex flex-col bg-gray-50">

//         {/* Status bar spacer */}
//         <div className="h-12 bg-white" />

//         {/* Top bar */}
//         <div className="px-5 py-4 flex items-center justify-between bg-white">
//           <div>
//             <p className="text-xs text-gray-400">Welcome back</p>
//             <p className="text-base font-bold text-gray-900">Alex</p>
//           </div>
//           <button className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">
//             <FiBell size={16} className="text-gray-600" />
//           </button>
//         </div>

//         {/* Search */}
//         <div className="px-5 py-3 bg-white">
//           <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-gray-100">
//             <FiSearch size={14} className="text-gray-400" />
//             <span className="text-xs text-gray-400">Search anything…</span>
//           </div>
//         </div>

//         {/* Hero banner */}
//         <div className="px-5 py-3">
//           <div className="rounded-2xl p-5 bg-gradient-to-br from-[var(--color-primary)] to-[var(--color-primary)]/70 text-white">
//             <p className="text-xs font-medium opacity-80">Featured</p>
//             <p className="text-lg font-bold mt-1">Discover what's new</p>
//             <button className="mt-3 px-3 py-1.5 bg-white text-[var(--color-primary)] text-xs font-bold rounded-lg">
//               Explore
//             </button>
//           </div>
//         </div>

//         {/* Quick links */}
//         <div className="px-5 py-3">
//           <p className="text-xs font-bold text-gray-700 mb-2">Quick links</p>
//           <div className="grid grid-cols-4 gap-2">
//             {['Browse', 'Saved', 'Cart', 'Profile'].map((label, i) => (
//               <div key={label} className="flex flex-col items-center gap-1 p-2 rounded-xl bg-white">
//                 <div className="w-9 h-9 rounded-xl bg-[var(--color-primary)]/10 flex items-center justify-center">
//                   <span className="text-[var(--color-primary)] text-xs font-bold">{label[0]}</span>
//                 </div>
//                 <span className="text-[10px] text-gray-600">{label}</span>
//               </div>
//             ))}
//           </div>
//         </div>

//         {/* Recent section */}
//         <div className="px-5 py-3 flex-1">
//           <p className="text-xs font-bold text-gray-700 mb-2">Recent</p>
//           <div className="space-y-2">
//             {[1, 2, 3].map((i) => (
//               <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-white">
//                 <div className="w-10 h-10 rounded-lg bg-gray-200" />
//                 <div className="flex-1">
//                   <p className="text-xs font-semibold text-gray-800">Item {i}</p>
//                   <p className="text-[10px] text-gray-400">Description here</p>
//                 </div>
//               </div>
//             ))}
//           </div>
//         </div>

//         {/* Bottom nav */}
//         <div className="px-3 py-2 bg-white border-t border-gray-100 flex justify-around">
//           {[
//             { Icon: FiHome,        label: 'Home',     active: true  },
//             { Icon: FiHeart,       label: 'Saved',    active: false },
//             { Icon: FiShoppingBag, label: 'Cart',     active: false },
//             { Icon: FiUser,        label: 'Profile',  active: false },
//             { Icon: FiSettings,    label: 'Settings', active: false },
//           ].map(({ Icon, label, active }) => (
//             <div key={label} className="flex flex-col items-center gap-0.5">
//               <Icon size={18} className={active ? 'text-[var(--color-primary)]' : 'text-gray-400'} />
//               <span className={`text-[9px] ${active ? 'text-[var(--color-primary)] font-bold' : 'text-gray-400'}`}>
//                 {label}
//               </span>
//             </div>
//           ))}
//         </div>
//       </div>
//     </PhoneFrame>
//   )
// }