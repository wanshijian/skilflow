import { create } from 'zustand'

export interface User {
  id: string
  email?: string
  nickname?: string
  avatar?: string
  role: 'user' | 'admin'
}

interface AuthState {
  user: User | null
  isAuthenticated: boolean
  isLoading: boolean
  setUser: (user: User | null) => void
  logout: () => void
  setLoading: (loading: boolean) => void
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,
  isLoading: true,
  setUser: (user) => set({ user, isAuthenticated: !!user, isLoading: false }),
  logout: () => set({ user: null, isAuthenticated: false }),
  setLoading: (loading) => set({ isLoading: loading })
}))
