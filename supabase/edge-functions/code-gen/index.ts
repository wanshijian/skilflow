// SkillFlow v3: 代码生成 Edge Function
// 开发阶段直接调用 Claude API；部署后转发到 VPS 的 Claude Code 服务

import { serve } from 'https://deno.land/std@0.208.0/http/server.ts'

const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY') || ''
const CODE_GEN_URL = Deno.env.get('CODE_GEN_SERVICE_URL') || '' // VPS 地址，部署后配置

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
  try {
    const { prompt, toolType, style, requirements, retryContext } = await req.json()
    if (!prompt) return new Response(JSON.stringify({ error: 'Missing prompt' }), { status: 400, headers: { 'Content-Type': 'application/json' } })

    // 组装专业 prompt
    let userPrompt = `Create a single-file HTML tool: ${prompt}.`
    if (toolType) userPrompt += ` Type: ${toolType}.`
    if (style) userPrompt += ` Style: ${style}.`
    if (requirements) userPrompt += ` Requirements: ${requirements}.`
    if (retryContext) {
      userPrompt += `\n\nPREVIOUS ATTEMPT: ${retryContext.previousOutput.slice(0, 500)}`
      userPrompt += `\n\nWHAT WAS WRONG: ${retryContext.userFeedback || retryContext.error}`
      userPrompt += `\n\nPlease fix the issues and regenerate.`
    }

    // 如果配置了 VPS 生成服务，转发过去
    if (CODE_GEN_URL) {
      const vpsRes = await fetch(`${CODE_GEN_URL}/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: userPrompt, toolType, style })
      })
      const vpsData = await vpsRes.json()
      return new Response(JSON.stringify(vpsData), { headers: { 'Content-Type': 'application/json' } })
    }

    // 开发阶段：直接调 Claude API
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
      return new Response(JSON.stringify({ error: claudeData.error?.message || 'Claude API error' }), { status: claudeRes.status, headers: { 'Content-Type': 'application/json' } })
    }

    const rawText = claudeData.content?.[0]?.text || ''
    // 提取 HTML 代码块
    const htmlMatch = rawText.match(/```html\s*([\s\S]*?)```/) || rawText.match(/```\s*([\s\S]*?)```/)
    const html = htmlMatch ? htmlMatch[1].trim() : rawText.trim()

    // 提取 title
    const titleMatch = html.match(/<title>(.*?)<\/title>/)
    const title = titleMatch ? titleMatch[1] : prompt.slice(0, 50)

    return new Response(JSON.stringify({
      success: true,
      html,
      title,
      fullResponse: rawText
    }), { headers: { 'Content-Type': 'application/json' } })

  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), { status: 500, headers: { 'Content-Type': 'application/json' } })
  }
})
