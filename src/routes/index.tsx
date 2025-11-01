import { createFileRoute } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { useEffect, useMemo, useState } from "react";
import { MDXProvider } from "@mdx-js/react";
import { evaluate } from "@mdx-js/mdx";
import * as mdxRuntime from "react/jsx-runtime";
import * as mdxDevRuntime from "react/jsx-dev-runtime";
import { generateText } from "ai";
import { openai } from "@ai-sdk/openai";
import { FirecrawlClient } from "@mendable/firecrawl-js";

type Result = {
  mdx: string;
};

const processRecipe = createServerFn({ method: "POST" })
  .inputValidator((d: { url: string }) => d)
  .handler(async ({ data }) => {
    const url = data?.url;
    if (!url) {
      throw new Error("Missing url");
    }

    const firecrawl = new FirecrawlClient({
      // Reads FIRECRAWL_API_KEY from env by default
    });

    // Fetch the page as markdown
    const doc = await firecrawl.scrape(url, {
      formats: ["markdown"],
      onlyMainContent: true,
      removeBase64Images: true,
      blockAds: true,
    });

    const pageMarkdown = doc?.markdown || "";
    if (!pageMarkdown) {
      throw new Error("Could not extract markdown from page");
    }

    // Rewrite using Vercel AI SDK (OpenAI)
    const { text } = await generateText({
      model: openai("gpt-4o-mini"),
      prompt:
        "Rewrite this recipe for an absolute beginner. Use a simple title, a clear ingredients list, and numbered steps. Keep jargon minimal. Output in Markdown/MDX only.\n\n--- PAGE CONTENT START ---\n" +
        pageMarkdown +
        "\n--- PAGE CONTENT END ---",
      temperature: 0.3,
    });

    const cleaned = (text || "").trim();
    return { mdx: cleaned } satisfies Result;
  });

export const Route = createFileRoute("/")({
  component: App,
  validateSearch: (search: Record<string, unknown>) => ({
    url: (search.url as string) || "",
  }),
});

function App() {
  const { url } = Route.useSearch() as { url: string };
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mdx, setMdx] = useState<string>("");
  const [inputUrl, setInputUrl] = useState(url);

  useEffect(() => {
    let cancelled = false;
    async function run() {
      if (!url) return;
      setLoading(true);
      setError(null);
      setMdx("");
      try {
        const res = await processRecipe({ data: { url } });
        if (!cancelled) setMdx(res.mdx);
      } catch (err: any) {
        if (!cancelled) setError(err?.message || "Something went wrong");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    run();
    return () => {
      cancelled = true;
    };
  }, [url]);

  const components = useMemo(() => {
    // Placeholder for custom MDX components you can add later
    // Example: { h1: (props) => <h1 className="text-2xl" {...props} /> }
    return {} as Record<string, any>;
  }, []);

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100">
      <div className="max-w-3xl mx-auto px-4 py-6">
        <h1 className="text-2xl font-bold mb-4">Parsnip</h1>
        <p className="text-slate-400 mb-4">
          Paste a recipe URL or load with <code>/?url=...</code>
        </p>

        <div className="flex gap-2 mb-6">
          <input
            className="flex-1 rounded-md border border-slate-700 bg-slate-800 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
            placeholder="https://example.com/your-recipe"
            value={inputUrl}
            onChange={(e) => setInputUrl(e.target.value)}
          />
          <a
            href={`/?url=${encodeURIComponent(inputUrl || "")}`}
            className="rounded-md bg-cyan-600 hover:bg-cyan-500 px-4 py-2 text-sm font-medium"
          >
            Go
          </a>
        </div>

        {loading && (
          <div className="animate-pulse rounded-md border border-slate-800 bg-slate-800/50 p-6">
            Loading recipe and rewriting for beginners...
          </div>
        )}

        {error && (
          <div className="rounded-md border border-red-800 bg-red-900/20 p-4 text-red-300">
            {error}
          </div>
        )}

        {!loading && !error && mdx && (
          <article className="prose prose-invert max-w-none">
            <MdxRenderer source={mdx} components={components} />
          </article>
        )}

        {!loading && !error && !mdx && !url && (
          <div className="text-slate-400 text-sm">
            Tip: open something like{" "}
            <code>
              /?url=https://www.allrecipes.com/recipe/24074/alysias-basic-meat-lasagna/
            </code>
          </div>
        )}
      </div>
    </div>
  );
}

function MdxRenderer({
  source,
  components,
}: {
  source: string;
  components: Record<string, any>;
}) {
  const [Comp, setComp] = useState<any>(null);

  useEffect(() => {
    let cancelled = false;
    async function run() {
      try {
        const dev = Boolean((import.meta as any)?.env?.DEV);
        const runtime = dev ? mdxDevRuntime : mdxRuntime;
        const mod = await evaluate(source, {
          ...runtime,
          useMDXComponents: () => components,
          development: dev,
        } as any);
        if (!cancelled) setComp(() => mod.default);
      } catch (e) {
        if (!cancelled)
          setComp(() => () => <pre className="text-red-300">{String(e)}</pre>);
      }
    }
    run();
    return () => {
      cancelled = true;
    };
  }, [source, components]);

  if (!Comp) return <div className="text-slate-400">Rendering…</div>;
  return (
    <MDXProvider components={components}>
      <Comp />
    </MDXProvider>
  );
}
