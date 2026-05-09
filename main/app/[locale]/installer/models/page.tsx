'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Loader2 } from 'lucide-react'
import { useInstallerStore } from '../../../store/useInstallerStore'
import LocaleSwitcher from '@/core/LocaleSwitcher'

type Model = {
  key: string
  label: string
  description: string
  required?: boolean
}

const DEFAULT_MODELS: Model[] = [
  { key: 'users', label: 'Users', description: 'Manage application users and authentication', required: true },
  { key: 'products', label: 'Products', description: 'Catalog of products or services' },
  { key: 'orders', label: 'Orders', description: 'Track customer orders and purchases' },
  { key: 'coupons', label: 'Coupons', description: 'Discount coupons and promotions' },
  { key: 'categories', label: 'Categories', description: 'Organize products or content' },
  { key: 'reviews', label: 'Reviews', description: 'User feedback and ratings' },
]

export default function ModelsSelectionPage() {
  const router = useRouter()
  const setInstallerValue = useInstallerStore((state) => state.setInstallerValue)

  const requiredKeys = DEFAULT_MODELS.filter(m => m.required).map(m => m.key)
  const optionalKeys = DEFAULT_MODELS.filter(m => !m.required).map(m => m.key)

  const [selectedModels, setSelectedModels] = useState<string[]>([
    ...requiredKeys,
    ...optionalKeys
  ])

  const [loading, setLoading] = useState(false)

  function toggleModel(key: string) {
    if (requiredKeys.includes(key)) return
    setSelectedModels(prev =>
      prev.includes(key)
        ? prev.filter(k => k !== key)
        : [...prev, key]
    )
  }

  function toggleAll() {
    const allOptionalSelected = optionalKeys.every(k => selectedModels.includes(k))
    setSelectedModels(allOptionalSelected ? [...requiredKeys] : [...requiredKeys, ...optionalKeys])
  }

  function handleContinue() {
    setLoading(true)
    setInstallerValue('models', selectedModels)

    setTimeout(() => {
      router.push('/installer/ecommerce')
    }, 1000)
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-white px-6 py-12">
      {/* Locale switcher — top right */}
            <div className="fixed top-4 right-4 z-50">
              <LocaleSwitcher />
            </div>
     <header className="mb-8 text-center flex flex-col items-center">
  <img 
    src="/images/logo/NXT_Flutter_logo.png" 
    alt="NXT_Flutter Logo" 
    className="h-16 w-auto mb-4"
  />
  <p className="text-xl text-gray-700">Your All-in-One SaaS Installer & Code Generator</p>
</header>


      <div className="w-full max-w-md p-8 bg-gray-50 rounded-2xl shadow-xl border space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold text-gray-900">Select Default Models</h2>
          <button
            type="button"
            className="text-sm font-medium text-blue-600 hover:underline"
            onClick={toggleAll}
          >
            {optionalKeys.every(k => selectedModels.includes(k)) ? 'Deselect All' : 'Select All'}
          </button>
        </div>
        <p className="text-sm text-gray-600 mb-4">
          Choose the default data models you want to include in your project. You can create or edit models later.
        </p>

        <div className="space-y-4">
          {DEFAULT_MODELS.map(({ key, label, description, required }) => (
            <div key={key} className="flex items-start space-x-3">
              <Checkbox
                id={key}
                checked={selectedModels.includes(key)}
                onCheckedChange={() => toggleModel(key)}
                disabled={!!required}
                className={required ? 'cursor-not-allowed opacity-50' : ''}
              />
              <div>
                <label htmlFor={key} className={`font-semibold text-gray-900 cursor-pointer ${required ? 'cursor-not-allowed' : ''}`}>
                  {label} {required && <span className="text-xs text-gray-500">(required)</span>}
                </label>
                <p className="text-sm text-gray-600 max-w-md">{description}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="pt-6">
          <Button className="w-full" onClick={handleContinue} disabled={loading}>
            {loading && <Loader2 className="animate-spin mr-2 h-4 w-4" />}
            {loading ? 'Continuing...' : 'Continue'}
          </Button>
        </div>
      </div>
    </div>
  )
}
