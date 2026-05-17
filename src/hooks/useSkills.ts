import { useState, useCallback } from 'react'
import { skillsApi } from '../utils/api'
import { useSkillStore } from '../stores/skillStore'
import { useFilterStore } from '../stores/filterStore'

export function useSkills() {
  const { skills, totalCount, isLoading, page, setSkills, setLoading, setPage } = useSkillStore()
  const { selectedCategory, selectedTags, selectedPricing, searchQuery } = useFilterStore()
  const [error, setError] = useState<string | null>(null)

  const fetchSkills = useCallback(async (pageNum: number = 1) => {
    setLoading(true)
    setError(null)
    try {
      const { data, count, error: err } = await skillsApi.list({
        page: pageNum,
        pageSize: 20,
        category: selectedCategory || undefined,
        tags: selectedTags.length > 0 ? selectedTags : undefined,
        pricing: selectedPricing || undefined,
        search: searchQuery || undefined,
        status: 'published'
      })
      if (err) throw err
      setSkills(data || [], count || 0)
      setPage(pageNum)
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载失败')
    } finally {
      setLoading(false)
    }
  }, [selectedCategory, selectedTags, selectedPricing, searchQuery])

  const fetchSkillBySlug = useCallback(async (slug: string) => {
    setLoading(true)
    try {
      const { data, error: err } = await skillsApi.getBySlug(slug)
      if (err) throw err
      return data
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载失败')
      return null
    } finally {
      setLoading(false)
    }
  }, [])

  return { skills, totalCount, isLoading, error, page, fetchSkills, fetchSkillBySlug }
}
