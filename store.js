import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const useAppStore = create((set) => ({
  apiKey: '',
  setApiKey: async (key) => {
    await AsyncStorage.setItem('user_gemini_api_key', key);
    set({ apiKey: key });
  },
  loadApiKey: async () => {
    const savedKey = await AsyncStorage.getItem('user_gemini_api_key');
    if (savedKey) set({ apiKey: savedKey });
  },
  
  // Your existing state (ingredients, recipe, etc.)...
  ingredients: [],
  addIngredient: (item) => set((state) => ({ ingredients: [...state.ingredients, item] })),
  removeIngredient: (index) => set((state) => ({ ingredients: state.ingredients.filter((_, i) => i !== index) })),
  recipe: null,
  setRecipe: (recipe) => set({ recipe }),
  previousRecipes: [],
  selectedCuisine: 'Any',
  setSelectedCuisine: (cuisine) => set({ selectedCuisine: cuisine }),
  loading: false,
  setLoading: (loading) => set({ loading }),
  resetSession: () => set({ recipe: null, ingredients: [] }),
}));