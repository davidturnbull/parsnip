import { createContext, useContext, type ReactNode } from 'react'

export type WeightSystem = 'metric' | 'imperial'

export const WeightContext = createContext<WeightSystem>('metric')

export function WeightProvider({
  children,
  unit = 'metric',
}: {
  children: ReactNode
  unit?: WeightSystem
}) {
  return <WeightContext.Provider value={unit}>{children}</WeightContext.Provider>
}

export function useWeightSystem() {
  return useContext(WeightContext)
}

export function Weight({ value }: { value: number }) {
  const system = useWeightSystem()

  const convert = (grams: number): { value: number; unit: string } => {
    if (system === 'imperial') {
      const oz = grams / 28.3495
      if (oz >= 16) {
        return { value: oz / 16, unit: 'lb' }
      } else {
        return { value: oz, unit: 'oz' }
      }
    } else {
      if (grams >= 1000) {
        return { value: grams / 1000, unit: 'kg' }
      } else {
        return { value: grams, unit: 'g' }
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

