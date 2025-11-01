import { createContext, useContext, type ReactNode } from 'react'

export type VolumeSystem = 'metric' | 'imperial'

export const VolumeContext = createContext<VolumeSystem>('metric')

export function VolumeProvider({
  children,
  unit = 'metric',
}: {
  children: ReactNode
  unit?: VolumeSystem
}) {
  return <VolumeContext.Provider value={unit}>{children}</VolumeContext.Provider>
}

export function useVolumeSystem() {
  return useContext(VolumeContext)
}

export function Volume({ value }: { value: number }) {
  const system = useVolumeSystem()

  const convert = (ml: number): { value: number; unit: string } => {
    if (system === 'imperial') {
      const flOz = ml / 29.5735

      if (flOz >= 128) {
        return { value: flOz / 128, unit: 'gal' }
      } else if (flOz >= 32) {
        return { value: flOz / 32, unit: 'qt' }
      } else if (flOz >= 16) {
        return { value: flOz / 16, unit: 'pt' }
      } else if (flOz >= 8) {
        return { value: flOz / 8, unit: 'cup' }
      } else if (flOz >= 2) {
        return { value: flOz, unit: 'fl oz' }
      } else {
        return { value: ml / 4.92892, unit: 'tsp' }
      }
    } else {
      if (ml >= 1000) {
        return { value: ml / 1000, unit: 'L' }
      } else {
        return { value: ml, unit: 'ml' }
      }
    }
  }

  const { value: displayValue, unit } = convert(value)
  const formatted = displayValue >= 10 ? String(Math.round(displayValue)) : displayValue.toFixed(1)

  return (
    <span>
      {formatted} {unit}
    </span>
  )
}

