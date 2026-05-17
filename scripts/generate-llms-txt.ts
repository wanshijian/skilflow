/**
 * 动态生成 llms.txt 文件
 * 供 AI 助手（ChatGPT/Claude 等）读取全站摘要
 * 部署到 Web 根目录 /llms.txt
 */

const SUPABASE_URL = process.env.SUPABASE_URL || ''
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || ''

const SITE_BASE_URL = process.env.SITE_BASE_URL || 'https://skilflow.com'

async function generateLlmsTxt(): Promise<string> {
  let content = `# SkillFlow - AI 技能枢纽平台
> 全球 AI 技能的自动化聚合、分发与调用平台

## 网站概述
- **名称**: SkillFlow
- **描述**: 发现并调用全球 AI 技能/Agent/工具的导航平台
- **内容类型**: AI 技能卡片、AI 资讯、Prompt 技巧

## 主要页面
- 首页: ${SITE_BASE_URL}/
- 技能列表: ${SITE_BASE_URL}/pages/skill/list/index
- AI 快报: ${SITE_BASE_URL}/pages/news/list/index
- 技巧实验室: ${SITE_BASE_URL}/pages/labs/index
- 许愿墙: ${SITE_BASE_URL}/pages/feedback/index

## 技能分类
`

  // 从 Supabase 获取已发布的技能列表
  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/skills?select=title,slug,short_summary,primary_category,sub_tags&status=eq.published&order=click_count.desc&limit=50`,
      {
        headers: {
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
        }
      }
    )

    if (res.ok) {
      const skills = await res.json()
      for (const skill of skills) {
        const url = `${SITE_BASE_URL}/pages/skill/detail/index?slug=${skill.slug}`
        const tags = [skill.primary_category, ...(skill.sub_tags || [])].filter(Boolean).join(', ')
        content += `- [${skill.title}](${url}) — ${skill.short_summary || ''} [${tags}]\n`
      }
    }
  } catch {
    content += '(技能数据加载中...)\n'
  }

  content += `\n## 关于此文件
此 llms.txt 每日自动更新，AI 助手可通过此文件了解本站全部内容结构。
最后更新: ${new Date().toISOString()}
`

  return content
}

async function main() {
  const txt = await generateLlmsTxt()
  console.log(txt)

  // 写入文件
  const fs = require('fs')
  const path = require('path')
  const distPath = path.join(__dirname, '..', 'dist', 'h5', 'llms.txt')
  fs.mkdirSync(path.dirname(distPath), { recursive: true })
  fs.writeFileSync(distPath, txt, 'utf-8')
  console.log(`\n✅ llms.txt written to ${distPath}`)
}

main().catch(console.error)
