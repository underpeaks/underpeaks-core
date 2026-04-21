'use client';

import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { useRouter } from 'next/navigation';
import { CheckCircle2 } from 'lucide-react';
import { INSTALL_STEPS, runInstallerSteps } from '../actions/installerRunner';
import { useInstallerStore } from '../../store/useInstallerStore';

export default function FinalizePage() {
  const router = useRouter();
  const selectedStack = useInstallerStore((state) => state.selectedStack);
  const installerState = useInstallerStore((state) => state);

  const [installing, setInstalling] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Step labels with skipped logic (UNCHANGED)
  const stepLabels = useMemo(() => {
  return INSTALL_STEPS.map((step) => {
  
    if (
      step === 'Installing Flutter project' &&
      selectedStack !== 'flutter' &&
      
      selectedStack !== 'both'
    ) {
      return { label: step, skipped: true };
    }
    if (
      step === 'Installing Next.js project' &&
      selectedStack !== 'next' &&
      
      selectedStack !== 'both'
    ) {
      return { label: step, skipped: true };
    }
    if (
  step === 'Installing CMS project' &&
  selectedStack !== 'cms' &&
  selectedStack !== 'both'
) {
  return { label: step, skipped: true };
}
    return { label: step, skipped: false };
  });
}, [selectedStack]);

  async function startInstall() {
    setInstalling(true);
    setErrorMessage(null);

    try {
      await runInstallerSteps((stepIndex) => {
        setProgress((stepIndex / INSTALL_STEPS.length) * 100);
        setCurrentStepIndex(stepIndex - 1);
      });

      // === SAVE CONFIG (SERVER CREATES PROJECT + ENCRYPTS) ===
      if (!installerState.selectedDb) {
        throw new Error('No database selected, cannot save config.');
      }

      console.log('[DEBUG] Sending installer config to server:', installerState);

      const res = await fetch('/api/save-config', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          projectName: installerState.projectName,
          subdomain: installerState.subdomain,
          selectedStack: installerState.selectedStack,
          selectedDb: installerState.selectedDb,
          dbConfig: installerState.dbConfig,
          selectedProjectType : installerState.selectedProjectType,
          databaseName: installerState.dbConfig.database,


        
        adminUser: installerState.adminUser
  ? {
      email: installerState.adminUser.email,
      full_name: installerState.adminUser.fullName,
     
    }
  : null,

        }),
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || 'Failed to save installer config');
      }

      const data = await res.json();
      console.log('[DEBUG] Installer config saved:', data);

      router.push('/installer/done');
    } catch (error: unknown) {
      setInstalling(false);

      let message = 'Unknown error occurred';
      if (error instanceof Error) message = error.message;
      else if (typeof error === 'string') message = error;

      setErrorMessage(message);
      console.error('Installation error:', message);
    }
  }

  return (
    <div className="max-w-xl mx-auto px-6 py-12 space-y-8">
      <header className="mb-8 text-center">
        <h1 className="text-4xl font-extrabold text-black tracking-tight">
          🚀 NXT_Flutter
        </h1>
        <p className="text-xl text-gray-700 mt-2">
          Build once. Run anywhere.
        </p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Finalize Setup</CardTitle>
        </CardHeader>

        <CardContent className="space-y-6">
          <div className="bg-gray-100 text-gray-900 p-4 rounded-md space-y-1 font-mono text-sm border border-gray-300">
            <p>
              <strong>Project:</strong>{' '}
              {installerState.projectName || 'MyApp'}
            </p>
            <p>
              <strong>Stack:</strong>{' '}
              {selectedStack === 'both'
                ? 'Flutter + Next.js'
                : selectedStack}
            </p>
            <p>
              <strong>Database:</strong>{' '}
              {installerState.selectedDb || 'Not selected'}
            </p>
          </div>

          <div className="bg-gray-50 border border-gray-300 rounded-md p-4 text-gray-700 text-sm">
            <h3 className="font-semibold mb-2">Installation Steps:</h3>
            <ul className="list-disc list-inside space-y-2">
              {stepLabels.map(({ label, skipped }, i) => {
                const done = i < currentStepIndex || progress === 100;
                const isCurrent =
                  i === currentStepIndex && progress < 100;

                return (
                  <li
                    key={label}
                    className={`flex items-center space-x-2 ${
                      done
                        ? 'text-gray-900 font-semibold'
                        : 'text-gray-600'
                    }`}
                  >
                    {done ? (
                      <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0" />
                    ) : (
                      <span
                        className={`inline-block w-4 h-4 rounded-full border-2 flex-shrink-0 ${
                          isCurrent
                            ? 'border-gray-900 bg-gray-900 animate-pulse'
                            : 'border-gray-400'
                        }`}
                      />
                    )}
                    <span>
                      {label}
                      {skipped && (
                        <span className="text-green-600 font-semibold ml-2 inline-flex items-center space-x-1">
                          <CheckCircle2 className="w-4 h-4" />
                          <span> skipped!</span>
                        </span>
                      )}
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>

          <div>
            <ProgressBar progress={progress} />
            <p className="mt-3 text-center text-gray-700 font-medium min-h-[1.5rem]">
              {installing
                ? INSTALL_STEPS[currentStepIndex] ?? 'Finishing...'
                : 'Ready to install your project'}
            </p>
          </div>

          {errorMessage && (
            <div className="bg-red-100 border border-red-400 text-red-700 p-4 rounded-md font-mono whitespace-pre-wrap mt-2">
              <strong>Error:</strong> {errorMessage}
            </div>
          )}

          <div className="flex justify-end">
            {!installing ? (
              <Button onClick={startInstall}>Start Installation</Button>
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
