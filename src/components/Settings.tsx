import React, { createContext, useContext } from 'react'

export const LANGUAGES = [
  { code: 'en', label: 'English' },
  { code: 'es', label: 'Spanish' },
  { code: 'fr', label: 'French' },
] as const
export type LanguageCode = (typeof LANGUAGES)[number]['code']

export const REGIONS = [
  { code: 'US', label: 'United States', flag: '🇺🇸' },
  { code: 'UK', label: 'United Kingdom', flag: '🇬🇧' },
  { code: 'EU', label: 'European Union', flag: '🇪🇺' },
  { code: 'CA', label: 'Canada', flag: '🇨🇦' },
  { code: 'AU', label: 'Australia', flag: '🇦🇺' },
] as const
export type RegionCode = (typeof REGIONS)[number]['code']

export type UnitSystem = 'metric' | 'imperial'

export function getLanguageLabel(code: LanguageCode) {
  return LANGUAGES.find((l) => l.code === code)?.label ?? code
}
export function getRegionMeta(code: RegionCode) {
  const r = REGIONS.find((x) => x.code === code)
  return { label: r?.label ?? code, flag: r?.flag ?? '' }
}

export type Settings = {
  system: UnitSystem
  setSystem: (v: UnitSystem) => void
  language: LanguageCode
  setLanguage: (v: LanguageCode) => void
  region: RegionCode
  setRegion: (v: RegionCode) => void
}

const SettingsContext = createContext<Settings | null>(null)

export function SettingsProvider({ value, children }: { value: Settings; children: React.ReactNode }) {
  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>
}

export function useSettings() {
  const ctx = useContext(SettingsContext)
  if (!ctx) throw new Error('useSettings must be used within SettingsProvider')
  return ctx
}

