'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { useRouter } from 'next/navigation';
import { CheckCircle2 } from 'lucide-react';
import { runInstallerSteps } from '../actions/installerRunner';

const INSTALL_STEPS = [
  'Creating Flutter project',
  'Creating Next.js project',
  'Creating database schema and tables',
  'Running database migrations',
  'Seeding initial data (admin user, roles, settings)',
  'Creating API endpoints',
  'Creating data models',
  'Installing e-commerce related tables',
  'Installing demo content',
  'Writing config.json file',
  'Writing .env.local file (if required)',
  'Setting up authentication system',
  'Configuring session management',
  'Setting up storage (e.g., Supabase storage buckets)',
  'Creating admin user',
  'Running tests to verify installation',
  'Finalizing installer and cleanup',
];

export default function FinalizePage() {
  const router = useRouter();
  const [installing, setInstalling] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);

   async function startInstall() {
    setInstalling(true);
    try {
      await runInstallerSteps((stepIndex) => {
        setProgress(stepIndex);
      });
      router.push('/installer/done');
    } catch (error: unknown) {
  if (error instanceof Error) {
    console.error(error.message)
  } else {
    console.error(String(error))
  }
}
  }

  return (
    <div className="max-w-xl mx-auto px-6 py-12 space-y-8">
      <header className="text-center">
        <h1 className="text-4xl font-extrabold tracking-tight">next_flutter</h1>
        <p className="text-muted-foreground text-sm mt-1">
          The full-stack starter for Flutter + Next.js
        </p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Finalize Setup</CardTitle>
        </CardHeader>

        <CardContent className="space-y-6">
          <div className="bg-gray-100 text-gray-900 p-4 rounded-md space-y-1 font-mono text-sm border border-gray-300">
            <p><strong>Project:</strong> MyApp</p>
            <p><strong>Stack:</strong> Next.js + Flutter</p>
            <p><strong>Database:</strong> Supabase</p>
          </div>

          <div className="bg-gray-50 border border-gray-300 rounded-md p-4 text-gray-700 text-sm">
            <h3 className="font-semibold mb-2">Installation Steps:</h3>
            <ul className="list-disc list-inside space-y-2">
              {INSTALL_STEPS.map((step, i) => {
                const done = i < currentStepIndex || progress === 100;
                const isCurrent = i === currentStepIndex && progress < 100;
                return (
                  <li
                    key={step}
                    className={`flex items-center space-x-2 ${
                      done ? 'text-gray-900 font-semibold' : 'text-gray-600'
                    }`}
                  >
                    {done ? (
                      <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0" />
                    ) : (
                      <span
                        className={`inline-block w-4 h-4 rounded-full border-2 flex-shrink-0 ${
                          isCurrent ? 'border-gray-900 bg-gray-900 animate-pulse' : 'border-gray-400'
                        }`}
                      />
                    )}
                    <span>{step}</span>
                  </li>
                );
              })}
            </ul>
          </div>

          <div>
            <ProgressBar progress={progress} />
            <p className="mt-3 text-center text-gray-700 font-medium min-h-[1.5rem]">
              {installing
                ? INSTALL_STEPS[currentStepIndex]
                : 'Ready to install your project'}
            </p>
          </div>

          <div className="flex justify-end">
            {/* ONLY show Install button if not installing */}
            {!installing ? (
              <Button onClick={() => startInstall()}>Start Installation</Button>
            ) : (
              <Button disabled>Installing...</Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function ProgressBar({ progress }: { progress: number }) {
  return (
    <div className="w-full h-12 rounded-xl overflow-hidden border border-gray-500 bg-gray-200 shadow-inner">
      <div
        className="h-full transition-all duration-100 ease-linear"
        style={{
          width: `${progress}%`,
          background: `repeating-linear-gradient(
            45deg,
            #000000cc,
            #000000cc 12px,
            #888888cc 12px,
            #888888cc 12px,
            #ffffffcc 12px,
            #ffffffcc 18px,
            #22c55ecc 6px,
            #22c55ecc 12px
          )`,
          boxShadow: 'inset 0 0 8px rgba(0,0,0,0.5)',
        }}
      />
    </div>
  );
}
