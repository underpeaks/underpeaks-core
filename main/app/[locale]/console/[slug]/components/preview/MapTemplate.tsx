'use client'

import { FiMapPin, FiNavigation, FiSearch, FiLayers } from 'react-icons/fi'
import type { ClientTemplateProps } from '../../types'
import PhoneFrame from '@/app/[locale]/preview/PhoneFrame'

export default function MapTemplate({ page }: ClientTemplateProps) {
  return (
    <PhoneFrame title={page.name ?? page.title ?? 'Map'} subtitle="Map view" slug={page.slug}>
      <div className="w-full h-full relative bg-gradient-to-br from-emerald-50 via-blue-50 to-amber-50">

        {/* Fake map grid */}
        <div className="absolute inset-0 opacity-20"
             style={{
               backgroundImage: 'linear-gradient(rgba(0,0,0,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(0,0,0,0.1) 1px, transparent 1px)',
               backgroundSize: '24px 24px',
             }} />

        {/* Map markers */}
        <div className="absolute top-[30%] left-[40%]">
          <div className="relative">
            <div className="w-8 h-8 rounded-full bg-[var(--color-primary)] flex items-center justify-center shadow-lg">
              <FiMapPin size={14} className="text-white" />
            </div>
            <div className="absolute top-full left-1/2 -translate-x-1/2 mt-1 px-2 py-1 bg-white rounded-lg shadow text-[9px] whitespace-nowrap">
              Coffee Shop
            </div>
          </div>
        </div>

        <div className="absolute top-[50%] left-[60%]">
          <div className="w-6 h-6 rounded-full bg-red-500 flex items-center justify-center shadow">
            <FiMapPin size={11} className="text-white" />
          </div>
        </div>

        <div className="absolute top-[20%] left-[70%]">
          <div className="w-6 h-6 rounded-full bg-amber-500 flex items-center justify-center shadow">
            <FiMapPin size={11} className="text-white" />
          </div>
        </div>

        <div className="absolute top-[65%] left-[25%]">
          <div className="w-6 h-6 rounded-full bg-emerald-500 flex items-center justify-center shadow">
            <FiMapPin size={11} className="text-white" />
          </div>
        </div>

        {/* Search bar */}
        <div className="absolute top-12 left-4 right-4">
          <div className="flex items-center gap-2 bg-white rounded-xl shadow-lg px-3 py-2">
            <FiSearch size={14} className="text-gray-400" />
            <span className="text-xs text-gray-400 flex-1">Search location…</span>
          </div>
        </div>

        {/* Controls */}
        <div className="absolute right-4 top-28 flex flex-col gap-2">
          <button className="w-9 h-9 bg-white rounded-lg shadow flex items-center justify-center">
            <FiNavigation size={14} className="text-[var(--color-primary)]" />
          </button>
          <button className="w-9 h-9 bg-white rounded-lg shadow flex items-center justify-center">
            <FiLayers size={14} className="text-gray-500" />
          </button>
        </div>

        {/* Bottom sheet */}
        <div className="absolute bottom-0 left-0 right-0 bg-white rounded-t-2xl shadow-xl p-5">
          <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-3" />
          <div className="flex items-start gap-3">
            <div className="w-12 h-12 rounded-xl bg-[var(--color-primary)]/10 flex items-center justify-center shrink-0">
              <FiMapPin size={16} className="text-[var(--color-primary)]" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-bold text-gray-900">Coffee Shop</p>
              <p className="text-[10px] text-gray-500">123 Main Street · 0.5 km away</p>
              <button className="mt-2 px-3 py-1.5 bg-[var(--color-primary)] text-white text-xs font-bold rounded-lg">
                Directions
              </button>
            </div>
          </div>
        </div>
      </div>
    </PhoneFrame>
  )
}