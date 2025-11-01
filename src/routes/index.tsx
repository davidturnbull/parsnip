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
import { Temperature } from "@/components/Temperature";
import { Weight } from "@/components/Weight";
import { Volume } from "@/components/Volume";
import { Length } from "@/components/Length";
import { useSettings, getLanguageLabel, getRegionMeta } from "@/components/Settings";
import dedent from "dedent";

type Result = {
  mdx: string;
};

const generateFromPrompt = createServerFn({ method: "POST" })
  .inputValidator((d: { prompt: string; language?: string; region?: string; languageLabel?: string; regionLabel?: string; regionFlag?: string }) => d)
  .handler(async ({ data }) => {
    const userPrompt = (data?.prompt || "").trim();
    if (!userPrompt) {
      throw new Error("Missing prompt");
    }

    const { text } = await generateText({
      model: openai("gpt-4o-mini"),
      prompt: dedent`\
        Create a simple, beginner-friendly recipe from this request.
        Keep it short and friendly. Use:
        - A simple title
        - An ingredients list
        - Numbered steps
        - Optional tips

        Language: ${data?.languageLabel || data?.language || 'English'} (${data?.language || 'en'})
        Region: ${data?.regionLabel || data?.region || 'United States'} ${data?.regionFlag || '🇺🇸'}
        Use the specified language for all text. Prefer regional terminology/spelling for the given region when relevant.

        Output MDX only. Do NOT include import statements.
        You can use these globally available MDX components without importing:
        - <Temperature value={numberInCelsius} />
        - <Weight value={grams} />
        - <Volume value={milliliters} />
        - <Length value={centimeters} />

        Usage examples (copy exact tag names; no imports):
        - Preheat oven: Preheat to <Temperature value={180} />.
        - Ingredient weight: <Weight value={500} /> flour
        - Liquid: <Volume value={250} /> milk
        - Pan size: Use a <Length value={20} /> round pan

        User request:
        ${userPrompt}
      `,
      temperature: 0.4,
    });

    const cleaned = (text || "").trim();
    return { mdx: cleaned } satisfies Result;
  });

const processRecipe = createServerFn({ method: "POST" })
  .inputValidator((d: { url: string; context?: string; language?: string; region?: string; languageLabel?: string; regionLabel?: string; regionFlag?: string }) => d)
  .handler(async ({ data }) => {
    const url = data?.url;
    const context = (data?.context || "").trim();
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
      prompt: dedent`\
        Rewrite this recipe for an absolute beginner.
        Keep it short and friendly. Use:
        - A simple title
        - An ingredients list
        - Numbered steps
        - Optional tips

        ${context ? `Consider these preferences and adapt the recipe: ${context}` : ""}

        Language: ${data?.languageLabel || data?.language || 'English'} (${data?.language || 'en'})
        Region: ${data?.regionLabel || data?.region || 'United States'} ${data?.regionFlag || '🇺🇸'}
        Use the specified language for all text. Prefer regional terminology/spelling for the given region when relevant.

        Output MDX only. Do NOT include import statements.
        You can use these globally available MDX components without importing:
        - <Temperature value={numberInCelsius} />
        - <Weight value={grams} />
        - <Volume value={milliliters} />
        - <Length value={centimeters} />

        Usage examples (copy exact tag names; no imports):
        - Preheat oven: Preheat to <Temperature value={180} />.
        - Ingredient weight: <Weight value={500} /> flour
        - Liquid: <Volume value={250} /> milk
        - Pan size: Use a <Length value={20} /> round pan

        When possible, keep original quantities from the page.

        --- PAGE CONTENT START ---
        ${pageMarkdown}
        --- PAGE CONTENT END ---
      `,
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
    context: (search.context as string) || "",
  }),
});

