// Supabase Edge Function: wechat-pay
// 微信支付 API 中转 — 下单 + 回调处理
import { serve } from 'https://deno.land/std@0.208.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { crypto } from 'https://deno.land/std@0.208.0/crypto/mod.ts'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const WECHAT_APPID = Deno.env.get('WECHAT_APPID')!
const WECHAT_MCHID = Deno.env.get('WECHAT_MCHID') || ''
const WECHAT_API_KEY = Deno.env.get('WECHAT_API_KEY') || ''
const WECHAT_NOTIFY_URL = Deno.env.get('WECHAT_NOTIFY_URL') || ''

// 获取微信支付 access_token（JSAPI 支付用）
async function getPaySign(prepayId: string, nonceStr: string, timestamp: string): Promise<string> {
  const signStr = `appId=${WECHAT_APPID}&nonceStr=${nonceStr}&package=prepay_id=${prepayId}&signType=MD5&timeStamp=${timestamp}&key=${WECHAT_API_KEY}`
  const hash = await crypto.subtle.digest('MD5', new TextEncoder().encode(signStr))
  // 简化实现 — 生产环境需使用完整的微信支付 V3 签名
  return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('').toUpperCase()
}

serve(async (req: Request) => {
  try {
    const url = new URL(req.url)
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

    // 支付回调处理
    if (req.method === 'POST' && url.pathname.endsWith('/callback')) {
      const body = await req.text()
      console.log('Payment callback:', body)

      // 解析微信回调（生产环境需验证签名）
      try {
        const xml = body // XML 格式，生产环境中用 xml 解析库
        const transactionId = body.match(/<transaction_id><!\[CDATA\[(.*?)\]\]><\/transaction_id>/)?.[1] || ''
        const outTradeNo = body.match(/<out_trade_no><!\[CDATA\[(.*?)\]\]><\/out_trade_no>/)?.[1] || ''

        if (transactionId && outTradeNo) {
          // 更新支付记录
          const { data: payment } = await supabase
            .from('payments')
            .update({
              status: 'paid',
              wechat_transaction_id: transactionId
            })
            .eq('id', outTradeNo)
            .select()
            .single()

          // 增加用户配额
          if (payment) {
            if (payment.type === 'pro_monthly') {
              await supabase.from('user_quotas')
                .update({
                  is_pro: true,
                  pro_expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
                })
                .eq('user_id', payment.user_id)
            } else {
              await supabase.from('user_quotas')
                .update({ purchased: supabase.rpc('get_purchased_plus', { val: payment.quota_added }) })
                .eq('user_id', payment.user_id)
            }
          }
        }
      } catch {
        // 回调处理失败不阻塞返回
      }

      // 返回成功给微信
      return new Response('<xml><return_code><![CDATA[SUCCESS]]></return_code></xml>', {
        headers: { 'Content-Type': 'application/xml' }
      })
    }

    // 下单 API
    const { userId, type } = await req.json()

    if (!userId || !type) {
      return new Response(JSON.stringify({ error: 'Missing userId or type' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    // 获取定价
    const priceKey = type === 'pro_monthly' ? 'pro_monthly_price' : 'single_pay_price'
    const quotaKey = type === 'pro_monthly' ? null : 'single_pay_quota'
    const { data: priceConfig } = await supabase.from('app_config').select('value').eq('key', priceKey).single()
    const amount = priceConfig ? parseFloat(priceConfig.value) : (type === 'pro_monthly' ? 29.9 : 9.9)
    const quotaAdded = quotaKey
      ? parseInt(((await supabase.from('app_config').select('value').eq('key', quotaKey).single()).data?.value || '5'))
      : 0

    // 创建支付记录
    const { data: payment, error } = await supabase
      .from('payments')
      .insert({
        user_id: userId,
        amount,
        type,
        status: 'pending',
        quota_added: quotaAdded
      })
      .select()
      .single()

    if (error) throw error

    // 调用微信统一下单 API（JSAPI）
    // 生产环境需完整实现 V3 API 签名和调用
    // 此处返回支付参数供前端调起微信支付
    const nonceStr = crypto.randomUUID().replace(/-/g, '')
    const timestamp = Math.floor(Date.now() / 1000).toString()

    return new Response(JSON.stringify({
      success: true,
      payment: {
        id: payment.id,
        amount,
        type,
        quota_added: quotaAdded
      },
      // 微信 JSAPI 支付参数（需实际调用微信 API 获取 prepay_id）
      wechat_pay_params: {
        appId: WECHAT_APPID,
        timeStamp: timestamp,
        nonceStr,
        package: `prepay_id=WX_PREPAY_ID_PLACEHOLDER`, // 实际需从微信接口获取
        signType: 'MD5',
        paySign: await getPaySign('WX_PREPAY_ID_PLACEHOLDER', nonceStr, timestamp)
      }
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
