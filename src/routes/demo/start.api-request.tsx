import { useEffect, useState } from 'react'

import { createFileRoute } from '@tanstack/react-router'

function getNames() {
  return fetch('/demo/api/names').then((res) => res.json() as Promise<string[]>)
}

export const Route = createFileRoute('/demo/start/api-request')({
  component: Home,
})

function Home() {
  const [names, setNames] = useState<Array<string>>([])

  useEffect(() => {
    getNames().then(setNames)
  }, [])

  return (
    <div className="flex items-center justify-center min-h-screen p-4 text-primary-dark">
      <div className="w-full max-w-2xl p-8 rounded-xl bg-surface border border-surface-dark shadow-sm">
        <h1 className="text-2xl mb-4 text-primary">Start API Request Demo - Names List</h1>
        <ul className="mb-4 space-y-2">
          {names.map((name) => (
            <li
              key={name}
              className="rounded-lg p-3 bg-surface border border-surface-dark"
            >
              <span className="text-lg text-primary-dark">{name}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
