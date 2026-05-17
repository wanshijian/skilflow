import { create } from 'zustand'

export interface Skill {
  id: string
  title: string
  slug: string
  raw_url: string
  github_url?: string
  stars: number
  author?: string
  short_summary?: string
  use_cases: { title: string; description: string }[]
  params: Record<string, unknown>
  code_snippet?: string
  primary_category?: string
  sub_tags: string[]
  pricing: string
  status: string
  click_count: number
  schema_json: Record<string, unknown>
  created_at: string
  updated_at: string
}

interface SkillStore {
  skills: Skill[]
  totalCount: number
  currentSkill: Skill | null
  isLoading: boolean
  page: number
  setSkills: (skills: Skill[], total: number) => void
  setCurrentSkill: (skill: Skill | null) => void
  setLoading: (loading: boolean) => void
  setPage: (page: number) => void
}

export const useSkillStore = create<SkillStore>((set) => ({
  skills: [],
  totalCount: 0,
  currentSkill: null,
  isLoading: false,
  page: 1,
  setSkills: (skills, total) => set({ skills, totalCount: total }),
  setCurrentSkill: (skill) => set({ currentSkill: skill }),
  setLoading: (loading) => set({ isLoading: loading }),
  setPage: (page) => set({ page })
}))
