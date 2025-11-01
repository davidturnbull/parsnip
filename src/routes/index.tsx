import { createFileRoute } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { useEffect, useMemo, useState } from "react";
import type React from "react";
import { MDXProvider } from "@mdx-js/react";
import { evaluate } from "@mdx-js/mdx";
import * as mdxRuntime from "react/jsx-runtime";
import * as mdxDevRuntime from "react/jsx-dev-runtime";
import { generateText, tool, stepCountIs } from "ai";
import { openai } from "@ai-sdk/openai";
import { z } from "zod";
import { FirecrawlClient } from "@mendable/firecrawl-js";
import { Temperature } from "@/components/Temperature";
import { Weight } from "@/components/Weight";
import { Volume } from "@/components/Volume";
import { Length } from "@/components/Length";
import { useSettings, getLanguageLabel, getRegionMeta } from "@/components/Settings";
import { usePaymentStatus } from "@/hooks/usePaymentStatus";
import { Paywall } from "@/components/PaywallOverlay";
import { verifyPayment } from "@/api/stripe";
import dedent from "dedent";

type Result = {
  mdx: string;
};

const webSearch = tool({
  description: "Search the web for up-to-date information about recipes, ingredients, cooking techniques, dietary requirements, substitutions, alternative ingredients, cooking methods, and other relevant culinary information. Use this tool to research recipe options and gather information before generating a recipe.",
  inputSchema: z.object({
    query: z.string().min(1).max(200).describe("The search query to find relevant recipe information, ingredient substitutions, cooking techniques, or dietary considerations"),
  }),
  execute: async ({ query }) => {
    const firecrawl = new FirecrawlClient({
      // Reads FIRECRAWL_API_KEY from env by default
    });

    try {
      const searchResponse = await firecrawl.search(query, {
        limit: 5,
        sources: ["web"],
        scrapeOptions: {
          formats: ["markdown"],
          onlyMainContent: true,
        },
      });

      if (!searchResponse || !searchResponse.success || !searchResponse.data?.web || searchResponse.data.web.length === 0) {
        return {
          results: [],
          message: "No search results found",
        };
      }

      return {
        results: searchResponse.data.web.map((result: any) => ({
          title: result.title || result.metadata?.title || "Untitled",
          url: result.url || result.metadata?.sourceURL || "",
          content: result.markdown?.slice(0, 1000) || result.description?.slice(0, 1000) || "",
          publishedDate: result.metadata?.publishedDate,
        })),
      };
    } catch (error) {
      return {
        results: [],
        message: `Search failed: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  },
});

// Fun messages shown while recipes are loading
const LOADING_MESSAGES = [
  "Gathering ingredients from the internet pantry…",
  "Asking the garlic to play nice…",
  "Counting grains of rice (not all of them)…",
  "Negotiating with stubborn noodles…",
  "Teaching onions to cry on cue…",
  "Convincing the pan to behave…",
  "Drawing tiny hats on mushrooms…",
  "Telling the oven a hot secret…",
  "Politely measuring a pinch of chaos…",
  "Checking if the spoon is left‑ or right‑handed…",
  "Bribing the tomatoes with sunshine…",
  "Explaining thermodynamics to a frozen pea…",
  "Teaching the salt shaker to count…",
  "Persuading butter it's not that cold…",
  "Consulting with a wise old bay leaf…",
  "Asking the whisk about its life goals…",
  "Negotiating a truce between sweet and savory…",
  "Reminding the timer what it means to be patient…",
  "Giving pep talks to hesitant potatoes…",
  "Calibrating the spiciness-o-meter…",
  "Organizing a meeting for all the herbs…",
  "Checking if carrots dream of being orange…",
  "Explaining to milk why it shouldn't be nervous…",
  "Setting up playdates for the vegetables…",
  "Asking the cheese what it wants to be when it grows up…",
  "Teaching proper posture to a droopy lettuce leaf…",
  "Negotiating flavor boundaries with the pepper…",
  "Giving the oven mitts a confidence boost…",
  "Asking the fridge what it saw last night…",
  "Teaching the measuring cup to tell better jokes…",
  "Consulting ancient scrolls about bread rising…",
  "Convincing the eggs they're ready for this…",
  "Negotiating portion sizes with hungry ingredients…",
  "Asking the cutting board if it's seen any action lately…",
  "Teaching proper manners to a rowdy bunch of peppers…",
  "Reminding the sugar it's supposed to be sweet…",
  "Consulting weather patterns for the perfect cooking day…",
  "Negotiating temperature with a reluctant burner…",
  "Asking the pasta if it prefers round or square shapes…",
  "Teaching the spatula some new dance moves…",
  "Convincing the flour it won't get all over everything…",
  "Asking the bay leaf if it's feeling fresh today…",
  "Negotiating with a stubborn jar lid…",
  "Teaching the lemon how to properly squeeze itself…",
  "Consulting the pepper mill about its life choices…",
  "Asking the chicken if it wants to be friends with the vegetables…",
  "Reminding the pan that hot and bothered are two different things…",
  "Teaching the timer about the relativity of time…",
  "Negotiating spice levels with a shy chili pepper…",
  "Asking the mixing bowl if it's ready for its close-up…",
  "Convincing the salt it doesn't need to be in every dish…",
  "Teaching the oven mitts to work together as a team…",
  "Asking the cutting board to stay sharp…",
  "Negotiating with a reluctant avocado about ripeness…",
  "Reminding the whisk it's not just for show…",
  "Teaching the measuring spoons the metric system…",
  "Consulting with a very old, very wise cinnamon stick…",
  "Asking the baking sheet if it's prepared for greatness…",
  "Negotiating space in the oven with a territorial casserole…",
  "Teaching the colander about life's draining moments…",
  "Convincing the garlic press it's not a torture device…",
  "Asking the paring knife if it feels up to the task…",
  "Reminding the zester it's time to shine…",
  "Teaching the stock pot about patience and depth…",
  "Negotiating with a very opinionated block of cheese…",
  "Asking the sieve if it's ready to filter some nonsense…",
  "Convincing the pastry brush it's not just for painting…",
  "Teaching the rolling pin to roll with the punches…",
  "Consulting with a mushroom about its cap-tivating personality…",
  "Asking the whisk attachment if it wants to join the party…",
  "Negotiating with a pack of wild herbs about their arrangement…",
  "Reminding the thermometer it's okay to have feelings…",
  "Teaching the grater about sharing and boundaries…",
  "Asking the pan lid if it knows how to keep a secret…",
  "Convincing the cookie sheet it's not just for cookies…",
  "Negotiating with a very emotional onion about layers…",
  "Teaching the chef's knife about precision and poetry…",
  "Asking the mixing spoon if it's ready to stir things up…",
  "Reminding the cooling rack that patience is a virtue…",
  "Consulting with a wise old potato about its life experience…",
  "Asking the parchment paper if it's ready to make a commitment…",
  "Negotiating temperature with a finicky ice cream maker…",
  "Teaching the juicer about extracting potential…",
  "Convincing the salad spinner it's not just for show…",
  "Asking the meat thermometer if it's feeling warm today…",
  "Reminding the sifter it's time to separate the wheat from the chaff…",
  "Teaching the garlic crusher about gentle persuasion…",
  "Negotiating with a very talkative bunch of parsley…",
  "Asking the steamer basket if it's ready to rise to the occasion…",
  "Convincing the mandoline it doesn't need to be so sharp…",
  "Teaching the trivet about supporting roles in life…",
  "Consulting with a cucumber about its refreshing attitude…",
  "Asking the pastry cutter if it's ready to make an impact…",
  "Negotiating with a pack of confused ice cubes…",
  "Reminding the Dutch oven it's not just Dutch, it's international…",
  "Teaching the slotted spoon about making choices…",
  "Asking the baster if it's ready to take the heat…",
  "Convincing the skewers they're more than just pointy sticks…",
  "Negotiating with a very dramatic bunch of kale…",
  "Teaching the cake tester about patience and precision…",
  "Asking the fish spatula if it's feeling flexible today…",
  "Reminding the rubber spatula it's time to scrape the bottom of the barrel…",
];

const generateFromPrompt = createServerFn({ method: "POST" })
  .inputValidator((d: { prompt: string; context?: string; language?: string; region?: string; languageLabel?: string; regionLabel?: string; regionFlag?: string }) => d)
  .handler(async ({ data }) => {
    const userPrompt = (data?.prompt || "").trim();
    if (!userPrompt) {
      throw new Error("Missing prompt");
    }

    const { text } = await generateText({
      model: openai("gpt-4o-mini"),
      tools: {
        webSearch,
      },
      stopWhen: stepCountIs(5),
      prompt: dedent`\
        ## Context

        Parsnip is an AI agent that writes and rewrite recipes.
        ${data?.context ? `\n### **CRITICAL: User Requirements**

The following user-provided context MUST be strictly adhered to when generating the recipe:
${data.context}

**IMPORTANT:** Every aspect of this context (dietary restrictions, allergies, preferences, tools available, etc.) must be carefully considered and incorporated into the recipe.` : ""}

        ## Important: Web Search Requirement

        **CRITICAL:** Before generating any recipe, you MUST use the webSearch tool to search for relevant recipe information. You should:
        
        - Search for 2-4 different recipe variations or approaches based on the user's prompt
        - Search for ingredient substitutions, alternatives, or dietary considerations if mentioned in the context
        - Search for cooking techniques or methods relevant to the recipe
        - Search for any specific requirements, allergies, or dietary restrictions mentioned
        
        Only after gathering information from web searches should you generate the final recipe. This ensures the recipe is informed by current culinary knowledge and best practices.

        ## Audience

        Your target audience has the following combination of characteristics:

        - adult
        - absolute beginners to the world of cooking
        - struggle to comprehend traditional recipes
        - avoids cooking because it fills them with anxiety
        - completely unfamiliar with cooking jargon
        - easily gets lost and confused while following recipes

        ## Guidelines

        ### Style

        - Use sentence case for headings
        - Prefer plain, concrete language
        - Use short, simple language

        ### Recipe names

        - Only specify the concrete name of the recipe
        - Do not include any subjective qualifiers (e.g., "best", etc)

        ### Tools

        - Specify the tool before the quantity of the tool
        - If only one instance of a tool is required, don't specify a quantity
        - Sort tools from most fundamental to least fundamental

        ### Ingredients

        - Specify the ingredient *before* the quantity of the ingredient
        - Sort ingredients from most fundamental (e.g., protein) to least fundamental (e.g., garnish)
        - If a recipe is made up of multiple components (e.g., a protein and a marinade):
            - Organize the ingredients by component
            - Use a h3 sub-heading for each component name
        - If an ingredient is used in multiple components, specify the ingredient for each component (with the appropriate quantity)

        ### Steps

        - Ensure that each step focuses on one specific action
        - For recipes with multiple components or more than 15 total steps:
            - Break steps into logical sections using numbered h3 sub-headings (e.g., "### Step 1: Make the rice")
            - Match section names to the ingredient components when possible
            - Further break down cooking processes into focused phases (e.g., "Cook the chicken", "Cook the vegetables", "Combine everything")
            - Keep each section to approximately 8 steps or fewer to avoid overwhelming the reader
            - Always include a final numbered step section for serving if applicable
            - Within each step section, use a numbered list that starts from 1
        - For simple recipes (15 steps or fewer), use a single numbered list without sections

        ### Units and measurements

        - ALWAYS use the globally available MDX components for ALL measurements
        - Available components (do NOT import these):
            - <Temperature value={numberInCelsius} />
            - <Weight value={grams} />
            - <Volume value={milliliters} />
            - <Length value={centimeters} />
        - CRITICAL: All numeric values MUST be provided in metric units only:
            - Temperature: Celsius only
            - Weight: grams only
            - Volume: milliliters only
            - Length: centimeters only
        - NEVER provide alternative unit measurements (e.g., do NOT write "cups" or "tablespoons" or "inches" alongside metric)
        - NEVER write unit measurements as plain text (e.g., "500g" or "2 cups" or "180°C")
        - The MDX components will handle unit conversion automatically for the user
        - Ensure MDX syntax is perfectly correct with proper opening and closing tags
        - Do NOT export these components
        - Examples:
            - Correct: Preheat oven to <Temperature value={180} />.
            - Correct: <Weight value={500} /> flour
            - Correct: <Volume value={250} /> milk
            - Correct: Use a <Length value={20} /> round pan
            - Incorrect: 500g flour
            - Incorrect: 2 cups (500ml) milk
            - Incorrect: 180°C (350°F)
            - Incorrect: 20cm / 8 inch pan

        ### Output format

        - Output MUST contain only the recipe content
        - Start directly with the recipe heading (e.g., "# Scrambled eggs")
        - End with the final line of actual recipe content
        - Do NOT include any introductory text before the recipe
        - Do NOT include any concluding remarks, comments, or explanations after the recipe
        - Do NOT include phrases like "Here's the recipe:" or "This recipe..."

        ## Examples

        ### Example 1: Simple recipe (no sections needed)

        **Input:** "scrambled eggs"

        **Output:**

        # Scrambled eggs

        ## Tools

        - Stove
        - Small bowl
        - Fork
        - Non-stick pan
        - Spatula

        ## Ingredients

        - Eggs (2)
        - Butter (<Weight value={15} />)
        - Salt (a pinch)

        ## Steps

        1. Crack the eggs into the small bowl by tapping each egg on the counter until it cracks, then pulling the shell apart over the bowl.

        2. Use the fork to mix the eggs in the bowl until the yellow and clear parts are completely combined.

        3. Turn the stove dial to medium heat.

        4. Put the butter in the pan.

        5. Wait until the butter melts and starts to bubble slightly.

        6. Pour the mixed eggs from the bowl into the pan.

        7. Let the eggs sit without touching them for 10 seconds.

        8. Use the spatula to gently push the eggs from the edge of the pan toward the center.

        9. Keep pushing the eggs slowly every few seconds as they start to look solid instead of liquid.

        10. Turn off the stove when the eggs still look slightly wet and shiny.

        11. Sprinkle the salt on top of the eggs.

        12. Use the spatula to move the eggs from the pan onto a plate.

        ### Example 2: Complex recipe with multiple components (sections required)

        **Input:** "chicken stir fry with rice"

        **Output:**

        # Chicken stir fry with rice

        ## Tools

        - Stove
        - Medium pot with lid
        - Measuring cup
        - Large pan or wok
        - Cutting board
        - Sharp knife
        - Large spoon or spatula
        - Small bowl

        ## Ingredients

        ### Rice

        - White rice (<Weight value={200} />)
        - Water (<Volume value={500} />)
        - Salt (a pinch)

        ### Stir fry

        - Chicken breast (2 pieces, about <Weight value={400} />)
        - Broccoli (<Weight value={300} />)
        - Carrot (1)
        - Garlic (2 cloves)
        - Vegetable oil (<Volume value={45} />)
        - Soy sauce (<Volume value={45} />)
        - Water (<Volume value={30} />)
        - Salt (a pinch)

        ## Steps

        ### Step 1: Make the rice

        1. Put the rice in the measuring cup.

        2. Pour the rice into the medium pot.

        3. Add the water to the pot with the rice.

        4. Add a pinch of salt to the pot.

        5. Put the pot on the stove and turn the heat to high.

        6. Wait until you see bubbles rising to the top of the water.

        7. Turn the heat down to low and put the lid on the pot.

        8. Set a timer for 15 minutes and leave the pot alone.

        ### Step 2: Prepare the stir fry ingredients

        1. While the rice cooks, place the chicken on the cutting board.

        2. Cut the chicken into pieces about the size of your thumb.

        3. Cut the carrot into thin circles, like coins.

        4. Break the broccoli into small pieces about the size of a golf ball.

        5. Peel the papery skin off the garlic cloves.

        6. Cut the garlic into very small pieces.

        ### Step 3: Cook the chicken

        1. Put the large pan on the stove and turn the heat to medium-high.

        2. Pour <Volume value={30} /> of the oil into the pan.

        3. Wait 1 minute for the oil to heat up.

        4. Put the chicken pieces in the pan and spread them out.

        5. Let the chicken cook without moving it for 2 minutes.

        6. Use the spoon to flip each piece of chicken over.

        7. Cook for another 2 minutes without moving the chicken.

        8. Use the spoon to move the chicken to the small bowl.

        ### Step 4: Cook the vegetables

        1. Pour the remaining <Volume value={15} /> of oil into the same pan.

        2. Add the garlic pieces to the pan.

        3. Stir the garlic with the spoon for 30 seconds.

        4. Add the carrot circles to the pan.

        5. Stir everything for 2 minutes.

        6. Add the broccoli pieces to the pan.

        7. Add the <Volume value={30} /> of water to the pan.

        8. Stir everything for 3 minutes.

        ### Step 5: Combine everything

        1. Put the chicken back into the pan with the vegetables.

        2. Pour the soy sauce over everything in the pan.

        3. Add a pinch of salt.

        4. Stir everything together for 1 minute.

        5. Turn off the stove under the pan.

        6. Turn off the stove under the rice pot.

        ### Step 6: Serve

        1. Use the spoon to scoop rice onto a plate.

        2. Use the spoon to put the chicken and vegetables on top of the rice.

        ### Example 3: Moderately complex recipe (sections improve clarity)

        **Input:** "grilled cheese sandwich and tomato soup"

        **Output:**

        # Grilled cheese sandwich and tomato soup

        ## Tools

        - Stove
        - Medium pot
        - Can opener
        - Cutting board
        - Butter knife
        - Large pan
        - Spatula

        ## Ingredients

        ### Soup

        - Canned tomato soup (1 can, <Weight value={400} />)
        - Milk (<Volume value={120} />)

        ### Sandwich

        - Bread (2 slices)
        - Cheddar cheese (2 slices, about <Weight value={50} />)
        - Butter (<Weight value={30} />)

        ## Steps

        ### Step 1: Make the soup

        1. Use the can opener to open the can of tomato soup.

        2. Pour the soup from the can into the medium pot.

        3. Fill the empty soup can halfway with milk.

        4. Pour the milk into the pot with the soup.

        5. Put the pot on the stove and turn the heat to medium.

        6. Stir the soup every minute until you see small bubbles around the edges.

        7. Turn the heat down to low.

        ### Step 2: Make the sandwich

        1. Place the 2 slices of bread on the cutting board.

        2. Put 1 slice of cheese on top of one piece of bread.

        3. Put the second slice of cheese on top of the first slice.

        4. Place the second piece of bread on top of the cheese.

        5. Use the butter knife to spread <Weight value={15} /> of butter on the top slice of bread.

        6. Put the large pan on the stove and turn the heat to medium.

        7. Wait 1 minute for the pan to heat up.

        8. Carefully pick up the sandwich and place it in the pan with the buttered side down.

        9. Use the butter knife to spread the remaining <Weight value={15} /> of butter on the top slice of bread that is now facing up.

        10. Let the sandwich cook for 3 minutes without moving it.

        11. Use the spatula to flip the sandwich over.

        12. Let the sandwich cook for another 3 minutes.

        13. Turn off the stove under the pan.

        ### Step 3: Serve

        1. Use the spatula to move the sandwich to a plate.

        2. Turn off the stove under the soup pot.

        3. Pour the soup into a bowl.

        ---

        Language: ${data?.languageLabel || data?.language || 'English'} (${data?.language || 'en'})
        Region: ${data?.regionLabel || data?.region || 'United States'} ${data?.regionFlag || '🇺🇸'}
        Use the specified language for all text. Prefer regional terminology/spelling for the given region when relevant.

        Now produce the recipe that follows all rules above.
        Input: "${userPrompt}"
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
      tools: {
        webSearch,
      },
      stopWhen: stepCountIs(5),
      prompt: dedent`\
        ## Context

        Parsnip is an AI agent that writes and rewrite recipes.
        ${context ? `\n### **CRITICAL: User Requirements**

The following user-provided context MUST be strictly adhered to when rewriting the recipe:
${context}

**IMPORTANT:** Every aspect of this context (dietary restrictions, allergies, preferences, tools available, etc.) must be carefully considered and incorporated into the recipe.` : ""}

        ## Important: Web Search Requirement

        **IMPORTANT:** Use the webSearch tool to search for relevant information if needed, especially:
        
        - Search for ingredient substitutions or alternatives based on the user's context
        - Search for cooking techniques or methods that might be relevant
        - Search for dietary requirements, allergies, or modifications if mentioned in the context
        - Search for regional variations or cooking styles relevant to the recipe
        
        Use web search to gather additional context before rewriting the recipe to ensure it meets all requirements.

        ## Audience

        Your target audience has the following combination of characteristics:

        - adult
        - absolute beginners to the world of cooking
        - struggle to comprehend traditional recipes
        - avoids cooking because it fills them with anxiety
        - completely unfamiliar with cooking jargon
        - easily gets lost and confused while following recipes

        ## Guidelines

        ### Style

        - Use sentence case for headings
        - Prefer plain, concrete language
        - Use short, simple language

        ### Recipe names

        - Only specify the concrete name of the recipe
        - Do not include any subjective qualifiers (e.g., "best", etc)

        ### Tools

        - Specify the tool before the quantity of the tool
        - If only one instance of a tool is required, don't specify a quantity
        - Sort tools from most fundamental to least fundamental

        ### Ingredients

        - Specify the ingredient *before* the quantity of the ingredient
        - Sort ingredients from most fundamental (e.g., protein) to least fundamental (e.g., garnish)
        - If a recipe is made up of multiple components (e.g., a protein and a marinade):
            - Organize the ingredients by component
            - Use a h3 sub-heading for each component name
        - If an ingredient is used in multiple components, specify the ingredient for each component (with the appropriate quantity)

        ### Steps

        - Ensure that each step focuses on one specific action
        - For recipes with multiple components or more than 15 total steps:
            - Break steps into logical sections using numbered h3 sub-headings (e.g., "### Step 1: Make the rice")
            - Match section names to the ingredient components when possible
            - Further break down cooking processes into focused phases (e.g., "Cook the chicken", "Cook the vegetables", "Combine everything")
            - Keep each section to approximately 8 steps or fewer to avoid overwhelming the reader
            - Always include a final numbered step section for serving if applicable
            - Within each step section, use a numbered list that starts from 1
        - For simple recipes (15 steps or fewer), use a single numbered list without sections

        ### Units and measurements

        - ALWAYS use the globally available MDX components for ALL measurements
        - Available components (do NOT import these):
            - <Temperature value={numberInCelsius} />
            - <Weight value={grams} />
            - <Volume value={milliliters} />
            - <Length value={centimeters} />
        - CRITICAL: All numeric values MUST be provided in metric units only:
            - Temperature: Celsius only
            - Weight: grams only
            - Volume: milliliters only
            - Length: centimeters only
        - NEVER provide alternative unit measurements (e.g., do NOT write "cups" or "tablespoons" or "inches" alongside metric)
        - NEVER write unit measurements as plain text (e.g., "500g" or "2 cups" or "180°C")
        - The MDX components will handle unit conversion automatically for the user
        - Ensure MDX syntax is perfectly correct with proper opening and closing tags
        - Do NOT export these components
        - Examples:
            - Correct: Preheat oven to <Temperature value={180} />.
            - Correct: <Weight value={500} /> flour
            - Correct: <Volume value={250} /> milk
            - Correct: Use a <Length value={20} /> round pan
            - Incorrect: 500g flour
            - Incorrect: 2 cups (500ml) milk
            - Incorrect: 180°C (350°F)
            - Incorrect: 20cm / 8 inch pan

        ### Output format

        - Output MUST contain only the recipe content
        - Start directly with the recipe heading (e.g., "# Scrambled eggs")
        - End with the final line of actual recipe content
        - Do NOT include any introductory text before the recipe
        - Do NOT include any concluding remarks, comments, or explanations after the recipe
        - Do NOT include phrases like "Here's the recipe:" or "This recipe..."

        ## Examples

        ### Example 1: Simple recipe (no sections needed)

        **Input:** "scrambled eggs"

        **Output:**

        # Scrambled eggs

        ## Tools

        - Stove
        - Small bowl
        - Fork
        - Non-stick pan
        - Spatula

        ## Ingredients

        - Eggs (2)
        - Butter (<Weight value={15} />)
        - Salt (a pinch)

        ## Steps

        1. Crack the eggs into the small bowl by tapping each egg on the counter until it cracks, then pulling the shell apart over the bowl.

        2. Use the fork to mix the eggs in the bowl until the yellow and clear parts are completely combined.

        3. Turn the stove dial to medium heat.

        4. Put the butter in the pan.

        5. Wait until the butter melts and starts to bubble slightly.

        6. Pour the mixed eggs from the bowl into the pan.

        7. Let the eggs sit without touching them for 10 seconds.

        8. Use the spatula to gently push the eggs from the edge of the pan toward the center.

        9. Keep pushing the eggs slowly every few seconds as they start to look solid instead of liquid.

        10. Turn off the stove when the eggs still look slightly wet and shiny.

        11. Sprinkle the salt on top of the eggs.

        12. Use the spatula to move the eggs from the pan onto a plate.

        ### Example 2: Complex recipe with multiple components (sections required)

        **Input:** "chicken stir fry with rice"

        **Output:**

        # Chicken stir fry with rice

        ## Tools

        - Stove
        - Medium pot with lid
        - Measuring cup
        - Large pan or wok
        - Cutting board
        - Sharp knife
        - Large spoon or spatula
        - Small bowl

        ## Ingredients

        ### Rice

        - White rice (<Weight value={200} />)
        - Water (<Volume value={500} />)
        - Salt (a pinch)

        ### Stir fry

        - Chicken breast (2 pieces, about <Weight value={400} />)
        - Broccoli (<Weight value={300} />)
        - Carrot (1)
        - Garlic (2 cloves)
        - Vegetable oil (<Volume value={45} />)
        - Soy sauce (<Volume value={45} />)
        - Water (<Volume value={30} />)
        - Salt (a pinch)

        ## Steps

        ### Step 1: Make the rice

        1. Put the rice in the measuring cup.

        2. Pour the rice into the medium pot.

        3. Add the water to the pot with the rice.

        4. Add a pinch of salt to the pot.

        5. Put the pot on the stove and turn the heat to high.

        6. Wait until you see bubbles rising to the top of the water.

        7. Turn the heat down to low and put the lid on the pot.

        8. Set a timer for 15 minutes and leave the pot alone.

        ### Step 2: Prepare the stir fry ingredients

        1. While the rice cooks, place the chicken on the cutting board.

        2. Cut the chicken into pieces about the size of your thumb.

        3. Cut the carrot into thin circles, like coins.

        4. Break the broccoli into small pieces about the size of a golf ball.

        5. Peel the papery skin off the garlic cloves.

        6. Cut the garlic into very small pieces.

        ### Step 3: Cook the chicken

        1. Put the large pan on the stove and turn the heat to medium-high.

        2. Pour <Volume value={30} /> of the oil into the pan.

        3. Wait 1 minute for the oil to heat up.

        4. Put the chicken pieces in the pan and spread them out.

        5. Let the chicken cook without moving it for 2 minutes.

        6. Use the spoon to flip each piece of chicken over.

        7. Cook for another 2 minutes without moving the chicken.

        8. Use the spoon to move the chicken to the small bowl.

        ### Step 4: Cook the vegetables

        1. Pour the remaining <Volume value={15} /> of oil into the same pan.

        2. Add the garlic pieces to the pan.

        3. Stir the garlic with the spoon for 30 seconds.

        4. Add the carrot circles to the pan.

        5. Stir everything for 2 minutes.

        6. Add the broccoli pieces to the pan.

        7. Add the <Volume value={30} /> of water to the pan.

        8. Stir everything for 3 minutes.

        ### Step 5: Combine everything

        1. Put the chicken back into the pan with the vegetables.

        2. Pour the soy sauce over everything in the pan.

        3. Add a pinch of salt.

        4. Stir everything together for 1 minute.

        5. Turn off the stove under the pan.

        6. Turn off the stove under the rice pot.

        ### Step 6: Serve

        1. Use the spoon to scoop rice onto a plate.

        2. Use the spoon to put the chicken and vegetables on top of the rice.

        ### Example 3: Moderately complex recipe (sections improve clarity)

        **Input:** "grilled cheese sandwich and tomato soup"

        **Output:**

        # Grilled cheese sandwich and tomato soup

        ## Tools

        - Stove
        - Medium pot
        - Can opener
        - Cutting board
        - Butter knife
        - Large pan
        - Spatula

        ## Ingredients

        ### Soup

        - Canned tomato soup (1 can, <Weight value={400} />)

        - Milk (<Volume value={120} />)

        ### Sandwich

        - Bread (2 slices)

        - Cheddar cheese (2 slices, about <Weight value={50} />)

        - Butter (<Weight value={30} />)

        ## Steps

        ### Step 1: Make the soup

        1. Use the can opener to open the can of tomato soup.

        2. Pour the soup from the can into the medium pot.

        3. Fill the empty soup can halfway with milk.

        4. Pour the milk into the pot with the soup.

        5. Put the pot on the stove and turn the heat to medium.

        6. Stir the soup every minute until you see small bubbles around the edges.

        7. Turn the heat down to low.

        ### Step 2: Make the sandwich

        1. Place the 2 slices of bread on the cutting board.

        2. Put 1 slice of cheese on top of one piece of bread.

        3. Put the second slice of cheese on top of the first slice.

        4. Place the second piece of bread on top of the cheese.

        5. Use the butter knife to spread <Weight value={15} /> of butter on the top slice of bread.

        6. Put the large pan on the stove and turn the heat to medium.

        7. Wait 1 minute for the pan to heat up.

        8. Carefully pick up the sandwich and place it in the pan with the buttered side down.

        9. Use the butter knife to spread the remaining <Weight value={15} /> of butter on the top slice of bread that is now facing up.

        10. Let the sandwich cook for 3 minutes without moving it.

        11. Use the spatula to flip the sandwich over.

        12. Let the sandwich cook for another 3 minutes.

        13. Turn off the stove under the pan.

        ### Step 3: Serve

        1. Use the spatula to move the sandwich to a plate.

        2. Turn off the stove under the soup pot.

        3. Pour the soup into a bowl.

        ---

        Language: ${data?.languageLabel || data?.language || 'English'} (${data?.language || 'en'})
        Region: ${data?.regionLabel || data?.region || 'United States'} ${data?.regionFlag || '🇺🇸'}
        Use the specified language for all text. Prefer regional terminology/spelling for the given region when relevant.

        Rewrite the following source into a recipe that follows all rules above while keeping original quantities when reasonable.
        --- PAGE CONTENT START ---
        ${pageMarkdown}
        --- PAGE CONTENT END ---
      `,
      temperature: 0.3,
    });

    const cleaned = (text || "").trim();
    return { mdx: cleaned } satisfies Result;
  });

const dumbDownRecipe = createServerFn({ method: "POST" })
  .inputValidator((d: { existingRecipe: string; originalPrompt?: string; originalUrl?: string; originalContext?: string; language?: string; region?: string; languageLabel?: string; regionLabel?: string; regionFlag?: string }) => d)
  .handler(async ({ data }) => {
    const existingRecipe = data?.existingRecipe || "";
    const originalPrompt = data?.originalPrompt || "";
    const originalUrl = data?.originalUrl || "";
    const originalContext = (data?.originalContext || "").trim();

    if (!existingRecipe) {
      throw new Error("Missing existing recipe");
    }

    const basePrompt = dedent`\
      ## Context

      Parsnip is an AI agent that writes and rewrite recipes.

      ## Important: Web Search Requirement

      **CRITICAL:** Before generating any recipe, you MUST use the webSearch tool to search for relevant recipe information. You should:
      
      - Search for 2-4 different recipe variations or approaches based on the user's prompt
      - Search for ingredient substitutions, alternatives, or dietary considerations if mentioned in the context
      - Search for cooking techniques or methods relevant to the recipe
      - Search for any specific requirements, allergies, or dietary restrictions mentioned
      
      Only after gathering information from web searches should you generate the final recipe. This ensures the recipe is informed by current culinary knowledge and best practices.

      ## Audience

      Your target audience has the following combination of characteristics:

      - adult
      - absolute beginners to the world of cooking
      - struggle to comprehend traditional recipes
      - avoids cooking because it fills them with anxiety
      - completely unfamiliar with cooking jargon
      - easily gets lost and confused while following recipes

      ## Guidelines

      ### Style

      - Use sentence case for headings
      - Prefer plain, concrete language
      - Use short, simple language

      ### Recipe names

      - Only specify the concrete name of the recipe
      - Do not include any subjective qualifiers (e.g., "best", etc)

      ### Tools

      - Specify the tool before the quantity of the tool
      - If only one instance of a tool is required, don't specify a quantity
      - Sort tools from most fundamental to least fundamental

      ### Ingredients

      - Specify the ingredient *before* the quantity of the ingredient
      - Sort ingredients from most fundamental (e.g., protein) to least fundamental (e.g., garnish)
      - If a recipe is made up of multiple components (e.g., a protein and a marinade):
          - Organize the ingredients by component
          - Use a h3 sub-heading for each component name
      - If an ingredient is used in multiple components, specify the ingredient for each component (with the appropriate quantity)

      ### Steps

      - Ensure that each step focuses on one specific action
      - For recipes with multiple components or more than 15 total steps:
          - Break steps into logical sections using numbered h3 sub-headings (e.g., "### Step 1: Make the rice")
          - Match section names to the ingredient components when possible
          - Further break down cooking processes into focused phases (e.g., "Cook the chicken", "Cook the vegetables", "Combine everything")
          - Keep each section to approximately 8 steps or fewer to avoid overwhelming the reader
          - Always include a final numbered step section for serving if applicable
          - Within each step section, use a numbered list that starts from 1
      - For simple recipes (15 steps or fewer), use a single numbered list without sections

      ### Units and measurements

      - ALWAYS use the globally available MDX components for ALL measurements
      - Available components (do NOT import these):
          - <Temperature value={numberInCelsius} />
          - <Weight value={grams} />
          - <Volume value={milliliters} />
          - <Length value={centimeters} />
      - CRITICAL: All numeric values MUST be provided in metric units only:
          - Temperature: Celsius only
          - Weight: grams only
          - Volume: milliliters only
          - Length: centimeters only
      - NEVER provide alternative unit measurements (e.g., do NOT write "cups" or "tablespoons" or "inches" alongside metric)
      - NEVER write unit measurements as plain text (e.g., "500g" or "2 cups" or "180°C")
      - The MDX components will handle unit conversion automatically for the user
      - Ensure MDX syntax is perfectly correct with proper opening and closing tags
      - Do NOT export these components
      - Examples:
          - Correct: Preheat oven to <Temperature value={180} />.
          - Correct: <Weight value={500} /> flour
          - Correct: <Volume value={250} /> milk
          - Correct: Use a <Length value={20} /> round pan
          - Incorrect: 500g flour
          - Incorrect: 2 cups (500ml) milk
          - Incorrect: 180°C (350°F)
          - Incorrect: 20cm / 8 inch pan

      ### Output format

      - Output MUST contain only the recipe content
      - Start directly with the recipe heading (e.g., "# Scrambled eggs")
      - End with the final line of actual recipe content
      - Do NOT include any introductory text before the recipe
      - Do NOT include any concluding remarks, comments, or explanations after the recipe
      - Do NOT include phrases like "Here's the recipe:" or "This recipe..."

      ---

      Language: ${data?.languageLabel || data?.language || 'English'} (${data?.language || 'en'})
      Region: ${data?.regionLabel || data?.region || 'United States'} ${data?.regionFlag || '🇺🇸'}
      Use the specified language for all text. Prefer regional terminology/spelling for the given region when relevant.
      ${originalContext ? `\n### **CRITICAL: User Requirements**

The following user-provided context MUST be strictly adhered to when simplifying the recipe:
${originalContext}

**IMPORTANT:** Every aspect of this context (dietary restrictions, allergies, preferences, tools available, etc.) must be carefully considered and maintained in the simplified version.` : ""}

      ## IMPORTANT: Simplify Further

      Below is a recipe that was previously generated for absolute beginners. However, the user has requested that you "dumb it down even further" because they still find it too complex or confusing.

      Your task is to rewrite this recipe to be EVEN MORE SIMPLE:
      - Use even simpler words (avoid any cooking terms that might be unfamiliar)
      - Break down steps into even smaller, more granular actions
      - Add more explicit guidance about what things should look like or feel like
      - Explain every single action in the most basic terms possible
      - Remove any assumptions about the user's prior knowledge
      - Make each step so simple that it feels like you're explaining to someone who has never seen a kitchen before

      --- ORIGINAL RECIPE START ---
      ${existingRecipe}
      --- ORIGINAL RECIPE END ---

      Now rewrite this recipe to be even simpler and more beginner-friendly, following all the guidelines above.
    `;

    const { text } = await generateText({
      model: openai("gpt-4o-mini"),
      tools: {
        webSearch,
      },
      stopWhen: stepCountIs(5),
      prompt: basePrompt,
      temperature: 0.4,
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
  const [loadingMsgIndex, setLoadingMsgIndex] = useState(() =>
    Math.floor(Math.random() * LOADING_MESSAGES.length),
  );
  const [dumbingDown, setDumbingDown] = useState(false);
  const getCacheKey = (u: string, c?: string) =>
    `parsnip-cache::${encodeURIComponent(u)}::${encodeURIComponent(c || "")}`;
  // Unit providers and settings are now handled globally in the root layout
  const { language, region, context: globalContext } = useSettings();
  const { hasPaid, markAsPaid, checkPaymentFromUrl } = usePaymentStatus();
  const combinedContext = useMemo(() => {
    const parts = [globalContext, context].map((s) => (s || "").trim()).filter(Boolean)
    return parts.join("\n")
  }, [globalContext, context]);

  useEffect(() => {
    const paymentInfo = checkPaymentFromUrl();
    if (paymentInfo?.success && paymentInfo.sessionId) {
      verifyPayment({ data: { sessionId: paymentInfo.sessionId } })
        .then((response) => {
          if (response?.paid) {
            markAsPaid();
            const url = new URL(window.location.href);
            url.searchParams.delete("payment");
            url.searchParams.delete("session_id");
            window.history.replaceState({}, "", url.toString());
          }
        })
        .catch((error) => {
          console.error("Payment verification failed:", error);
        });
    }
  }, [checkPaymentFromUrl, markAsPaid]);

  useEffect(() => {
    let cancelled = false;
    async function run() {
      if (!url && !prompt) return;
      // Try cache first to avoid redundant requests on reload
      if (url) {
        try {
          const raw = localStorage.getItem(getCacheKey(url, combinedContext));
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
          const res = await processRecipe({ data: { url, context: combinedContext, language, region, languageLabel, regionLabel, regionFlag } });
          if (!cancelled) {
            setMdx(res.mdx);
            try {
              localStorage.setItem(
                getCacheKey(url, combinedContext),
                JSON.stringify({ mdx: res.mdx, ts: Date.now() }),
              );
            } catch {}
          }
        } else if (prompt) {
          const { label: regionLabel, flag: regionFlag } = getRegionMeta(region as any);
          const languageLabel = getLanguageLabel(language as any);
          const res = await generateFromPrompt({ data: { prompt, context: combinedContext, language, region, languageLabel, regionLabel, regionFlag } });
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
  }, [url, prompt, context, language, region, globalContext, combinedContext]);

  // Rotate whimsical loading messages while loading
  useEffect(() => {
    if (!loading) return;
    // Immediately pick a new message when loading starts
    setLoadingMsgIndex((prev) => {
      if (LOADING_MESSAGES.length < 2) return prev;
      let next = prev;
      while (next === prev) next = Math.floor(Math.random() * LOADING_MESSAGES.length);
      return next;
    });
    const id = setInterval(() => {
      setLoadingMsgIndex((prev) => {
        if (LOADING_MESSAGES.length < 2) return prev;
        let next = prev;
        while (next === prev) next = Math.floor(Math.random() * LOADING_MESSAGES.length);
        return next;
      });
    }, 3000);
    return () => clearInterval(id);
  }, [loading]);

  const components = useMemo(() => {
    const A = (props: React.AnchorHTMLAttributes<HTMLAnchorElement>) => {
      const href = props.href || '';
      const isExternal = /^https?:\/\//i.test(href);
      const target = isExternal ? '_blank' : props.target;
      const rel = isExternal ? 'noopener noreferrer' : props.rel;
      return <a {...props} target={target} rel={rel} />;
    };
    return { Temperature, Weight, Volume, Length, a: A } as Record<string, any>;
  }, []);

  return (
    <main id="main" className="min-h-screen" aria-busy={loading || undefined}>
      <div className="max-w-3xl mx-auto px-4 py-6">
        <div className="w-full flex items-center justify-center mb-6">
          <a href="/" aria-label="Parsnip home" className="flex items-center">
            <img src="/logo.png" alt="Parsnip logo" className="block h-16 w-16" />
            <span className="ml-3 text-3xl lowercase font-ui font-ui-heading text-primary-dark">
              parsnip
            </span>
          </a>
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
                <form method="GET" action="/" className="flex gap-2" onSubmit={(e) => {
                  const canGenerate = inputPrompt.trim().length > 0;
                  if (!canGenerate) {
                    e.preventDefault();
                  }
                }}>
                  <input
                    className="flex-1 rounded-md border border-surface-dark bg-surface px-3 py-2 text-sm text-primary-dark placeholder:text-primary-dark/60 focus:outline-none focus:ring-2 focus:ring-primary font-sans"
                    placeholder="I have eggs, spinach, and feta..."
                    aria-label="Describe ingredients or dish"
                    name="prompt"
                    enterKeyHint="go"
                    autoComplete="off"
                    value={inputPrompt}
                    onChange={(e) => setInputPrompt(e.target.value)}
                    required
                  />
                  {(() => {
                    const canGenerate = inputPrompt.trim().length > 0;
                    return (
                      <button
                        type="submit"
                        aria-disabled={!canGenerate}
                        disabled={!canGenerate}
                        className={`rounded-md px-4 py-2 text-sm font-medium text-surface font-ui ${
                          canGenerate
                            ? "bg-primary hover:bg-primary-dark"
                            : "bg-primary/40 cursor-not-allowed"
                        }`}
                      >
                        Generate
                      </button>
                    );
                  })()}
                </form>
              </section>

              <section className="rounded-xl border border-surface-dark bg-surface p-5 shadow-sm">
                <h2 className="text-lg font-semibold mb-2 text-primary font-ui font-ui-heading">
                  Import
                </h2>
                <p className="text-sm mb-3 text-primary-dark/70">
                  Paste a recipe URL to simplify it for beginners.
                </p>
                <form method="GET" action="/" className="flex flex-col gap-3" onSubmit={(e) => {
                  const canImport = inputUrl.trim().length > 0;
                  if (!canImport) {
                    e.preventDefault();
                  }
                }}>
                  <div className="flex gap-2">
                    <input
                      className="flex-1 rounded-md border border-surface-dark bg-surface px-3 py-2 text-sm text-primary-dark placeholder:text-primary-dark/60 focus:outline-none focus:ring-2 focus:ring-primary font-sans"
                      placeholder="https://example.com/your-recipe"
                      aria-label="Recipe URL"
                      type="url"
                      name="url"
                      enterKeyHint="go"
                      autoComplete="url"
                      value={inputUrl}
                      onChange={(e) => setInputUrl(e.target.value)}
                      required
                    />
                    {(() => {
                      const canImport = inputUrl.trim().length > 0;
                      return (
                        <button
                          type="submit"
                          aria-disabled={!canImport}
                          disabled={!canImport}
                          className={`rounded-md px-4 py-2 text-sm font-medium text-surface font-ui ${
                            canImport
                              ? "bg-primary hover:bg-primary-dark"
                              : "bg-primary/40 cursor-not-allowed"
                          }`}
                        >
                          Import
                        </button>
                      );
                    })()}
                  </div>
                  <div>
                    <label className="block text-sm mb-1 text-primary-dark font-ui" htmlFor="import-context">
                      Additional context (optional)
                    </label>
                    {hasPaid ? (
                      <textarea
                        id="import-context"
                        className="w-full min-h-20 rounded-md border border-surface-dark bg-surface px-3 py-2 text-sm text-primary-dark placeholder:text-primary-dark/60 focus:outline-none focus:ring-2 focus:ring-primary font-sans"
                        placeholder="Dietary requirements, substitutions, spice tolerance, allergies, tools available, etc."
                        aria-label="Additional context"
                        name="context"
                        value={inputContext}
                        onChange={(e) => setInputContext(e.target.value)}
                      />
                    ) : (
                      <Paywall minHeight="min-h-20" />
                    )}
                  </div>
                </form>
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
              <div
                className="animate-pulse rounded-md border border-surface-dark bg-surface/60 p-6 font-ui"
                role="status"
                aria-live="polite"
              >
                {LOADING_MESSAGES[loadingMsgIndex]}
              </div>
            )}

            {error && (
              <div className="rounded-md border border-red-700 bg-red-50 p-4 text-red-800">
                {error}
              </div>
            )}

            {!loading && !error && mdx && (
              <>
                <div className="mb-4 flex justify-end">
                  <button
                    type="button"
                    onClick={async () => {
                      setDumbingDown(true);
                      setError(null);
                      try {
                        const { label: regionLabel, flag: regionFlag } = getRegionMeta(region as any);
                        const languageLabel = getLanguageLabel(language as any);
                        const res = await dumbDownRecipe({
                          data: {
                            existingRecipe: mdx,
                            originalPrompt: prompt,
                            originalUrl: url,
                            originalContext: combinedContext,
                            language,
                            region,
                            languageLabel,
                            regionLabel,
                            regionFlag,
                          },
                        });
                        setMdx(res.mdx);
                        if (url) {
                          try {
                            localStorage.setItem(
                              getCacheKey(url, combinedContext),
                              JSON.stringify({ mdx: res.mdx, ts: Date.now() }),
                            );
                          } catch {}
                        }
                      } catch (err: any) {
                        setError(err?.message || "Something went wrong");
                      } finally {
                        setDumbingDown(false);
                      }
                    }}
                    disabled={dumbingDown}
                    className={`rounded-md px-4 py-2 text-sm font-medium font-ui ${
                      dumbingDown
                        ? "bg-primary/40 cursor-not-allowed text-surface"
                        : "bg-primary hover:bg-primary-dark text-surface"
                    }`}
                  >
                    {dumbingDown ? "Simplifying..." : "Dumb this down"}
                  </button>
                </div>
                <article className="prose max-w-none prose-headings:text-primary prose-a:text-primary prose-strong:text-primary-dark">
                  <MdxRenderer source={mdx} components={components} />
                </article>
              </>
            )}
          </>
        )}
      </div>
    </main>
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
