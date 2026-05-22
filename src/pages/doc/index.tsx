import { View, Text, Textarea } from '@tarojs/components'
import { useState } from 'react'
import Taro from '@tarojs/taro'
import Layout from '../../components/Layout'
import { useAuthStore } from '../../stores/authStore'
import './index.scss'

export default function DocPage() {
  const { user } = useAuthStore()
  const [text, setText] = useState('')
  const [format, setFormat] = useState('normal')
  const [processing, setProcessing] = useState(false)
  const [result, setResult] = useState<{ title?: string; sections?: any[]; text?: string } | null>(null)
  const [showGate, setShowGate] = useState(false)
  const [docUsed, setDocUsed] = useState(0)
  const [downloaded, setDownloaded] = useState(false)

  async function handleClean() {
    if (!text.trim()) {
      Taro.showToast({ title: '请先粘贴内容', icon: 'none' })
      return
    }

    if (docUsed >= 1 && !showGate) {
      setShowGate(true)
      return
    }

    setProcessing(true)
    setResult(null)
    setDownloaded(false)

    try {
      const { invokeEdgeFunction } = await import('../../utils/supabase')
      const data = await invokeEdgeFunction<{ title?: string; sections?: any[]; text?: string }>('doc-cleanup', { text, format })
      if (data && (data.text || data.sections)) {
        setResult(data)
      } else {
        const cleaned = cleanText(text, format)
        setResult({ text: cleaned, title: extractTitle(cleaned) })
      }
    } catch {
      const cleaned = cleanText(text, format)
      setResult({ text: cleaned, title: extractTitle(cleaned) })
    } finally {
      setProcessing(false)
    }
  }

  function downloadDocx() {
    if (!result?.text) return
    const htmlContent = generateHTML(result)
    const blob = new Blob([htmlContent], { type: 'application/msword' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${result.title || 'document'}.doc`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    Taro.showToast({ title: '下载成功', icon: 'success' })
    setShowGate(false)
    setDownloaded(true)
  }

  function handleShare() {
    Taro.setClipboardData({ data: typeof window !== 'undefined' ? window.location.href : '' })
    Taro.showToast({ title: '链接已复制，下载中...', icon: 'success' })
    setDocUsed(d => d + 1)
    downloadDocx()
  }

  function handlePay() {
    Taro.showToast({ title: '支付开发中，当前可免费体验', icon: 'none', duration: 1500 })
    setDocUsed(d => d + 1)
    downloadDocx()
  }

  function handleReset() {
    setText('')
    setResult(null)
    setShowGate(false)
    setDownloaded(false)
  }

  return (
    <Layout className="doc-page">
      <View className="page-header">
        <Text className="page-header__eyebrow">AI 文档整理</Text>
        <Text className="page-header__title">把散乱文字整理成干净文档</Text>
        <Text className="page-header__desc">粘贴 AI 生成的内容，一键清洗 Markdown 符号、整理段落，并导出 Word。</Text>
      </View>

      <View className="format-bar">
        <View className={`format-opt ${format === 'normal' ? 'format-opt--active' : ''}`} onClick={() => setFormat('normal')}>
          <Text>普通文档</Text>
        </View>
        <View className="format-opt format-opt--soon">
          <Text>公文格式<Text className="soon-tag">即将上线</Text></Text>
        </View>
        <View className="format-opt format-opt--soon">
          <Text>公众号稿<Text className="soon-tag">即将上线</Text></Text>
        </View>
      </View>

      <View className="input-area">
        <Textarea
          className="doc-textarea"
          value={text}
          onInput={(e) => setText(e.detail.value)}
          placeholder="把 ChatGPT / Claude / DeepSeek 等 AI 生成的文章粘贴到这里..."
          maxlength={50000}
          autoHeight
        />
        <View className="input-footer">
          <Text className="input-count">{text.length.toLocaleString()} / 50,000</Text>
        </View>
      </View>

      {!result && !showGate && !downloaded && (
        <View className={`clean-btn ${processing ? 'clean-btn--loading' : ''}`} onClick={handleClean}>
          <Text className="clean-btn__text">{processing ? '正在整理...' : '开始整理'}</Text>
        </View>
      )}

      {processing && (
        <View className="progress">
          <Text className="progress__text">分析结构、清洗符号、整理排版中...</Text>
        </View>
      )}

      {result && !showGate && !downloaded && (
        <View className="result-card">
          <View className="result-header">
            <Text className="result-label">预览</Text>
          </View>
          <View className="result-content">
            <Text className="result-text">{result.text?.slice(0, 3000)}{(result.text?.length || 0) > 3000 ? '\n\n...' : ''}</Text>
          </View>
          <View className="result-stats">
            <Text className="result-stats__text">
              共 {result.text?.length.toLocaleString()} 字符 · {result.text?.split('\n').filter(l => l.trim()).length || 0} 段
            </Text>
          </View>
          <View className="result-actions">
            <View className="btn block" onClick={() => setShowGate(true)}><Text>下载 Word 文档</Text></View>
            <View className="btn btn--outline block" onClick={handleReset}><Text>重新整理</Text></View>
          </View>
        </View>
      )}

      {downloaded && (
        <View className="result-card">
          <View className="result-header">
            <Text className="result-label">下载完成</Text>
          </View>
          <View className="result-content" style={{ textAlign: 'center', padding: '2rem 0' }}>
            <Text className="result-text" style={{ fontSize: '1.1rem', color: 'var(--color-text)' }}>文档已保存到你的电脑</Text>
          </View>
          <View className="result-actions">
            <View className="btn block btn--primary" onClick={handleReset}>
              <Text>开始新任务</Text>
            </View>
          </View>
        </View>
      )}

      {showGate && (
        <View className="gate-card">
          <Text className="gate-title">下载 Word 文档</Text>
          {docUsed === 0 ? (
            <View>
              <Text className="gate-desc">第 1 次完全免费</Text>
              <View className="gate__btn gate__btn--share" onClick={handleShare}><Text className="gate__btn-text">免费下载</Text></View>
            </View>
          ) : (
            <View>
              <Text className="gate-desc">分享或付费，文档即可下载到本地。</Text>
              <View className="gate__btn gate__btn--share" onClick={handleShare}><Text className="gate__btn-text">分享后免费下载</Text></View>
              <View className="gate__divider"><Text>或</Text></View>
              <View className="gate__btn gate__btn--pay" onClick={handlePay}><Text className="gate__btn-text">¥1.99 直接下载</Text></View>
            </View>
          )}
        </View>
      )}

      <View className="info-card">
        <Text className="info-card__title">适合这些内容</Text>
        <Text className="info-card__text">会议纪要、文章草稿、报告初稿、AI 对话输出。系统会去掉常见 Markdown 符号，保留可读的段落结构。</Text>
      </View>
    </Layout>
  )
}

function cleanText(text: string, _format: string): string {
  let t = text
  t = t.replace(/^#{1,6}\s+/gm, '')
  t = t.replace(/\*\*(.+?)\*\*/g, '$1')
  t = t.replace(/__(.+?)__/g, '$1')
  t = t.replace(/\*(.+?)\*/g, '$1')
  t = t.replace(/_(.+?)_/g, '$1')
  t = t.replace(/^[\-\*\+]\s+/gm, '')
  t = t.replace(/^\d+\.\s+/gm, '')
  t = t.replace(/```[\s\S]*?```/g, '')
  t = t.replace(/`(.+?)`/g, '$1')
  t = t.replace(/^>\s+/gm, '')
  t = t.replace(/^[-*_]{3,}\s*$/gm, '')
  t = t.replace(/\n{3,}/g, '\n\n')
  t = t.split('\n').map(l => l.trim()).join('\n')
  return t.trim()
}

function extractTitle(text: string): string {
  const lines = text.split('\n').filter(l => l.trim())
  return lines[0]?.slice(0, 50) || '文档'
}

function generateHTML(result: { title?: string; text?: string }): string {
  const title = result.title || '文档'
  const body = (result.text || '').split('\n').map(line => {
    const trimmed = line.trim()
    if (!trimmed) return '<br>'
    if (/^[一二三四五六七八九十]/.test(trimmed) && trimmed.length < 30) return `<h2>${trimmed}</h2>`
    if (trimmed.endsWith('：') && trimmed.length < 30) return `<h3>${trimmed}</h3>`
    return `<p style="text-indent:2em;margin:6px 0;line-height:1.8">${trimmed}</p>`
  }).join('\n')

  return `<html xmlns:o="urn:schemas-microsoft-com:office:office"
  xmlns:w="urn:schemas-microsoft-com:office:word"
  xmlns="http://www.w3.org/TR/REC-html40">
  <head><meta charset="utf-8"><title>${title}</title></head>
  <body><h1 style="text-align:center;font-size:18pt;font-weight:bold">${title}</h1>${body}</body></html>`
}
