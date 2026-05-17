/**
 * SkillFlow 自动化爬虫脚本
 * 每日抓取 GitHub Trending AI 项目并调用 ai-parse Edge Function 解析入库
 *
 * 使用方式: npm run scrape
 * 环境变量: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, GEMINI_API_KEY
 */

const SUPABASE_URL = process.env.SUPABASE_URL || ''
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

async function fetchGitHubTrending(language = ''): Promise<Array<{
  title: string
  url: string
  stars: number
  author: string
  description: string
}>> {
  const url = language
    ? `https://api.github.com/search/repositories?q=ai+machine+learning+llm+language:${language}&sort=stars&order=desc&per_page=10`
    : 'https://api.github.com/search/repositories?q=ai+OR+machine-learning+OR+llm+OR+generative&sort=stars&order=desc&per_page=10'

  const res = await fetch(url, {
    headers: {
      'Accept': 'application/vnd.github.v3+json',
      'User-Agent': 'SkillFlow-Scraper/1.0'
    }
  })

  if (!res.ok) {
    console.error(`GitHub API error: ${res.status}`)
    return []
  }

  const data = await res.json()
  return (data.items || []).map((item: any) => ({
    title: item.name,
    url: item.html_url,
    stars: item.stargazers_count,
    author: item.owner?.login,
    description: item.description || ''
  }))
}

async function fetchReadme(repoUrl: string): Promise<string> {
  const readmeUrl = `${repoUrl}/raw/main/README.md`
  try {
    const res = await fetch(readmeUrl)
    if (res.ok) return await res.text()

    // 尝试 master 分支
    const res2 = await fetch(`${repoUrl}/raw/master/README.md`)
    if (res2.ok) return await res2.text()

    return ''
  } catch {
    return ''
  }
}

async function invokeAiParse(repo: {
  url: string
  stars: number
  author: string
  description: string
}): Promise<void> {
  console.log(`  Processing: ${repo.url}`)

  const readme = await fetchReadme(repo.url)
  if (!readme) {
    console.log(`    No README found, using description only`)
  }

  try {
    const res = await fetch(`${SUPABASE_URL}/functions/v1/ai-parse`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`
      },
      body: JSON.stringify({
        readmeContent: readme || repo.description,
        repoUrl: repo.url,
        stars: repo.stars,
        author: repo.author
      })
    })

    const data = await res.json()
    if (data.error) {
      console.log(`    Error: ${data.error}`)
    } else {
      console.log(`    ✅ Created: ${data.skill?.title}`)
    }
  } catch (err) {
    console.error(`    ❌ Failed: ${(err as Error).message}`)
  }
}

async function main() {
  console.log('=== SkillFlow Scraper ===')
  console.log(`Started at: ${new Date().toISOString()}`)

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables')
    process.exit(1)
  }

  // 抓取 GitHub Trending
  console.log('Fetching GitHub trending repositories...')
  const repos = await fetchGitHubTrending()
  console.log(`Found ${repos.length} repositories`)

  // 逐个解析（串行避免 API rate limit）
  for (const repo of repos) {
    await invokeAiParse(repo)
    // 延迟避免触发 rate limit
    await new Promise(r => setTimeout(r, 2000))
  }

  // 抓取 RSS 资讯
  console.log('\nFetching RSS news...')
  try {
    const res = await fetch(`${SUPABASE_URL}/functions/v1/rss-fetch`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`
      }
    })
    const data = await res.json()
    console.log(`  Processed ${data.processed} news items, Top 3: ${data.top3?.length || 0}`)
  } catch (err) {
    console.error(`  RSS fetch failed: ${(err as Error).message}`)
  }

  console.log('\n=== Scrape Complete ===')
}

main().catch(console.error)
