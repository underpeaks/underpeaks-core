'use client'

import { useRouter } from 'next/navigation'
import { useInstallerStore } from '../../store/useInstallerStore'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default function DonePage() {
  const router = useRouter()

  const {
  projectName,
  selectedStack,
  selectedDb,
  dbConfig,
  adminUser,
  ecommerceEnabled,
  demoContentEnabled,
  models,
  
} = useInstallerStore()


  const selectedModels = models ?? ['EMPTY'];

  const maskedPassword = adminUser.password
    ? `${adminUser.password[0]}${'*'.repeat(adminUser.password.length - 2)}${adminUser.password.slice(-1)}`
    : '********'

  const formatStack = (stack: string) => {
    switch (stack) {
      case 'both':
        return 'Next.js + Flutter'
      case 'next':
        return 'Next.js'
      case 'flutter':
        return 'Flutter'
      default:
        return stack
    }
  }




  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-white px-6 py-12">
      {/* Logo */}
      <header className="mb-8 text-center">
        <h1 className="text-3xl font-extrabold text-black tracking-tight">🚀 NextFlutter</h1>
        <p className="text-sm text-gray-500">Build once. Run anywhere.</p>
      </header>

      <Card className="w-full max-w-xl">
        <CardHeader>
          <CardTitle className="text-center text-2xl">🎉 Installation Complete!</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6 text-gray-800">
          {/* Project Info */}
          <section>
            <h3 className="font-semibold text-lg">Project Info</h3>
            <p className="text-sm text-gray-500 mb-2">Basic information about your project setup.</p>
            <p><strong>Name:</strong> {projectName || '—'}</p>
            <p><strong>Stack:</strong> {formatStack(selectedStack)}</p>
          </section>

          <hr className="border-gray-300" />

          {/* Database Info */}
          <section>
            <h3 className="font-semibold text-lg">Database</h3>
            <p className="text-sm text-gray-500 mb-2">Your selected database and config.</p>
            <p><strong>Type:</strong> {selectedDb || 'None selected'}</p>
            {dbConfig && Object.keys(dbConfig).length > 0 && (
              <div className="ml-4 space-y-1">
                {Object.entries(dbConfig).map(([key, value]) => (
                  <p key={key}><strong>{key}:</strong> {value}</p>
                ))}
              </div>
            )}
          </section>

          <hr className="border-gray-300" />

          {/* Models */}
          <section>
            <h3 className="font-semibold text-lg">Models</h3>
            <p className="text-sm text-gray-500 mb-2">These modules will be generated:</p>
            <p>{selectedModels.length ? selectedModels.join(", ") : "No models selected"}</p>
          </section>

          <hr className="border-gray-300" />

          {/* Admin User */}
          <section>
            <h3 className="font-semibold text-lg">Admin User</h3>
            <p className="text-sm text-gray-500 mb-2">Your initial admin credentials.</p>
            <p><strong>Name:</strong> {adminUser.fullName}</p>
            <p><strong>Email:</strong> {adminUser.email}</p>
            <p><strong>Password:</strong> {maskedPassword}</p>
          </section>

          <hr className="border-gray-300" />

          {/* E-commerce Modules */}
          <section>
            <h3 className="font-semibold text-lg">E-commerce Modules</h3>
            <p className="text-sm text-gray-500 mb-2">E-commerce feature set selection.</p>
            <p>{ecommerceEnabled ? 'Enabled' : 'Disabled'}</p>
          </section>

          <hr className="border-gray-300" />

          {/* Demo Content */}
          <section>
            <h3 className="font-semibold text-lg">Demo Content</h3>
            <p className="text-sm text-gray-500 mb-2">Whether to preload sample store data.</p>
            <p>{demoContentEnabled ? 'Installed' : 'Not Installed'}</p>
          </section>
        </CardContent>
      </Card>

      <div className="w-full max-w-xl mt-8">
        <Button className="w-full" onClick={() => router.push('/signin')}>
          Continue to → Sign In
        </Button>
      </div>
    </div>
  )
}
