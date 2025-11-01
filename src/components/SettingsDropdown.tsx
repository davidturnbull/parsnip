import { useEffect, useRef, useState } from 'react'

export function SettingsDropdown({
  system,
  setSystem,
}: {
  system: 'metric' | 'imperial'
  setSystem: (s: 'metric' | 'imperial') => void
}) {
  const [open, setOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (!menuRef.current) return
      if (menuRef.current.contains(e.target as Node)) return
      setOpen(false)
    }
    document.addEventListener('mousedown', onDocClick)
    return () => document.removeEventListener('mousedown', onDocClick)
  }, [])

  return (
    <div className="fixed top-4 right-4 z-50" ref={menuRef}>
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-2 rounded-md border border-surface-dark bg-surface px-3 py-1.5 text-sm font-ui text-primary-dark shadow-sm hover:bg-parsnip-peach-light"
      >
        <span aria-hidden="true">⚙️</span>
        Settings
        <span className="text-xs" aria-hidden="true">▾</span>
      </button>
      {open && (
        <div
          role="menu"
          aria-label="Settings"
          className="mt-2 w-56 rounded-md border border-surface-dark bg-surface p-2 shadow-lg"
        >
          <div className="px-2 py-1.5 text-xs uppercase tracking-wide text-primary-dark/70 font-ui">Units</div>
          <button
            role="menuitemradio"
            aria-checked={system === 'metric'}
            onClick={() => setSystem('metric')}
            className={`flex w-full items-center justify-between rounded-md px-3 py-2 text-sm font-ui hover:bg-parsnip-leaf-light hover:text-primary-dark ${
              system === 'metric' ? 'bg-primary text-surface' : 'text-primary-dark'
            }`}
          >
            <span>Metric (°C)</span>
            {system === 'metric' ? (
              <span aria-hidden="true">✓</span>
            ) : (
              <span className="opacity-40" aria-hidden="true">◯</span>
            )}
          </button>
          <button
            role="menuitemradio"
            aria-checked={system === 'imperial'}
            onClick={() => setSystem('imperial')}
            className={`mt-1 flex w-full items-center justify-between rounded-md px-3 py-2 text-sm font-ui hover:bg-parsnip-leaf-light hover:text-primary-dark ${
              system === 'imperial' ? 'bg-primary text-surface' : 'text-primary-dark'
            }`}
          >
            <span>Imperial (°F)</span>
            {system === 'imperial' ? (
              <span aria-hidden="true">✓</span>
            ) : (
              <span className="opacity-40" aria-hidden="true">◯</span>
            )}
          </button>
        </div>
      )}
    </div>
  )
}
