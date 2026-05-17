import { create } from 'zustand'

interface FilterState {
  selectedCategory: string | null
  selectedTags: string[]
  selectedPricing: string | null
  searchQuery: string
  sortBy: string // 'hot' | 'new'
  setCategory: (category: string | null) => void
  toggleTag: (tag: string) => void
  setPricing: (pricing: string | null) => void
  setSearch: (query: string) => void
  setSortBy: (sort: string) => void
  clearAll: () => void
}

export const useFilterStore = create<FilterState>((set) => ({
  selectedCategory: null,
  selectedTags: [],
  selectedPricing: null,
  searchQuery: '',
  sortBy: 'hot',
  setCategory: (category) => set({ selectedCategory: category }),
  toggleTag: (tag) => set((state) => ({
    selectedTags: state.selectedTags.includes(tag)
      ? state.selectedTags.filter((t) => t !== tag)
      : [...state.selectedTags, tag]
  })),
  setPricing: (pricing) => set({ selectedPricing: pricing }),
  setSearch: (query) => set({ searchQuery: query }),
  setSortBy: (sort) => set({ sortBy: sort }),
  clearAll: () => set({
    selectedCategory: null,
    selectedTags: [],
    selectedPricing: null,
    searchQuery: '',
    sortBy: 'hot'
  })
}))
