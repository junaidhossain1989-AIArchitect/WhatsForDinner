const recipeResponseFormat = '{"title": "Recipe Name", "time": "Cooking Time", "steps": ["Step 1", "Step 2"]}';

export const fridgeImagePrompt = 'Identify all raw food ingredients, pantry items, or vegetables visible in this image. Return the list strictly as a flat JSON array of lowercase strings. Example: ["chicken", "spinach"]. No markdown code blocks.';

export const recipePrompt = (ingredients, cuisine) =>
  `Based strictly on these elements: ${ingredients.join(", ")}. Create a healthy ${cuisine} dinner recipe. Return exclusively as a clean JSON object structured exactly like this: ${recipeResponseFormat}. No markdown annotations.`;

export const alternativeRecipePrompt = (ingredients, cuisine, previousRecipes) =>
  `You are an intelligent home chef. 
  Primary ingredients provided by the user: ${ingredients.join(", ")}. 
  Desired cuisine: ${cuisine}.
  
  INSTRUCTIONS:
  - Base the main meal primarily on the provided ingredients.
  - You are INTELLIGENT and FLEXIBLE: Assume standard kitchen staples (e.g., salt, pepper, cooking oil, water, basic seasoning) can be used even if the user forgot to explicitly list them.
  - Keep additional unlisted ingredients minimal and practical.

  Return EXCLUSIVELY a single clean JSON object structured exactly like this with no markdown backticks or commentary: 
  {"title": "Recipe Name", "time": "Cooking Time", "steps": ["Step 1", "Step 2"]}.`;

export const voiceAudioPrompt = 'Listen to this audio clip. Extract all food ingredients mentioned. Return strictly a flat JSON array of lowercase strings. Example: ["chickpeas", "garlic"]. No markdown or extra text.';