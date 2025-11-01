import fs from 'node:fs'
import { useCallback, useState } from 'react'
import { createFileRoute, useRouter } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'

/*
const loggingMiddleware = createMiddleware().server(
  async ({ next, request }) => {
    console.log("Request:", request.url);
    return next();
  }
);
const loggedServerFunction = createServerFn({ method: "GET" }).middleware([
  loggingMiddleware,
]);
*/

const TODOS_FILE = 'todos.json'

async function readTodos() {
  return JSON.parse(
    await fs.promises.readFile(TODOS_FILE, 'utf-8').catch(() =>
      JSON.stringify(
        [
          { id: 1, name: 'Get groceries' },
          { id: 2, name: 'Buy a new phone' },
        ],
        null,
        2,
      ),
    ),
  )
}

const getTodos = createServerFn({
  method: 'GET',
}).handler(async () => await readTodos())

const addTodo = createServerFn({ method: 'POST' })
  .inputValidator((d: string) => d)
  .handler(async ({ data }) => {
    const todos = await readTodos()
    todos.push({ id: todos.length + 1, name: data })
    await fs.promises.writeFile(TODOS_FILE, JSON.stringify(todos, null, 2))
    return todos
  })

export const Route = createFileRoute('/demo/start/server-funcs')({
  component: Home,
  loader: async () => await getTodos(),
})

function Home() {
  const router = useRouter()
  let todos = Route.useLoaderData()

  const [todo, setTodo] = useState('')

  const submitTodo = useCallback(async () => {
    todos = await addTodo({ data: todo })
    setTodo('')
    router.invalidate()
  }, [addTodo, todo])

  return (
    <div className="flex items-center justify-center min-h-screen p-4 text-primary-dark">
      <div className="w-full max-w-2xl p-8 rounded-xl bg-surface border border-surface-dark shadow-sm">
        <h1 className="text-2xl mb-4 text-primary">Start Server Functions - Todo Example</h1>
        <ul className="mb-4 space-y-2">
          {todos?.map((t) => (
            <li
              key={t.id}
              className="rounded-lg p-3 bg-surface border border-surface-dark"
            >
              <span className="text-lg text-primary-dark">{t.name}</span>
            </li>
          ))}
        </ul>
        <div className="flex flex-col gap-2">
          <input
            type="text"
            value={todo}
            onChange={(e) => setTodo(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                submitTodo()
              }
            }}
            placeholder="Enter a new todo..."
            className="w-full px-4 py-3 rounded-lg border border-surface-dark bg-surface text-primary-dark placeholder:text-primary-dark/60 focus:outline-none focus:ring-2 focus:ring-primary"
          />
          <button
            disabled={todo.trim().length === 0}
            onClick={submitTodo}
            className="bg-primary hover:bg-primary-dark disabled:bg-primary/50 disabled:cursor-not-allowed text-surface font-bold py-3 px-4 rounded-lg transition-colors"
          >
            Add todo
          </button>
        </div>
      </div>
    </div>
  )
}
