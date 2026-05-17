import { View, Text } from '@tarojs/components'
import { useEffect, useState } from 'react'
import Taro, { useRouter } from '@tarojs/taro'
import Layout from '../../components/Layout'
import { toolsApi, quotaApi } from '../../utils/api'
import { devMode } from '../../utils/devMode'
import type { Tool } from '../../stores/toolStore'
import './detail.scss'

export default function ToolDetailPage() {
  const router = useRouter(); const { id } = router.params
  const [tool, setTool] = useState<Tool | null>(null)
  const [loading, setLoading] = useState(true)
  const [downloading, setDownloading] = useState(false)

  useEffect(() => { if (id) loadTool() }, [id])
  async function loadTool() {
    const { data } = await toolsApi.getById(id as string)
    if (data) setTool(data); setLoading(false)
  }

  async function handleShareDownload() {
    if (!tool) return
    setDownloading(true)
    Taro.setClipboardData({ data: typeof window !== 'undefined' ? window.location.href : '' })
    const user = devMode.getUser()
    await quotaApi.shareUnlock(user.id, tool.id)
    downloadTool(tool)
  }

  async function handlePaidDownload() {
    if (!tool) return
    setDownloading(true)
    const user = devMode.getUser()
    await quotaApi.consumeFree(user.id, tool.id)
    downloadTool(tool)
  }

  function downloadTool(t: Tool) {
    const blob = new Blob([t.html_code], { type: 'text/html' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url
    a.download = `${t.slug || 'tool'}.html`
    document.body.appendChild(a); a.click(); document.body.removeChild(a)
    URL.revokeObjectURL(url)
    Taro.showToast({ title: '下载成功！双击打开即可使用', icon: 'success' })
    setDownloading(false)
  }

  if (loading) return <Layout><Text className="loading">加载中…</Text></Layout>
  if (!tool) return <Layout><Text className="loading">工具未找到</Text></Layout>

  return (
    <Layout className="tool-detail-page">
      <Text className="tool-title">{tool.title}</Text>
      <View className="tool-meta">
        <View className="tool-type-tag">{tool.tool_type}</View>
        {tool.is_premium && <View className="tool-premium-badge">精品</View>}
        <Text className="tool-downloads">{tool.download_count} 次下载</Text>
      </View>
      {tool.description && <Text className="tool-desc">{tool.description}</Text>}

      <View className="preview-frame">
        <Text className="preview-label">在线试用</Text>
        {/* #ifdef H5 */}
        <iframe srcDoc={tool.html_code} style={{ width:'100%',height:'350px',border:'none' }} sandbox="allow-scripts allow-same-origin allow-forms" />
        {/* #endif */}
      </View>

      <View className="download-section">
        {tool.is_premium && tool.premium_price ? (
          <View className="btn block" onClick={handlePaidDownload}>
            <Text>{downloading ? '处理中…' : `💰 购买下载 ¥${tool.premium_price}`}</Text>
          </View>
        ) : (
          <>
            <View className="btn block" onClick={handleShareDownload}>
              <Text>{downloading ? '处理中…' : '📤 分享朋友圈 → 免费下载'}</Text>
            </View>
            <View className="pay-option">
              <Text className="pay-option__text" onClick={handlePaidDownload}>或 ¥6.99 直接下载</Text>
            </View>
          </>
        )}
      </View>

      <View className="ai-notice">
        <Text className="ai-notice__text">🤖 这个工具是 AI 生成的</Text>
        <View className="btn btn--outline" onClick={() => Taro.navigateTo({ url: '/pages/index/index' })}>
          <Text>你也做一个 →</Text>
        </View>
      </View>

      <View className="custom-cta">
        <Text className="custom-cta__title">需要更专业的版本？</Text>
        <Text className="custom-cta__text">
          加微信 <Text style={{color:'var(--accent)',fontWeight:700}}>skilflow</Text>，帮你定制开发
        </Text>
      </View>
    </Layout>
  )
}
