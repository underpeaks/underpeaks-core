'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Loader2 } from 'lucide-react'
import { useInstallerStore } from '../../store/useInstallerStore'

export default function DemoPage() {
  const router = useRouter()
  const setInstallerValue = useInstallerStore((s) => s.setInstallerValue)

  const [installDemo, setInstallDemo] = useState(false)
  const [loading, setLoading] = useState(false)
  const [selectedProject, setSelectedProject] = useState<string>('blank')

  const projectOptions = [
    { value: "ecommerce", label: "🛒 E-commerce" },
    { value: "marketplace", label: "🏬 Marketplace" },
    { value: "listing", label: "📋 Listing Platform" },
    { value: "blog", label: "✍️ Blog / Content Site" },
    { value: "social", label: "🌐 Social Network" },
    { value: "saas", label: "💻 SaaS / Web App" },
    { value: "blank", label: "⚙️ Blank Project" }
  ]

  const projectDescriptions: Record<string, string> = {
    ecommerce: "Includes products, categories, orders, customers, and storefront pages.",
    marketplace: "Supports multiple vendors, listings, commissions, and vendor dashboards.",
    listing: "For property, job, or service listings with categories, search, and filters.",
    blog: "Content-driven site with posts, categories, tags, authors, and comments.",
    social: "User profiles, posts, comments, likes, followers, messages, and notifications.",
    saas: "Web app structure with users, roles, permissions, and subscription plans.",
    blank: "No demo content; start with an empty project skeleton."
  }

  const handleNext = () => {
    setLoading(true)
    setInstallerValue('demoContentEnabled', installDemo)
    setInstallerValue('selectedProjectType', selectedProject)

    setTimeout(() => {
      router.push('/installer/finalise')
    }, 1000)
  }

  const showDemoCard = selectedProject !== 'blank'

  return (
    <div className="max-w-2xl mx-auto px-4 py-10 space-y-6">

      <header className="mb-8 text-center flex flex-col items-center">
        <img
          src="/images/logo/NXT_Flutter_logo.png"
          alt="NXT_Flutter Logo"
          className="h-16 w-auto mb-4"
        />
        <p className="text-xl text-gray-700">
          Your All-in-One SaaS Installer & Code Generator
        </p>
      </header>

      {/* ================= PROJECT TYPE ================= */}
      <Card>
        <CardHeader>
          <CardTitle>Select Project Type</CardTitle>
          <CardDescription>
            Choose a template to automatically install default models for your project.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-1">

          {projectOptions.map((option) => {
            const isActive = selectedProject === option.value

            return (
              <div
                key={option.value}
                onClick={() => setSelectedProject(option.value)}
                className={`
                  flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition
                  ${isActive
                    ? 'border-black bg-gray-50'
                    : 'border-gray-200 hover:border-gray-400'
                  }
                `}
              >
                <input
                  type="radio"
                  name="projectType"
                  checked={isActive}
                  readOnly
                  className="mt-1 h-4 w-4 accent-black bg-white border-gray-400"
                />

                <div className="flex flex-col">
                  <span className="text-base font-medium">
                    {option.label}
                  </span>
                  <span className="text-sm text-gray-500 mt-1">
                    {projectDescriptions[option.value]}
                  </span>
                </div>
              </div>
            )
          })}

        </CardContent>
      </Card>

      {/* ================= DEMO CARD ================= */}
      {showDemoCard && (
        <Card>
          <CardHeader>
            <CardTitle>Setup Demo Content</CardTitle>
            <CardDescription>
              Preview your store with sample data already loaded.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-6">
            <div className="flex items-start gap-3">
              <Checkbox
                id="demoData"
                checked={installDemo}
                onCheckedChange={(checked) => setInstallDemo(!!checked)}
              />
              <Label htmlFor="demoData" className="font-medium">
                Include demo content for the selected project
              </Label>
            </div>

            {installDemo && selectedProject === 'ecommerce' && (
              <ul className="text-sm text-gray-600 list-disc pl-6 space-y-1">
                <li>Demo products with categories and tags</li>
                <li>Example customers and orders</li>
                <li>Storefront pages (home, products, cart, checkout)</li>
                <li>Basic CMS content</li>
                <li>Pre-configured menus and modules</li>
              </ul>
            )}
          </CardContent>
        </Card>
      )}

      {/* ================= CONTINUE ================= */}
      <div className="flex justify-end pt-2">
        <Button onClick={handleNext} disabled={loading} className="w-full">
          {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
          {loading ? 'Continuing...' : 'Continue'}
        </Button>
      </div>

    </div>
  )
}