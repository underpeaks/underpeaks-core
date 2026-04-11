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

  // Descriptions for each project type
  const projectDescriptions: Record<string, string> = {
    ecommerce: "Includes products, categories, orders, customers, and storefront pages.",
    marketplace: "Supports multiple vendors, listings, commissions, and vendor dashboards.",
    listing: "For property, job, or service listings with categories, search, and filters.",
    blog: "Content-driven site with posts, categories, tags, authors, and comments.",
    social: "User profiles, posts, comments, likes, followers, messages, and notifications.",
    saas: "Web app structure with users, roles, permissions, and subscription plans.",
    blank: "No demo content; start with an empty project skeleton."
  }

  const handleCheckedChange = (checked: boolean) => {
    setInstallDemo(checked)
  }

  const handleNext = () => {
    setLoading(true)
    setInstallerValue('demoContentEnabled', installDemo)
    setInstallerValue('selectedProjectType', selectedProject)

    setTimeout(() => {
      router.push('/installer/finalise')
    }, 1000)
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-10 space-y-6">
      <header className="mb-8 text-center">
        <h1 className="text-3xl font-extrabold text-black tracking-tight">🚀 NXT_Flutter</h1>
        <p className="text-sm text-gray-500">Build once. Run anywhere.</p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Select Project Type</CardTitle>
          <CardDescription>
            Choose a template to automatically install default models for your project.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col space-y-3">
            {projectOptions.map((option) => (
              <label key={option.value} className="flex items-start gap-3">
                <input
                  type="radio"
                  name="projectType"
                  value={option.value}
                  checked={selectedProject === option.value}
                  onChange={() => setSelectedProject(option.value)}
                  className="h-4 w-4 mt-1"
                />
                <div className="flex flex-col">
                  <span className="text-sm font-medium">{option.label}</span>
                  <span className="text-gray-500 text-xs">{projectDescriptions[option.value]}</span>
                </div>
              </label>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Setup Demo Content</CardTitle>
          <CardDescription>
            Preview your store with sample data already loaded.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <div className="flex items-start gap-3">
              <Checkbox
                id="demoData"
                checked={installDemo}
                onCheckedChange={handleCheckedChange}
              />
              <Label htmlFor="demoData" className="font-medium">
                Include demo content for the selected project:
              </Label>
            </div>

            {installDemo && selectedProject === 'ecommerce' && (
              <ul className="text-muted-foreground text-sm list-disc list-inside pl-6 space-y-1">
                <li>Demo products with categories and tags</li>
                <li>Example customers and orders</li>
                <li>Storefront pages (home, products, cart, checkout)</li>
                <li>Basic CMS content (about us, contact, policies)</li>
                <li>Pre-configured menus and modules</li>
              </ul>
            )}
          </div>

          <div className="flex justify-end pt-2">
            <Button onClick={handleNext} disabled={loading} className="w-full">
              {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {loading ? 'Continuing...' : 'Next'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}