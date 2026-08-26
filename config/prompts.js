
export const fridgeImagePrompt = 
  "Identify all raw food ingredients, pantry items, or vegetables visible in this image. Return the list strictly as a flat JSON array of lowercase strings. Example: [\"chicken\", \"spinach\"]. No markdown code blocks.";

export const voiceAudioPrompt = 
  "Listen to this audio clip. Extract any mentioned food ingredients or pantry items. Return ONLY a single clean JSON array of strings containing lowercase item names. Example: [\"chickpeas\", \"garlic\"]. No markdown code blocks.";

export const recipePrompt = (ingredients, cuisine) => `
You are an intelligent home chef.
Primary ingredients provided by the user: ${ingredients.join(", ")}.
Desired cuisine: ${cuisine}.

INSTRUCTIONS:
- Base the main meal primarily on the provided ingredients.
- You are INTELLIGENT and FLEXIBLE: Assume standard kitchen staples (e.g., salt, pepper, cooking oil, water, basic seasoning) can be used even if the user forgot to explicitly list them.
- Keep additional unlisted ingredients minimal and practical.

Return EXCLUSIVELY a single clean JSON object structured exactly like this with no markdown backticks or commentary:
{"title": "Recipe Name", "time": "Cooking Time", "steps": ["Step 1", "Step 2"]}.
`;

export const alternativeRecipePrompt = (ingredients, cuisine, previousRecipes) => `
You are an intelligent home chef.
Primary ingredients provided by the user: ${ingredients.join(", ")}.
Desired cuisine: ${cuisine}.
CRITICAL: The user rejected these recipes: ${previousRecipes.join(", ")}. Do NOT suggest them or minor variations of them.

INSTRUCTIONS:
- Base the main meal primarily on the provided ingredients.
- You are INTELLIGENT and FLEXIBLE: Assume standard kitchen staples (e.g., salt, pepper, cooking oil, water, basic seasoning) can be used even if the user forgot to explicitly list them.
- Keep additional unlisted ingredients minimal and practical.

Return EXCLUSIVELY a single clean JSON object structured exactly like this with no markdown backticks or commentary:
{"title": "Recipe Name", "time": "Cooking Time", "steps": ["Step 1", "Step 2"]}.
`;