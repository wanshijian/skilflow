// SkillFlow v3: 配额处理 Edge Function

import { serve } from 'https://deno.land/std@0.208.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

serve(async (req: Request) => {
  try {
    const { action, userId, toolId, ipAddress, userAgent } = await req.json()
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

    // === 检查配额 ===
    if (action === 'check_quota') {
      const { data: user, error } = await supabase.from('users').select('lifetime_free_remaining').eq('id', userId).single()
      if (error || !user) {
        return new Response(JSON.stringify({ canDownload: false, reason: 'user_not_found' }), { headers: { 'Content-Type': 'application/json' } })
      }
      const canUseFree = user.lifetime_free_remaining > 0
      return new Response(JSON.stringify({
        canDownload: true,
        canUseFree,
        remainingFree: user.lifetime_free_remaining
      }), { headers: { 'Content-Type': 'application/json' } })
    }

    // === 消耗免费额度 ===
    if (action === 'consume_free') {
      const { data: success } = await supabase.rpc('consume_free_quota', { uid: userId })
      if (success) {
        await supabase.rpc('increment_tool_download', { tool_uid: toolId })
        await supabase.from('downloads').insert({ tool_id: toolId, user_id: userId, method: 'free', ip_address: ipAddress })
        return new Response(JSON.stringify({ success: true, method: 'free' }), { headers: { 'Content-Type': 'application/json' } })
      }
      return new Response(JSON.stringify({ success: false, reason: 'no_quota' }), { headers: { 'Content-Type': 'application/json' } })
    }

    // === 分享解锁 ===
    if (action === 'share_unlock') {
      await supabase.rpc('record_share_unlock', { sharer_uid: userId, tool_uid: toolId, visitor_ip_addr: ipAddress, visitor_ua_text: userAgent })
      await supabase.rpc('increment_tool_download', { tool_uid: toolId })
      await supabase.from('downloads').insert({ tool_id: toolId, user_id: userId, method: 'share', ip_address: ipAddress })
      return new Response(JSON.stringify({ success: true, method: 'share' }), { headers: { 'Content-Type': 'application/json' } })
    }

    // === 付费下载 ===
    if (action === 'paid_download') {
      await supabase.rpc('increment_tool_download', { tool_uid: toolId })
      await supabase.from('downloads').insert({ tool_id: toolId, user_id: userId, method: 'paid', ip_address: ipAddress })
      return new Response(JSON.stringify({ success: true, method: 'paid' }), { headers: { 'Content-Type': 'application/json' } })
    }

    return new Response(JSON.stringify({ error: 'Invalid action' }), { status: 400, headers: { 'Content-Type': 'application/json' } })
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), { status: 500, headers: { 'Content-Type': 'application/json' } })
  }
})
