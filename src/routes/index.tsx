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
import { TemperatureProvider, Temperature } from "@/components/Temperature";
import { WeightProvider, Weight } from "@/components/Weight";
import { VolumeProvider, Volume } from "@/components/Volume";
import { LengthProvider, Length } from "@/components/Length";

type Result = {
  mdx: string;
};

const generateFromPrompt = createServerFn({ method: "POST" })
  .inputValidator((d: { prompt: string }) => d)
  .handler(async ({ data }) => {
    const userPrompt = (data?.prompt || "").trim();
    if (!userPrompt) {
      throw new Error("Missing prompt");
    }

    const { text } = await generateText({
      model: openai("gpt-4o-mini"),
      prompt: [
        "Create a simple, beginner-friendly recipe from this request.",
        "Keep it short and friendly. Use:",
        "- A simple title",
        "- An ingredients list",
        "- Numbered steps",
        "- Optional tips",
        "",
        "Output MDX only. Do NOT include import statements.",
        "You can use these globally available MDX components without importing:",
        "- <Temperature value={numberInCelsius} />",
        "- <Weight value={grams} />",
        "- <Volume value={milliliters} />",
        "- <Length value={centimeters} />",
        "",
        "Usage examples (copy exact tag names; no imports):",
        "- Preheat oven: Preheat to <Temperature value={180} />.",
        "- Ingredient weight: <Weight value={500} /> flour",
        "- Liquid: <Volume value={250} /> milk",
        "- Pan size: Use a <Length value={20} /> round pan",
        "",
        "User request:",
        userPrompt,
      ].join("\n"),
      temperature: 0.4,
    });

    const cleaned = (text || "").trim();
    return { mdx: cleaned } satisfies Result;
  });

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
      prompt: [
        "Rewrite this recipe for an absolute beginner.",
        "Keep it short and friendly. Use:",
        "- A simple title",
        "- An ingredients list",
        "- Numbered steps",
        "- Optional tips",
        "",
        "Output MDX only. Do NOT include import statements.",
        "You can use these globally available MDX components without importing:",
        "- <Temperature value={numberInCelsius} />",
        "- <Weight value={grams} />",
        "- <Volume value={milliliters} />",
        "- <Length value={centimeters} />",
        "",
        "Usage examples (copy exact tag names; no imports):",
        "- Preheat oven: Preheat to <Temperature value={180} />.",
        "- Ingredient weight: <Weight value={500} /> flour",
        "- Liquid: <Volume value={250} /> milk",
        "- Pan size: Use a <Length value={20} /> round pan",
        "",
        "When possible, keep original quantities from the page.",
        "",
        "--- PAGE CONTENT START ---",
        pageMarkdown,
        "--- PAGE CONTENT END ---",
      ].join("\n"),
      temperature: 0.3,
    });

    const cleaned = (text || "").trim();
    return { mdx: cleaned } satisfies Result;
  });

export const Route = createFileRoute("/")({
  component: App,
  validateSearch: (search: Record<string, unknown>) => ({
    url: (search.url as string) || "",
    prompt: (search.prompt as string) || "",
  }),
});

