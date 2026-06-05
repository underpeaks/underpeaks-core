'use client'

import { FiTrash2, FiPlus, FiMinus, FiShoppingBag } from 'react-icons/fi'
import { ClientTemplateProps } from '../../types'
import PhoneFrame from '@/app/[locale]/preview/PhoneFrame'


const sampleItems = [
  { name: 'Classic Tee',     price: 29.99,  qty: 2 },
  { name: 'Premium Hoodie',  price: 79.99,  qty: 1 },
  { name: 'Canvas Cap',      price: 19.99,  qty: 1 },
]

export default function CartTemplate({ page }: ClientTemplateProps) {
  const subtotal = sampleItems.reduce((acc, i) => acc + i.price * i.qty, 0)
  const tax      = subtotal * 0.15
  const total    = subtotal + tax

  return (
    <PhoneFrame title={page.name ?? page.title ?? 'Cart'} subtitle="Shopping cart" slug={page.slug}>
      <div className="w-full h-full flex flex-col bg-gray-50">

        <div className="bg-white px-5 py-4 border-b border-gray-100">
          <p className="text-base font-bold text-gray-900">Your cart</p>
          <p className="text-xs text-gray-500">{sampleItems.length} items</p>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
          {sampleItems.map((item) => (
            <div key={item.name} className="flex items-center gap-3 bg-white rounded-xl p-3">
              <div className="w-14 h-14 rounded-lg bg-gradient-to-br from-gray-100 to-gray-200" />
              <div className="flex-1">
                <p className="text-xs font-semibold text-gray-800">{item.name}</p>
                <p className="text-xs text-[var(--color-primary)] font-bold">R {item.price.toFixed(2)}</p>
                <div className="flex items-center gap-2 mt-1">
                  <button className="w-5 h-5 rounded bg-gray-100 flex items-center justify-center">
                    <FiMinus size={10} />
                  </button>
                  <span className="text-xs font-medium">{item.qty}</span>
                  <button className="w-5 h-5 rounded bg-gray-100 flex items-center justify-center">
                    <FiPlus size={10} />
                  </button>
                </div>
              </div>
              <button className="p-1.5 rounded text-gray-300 hover:text-red-500">
                <FiTrash2 size={14} />
              </button>
            </div>
          ))}
        </div>

        <div className="bg-white border-t border-gray-100 px-5 py-4 space-y-3">
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs">
              <span className="text-gray-500">Subtotal</span>
              <span className="text-gray-900 font-medium">R {subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-gray-500">Tax (15%)</span>
              <span className="text-gray-900 font-medium">R {tax.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm font-bold pt-2 border-t border-gray-100">
              <span className="text-gray-900">Total</span>
              <span className="text-[var(--color-primary)]">R {total.toFixed(2)}</span>
            </div>
          </div>

          <button className="w-full py-3 bg-[var(--color-primary)] text-white rounded-xl text-sm font-bold
                             flex items-center justify-center gap-2">
            <FiShoppingBag size={14} /> Checkout
          </button>
        </div>
      </div>
    </PhoneFrame>
  )
}