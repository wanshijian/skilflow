import { create } from 'zustand'

export interface GeneratedApp {
  id: string
  user_id: string
  prompt: string
  language: string
  generated_code?: string
  output_files: string[]
  download_url?: string
  status: 'pending' | 'generating' | 'testing' | 'completed' | 'failed'
  error_log?: string
  is_public: boolean
  download_count: number
  expires_at: string
  created_at: string
}

export interface UserQuota {
  daily_free: number
  extra_earned: number
  purchased: number
  is_pro: boolean
  pro_expires_at?: string
}

type AppFlowStep = 'idle' | 'input' | 'generating' | 'testing' | 'done' | 'failed'

interface AppState {
  flowStep: AppFlowStep
  currentPrompt: string
  currentLanguage: string
  currentApp: GeneratedApp | null
  generatedCode: string
  sandboxResult: { success: boolean; stdout: string; stderr: string; error?: string } | null
  quota: UserQuota | null
  remainingQuota: number

  setFlowStep: (step: AppFlowStep) => void
  setPrompt: (prompt: string) => void
  setLanguage: (lang: string) => void
  setCurrentApp: (app: GeneratedApp | null) => void
  setGeneratedCode: (code: string) => void
  setSandboxResult: (result: any) => void
  setQuota: (quota: UserQuota | null) => void
  setRemainingQuota: (n: number) => void
  reset: () => void
}

const initialState = {
  flowStep: 'idle' as AppFlowStep,
  currentPrompt: '',
  currentLanguage: 'python',
  currentApp: null,
  generatedCode: '',
  sandboxResult: null,
  quota: null,
  remainingQuota: 0
}

export const useAppStore = create<AppState>((set) => ({
  ...initialState,
  setFlowStep: (step) => set({ flowStep: step }),
  setPrompt: (prompt) => set({ currentPrompt: prompt }),
  setLanguage: (lang) => set({ currentLanguage: lang }),
  setCurrentApp: (app) => set({ currentApp: app }),
  setGeneratedCode: (code) => set({ generatedCode: code }),
  setSandboxResult: (result) => set({ sandboxResult: result }),
  setQuota: (quota) => set({ quota }),
  setRemainingQuota: (n) => set({ remainingQuota: n }),
  reset: () => set(initialState)
}))