function App() {
  const { url, prompt } = Route.useSearch() as { url: string; prompt: string };
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mdx, setMdx] = useState<string>("");
  const [inputUrl, setInputUrl] = useState(url);
  const [inputPrompt, setInputPrompt] = useState(prompt);
  const getCacheKey = (u: string) => `parsnip-cache::${encodeURIComponent(u)}`;
  const [system, setSystem] = useState<"metric" | "imperial">("metric");

  // Load saved unit preference
  useEffect(() => {
    try {
      const saved = localStorage.getItem("parsnip-units");
      if (saved === "metric" || saved === "imperial") setSystem(saved);
    } catch {}
  }, []);

  // Persist unit preference
  useEffect(() => {
    try {
      localStorage.setItem("parsnip-units", system);
    } catch {}
  }, [system]);

  const tempUnit = system === "imperial" ? "fahrenheit" : "celsius" as const;

  useEffect(() => {
    let cancelled = false;
    async function run() {
      if (!url && !prompt) return;
      // Try cache first to avoid redundant requests on reload
      if (url) {
        try {
          const raw = localStorage.getItem(getCacheKey(url));
          if (raw) {
            const cached = JSON.parse(raw) as { mdx?: string };
            if (cached?.mdx) {
              if (!cancelled) {
                setMdx(cached.mdx);
                setError(null);
                setLoading(false);
              }
              return;
            }
          }
        } catch {}
      }

      setLoading(true);
      setError(null);
      setMdx("");
      try {
        if (url) {
          const res = await processRecipe({ data: { url } });
          if (!cancelled) {
            setMdx(res.mdx);
            try {
              localStorage.setItem(
                getCacheKey(url),
                JSON.stringify({ mdx: res.mdx, ts: Date.now() }),
              );
            } catch {}
          }
        } else if (prompt) {
          const res = await generateFromPrompt({ data: { prompt } });
          if (!cancelled) setMdx(res.mdx);
        }
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
  }, [url, prompt]);

  const components = useMemo(() => {
    return { Temperature, Weight, Volume, Length } as Record<string, any>;
  }, []);

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100">
      <div className="max-w-3xl mx-auto px-4 py-6">
        {!url && !prompt && (
          <>
            <div className="grid gap-6">
              <section className="rounded-lg border border-slate-800 bg-slate-800/40 p-4">
                <h2 className="text-lg font-semibold mb-2">Generate</h2>
                <p className="text-slate-400 text-sm mb-3">
                  Tell the AI what you have or want (e.g. "I have chicken, rice, broccoli"). It will invent a simple recipe.
                </p>
                <div className="flex gap-2">
                  <input
                    className="flex-1 rounded-md border border-slate-700 bg-slate-800 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
                    placeholder="I have eggs, spinach, and feta..."
                    value={inputPrompt}
                    onChange={(e) => setInputPrompt(e.target.value)}
                  />
                  <a
                    href={`/?prompt=${encodeURIComponent(inputPrompt || "")}`}
                    className="rounded-md bg-cyan-600 hover:bg-cyan-500 px-4 py-2 text-sm font-medium"
                  >
                    Generate
                  </a>
                </div>
              </section>

              <section className="rounded-lg border border-slate-800 bg-slate-800/40 p-4">
                <h2 className="text-lg font-semibold mb-2">Import</h2>
                <p className="text-slate-400 text-sm mb-3">
                  Paste a recipe URL to simplify it for beginners.
                </p>
                <div className="flex gap-2">
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
                    Import
                  </a>
                </div>
                <div className="text-slate-500 text-xs mt-2">
                  Example: <code>/?url=https://www.allrecipes.com/recipe/24074/alysias-basic-meat-lasagna/</code>
                </div>
              </section>
            </div>
          </>
        )}

        {(url || prompt) && (
          <TemperatureProvider unit={tempUnit}>
            <WeightProvider unit={system}>
              <VolumeProvider unit={system}>
                <LengthProvider unit={system}>
                  <div className="flex justify-end mb-4">
                    <div className="inline-flex rounded-md bg-slate-800 p-1">
                      <button
                        onClick={() => setSystem("metric")}
                        className={`px-3 py-1 text-sm rounded ${
                          system === "metric"
                            ? "bg-cyan-600 text-white"
                            : "text-slate-300 hover:text-white"
                        }`}
                        aria-pressed={system === "metric"}
                      >
                        Metric (°C)
                      </button>
                      <button
                        onClick={() => setSystem("imperial")}
                        className={`px-3 py-1 text-sm rounded ${
                          system === "imperial"
                            ? "bg-cyan-600 text-white"
                            : "text-slate-300 hover:text-white"
                        }`}
                        aria-pressed={system === "imperial"}
                      >
                        Imperial (°F)
                      </button>
                    </div>
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
                </LengthProvider>
              </VolumeProvider>
            </WeightProvider>
          </TemperatureProvider>
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
