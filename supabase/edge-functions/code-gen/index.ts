// SkillFlow v3: 代码生成 Edge Function
// 转发到 VPS Code Gen Service；VPS 不可用时 fallback 到直接 Claude API
// 每次请求自动记录到 generation_logs 表供分析

import { serve } from 'https://deno.land/std@0.208.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY') || ''
const CODE_GEN_URL = Deno.env.get('CODE_GEN_SERVICE_URL') || 'http://43.129.69.144:8081'
const SERVICE_API_KEY = Deno.env.get('SERVICE_API_KEY') || 'dev-key'
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

// 规范化 prompt 用于聚合：去空白 + 小写
function normalizePrompt(p: string): string {
  return p.replace(/\s+/g, '').toLowerCase().slice(0, 200)
}

// SHA256 hash
async function sha256(text: string): Promise<string> {
  const data = new TextEncoder().encode(text)
  const hash = await crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('')
}

// 异步写日志（fire-and-forget，不阻塞生成请求）
async function logRequest(params: {
  userId?: string
  prompt: string
  toolType?: string
  style?: string
  language?: string
  source: string
  success: boolean
  errorMsg?: string
}) {
  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
    const hash = await sha256(normalizePrompt(params.prompt))
    await supabase.from('generation_logs').insert({
      user_id: params.userId || null,
      prompt: params.prompt.slice(0, 500),
      prompt_hash: hash,
      tool_type: params.toolType || null,
      style: params.style || null,
      language: params.language || null,
      source: params.source,
      success: params.success,
      error_msg: params.errorMsg || null,
    })
  } catch (_) {
    // 日志失败不影响主流程
  }
}

const SYSTEM_PROMPT = `You are an expert frontend engineer at SkillFlow. Generate single-file HTML tools.

## CRITICAL RULES
1. Output ONLY the complete HTML file. No markdown, no explanations.
2. The HTML must be fully self-contained (CSS + JS inline).
3. Must work when opened directly in browser via file:// protocol.
4. Responsive: works on both desktop and mobile. Use touch events for mobile.
5. Handle errors gracefully with user-friendly messages.
6. Include a clear title and brief usage instructions at the top.
7. Use semantic HTML, clean CSS, accessible labels.
8. Zero external dependencies unless absolutely necessary (CDN libs OK).
9. The page should look polished and professional, not bare-bones.

## Output Format
\`\`\`html
<!DOCTYPE html>
<html lang="zh-CN">
...complete working tool...
</html>
\`\`\`

## Before outputting, verify:
- [ ] Opens via double-click in any browser
- [ ] Works on mobile (touch events, viewport meta)
- [ ] Handles empty/invalid input gracefully
- [ ] Has visual hierarchy and clear UI
- [ ] No broken references or dead code`

serve(async (req: Request) => {
  let logParams: any = null

  try {
    const { prompt, toolType, style, requirements, retryContext, language, userId } = await req.json()
    if (!prompt) return new Response(JSON.stringify({ error: 'Missing prompt' }), { status: 400, headers: { 'Content-Type': 'application/json' } })

    const source = language ? 'app-factory' : 'generate'

    // 异步写日志（不等待）
    logParams = {
      userId,
      prompt,
      toolType: toolType || 'utility',
      style: style || 'clean',
      language: language || null,
      source,
      success: false,
    }

    let result: any

    // 如果配置了 VPS 生成服务，转发过去
    if (CODE_GEN_URL) {
      const endpoint = language ? `${CODE_GEN_URL}/generate/app` : `${CODE_GEN_URL}/generate/tool`
      const body = language
        ? { prompt, language, userId: userId || '' }
        : { prompt, toolType, style, requirements: requirements || '', retryContext: retryContext || undefined }

      const vpsRes = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': SERVICE_API_KEY
        },
        body: JSON.stringify(body)
      })
      const vpsData = await vpsRes.json()
      result = vpsData
    } else {
      // Fallback: 直接调 Claude API
      let userPrompt = `Create a single-file HTML tool: ${prompt}.`
      if (toolType) userPrompt += ` Type: ${toolType}.`
      if (style) userPrompt += ` Style: ${style}.`
      if (language) userPrompt = `Create a ${language} application: ${prompt}.`
      if (retryContext) {
        userPrompt += `\n\nPREVIOUS ATTEMPT: ${retryContext.previousOutput.slice(0, 500)}`
        userPrompt += `\n\nWHAT WAS WRONG: ${retryContext.userFeedback || retryContext.error}`
        userPrompt += `\n\nPlease fix the issues and regenerate.`
      }

      const claudeRes = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': ANTHROPIC_API_KEY,
          'anthropic-version': '2023-06-01',
          'anthropic-beta': 'prompt-caching-2024-07-31'
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 8192,
          system: [
            { type: 'text', text: SYSTEM_PROMPT, cache_control: { type: 'ephemeral' } }
          ],
          messages: [{ role: 'user', content: userPrompt }]
        })
      })

      const claudeData = await claudeRes.json()
      if (!claudeRes.ok) {
        const errMsg = claudeData.error?.message || 'Claude API error'
        logParams.errorMsg = errMsg
        logRequest(logParams)
        return new Response(JSON.stringify({ error: errMsg }), { status: claudeRes.status, headers: { 'Content-Type': 'application/json' } })
      }

      const rawText = claudeData.content?.[0]?.text || ''
      const htmlMatch = rawText.match(/```html\s*([\s\S]*?)```/) || rawText.match(/```\s*([\s\S]*?)```/)
      const html = htmlMatch ? htmlMatch[1].trim() : rawText.trim()
      const titleMatch = html.match(/<title>(.*?)<\/title>/)
      const title = titleMatch ? titleMatch[1] : prompt.slice(0, 50)

      result = { success: true, html, title, fullResponse: rawText }
    }

    // 标记成功并写日志
    if (result?.success) {
      logParams.success = true
    } else if (result?.error) {
      logParams.errorMsg = result.error
    }
    logRequest(logParams)

    return new Response(JSON.stringify(result), { headers: { 'Content-Type': 'application/json' } })

  } catch (err) {
    if (logParams) {
      logParams.errorMsg = (err as Error).message
      logRequest(logParams)
    }
    return new Response(JSON.stringify({ error: (err as Error).message }), { status: 500, headers: { 'Content-Type': 'application/json' } })
  }
})
