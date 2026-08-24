const recipeResponseFormat = '{"title": "Recipe Name", "time": "Cooking Time", "steps": ["Step 1", "Step 2"]}';

export const fridgeImagePrompt = 'Identify all raw food ingredients, pantry items, or vegetables visible in this image. Return the list strictly as a flat JSON array of lowercase strings. Example: ["chicken", "spinach"]. No markdown code blocks.';

export const recipePrompt = (ingredients, cuisine) =>
  `Based strictly on these elements: ${ingredients.join(", ")}. Create a healthy ${cuisine} dinner recipe. Return exclusively as a clean JSON object structured exactly like this: ${recipeResponseFormat}. No markdown annotations.`;

export const alternativeRecipePrompt = (ingredients, cuisine, previousRecipes) =>
  `You are a resourceful home chef. The user has these ingredients: ${ingredients.join(", ")}. They want a ${cuisine} dinner. CRITICAL: They have already rejected the following recipes: ${previousRecipes.join(", ")}. Do NOT suggest these meals or variations of them. Provide a completely distinct alternative using the same ingredients. Return exclusively as a clean JSON object structured exactly like this: ${recipeResponseFormat}.`;

export const voiceAudioPrompt = 'Listen to this audio clip. Extract all food ingredients mentioned. Return strictly a flat JSON array of lowercase strings. Example: ["chickpeas", "garlic"]. No markdown or extra text.';