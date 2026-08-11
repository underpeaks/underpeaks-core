// 'use client'

// /**
//  * PhoneFrame.tsx
//  *
//  * Shared phone-frame wrapper for preview-only templates.
//  * Renders a realistic mobile device frame with the project theme
//  * applied via CSS variables.
//  *
//  * Used by Splash, Home, Onboarding, Sign In, Sign Up, etc.
//  */

// import { FiEye, FiSmartphone, FiMonitor } from 'react-icons/fi'
// import { useState }                       from 'react'

// interface PhoneFrameProps {
//   title:     string
//   subtitle?: string
//   slug:      string
//   children:  React.ReactNode
// }

// export default function PhoneFrame({ title, subtitle, slug, children }: PhoneFrameProps) {
//   const [view, setView] = useState<'mobile' | 'web'>('mobile')

//   return (
//     <div className="flex flex-col gap-6 p-6 max-w-[1400px] mx-auto">

//       {/* Header */}
//       <div className="flex items-center justify-between flex-wrap gap-3">
//         <div>
//           <h1 className="text-xl font-bold text-[var(--color-text)]">{title}</h1>
//           {subtitle && (
//             <p className="text-sm text-[var(--color-text-muted)]">{subtitle}</p>
//           )}
//         </div>

//         <div className="flex items-center gap-2">
//           {/* Viewport toggle */}
//           <div className="flex rounded-lg border border-gray-200 overflow-hidden">
//             <button
//               onClick={() => setView('mobile')}
//               className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium transition ${
//                 view === 'mobile'
//                   ? 'bg-gray-900 text-white'
//                   : 'text-gray-500 hover:bg-gray-50'
//               }`}
//             >
//               <FiSmartphone size={12} /> Mobile
//             </button>
//             <button
//               onClick={() => setView('web')}
//               className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium transition ${
//                 view === 'web'
//                   ? 'bg-gray-900 text-white'
//                   : 'text-gray-500 hover:bg-gray-50'
//               }`}
//             >
//               <FiMonitor size={12} /> Web
//             </button>
//           </div>

//           {/* Preview button */}
//           <a
//             href={`/preview/${view === 'mobile' ? 'mobile/' : ''}${slug.replace(/^\//, '')}`}
//             target="_blank"
//             rel="noopener noreferrer"
//             className="flex items-center gap-1.5 px-3 py-2 text-sm rounded-lg
//                        bg-[var(--color-primary)] text-white hover:opacity-90 transition"
//           >
//             <FiEye size={14} />
//             Open preview
//           </a>
//         </div>
//       </div>

//       {/* Preview container */}
//       <div className="flex justify-center items-center min-h-[600px] bg-gray-50
//                       rounded-2xl border border-gray-200 p-8">

//         {view === 'mobile' ? (
//           // Phone frame — 390x844 (iPhone 14 Pro)
//           <div className="relative w-[390px] h-[780px] bg-black rounded-[48px] p-3 shadow-2xl">
//             <div className="absolute top-3 left-1/2 -translate-x-1/2 w-32 h-7
//                             bg-black rounded-full z-10" />
//             <div className="w-full h-full bg-white rounded-[36px] overflow-hidden relative">
//               {children}
//             </div>
//           </div>
//         ) : (
//           // Browser frame — desktop preview
//           <div className="w-full max-w-5xl bg-white rounded-xl border border-gray-200 shadow-xl overflow-hidden">
//             <div className="flex items-center gap-2 px-4 py-3 bg-gray-50 border-b border-gray-200">
//               <div className="flex gap-1.5">
//                 <span className="w-3 h-3 rounded-full bg-red-400" />
//                 <span className="w-3 h-3 rounded-full bg-amber-400" />
//                 <span className="w-3 h-3 rounded-full bg-emerald-400" />
//               </div>
//               <div className="flex-1 ml-4 px-3 py-1 bg-white rounded text-xs text-gray-400 font-mono">
//                 {slug}
//               </div>
//             </div>
//             <div className="aspect-video bg-white">
//               {children}
//             </div>
//           </div>
//         )}
//       </div>

//       {/* Note */}
//       <div className="px-4 py-3 bg-amber-50 border border-amber-200 rounded-lg
//                       text-xs text-amber-700">
//         This is a preview of how this screen will look in your generated Flutter or
//         Next.js app. The page builder is part of the hosted plan — for now, the layout
//         and theme are fixed per template type.
//       </div>
//     </div>
//   )
// }