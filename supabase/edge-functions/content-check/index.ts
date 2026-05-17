// Supabase Edge Function: content-check
// 微信内容安全审查（msgSecCheck）中转

import { serve } from 'https://deno.land/std@0.208.0/http/server.ts'

const WECHAT_APPID = Deno.env.get('WECHAT_APPID')!
const WECHAT_SECRET = Deno.env.get('WECHAT_SECRET')!

async function getAccessToken(): Promise<string> {
  const res = await fetch(
    `https://api.weixin.qq.com/cgi-bin/token?grant_type=client_credential&appid=${WECHAT_APPID}&secret=${WECHAT_SECRET}`
  )
  const data = await res.json()
  return data.access_token
}

serve(async (req: Request) => {
  try {
    const { content } = await req.json()

    if (!content) {
      return new Response(JSON.stringify({ error: 'Missing content' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    const accessToken = await getAccessToken()

    const res = await fetch(
      `https://api.weixin.qq.com/wxa/msg_sec_check?access_token=${accessToken}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content })
      }
    )

    const data = await res.json()

    // 0 表示内容合规
    return new Response(JSON.stringify({
      passed: data.errcode === 0,
      errcode: data.errcode,
      errmsg: data.errmsg
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
