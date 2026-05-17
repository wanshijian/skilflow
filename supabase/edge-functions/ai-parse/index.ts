// Supabase Edge Function: ai-parse
// 调用 Gemini 解析项目 README → 生成结构化技能卡片数据

import { serve } from 'https://deno.land/std@0.208.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY')!
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

const TAG_LIBRARY = `
可用标签库：
- 行业领域：法律、医疗、金融、跨境电商、教育、自媒体、程序员、通用
- 能力类型：文本写作、代码开发、图像处理、音频视频、数据分析、自动化流、翻译
- 适用平台：ChatGPT、Claude、Midjourney、DeepSeek、Dify、Stable Diffusion
`

const PARSE_PROMPT = `你是一个 AI 技能分析师。请阅读以下项目 README 内容，并以 JSON 格式返回分析结果。

${TAG_LIBRARY}

请返回以下格式的 JSON（不要包含 markdown 代码块标记）：
{
  "short_summary": "50字以内的大白话功能描述",
  "use_cases": [{"title": "场景名", "description": "具体描述"}],
  "params": {"inputs": ["输入参数1"], "outputs": ["输出结果1"]},
  "code_snippet": "最简安装或配置代码片段",
  "primary_category": "行业领域标签（选1个最匹配的）",
  "sub_tags": ["能力标签1", "平台标签1"],
  "pricing": "完全免费/限时免费/按次付费/订阅制"
}

要求：
- short_summary 必须简洁易懂，避免技术术语
- use_cases 必须给出3个具体使用场景
- sub_tags 每个维度选1-3个标签，总数不超过5个
- 如果项目不匹配任何现有标签，用自定义关键词标注`

serve(async (req: Request) => {
  try {
    const { readmeContent, repoUrl, stars, author } = await req.json()

    if (!readmeContent) {
      return new Response(JSON.stringify({ error: 'Missing readmeContent' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    // 调用 Gemini 解析
    const geminiRes = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: `${PARSE_PROMPT}\n\n项目地址：${repoUrl}\nStar数：${stars}\n作者：${author}\n\nREADME内容：\n${readmeContent.slice(0, 8000)}` }] }],
        generationConfig: { temperature: 0.2, maxOutputTokens: 2048 }
      })
    })

    const geminiData = await geminiRes.json()
    const rawText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || ''

    // 解析 Gemini 返回的 JSON
    let parsed: Record<string, unknown> = {}
    try {
      const jsonStr = rawText.replace(/```json\s?|\s?```/g, '').trim()
      parsed = JSON.parse(jsonStr)
    } catch {
      return new Response(JSON.stringify({ error: 'Failed to parse AI response', raw: rawText }), {
        status: 422,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    // 写入 Supabase (draft 状态)
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

    const title = (parsed.short_summary as string || 'Unknown').slice(0, 30)
    const slug = title.toLowerCase().replace(/[^a-z0-9一-鿿]+/g, '-').replace(/^-|-$/g, '') + '-' + Date.now().toString(36)

    const { data, error } = await supabase
      .from('skills')
      .insert({
        title: title,
        slug,
        raw_url: repoUrl || '',
        github_url: repoUrl,
        stars: stars || 0,
        author: author || 'Unknown',
        short_summary: parsed.short_summary,
        use_cases: parsed.use_cases || [],
        params: parsed.params || {},
        code_snippet: parsed.code_snippet || '',
        primary_category: parsed.primary_category || '通用',
        sub_tags: parsed.sub_tags || [],
        pricing: parsed.pricing || '免费',
        status: 'draft'
      })
      .select()
      .single()

    if (error) throw error

    return new Response(JSON.stringify({ success: true, skill: data }), {
      headers: { 'Content-Type': 'application/json' }
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    })
  }
})
