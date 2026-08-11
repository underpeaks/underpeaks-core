// 'use client'

// import { FiLock, FiCheck, FiRefreshCcw } from 'react-icons/fi'
// import type { ClientTemplateProps } from '../../types'
// import PhoneFrame from '@/app/[locale]/preview/PhoneFrame'

// export default function ResetPasswordTemplate({ page }: ClientTemplateProps) {
//   return (
//     <PhoneFrame title={page.name ?? page.title ?? 'Reset Password'} subtitle="Reset password screen" slug={page.slug}>
//       <div className="w-full h-full flex flex-col bg-white px-8 pt-16 pb-8">

//         <div className="mb-8">
//           <div className="w-16 h-16 rounded-2xl bg-[var(--color-primary)]/10 flex items-center justify-center mb-4">
//             <FiRefreshCcw size={28} className="text-[var(--color-primary)]" />
//           </div>
//           <p className="text-2xl font-bold text-gray-900">Reset password</p>
//           <p className="text-sm text-gray-500 mt-2">Create a new password for your account.</p>
//         </div>

//         <div className="space-y-3 flex-1">
//           <div>
//             <label className="text-xs font-medium text-gray-600">New password</label>
//             <div className="relative mt-1">
//               <FiLock size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
//               <input type="password" placeholder="At least 8 characters"
//                      className="w-full pl-9 pr-3 py-3 text-sm border border-gray-200 rounded-xl bg-gray-50" disabled />
//             </div>
//           </div>

//           <div>
//             <label className="text-xs font-medium text-gray-600">Confirm password</label>
//             <div className="relative mt-1">
//               <FiLock size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
//               <input type="password" placeholder="Repeat new password"
//                      className="w-full pl-9 pr-3 py-3 text-sm border border-gray-200 rounded-xl bg-gray-50" disabled />
//             </div>
//           </div>

//           <div className="space-y-1.5 pt-2">
//             {['At least 8 characters', 'One uppercase letter', 'One number'].map((req) => (
//               <div key={req} className="flex items-center gap-2">
//                 <FiCheck size={11} className="text-emerald-500" />
//                 <span className="text-[10px] text-gray-500">{req}</span>
//               </div>
//             ))}
//           </div>
//         </div>

//         <button className="w-full py-3 bg-[var(--color-primary)] text-white rounded-xl text-sm font-bold">
//           Reset password
//         </button>
//       </div>
//     </PhoneFrame>
//   )
// }