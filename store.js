import { create } from 'zustand';

export const useAppStore = create((set) => ({
  ingredients: [],
  selectedCuisine: 'Any',
  recipe: null,
  previousRecipes: [],
  loading: false,

  setIngredients: (list) => set({ ingredients: list }),

  addIngredient: (item) => set((state) => ({
    ingredients: [...state.ingredients, item]
  })),

  removeIngredient: (index) => set((state) => ({
    ingredients: state.ingredients.filter((_, i) => i !== index)
  })),

  setSelectedCuisine: (cuisine) => set({ selectedCuisine: cuisine }),

  setRecipe: (newRecipe) => set((state) => ({
    recipe: newRecipe,
    previousRecipes: state.recipe
      ? [...state.previousRecipes, state.recipe.title]
      : state.previousRecipes
  })),

  resetSession: () => set({
    ingredients: [],
    recipe: null,
    previousRecipes: [],
    selectedCuisine: 'Any'
  }),

  setLoading: (status) => set({ loading: status })
}));