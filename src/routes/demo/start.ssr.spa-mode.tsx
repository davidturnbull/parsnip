import { useEffect, useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { getPunkSongs } from '@/data/demo.punk-songs'

export const Route = createFileRoute('/demo/start/ssr/spa-mode')({
  ssr: false,
  component: RouteComponent,
})

function RouteComponent() {
  const [punkSongs, setPunkSongs] = useState<
    Awaited<ReturnType<typeof getPunkSongs>>
  >([])

  useEffect(() => {
    getPunkSongs().then(setPunkSongs)
  }, [])

  return (
    <div className="flex items-center justify-center min-h-screen p-4 text-primary-dark">
      <div className="w-full max-w-2xl p-8 rounded-xl bg-surface border border-surface-dark shadow-sm">
        <h1 className="text-3xl font-bold mb-6 text-primary font-ui font-ui-heading">SPA Mode - Punk Songs</h1>
        <ul className="space-y-3">
          {punkSongs.map((song) => (
            <li
              key={song.id}
              className="rounded-lg p-4 bg-surface border border-surface-dark"
            >
              <span className="text-lg font-medium text-primary-dark">
                {song.name}
              </span>
              <span className="text-primary-dark/70"> - {song.artist}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
