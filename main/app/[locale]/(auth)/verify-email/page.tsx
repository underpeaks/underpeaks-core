// File: app/[locale]/verify-email/page.tsx
'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'

function VerifyEmailContent() {
  const searchParams = useSearchParams()
  const token = searchParams.get('token') || ''

  const [status, setStatus]   = useState<'loading' | 'success' | 'error'>('loading')
  const [message, setMessage] = useState('Verifying your email…')

  useEffect(() => {
    if (!token) {
      setStatus('error')
      setMessage('No verification token provided. Please use the link from your email.')
      return
    }

    const verify = async () => {
      try {
        const res = await fetch('/api/auth-verify-email', {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify({ token }),
        })

        const data = await res.json()

        if (!res.ok) {
          setStatus('error')
          setMessage(data.error || 'Verification failed. The link may have expired.')
          return
        }

        setStatus('success')
        setMessage('Your email has been verified. You can now sign in.')
      } catch {
        setStatus('error')
        setMessage('Network error. Please try again.')
      }
    }

    verify()
  }, [token])

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: '#0f0f0f',
      padding: '1rem',
    }}>
      <div style={{
        width: '100%',
        maxWidth: '400px',
        background: '#1a1a1a',
        borderRadius: '12px',
        padding: '2rem',
        border: '1px solid #2a2a2a',
        textAlign: 'center',
      }}>
        {status === 'loading' && (
          <div style={{ color: '#888', fontSize: '0.95rem' }}>
            {message}
          </div>
        )}

        {status === 'success' && (
          <>
            <div style={{
              fontSize: '2rem',
              marginBottom: '1rem',
            }}>
              ✓
            </div>
            <h1 style={{ color: '#00d9a3', fontSize: '1.3rem', marginBottom: '0.5rem' }}>
              Email Verified
            </h1>
            <p style={{ color: '#888', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
              {message}
            </p>
            <a href="/signin" style={{
              display: 'inline-block',
              padding: '0.75rem 1.5rem',
              background: '#00d9a3',
              borderRadius: '8px',
              color: '#0f0f0f',
              fontWeight: 600,
              fontSize: '0.95rem',
              textDecoration: 'none',
            }}>
              Go to sign in →
            </a>
          </>
        )}

        {status === 'error' && (
          <>
            <div style={{
              fontSize: '2rem',
              marginBottom: '1rem',
            }}>
              ✕
            </div>
            <h1 style={{ color: '#ff5555', fontSize: '1.3rem', marginBottom: '0.5rem' }}>
              Verification Failed
            </h1>
            <p style={{ color: '#888', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
              {message}
            </p>
            <a href="/signin" style={{
              display: 'inline-block',
              padding: '0.75rem 1.5rem',
              background: '#2a2a2a',
              borderRadius: '8px',
              color: '#fff',
              fontWeight: 600,
              fontSize: '0.95rem',
              textDecoration: 'none',
            }}>
              Back to sign in
            </a>
          </>
        )}
      </div>
    </div>
  )
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={null}>
      <VerifyEmailContent />
    </Suspense>
  )
}