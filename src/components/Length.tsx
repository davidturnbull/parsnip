import { createContext, useContext, type ReactNode } from 'react'

export type LengthSystem = 'metric' | 'imperial'

export const LengthContext = createContext<LengthSystem>('metric')

export function LengthProvider({
  children,
  unit = 'metric',
}: {
  children: ReactNode
  unit?: LengthSystem
}) {
  return <LengthContext.Provider value={unit}>{children}</LengthContext.Provider>
}

export function useLengthSystem() {
  return useContext(LengthContext)
}

export function Length({ value }: { value: number }) {
  const system = useLengthSystem()

  const convert = (cm: number): { value: number; unit: string } => {
    if (system === 'imperial') {
      const inches = cm / 2.54
      return { value: inches, unit: 'in' }
    } else {
      return { value: cm, unit: 'cm' }
    }
  }

  const { value: displayValue, unit } = convert(value)
  const formatted = displayValue.toFixed(1)
  const unitWord = unit === 'in' ? 'inches' : 'centimeters'

  return (
    <span aria-label={`${formatted} ${unitWord}`} title={`${formatted} ${unitWord}`}>
      {formatted} {unit}
    </span>
  )
}
