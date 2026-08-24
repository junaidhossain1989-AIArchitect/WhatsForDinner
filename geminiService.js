const GEMINI_API_KEY = process.env.EXPO_PUBLIC_GEMINI_API_KEY;
const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key=${GEMINI_API_KEY}`;
import {
  fridgeImagePrompt,
  recipePrompt,
  alternativeRecipePrompt,
  voiceAudioPrompt
} from './config/prompts';

export const processFridgeImage = async (base64Image) => {
  const payload = {
    contents: [{
      parts: [
        { inlineData: { mimeType: "image/jpeg", data: base64Image } },
        { text: fridgeImagePrompt }
      ]
    }]
  };

  const response = await fetch(API_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });

  const data = await response.json();
  const rawText = data.candidates[0].content.parts[0].text;
  return JSON.parse(rawText.replace(/```json|```/g, "").trim());
};

export const fetchRecipeFromAI = async (ingredients, cuisine) => {
  const prompt = recipePrompt(ingredients, cuisine);
  const payload = { contents: [{ parts: [{ text: prompt }] }] };
  const response = await fetch(API_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });

  const data = await response.json();
  const rawText = data.candidates[0].content.parts[0].text;
  return JSON.parse(rawText.replace(/```json|```/g, "").trim());
};

export const fetchAlternativeRecipe = async (ingredients, cuisine, previousRecipes) => {
  const prompt = alternativeRecipePrompt(ingredients, cuisine, previousRecipes);
  const payload = { contents: [{ parts: [{ text: prompt }] }] };
  const response = await fetch(API_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });

  const data = await response.json();
  const rawText = data.candidates[0].content.parts[0].text;
  return JSON.parse(rawText.replace(/```json|```/g, "").trim());
};
export const processVoiceAudio = async (base64Audio) => {
  // Try sending as standard m4a / mp4 / audio containers accepted by Gemini
  const payload = {
    contents: [{
      parts: [
        { 
          inlineData: { 
            mimeType: "audio/mp4", // Universal container supported by Gemini Flash across iOS & Android
            data: base64Audio 
          } 
        },
        { text: voiceAudioPrompt }
      ]
    }]
  };

  const response = await fetch(API_URL, {
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