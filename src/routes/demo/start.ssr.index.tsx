import { createFileRoute, Link } from '@tanstack/react-router'

export const Route = createFileRoute('/demo/start/ssr/')({
  component: RouteComponent,
})

function RouteComponent() {
  return (
    <div className="flex items-center justify-center min-h-screen p-4 text-primary-dark">
      <div className="w-full max-w-2xl p-8 rounded-xl bg-surface border border-surface-dark shadow-sm">
        <h1 className="text-4xl font-bold mb-8 text-center text-primary font-ui font-ui-heading">SSR Demos</h1>
        <div className="flex flex-col gap-4">
          <Link
            to="/demo/start/ssr/spa-mode"
            className="text-2xl font-bold py-6 px-8 rounded-lg bg-primary text-surface text-center shadow-sm hover:bg-primary-dark border border-surface-dark"
          >
            SPA Mode
          </Link>
          <Link
            to="/demo/start/ssr/full-ssr"
            className="text-2xl font-bold py-6 px-8 rounded-lg bg-primary text-surface text-center shadow-sm hover:bg-primary-dark border border-surface-dark"
          >
            Full SSR
          </Link>
          <Link
            to="/demo/start/ssr/data-only"
            className="text-2xl font-bold py-6 px-8 rounded-lg bg-primary text-surface text-center shadow-sm hover:bg-primary-dark border border-surface-dark"
          >
            Data Only
          </Link>
        </div>
      </div>
    </div>
  )
}
