// SkillFlow: 文档整理 Edge Function
// 接收 AI 生成的文本 → Claude 清洗排版 → 返回结构化 JSON

import { serve } from 'https://deno.land/std@0.208.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY') || ''
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

const SYSTEM_PROMPT = `你是文档整理专家。接收用户粘贴的 AI 生成文本，完成清洗和排版。

## 步骤

1. **清洗 Markdown**:
   - 移除所有 ##、**、*、-、+、>、\`、\`\`\` 等符号
   - 替换弯引号 ""'' 为直引号 ""
   - 移除零宽字符和控制符
   - 统一换行

2. **识别结构**:
   - 找出文章标题（第一行或最突出的短句）
   - 识别各级标题（通过内容语义判断，不是通过符号）
   - 区分正文段落、列表、引用
   - 合并过短的段落到一起

3. **排版输出**:
   - 标题居中加粗
   - 段落首行缩进
   - 段间距均匀
   - 保留原文的语义结构

## 输出格式（严格 JSON）

{
  "title": "文章标题",
  "format": "normal",
  "sections": [
    { "type": "paragraph", "text": "正文段落..." },
    { "type": "heading", "level": 1, "text": "一级标题" },
    { "type": "list", "items": ["项目1", "项目2"] }
  ],
  "stats": { "chars": 1234, "paragraphs": 8, "headings": 2 }
}

注意: 只输出 JSON，不要 Markdown 包裹，不要任何解释文字。`

serve(async (req: Request) => {
  try {
    const { text, format } = await req.json()
    if (!text) return new Response(JSON.stringify({ error: 'Missing text' }), { status: 400, headers: { 'Content-Type': 'application/json' } })

    // 获取该格式的 prompt 模板（未来从 DB 读）
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

    // 调 Claude API
    const claudeRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 4096,
        system: SYSTEM_PROMPT,
        messages: [{ role: 'user', content: `格式类型: ${format || 'normal'}\n\n需要整理的文本:\n${text.slice(0, 15000)}` }]
      })
    })

    const claudeData = await claudeRes.json()
    if (!claudeRes.ok) {
      return new Response(JSON.stringify({ error: claudeData.error?.message }), { status: claudeRes.status, headers: { 'Content-Type': 'application/json' } })
    }

    const rawOutput = claudeData.content?.[0]?.text || ''
    // 提取 JSON
    const jsonMatch = rawOutput.match(/\{[\s\S]*\}/)
    const parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : { title: '文档', sections: [], stats: { chars: text.length, paragraphs: 0 } }

    return new Response(JSON.stringify(parsed), { headers: { 'Content-Type': 'application/json' } })

  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), { status: 500, headers: { 'Content-Type': 'application/json' } })
  }
})
