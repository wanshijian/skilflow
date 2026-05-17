// Supabase Edge Function: rss-fetch
// RSS 源聚合 + AI 自动摘要

import { serve } from 'https://deno.land/std@0.208.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY')!
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

// RSS 源列表（可扩展）
const RSS_SOURCES = [
  'https://hnrss.org/frontpage',
  'https://www.artificialintelligence-news.com/feed/',
  'https://techcrunch.com/category/artificial-intelligence/feed/'
]

async function fetchAndParseRSS(url: string): Promise<Array<{ title: string; content: string; source_url: string }>> {
  // 使用简单的 XML 解析（生产环境建议使用专门的 RSS 解析库）
  try {
    const res = await fetch(url)
    const text = await res.text()

    const items: Array<{ title: string; content: string; source_url: string }> = []
    const itemRegex = /<item>([\s\S]*?)<\/item>/g
    let match

    while ((match = itemRegex.exec(text)) !== null) {
      const item = match[1]
      const title = item.match(/<title>([\s\S]*?)<\/title>/)?.[1] || ''
      const link = item.match(/<link>([\s\S]*?)<\/link>/)?.[1] || ''
      const description = item.match(/<description>([\s\S]*?)<\/description>/)?.[1] || ''

      if (title && link) {
        items.push({
          title: title.replace(/<!\[CDATA\[|\]\]>/g, '').trim(),
          content: description.replace(/<!\[CDATA\[|\]\]>/g, '').replace(/<[^>]*>/g, '').trim(),
          source_url: link.trim()
        })
      }
    }

    return items
  } catch {
    return []
  }
}

serve(async (_req: Request) => {
  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

    const allItems: Array<{ title: string; content: string; source_url: string; source: string }> = []

    for (const source of RSS_SOURCES) {
      const items = await fetchAndParseRSS(source)
      allItems.push(...items.map(i => ({ ...i, source })))
    }

    // 对每篇文章调用 Gemini 生成摘要
    const savedIds: string[] = []
    const summaryBatchSize = 5
    const summaryCandidates = allItems.slice(0, 20) // 每天处理最多20篇

    for (let i = 0; i < Math.min(summaryCandidates.length, summaryBatchSize); i++) {
      const item = summaryCandidates[i]

      // 调用 Gemini 生成摘要
      let summary = ''
      try {
        const geminiRes = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{
                parts: [{
                  text: `请用一句话（30字以内）概括以下 AI 资讯的核心内容：\n标题：${item.title}\n内容：${item.content.slice(0, 1000)}`
                }]
              }],
              generationConfig: { temperature: 0.1, maxOutputTokens: 200 }
            })
          }
        )
        const geminiData = await geminiRes.json()
        summary = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || item.title
      } catch {
        summary = item.title
      }

      // 入库
      const { data, error } = await supabase
        .from('news')
        .insert({
          title: item.title,
          content: item.content,
          summary,
          source: item.source,
          source_url: item.source_url,
          publish_date: new Date().toISOString().split('T')[0]
        })
        .select('id')
        .single()

      if (!error && data) {
        savedIds.push(data.id)
      }
    }

    // 标记 Top 3
    if (savedIds.length > 0) {
      await supabase
        .from('news')
        .update({ is_top3: true })
        .in('id', savedIds.slice(0, 3))
    }

    return new Response(JSON.stringify({
      success: true,
      processed: savedIds.length,
      top3: savedIds.slice(0, 3)
    }), {
      headers: { 'Content-Type': 'application/json' }
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    })
  }
})
