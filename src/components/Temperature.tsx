import { createContext, useContext, type ReactNode } from 'react'

export type TemperatureUnit = 'celsius' | 'fahrenheit'

export const TemperatureContext = createContext<TemperatureUnit>('celsius')

export function TemperatureProvider({
  children,
  unit = 'celsius',
}: {
  children: ReactNode
  unit?: TemperatureUnit
}) {
  return (
    <TemperatureContext.Provider value={unit}>
      {children}
    </TemperatureContext.Provider>
  )
}

export function useTemperatureUnit() {
  return useContext(TemperatureContext)
}

export function Temperature({ value }: { value: number }) {
  const unit = useTemperatureUnit()

  const convert = (celsius: number) =>
    unit === 'fahrenheit' ? (celsius * 9) / 5 + 32 : celsius

  const symbol = unit === 'fahrenheit' ? '°F' : '°C'
  const unitWord = unit === 'fahrenheit' ? 'degrees Fahrenheit' : 'degrees Celsius'
  const displayValue = Math.round(convert(value))

  return (
    <span aria-label={`${displayValue} ${unitWord}`} title={`${displayValue} ${unitWord}`}>
      {displayValue}
      {symbol}
    </span>
  )
}
