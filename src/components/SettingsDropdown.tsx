import { useEffect, useRef, useState } from 'react'
import { LANGUAGES, REGIONS, type LanguageCode, type RegionCode, useSettings } from '@/components/Settings'

export function SettingsDropdown() {
  const { system, setSystem, language, setLanguage, region, setRegion } = useSettings()
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

  // Close on ESC when open
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  return (
    <div className="fixed top-4 right-4 z-50" ref={menuRef}>
      <button
        type="button"
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 rounded-md border border-surface-dark bg-surface px-3 py-1.5 text-sm font-ui text-primary-dark shadow-sm hover:bg-parsnip-peach-light"
      >
        <span aria-hidden="true">⚙️</span>
        Settings
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="settings-title"
          onClick={() => setOpen(false)}
        >
          <div className="absolute inset-0 bg-black/40" />
          <div
            className="relative z-10 w-full max-w-md rounded-xl border border-surface-dark bg-surface p-4 shadow-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between">
              <h2 id="settings-title" className="text-lg font-ui font-ui-heading text-primary">Settings</h2>
              <button
                aria-label="Close settings"
                className="rounded-md px-2 py-1 text-primary-dark hover:bg-parsnip-leaf-light"
                onClick={() => setOpen(false)}
              >
                ✕
              </button>
            </div>

            <div className="mt-3 grid gap-6">
              <section>
                <div className="text-xs uppercase tracking-wide text-primary-dark/70 font-ui">Units</div>
                <div className="mt-2">
                <button
                  role="radio"
                  aria-checked={system === 'metric'}
                  onClick={() => setSystem('metric')}
                  className={`flex w-full items-center justify-between rounded-md px-3 py-2 text-sm font-ui hover:bg-parsnip-leaf-light hover:text-primary-dark ${
                    system === 'metric' ? 'bg-primary text-surface' : 'text-primary-dark'
                  }`}
                  autoFocus
                >
                  <span>Metric (°C)</span>
                  {system === 'metric' ? (
                    <span aria-hidden="true">✓</span>
                  ) : (
                    <span className="opacity-40" aria-hidden="true">◯</span>
                  )}
                </button>
                <button
                  role="radio"
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
              </section>

              <section>
                <div className="text-xs uppercase tracking-wide text-primary-dark/70 font-ui">Language</div>
                <div className="mt-2">
                  <select
                    value={language}
                    onChange={(e) => setLanguage(e.target.value as LanguageCode)}
                    className="w-full rounded-md border border-surface-dark bg-surface px-3 py-2 text-sm font-ui text-primary-dark hover:bg-parsnip-peach-light"
                  >
                    {[...LANGUAGES]
                      .sort((a, b) => a.label.localeCompare(b.label))
                      .map((l) => (
                        <option key={l.code} value={l.code}>
                          {l.label} ({l.code})
                        </option>
                      ))}
                  </select>
                </div>
              </section>

              <section>
                <div className="text-xs uppercase tracking-wide text-primary-dark/70 font-ui">Region</div>
                <div className="mt-2">
                  <select
                    value={region}
                    onChange={(e) => setRegion(e.target.value as RegionCode)}
                    className="w-full rounded-md border border-surface-dark bg-surface px-3 py-2 text-sm font-ui text-primary-dark hover:bg-parsnip-peach-light"
                  >
                    {[...REGIONS]
                      .sort((a, b) => a.label.localeCompare(b.label))
                      .map((r) => (
                        <option key={r.code} value={r.code}>
                          {r.flag} {r.label} ({r.code})
                        </option>
                      ))}
                  </select>
                </div>
              </section>
            </div>

            <div className="mt-4 flex justify-end">
              <button
                className="rounded-md border border-surface-dark bg-surface px-3 py-1.5 text-sm font-ui text-primary-dark hover:bg-parsnip-peach-light"
                onClick={() => setOpen(false)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
