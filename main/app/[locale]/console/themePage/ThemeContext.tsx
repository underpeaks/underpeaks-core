'use client'

import {
  createContext, useContext, useState,
  useEffect, useCallback, type ReactNode,
} from 'react'
// ✅ was: '@/app/api/themes/route'
import { useAuth } from '../layout'
import { DEFAULT_THEME } from '@/app/lib/theme-defaults';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ThemeColours    { [key: string]: string }
export interface ThemeTypography { headingFont: string; bodyFont: string; monoFont: string; headingWeight: string; bodyWeight: string; scale: string }
export interface ThemeSpacing    { radius: string; density: string; shadow: string }
export interface ThemeFlags      { [key: string]: boolean | string }

export interface ThemeData {
  colours:    ThemeColours
  typography: ThemeTypography
  spacing:    ThemeSpacing
  flags:      ThemeFlags
}

interface ThemeContextValue {
  theme:         ThemeData
  themeId:       string | null
  loading:       boolean
  saving:        boolean
  saved:         boolean
  error:         string | null
  setColours:    (c: ThemeColours)    => void
  setTypography: (t: ThemeTypography) => void
  setSpacing:    (s: ThemeSpacing)    => void
  setFlags:      (f: ThemeFlags)      => void
  saveTheme:     () => Promise<void>
  injectCssVars: () => void
}

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

const ThemeContext = createContext<ThemeContextValue | null>(null)

export function useTheme() {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error('useTheme must be used inside ThemeProvider')
  return ctx
}

// ---------------------------------------------------------------------------
// CSS variable injection
// ---------------------------------------------------------------------------

function injectCssVariables(colours: ThemeColours) {
  const root = document.documentElement
  Object.entries(colours).forEach(([key, value]) => {
    root.style.setProperty(`--color-${key}`, value)
  })
}

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

export function ThemeProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()

  const [themeId, setThemeId] = useState<string | null>(null)
  const [theme,   setTheme]   = useState<ThemeData>(DEFAULT_THEME)
  const [loading, setLoading] = useState(true)
  const [saving,  setSaving]  = useState(false)
  const [saved,   setSaved]   = useState(false)
  const [error,   setError]   = useState<string | null>(null)

  // ── Load ─────────────────────────────────────────────────────────────────

  useEffect(() => {
    if (!user) return
    const userId = user.user_id || user.id
    loadTheme(userId)
  }, [user])

  async function loadTheme(userId: string) {
    setLoading(true)
    setError(null)
    try {
      const res  = await fetch(`/api/themes?user_id=${userId}`)
      const text = await res.text()
      if (!text) throw new Error('Failed to load theme')
      const data = JSON.parse(text)
      if (!res.ok) throw new Error(data.error || 'Failed to load theme')

      const loaded: ThemeData = {
        colours:    { ...DEFAULT_THEME.colours,    ...data.theme.colours    },
        typography: { ...DEFAULT_THEME.typography, ...data.theme.typography },
        spacing:    { ...DEFAULT_THEME.spacing,    ...data.theme.spacing    },
        flags:      { ...DEFAULT_THEME.flags,      ...data.theme.flags      },
      }

      setTheme(loaded)
      setThemeId(data.theme_id ?? null)
      injectCssVariables(loaded.colours)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  // ── Save ─────────────────────────────────────────────────────────────────

  const saveTheme = useCallback(async () => {
    if (!user) return
    setSaving(true)
    setError(null)
    setSaved(false)
    try {
      const userId = user.user_id || user.id
      const res    = await fetch('/api/themes', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          user_id:    userId,
          user_email: user.user_email ?? '',
          theme_id:   themeId,
          ...theme,
        }),
      })
      const text = await res.text()
      const json = text ? JSON.parse(text) : {}
      if (!res.ok) throw new Error(json.error || 'Failed to save theme')

      injectCssVariables(theme.colours)
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }, [user, themeId, theme])

  // ── Setters ───────────────────────────────────────────────────────────────

  const setColours    = (c: ThemeColours)    => setTheme((p) => ({ ...p, colours:    c }))
  const setTypography = (t: ThemeTypography) => setTheme((p) => ({ ...p, typography: t }))
  const setSpacing    = (s: ThemeSpacing)    => setTheme((p) => ({ ...p, spacing:    s }))
  const setFlags      = (f: ThemeFlags)      => setTheme((p) => ({ ...p, flags:      f }))
  const injectCssVars = ()                   => injectCssVariables(theme.colours)

  return (
    <ThemeContext.Provider value={{
      theme, themeId, loading, saving, saved, error,
      setColours, setTypography, setSpacing, setFlags,
      saveTheme, injectCssVars,
    }}>
      {children}
    </ThemeContext.Provider>
  )
}