function App() {
  const { url, prompt, context } = Route.useSearch() as {
    url: string;
    prompt: string;
    context: string;
  };
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mdx, setMdx] = useState<string>("");
  const [inputUrl, setInputUrl] = useState(url);
  const [inputPrompt, setInputPrompt] = useState(prompt);
  const [inputContext, setInputContext] = useState(context);
  const getCacheKey = (u: string, c?: string) =>
    `parsnip-cache::${encodeURIComponent(u)}::${encodeURIComponent(c || "")}`;
  // Unit providers and settings are now handled globally in the root layout
  const { language, region } = useSettings();

  useEffect(() => {
    let cancelled = false;
    async function run() {
      if (!url && !prompt) return;
      // Try cache first to avoid redundant requests on reload
      if (url) {
        try {
          const raw = localStorage.getItem(getCacheKey(url, context));
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
          const { label: regionLabel, flag: regionFlag } = getRegionMeta(region as any);
          const languageLabel = getLanguageLabel(language as any);
          const res = await processRecipe({ data: { url, context, language, region, languageLabel, regionLabel, regionFlag } });
          if (!cancelled) {
            setMdx(res.mdx);
            try {
              localStorage.setItem(
                getCacheKey(url, context),
                JSON.stringify({ mdx: res.mdx, ts: Date.now() }),
              );
            } catch {}
          }
        } else if (prompt) {
          const { label: regionLabel, flag: regionFlag } = getRegionMeta(region as any);
          const languageLabel = getLanguageLabel(language as any);
          const res = await generateFromPrompt({ data: { prompt, language, region, languageLabel, regionLabel, regionFlag } });
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
  }, [url, prompt, context]);

  const components = useMemo(() => {
    return { Temperature, Weight, Volume, Length } as Record<string, any>;
  }, []);

  return (
    <div className="min-h-screen">
      <div className="max-w-3xl mx-auto px-4 py-6">
        <div className="w-full flex items-center justify-center mb-6">
          <img src="/logo.png" alt="Parsnip logo" className="block h-16 w-16" />
          <span className="ml-3 text-3xl lowercase font-ui font-ui-heading text-primary-dark">
            parsnip
          </span>
        </div>
        {!url && !prompt && (
          <>
            <div className="grid gap-6">
              <section className="rounded-xl border border-surface-dark bg-surface p-5 shadow-sm">
                <h2 className="text-lg font-semibold mb-2 text-primary font-ui font-ui-heading">
                  Generate
                </h2>
                <p className="text-sm mb-3 text-primary-dark/70">
                  Tell the AI what you have or want (e.g. "I have chicken, rice,
                  broccoli"). It will invent a simple recipe.
                </p>
                <div className="flex gap-2">
                  <input
                    className="flex-1 rounded-md border border-surface-dark bg-surface px-3 py-2 text-sm text-primary-dark placeholder:text-primary-dark/60 focus:outline-none focus:ring-2 focus:ring-primary font-sans"
                    placeholder="I have eggs, spinach, and feta..."
                    value={inputPrompt}
                    onChange={(e) => setInputPrompt(e.target.value)}
                  />
                  {(() => {
                    const canGenerate = inputPrompt.trim().length > 0;
                    const href = canGenerate
                      ? `/?prompt=${encodeURIComponent(inputPrompt)}`
                      : "#";
                    return (
                      <a
                        role="button"
                        aria-disabled={!canGenerate}
                        onClick={(e) => {
                          if (!canGenerate) e.preventDefault();
                        }}
                        href={href}
                        className={`rounded-md px-4 py-2 text-sm font-medium text-surface font-ui ${
                          canGenerate
                            ? "bg-primary hover:bg-primary-dark"
                            : "bg-primary/40 cursor-not-allowed"
                        }`}
                      >
                        Generate
                      </a>
                    );
                  })()}
                </div>
              </section>

              <section className="rounded-xl border border-surface-dark bg-surface p-5 shadow-sm">
                <h2 className="text-lg font-semibold mb-2 text-primary font-ui font-ui-heading">
                  Import
                </h2>
                <p className="text-sm mb-3 text-primary-dark/70">
                  Paste a recipe URL to simplify it for beginners.
                </p>
                <div className="flex flex-col gap-3">
                  <div className="flex gap-2">
                    <input
                      className="flex-1 rounded-md border border-surface-dark bg-surface px-3 py-2 text-sm text-primary-dark placeholder:text-primary-dark/60 focus:outline-none focus:ring-2 focus:ring-primary font-sans"
                      placeholder="https://example.com/your-recipe"
                      value={inputUrl}
                      onChange={(e) => setInputUrl(e.target.value)}
                    />
                    {(() => {
                      const canImport = inputUrl.trim().length > 0;
                      const href = canImport
                        ? `/?url=${encodeURIComponent(inputUrl)}${
                            inputContext
                              ? `&context=${encodeURIComponent(inputContext)}`
                              : ""
                          }`
                        : "#";
                      return (
                        <a
                          role="button"
                          aria-disabled={!canImport}
                          onClick={(e) => {
                            if (!canImport) e.preventDefault();
                          }}
                          href={href}
                          className={`rounded-md px-4 py-2 text-sm font-medium text-surface font-ui ${
                            canImport
                              ? "bg-primary hover:bg-primary-dark"
                              : "bg-primary/40 cursor-not-allowed"
                          }`}
                        >
                          Import
                        </a>
                      );
                    })()}
                  </div>
                  <div>
                    <label className="block text-sm mb-1 text-primary-dark font-ui">
                      Additional context (optional)
                    </label>
                    <textarea
                      className="w-full min-h-20 rounded-md border border-surface-dark bg-surface px-3 py-2 text-sm text-primary-dark placeholder:text-primary-dark/60 focus:outline-none focus:ring-2 focus:ring-primary font-sans"
                      placeholder="Dietary requirements, substitutions, spice tolerance, allergies, tools available, etc."
                      value={inputContext}
                      onChange={(e) => setInputContext(e.target.value)}
                    />
                  </div>
                </div>
                <div className="text-xs mt-2 text-primary-dark/60">
                  Example:{" "}
                  <code>
                    /?url=https://www.allrecipes.com/recipe/24074/alysias-basic-meat-lasagna/
                  </code>
                </div>
              </section>
            </div>
          </>
        )}

        {(url || prompt) && (
          <>
            {loading && (
              <div className="animate-pulse rounded-md border border-surface-dark bg-surface/60 p-6 font-ui">
                Loading recipe and rewriting for beginners...
              </div>
            )}

            {error && (
              <div className="rounded-md border border-red-700 bg-red-50 p-4 text-red-800">
                {error}
              </div>
            )}

            {!loading && !error && mdx && (
              <article className="prose max-w-none prose-headings:text-primary prose-a:text-primary prose-strong:text-primary-dark">
                <MdxRenderer source={mdx} components={components} />
              </article>
            )}
          </>
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
          setComp(() => () => <pre className="text-red-700">{String(e)}</pre>);
      }
    }
    run();
    return () => {
      cancelled = true;
    };
  }, [source, components]);

  if (!Comp)
    return <div className="text-primary-dark/70 font-ui">Rendering…</div>;
  return (
    <MDXProvider components={components}>
      <Comp />
    </MDXProvider>
  );
}
