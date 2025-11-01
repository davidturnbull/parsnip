import { HeadContent, Scripts, createRootRoute, Outlet } from '@tanstack/react-router'
import { useEffect, useMemo, useState } from 'react'

import appCss from '../styles.css?url'
import { TemperatureProvider } from '@/components/Temperature'
import { WeightProvider } from '@/components/Weight'
import { VolumeProvider } from '@/components/Volume'
import { LengthProvider } from '@/components/Length'
import { SettingsDropdown } from '@/components/SettingsDropdown'
import { LANGUAGES, REGIONS, SettingsProvider, type LanguageCode, type RegionCode } from '@/components/Settings'

export const Route = createRootRoute({
  head: () => ({
    meta: [
      {
        charSet: 'utf-8',
      },
      {
        name: 'viewport',
        content: 'width=device-width, initial-scale=1',
      },
      {
        title: 'TanStack Start Starter',
      },
    ],
    links: [
      {
        rel: 'stylesheet',
        href: appCss,
      },
      {
        rel: 'stylesheet',
        href: 'https://fonts.googleapis.com/css2?family=Pixelify+Sans:wght@400;500;600;700&display=swap',
      },
    ],
  }),

  shellComponent: RootDocument,
  component: RootLayout,
})

function RootDocument({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  )
}

function RootLayout() {
  const [system, setSystem] = useState<'metric' | 'imperial'>('metric')
  const [language, setLanguage] = useState<LanguageCode>('en')
  const [region, setRegion] = useState<RegionCode>('US')
  const [context, setContext] = useState<string>('')

  // Load saved unit preference
  useEffect(() => {
    try {
      const saved = localStorage.getItem('parsnip-units')
      if (saved === 'metric' || saved === 'imperial') setSystem(saved)
    } catch {}
  }, [])

  useEffect(() => {
    try {
      const saved = localStorage.getItem('parsnip-language')
      const codes = new Set(LANGUAGES.map((l) => l.code))
      if (saved && codes.has(saved as LanguageCode)) setLanguage(saved as LanguageCode)
    } catch {}
  }, [])

  useEffect(() => {
    try {
      const saved = localStorage.getItem('parsnip-region')
      const codes = new Set(REGIONS.map((r) => r.code))
      if (saved && codes.has(saved as RegionCode)) setRegion(saved as RegionCode)
    } catch {}
  }, [])

  useEffect(() => {
    try {
      const saved = localStorage.getItem('parsnip-context')
      if (typeof saved === 'string') setContext(saved)
    } catch {}
  }, [])

  // Persist unit preference
  useEffect(() => {
    try {
      localStorage.setItem('parsnip-units', system)
    } catch {}
  }, [system])

  useEffect(() => {
    try {
      localStorage.setItem('parsnip-language', language)
    } catch {}
  }, [language])

  useEffect(() => {
    try {
      localStorage.setItem('parsnip-region', region)
    } catch {}
  }, [region])

  useEffect(() => {
    try {
      localStorage.setItem('parsnip-context', context)
    } catch {}
  }, [context])

  const tempUnit = useMemo(
    () => (system === 'imperial' ? ('fahrenheit' as const) : ('celsius' as const)),
    [system],
  )

  return (
    <SettingsProvider
      value={{
        system,
        setSystem,
        language,
        setLanguage,
        region,
        setRegion,
        context,
        setContext,
      }}
    >
      <TemperatureProvider unit={tempUnit}>
        <WeightProvider unit={system}>
          <VolumeProvider unit={system}>
            <LengthProvider unit={system}>
              <div className="min-h-screen">
                <SettingsDropdown />
                <Outlet />
              </div>
            </LengthProvider>
          </VolumeProvider>
        </WeightProvider>
      </TemperatureProvider>
    </SettingsProvider>
  )
}
