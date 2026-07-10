// File: app/[locale]/reset-password/page.tsx
'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'

function ResetPasswordForm() {
  const searchParams = useSearchParams()
  const token = searchParams.get('token') || ''

  const [password, setPassword] = useState('')
  const [confirm, setConfirm]   = useState('')
  const [status, setStatus]     = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [message, setMessage]   = useState('')

  useEffect(() => {
    if (!token) {
      setStatus('error')
      setMessage('No reset token provided. Please use the link from your email.')
    }
  }, [token])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (password !== confirm) {
      setStatus('error')
      setMessage('Passwords do not match.')
      return
    }

    if (password.length < 8) {
      setStatus('error')
      setMessage('Password must be at least 8 characters.')
      return
    }

    setStatus('loading')
    setMessage('')

    try {
      const res = await fetch('/api/auth-reset-password', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ token, password }),
      })

      const data = await res.json()

      if (!res.ok) {
        setStatus('error')
        setMessage(data.error || 'Something went wrong. Please try again.')
        return
      }

      setStatus('success')
      setMessage('Your password has been reset. You can now sign in.')
    } catch {
      setStatus('error')
      setMessage('Network error. Please try again.')
    }
  }

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
      }}>
        <h1 style={{ color: '#fff', fontSize: '1.5rem', marginBottom: '0.5rem' }}>
          Reset Password
        </h1>
        <p style={{ color: '#888', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
          Enter your new password below.
        </p>

        {status === 'success' ? (
          <div style={{
            padding: '1rem',
            background: '#00d9a318',
            border: '1px solid #00d9a3',
            borderRadius: '8px',
            color: '#00d9a3',
            fontSize: '0.9rem',
          }}>
            {message}
            <div style={{ marginTop: '1rem' }}>
              <a href="/signin" style={{ color: '#00d9a3', fontWeight: 600 }}>
                Go to sign in →
              </a>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <input
              type="password"
              placeholder="New password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={status === 'loading' || !token}
              style={{
                width: '100%',
                padding: '0.75rem',
                marginBottom: '1rem',
                background: '#0f0f0f',
                border: '1px solid #2a2a2a',
                borderRadius: '8px',
                color: '#fff',
                fontSize: '0.95rem',
              }}
            />
            <input
              type="password"
              placeholder="Confirm new password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              disabled={status === 'loading' || !token}
              style={{
                width: '100%',
                padding: '0.75rem',
                marginBottom: '1rem',
                background: '#0f0f0f',
                border: '1px solid #2a2a2a',
                borderRadius: '8px',
                color: '#fff',
                fontSize: '0.95rem',
              }}
            />

            {message && status === 'error' && (
              <p style={{ color: '#ff5555', fontSize: '0.85rem', marginBottom: '1rem' }}>
                {message}
              </p>
            )}

            <button
              type="submit"
              disabled={status === 'loading' || !token}
              style={{
                width: '100%',
                padding: '0.75rem',
                background: '#00d9a3',
                border: 'none',
                borderRadius: '8px',
                color: '#0f0f0f',
                fontWeight: 600,
                fontSize: '0.95rem',
                cursor: status === 'loading' || !token ? 'not-allowed' : 'pointer',
                opacity: status === 'loading' || !token ? 0.6 : 1,
              }}
            >
              {status === 'loading' ? 'Resetting…' : 'Reset Password'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={null}>
      <ResetPasswordForm />
    </Suspense>
  )
}