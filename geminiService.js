import {
  fridgeImagePrompt,
  recipePrompt,
  alternativeRecipePrompt,
  voiceAudioPrompt
} from './config/prompts';

const getEndpoint = (userKey) => {
  const key = userKey || process.env.EXPO_PUBLIC_GEMINI_API_KEY;
  if (!key) {
    throw new Error("No Gemini API key found. Please set your key in Settings.");
  }
  return `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key=${key}`;
};

export const processFridgeImage = async (base64Image, userApiKey) => {
  const payload = {
    contents: [{
      parts: [
        { inlineData: { mimeType: "image/jpeg", data: base64Image } },
        { text: fridgeImagePrompt }
      ]
    }]
  };

  const response = await fetch(getEndpoint(userApiKey), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });

  const data = await response.json();
  if (data.error) throw new Error(data.error.message);

  const rawText = data.candidates[0].content.parts[0].text;
  return JSON.parse(rawText.replace(/```json|```/g, "").trim());
};

export const fetchRecipeFromAI = async (ingredients, cuisine, userApiKey) => {
  const prompt = recipePrompt(ingredients, cuisine);
  const payload = { contents: [{ parts: [{ text: prompt }] }] };

  const response = await fetch(getEndpoint(userApiKey), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });

  const data = await response.json();
  if (data.error) throw new Error(data.error.message);

  const rawText = data.candidates[0].content.parts[0].text;
  return JSON.parse(rawText.replace(/```json|```/g, "").trim());
};

export const fetchAlternativeRecipe = async (ingredients, cuisine, previousRecipes, userApiKey) => {
  const prompt = alternativeRecipePrompt(ingredients, cuisine, previousRecipes);
  const payload = { contents: [{ parts: [{ text: prompt }] }] };

  const response = await fetch(getEndpoint(userApiKey), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });

  const data = await response.json();
  if (data.error) throw new Error(data.error.message);

  const rawText = data.candidates[0].content.parts[0].text;
  return JSON.parse(rawText.replace(/```json|```/g, "").trim());
};

export const processVoiceAudio = async (base64Audio, userApiKey) => {
  const payload = {
    contents: [{
      parts: [
        { 
          inlineData: { 
            mimeType: "audio/mp4",
            data: base64Audio 
          } 
        },
        { text: voiceAudioPrompt }
      ]
    }]
  };

  const response = await fetch(getEndpoint(userApiKey), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });

  const data = await response.json();
  if (data.error) {
    console.error("Gemini Speech Error:", data.error);
    throw new Error(data.error.message);
  }

  const rawText = data.candidates[0].content.parts[0].text;
  return JSON.parse(rawText.replace(/```json|```/g, "").trim());
};