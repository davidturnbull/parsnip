import { HeadContent, Scripts, createRootRoute, Outlet } from '@tanstack/react-router'
import { useEffect, useMemo, useState } from 'react'

import appCss from '../styles.css?url'
import { TemperatureProvider } from '@/components/Temperature'
import { WeightProvider } from '@/components/Weight'
import { VolumeProvider } from '@/components/Volume'
import { LengthProvider } from '@/components/Length'
import { SettingsDropdown } from '@/components/SettingsDropdown'

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

  // Load saved unit preference
  useEffect(() => {
    try {
      const saved = localStorage.getItem('parsnip-units')
      if (saved === 'metric' || saved === 'imperial') setSystem(saved)
    } catch {}
  }, [])

  // Persist unit preference
  useEffect(() => {
    try {
      localStorage.setItem('parsnip-units', system)
    } catch {}
  }, [system])

  const tempUnit = useMemo(
    () => (system === 'imperial' ? ('fahrenheit' as const) : ('celsius' as const)),
    [system],
  )

  return (
    <TemperatureProvider unit={tempUnit}>
      <WeightProvider unit={system}>
        <VolumeProvider unit={system}>
          <LengthProvider unit={system}>
            <div className="min-h-screen">
              <SettingsDropdown system={system} setSystem={setSystem} />
              <Outlet />
            </div>
          </LengthProvider>
        </VolumeProvider>
      </WeightProvider>
    </TemperatureProvider>
  )
}
