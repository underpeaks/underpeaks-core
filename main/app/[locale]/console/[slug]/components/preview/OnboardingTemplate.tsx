// 'use client'

// import { useState } from 'react'
// import { FiChevronRight, FiZap, FiTarget, FiHeart } from 'react-icons/fi'
// import type { ClientTemplateProps } from '../../types'
// import PhoneFrame from '@/app/[locale]/preview/PhoneFrame'

// const slides = [
//   { icon: FiZap,    title: 'Fast & Powerful', body: 'Get things done faster than ever before' },
//   { icon: FiTarget, title: 'Stay Focused',     body: 'Built-in tools to help you reach your goals' },
//   { icon: FiHeart,  title: 'Made for You',     body: 'Personalized experience that adapts to you' },
// ]

// export default function OnboardingTemplate({ page }: ClientTemplateProps) {
//   const [step, setStep] = useState(0)
//   const slide = slides[step]
//   const Icon  = slide.icon

//   return (
//     <PhoneFrame title={page.name ?? page.title ?? 'Onboarding'} subtitle="Onboarding flow" slug={page.slug}>
//       <div className="w-full h-full flex flex-col bg-white">

//         {/* Skip button */}
//         <div className="flex justify-end px-5 pt-12">
//           <button className="text-xs text-gray-400">Skip</button>
//         </div>

//         {/* Content */}
//         <div className="flex-1 flex flex-col items-center justify-center px-8 text-center gap-6">
//           <div className="w-32 h-32 rounded-full bg-[var(--color-primary)]/10 flex items-center justify-center">
//             <Icon size={56} className="text-[var(--color-primary)]" />
//           </div>
//           <div>
//             <p className="text-2xl font-bold text-gray-900">{slide.title}</p>
//             <p className="text-sm text-gray-500 mt-2">{slide.body}</p>
//           </div>
//         </div>

//         {/* Indicators */}
//         <div className="flex justify-center gap-1.5 py-4">
//           {slides.map((_, i) => (
//             <button
//               key={i}
//               onClick={() => setStep(i)}
//               className={`h-1.5 rounded-full transition-all ${
//                 i === step ? 'w-6 bg-[var(--color-primary)]' : 'w-1.5 bg-gray-200'
//               }`}
//             />
//           ))}
//         </div>

//         {/* Next button */}
//         <div className="px-8 pb-12">
//           <button
//             onClick={() => setStep((s) => (s + 1) % slides.length)}
//             className="w-full py-3 bg-[var(--color-primary)] text-white rounded-xl
//                        text-sm font-bold flex items-center justify-center gap-2"
//           >
//             {step === slides.length - 1 ? 'Get started' : 'Next'}
//             <FiChevronRight size={14} />
//           </button>
//         </div>
//       </div>
//     </PhoneFrame>
//   )
// }