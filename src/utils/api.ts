import { devMode } from './devMode'
import { supabase } from './supabase'

const mock = devMode // 开发模式自动启用

export const toolsApi = {
  async list(params: { toolType?: string; sort?: string; page?: number; premium?: boolean }) {
    if (mock.isActive) return mock.listTools(params)
    let q = supabase.from('tools').select('*', { count: 'exact' }).eq('status', 'published')
    if (params.toolType) q = q.eq('tool_type', params.toolType)
    if (params.premium !== undefined) q = q.eq('is_premium', params.premium)
    const sort = params.sort === 'new' ? 'created_at' : 'download_count'
    const from = ((params.page || 1) - 1) * 20
    return q.order(sort, { ascending: false }).range(from, from + 19)
  },
  async getById(id: string) {
    if (mock.isActive) return mock.getToolById(id)
    return supabase.from('tools').select('*').eq('id', id).single()
  },
  async getBySlug(slug: string) { return supabase.from('tools').select('*').eq('slug', slug).single() },
  async incrementView(id: string) { return supabase.rpc('increment_tool_view', { tool_uid: id }) },
}

export const generateApi = {
  async generate(params: { prompt: string; toolType?: string; style?: string; requirements?: string; retryContext?: any }) {
    if (mock.isActive) return mock.generateCode(params)
    return supabase.functions.invoke('code-gen', { body: params })
  }
}

export const quotaApi = {
  async check(userId?: string) {
    if (mock.isActive) return mock.checkQuota(userId || 'dev')
    return supabase.functions.invoke('quota-handler', { body: { action: 'check_quota', userId } })
  },
  async consumeFree(userId?: string, toolId?: string) {
    if (mock.isActive) return mock.consumeFree(userId || 'dev', toolId || '')
    return supabase.functions.invoke('quota-handler', { body: { action: 'consume_free', userId, toolId } })
  },
  async shareUnlock(userId?: string, toolId?: string) {
    if (mock.isActive) return mock.shareUnlock(userId || 'dev', toolId || '')
    return supabase.functions.invoke('quota-handler', { body: { action: 'share_unlock', userId, toolId } })
  },
}

export const downloadApi = {
  async listMine(userId: string) {
    if (mock.isActive) return { data: [], error: null }
    return supabase.from('downloads').select('*, tools(*)').eq('user_id', userId).order('created_at', { ascending: false }).limit(50)
  },
}

export const customRequestApi = {
  async submit(params: { description: string; contact: string }) {
    if (mock.isActive) return { data: { success: true }, error: null }
    return supabase.from('custom_requests').insert(params)
  }
}

// 开发模式用户
export { devMode }
