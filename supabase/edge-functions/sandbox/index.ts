// Supabase Edge Function: sandbox
// Docker 沙箱执行代理 API — 转发代码到沙箱执行
import { serve } from 'https://deno.land/std@0.208.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SANDBOX_URL = Deno.env.get('DOCKER_SANDBOX_URL') || 'http://localhost:8080'
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

serve(async (req: Request) => {
  try {
    const { code, language, appId } = await req.json()

    if (!code) {
      return new Response(JSON.stringify({ error: 'Missing code' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

    // 更新状态为测试中
    if (appId) {
      await supabase.from('generated_apps')
        .update({ status: 'testing' })
        .eq('id', appId)
    }

    // 调用 Docker 沙箱 API
    const sandboxRes = await fetch(`${SANDBOX_URL}/execute`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code, language, app_id: appId })
    })

    const result = await sandboxRes.json()

    // 更新执行结果
    if (appId) {
      const updates: Record<string, unknown> = {
        status: result.success ? 'completed' : 'failed'
      }
      if (!result.success && result.error) {
        updates.error_log = result.error
      }
      await supabase.from('generated_apps')
        .update(updates)
        .eq('id', appId)
    }

    return new Response(JSON.stringify(result), {
      headers: { 'Content-Type': 'application/json' }
    })

  } catch (err) {
    return new Response(JSON.stringify({
      success: false,
      error: `Sandbox unavailable: ${(err as Error).message}`
    }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' }
    })
  }
})
