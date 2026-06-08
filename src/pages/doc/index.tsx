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
    if (!result || (!result.text && !result.sections)) return
    const htmlContent = generateHTML(result, format)
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
        <View className={`format-opt ${format === 'gongwen' ? 'format-opt--active' : ''}`} onClick={() => setFormat('gongwen')}>
          <Text>公文格式</Text>
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
            <Text className="result-text">{renderPreviewText(result)}</Text>
          </View>
          <View className="result-stats">
            <Text className="result-stats__text">
              共 {result.stats?.chars?.toLocaleString() || result.text?.length?.toLocaleString() || 0} 字符 · {result.stats?.paragraphs || result.text?.split('\n').filter(l => l.trim()).length || 0} 段
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

function generateHTML(result: { title?: string; text?: string; sections?: any[]; format?: string }, format: string): string {
  const title = result.title || '文档'
  const isGongwen = format === 'gongwen'

  // 构建 body HTML
  let body: string
  if (result.sections && result.sections.length > 0) {
    body = renderSections(result.sections, isGongwen)
  } else {
    // fallback: 纯文本按行解析，先去掉可能重复的标题行
    const safeText = stripTitleFromText(result.text || '', title)
    body = renderTextAsHTML(safeText, isGongwen)
  }

  // 公文格式：加 @page CSS 设置页边距 (GB/T 9704-2012)
  const pageStyle = isGongwen
    ? '<style>@page { size: A4; margin: 3.7cm 2.6cm 3.5cm 2.8cm; }</style>'
    : ''
  const titleStyle = isGongwen
    ? 'font-family:FZXiaoBiaoSong-B05S,宋体,SimSun,serif;font-size:22pt;font-weight:normal;line-height:35.45pt'
    : 'font-size:18pt;font-weight:bold'
  const bodyStyle = isGongwen
    ? 'style="font-family:FangSong,仿宋,STFangsong,serif;font-size:16pt"'
    : ''

  return `<html xmlns:o="urn:schemas-microsoft-com:office:office"
  xmlns:w="urn:schemas-microsoft-com:office:word"
  xmlns="http://www.w3.org/TR/REC-html40">
  <head><meta charset="utf-8"><title>${title}</title>${pageStyle}</head>
  <body${bodyStyle ? ' ' + bodyStyle : ''}><h1 style="text-align:center;${titleStyle}">${title}</h1>${body}</body></html>`
}

// fallback 路径：纯文本开头如果与标题相同，删除
function stripTitleFromText(text: string, title: string): string {
  if (!title || !text) return text
  const lines = text.split('\n')
  // 检查第一非空行是否等于标题
  const firstIdx = lines.findIndex(l => l.trim())
  if (firstIdx >= 0 && lines[firstIdx].trim() === title.trim()) {
    lines.splice(firstIdx, 1)
  }
  return lines.join('\n')
}

// 用 AI 返回的 sections 数组渲染 HTML
function renderSections(sections: any[], isGongwen: boolean): string {
  // 防御性去重：如果第一段正文以文档标题开头，裁剪掉标题
  const safe = dedupTitleFromFirstParagraph(sections)
  if (isGongwen) return renderGongwenSections(safe)
  return renderNormalSections(safe)
}

// 删除第一段正文中与 H1 标题完全重复的开头文本
function dedupTitleFromFirstParagraph(sections: any[]): any[] {
  const title = sections.find(s => s.type === 'heading' && s.level === 1)
  if (!title) return sections
  const titleText = title.text || ''
  return sections.map((s, i) => {
    // 找第一个 paragraph
    if (s.type !== 'paragraph') return s
    const isFirst = !sections.slice(0, i).some(prev => prev.type === 'paragraph')
    if (!isFirst) return s
    const t = s.text || ''
    if (t.trim() === titleText.trim()) {
      // 整段就是标题——跳过这段
      return null
    }
    if (t.startsWith(titleText + '\n')) {
      return { ...s, text: t.slice(titleText.length + 1) }
    }
    if (t.startsWith(titleText)) {
      return { ...s, text: t.slice(titleText.length).replace(/^\n+/, '') }
    }
    return s
  }).filter(Boolean)
}

function renderGongwenSections(sections: any[]): string {
  return sections.map(s => {
    switch (s.type) {
      case 'heading': {
        const lv = s.level || 2
        if (lv === 1) return '' // H1 是文档标题，已单独渲染
        if (lv === 2)
          return `<h2 style="font-family:SimHei,黑体,sans-serif;font-size:16pt;font-weight:normal;margin:10px 0 4px 0;line-height:29.45pt">${esc(s.text)}</h2>`
        if (lv === 3)
          return `<h3 style="font-family:KaiTi,楷体,STKaiti,serif;font-size:16pt;font-weight:bold;margin:8px 0 2px 0;line-height:29.45pt">${esc(s.text)}</h3>`
        if (lv === 4)
          return `<h4 style="font-family:FangSong,仿宋,STFangsong,serif;font-size:16pt;font-weight:bold;margin:6px 0 2px 0;line-height:29.45pt">${esc(s.text)}</h4>`
        return `<h5 style="font-family:FangSong,仿宋,STFangsong,serif;font-size:16pt;margin:4px 0 2px 0;line-height:29.45pt">${esc(s.text)}</h5>`
      }
      case 'paragraph':
        // 公文落款：签名/日期行右对齐，首行不缩进
        {
          const isSign = /^(?:签名|姓\s*名|日\s*期|年\s+月\s+日)/.test(s.text) || /^\d{4}\s*年\s*\d{1,2}\s*月\s*\d{1,2}\s*日/.test(s.text)
          const indent = isSign ? 'text-indent:0;text-align:right' : 'text-indent:2em'
          return `<p style="font-family:FangSong,仿宋,STFangsong,serif;font-size:16pt;${indent};margin:0;line-height:29.45pt">${esc(s.text)}</p>`
        }
      case 'list': {
        const items = (s.items || []).map((item: string) => `<li style="font-family:FangSong,仿宋,STFangsong,serif;font-size:16pt;line-height:29.45pt">${esc(item)}</li>`).join('')
        const tag = s.ordered ? 'ol' : 'ul'
        return `<${tag} style="margin:4px 0 4px 1.5em;padding:0">${items}</${tag}>`
      }
      case 'quote':
        return `<blockquote style="font-family:FangSong,仿宋,STFangsong,serif;font-size:16pt;border-left:3px solid #ccc;margin:8px 0;padding:4px 12px;line-height:29.45pt">${esc(s.text)}${s.source ? `<footer>— ${esc(s.source)}</footer>` : ''}</blockquote>`
      default:
        return `<p style="font-family:FangSong,仿宋,STFangsong,serif;font-size:16pt;text-indent:2em;margin:0;line-height:29.45pt">${esc(s.text || '')}</p>`
    }
  }).join('\n')
}

function renderNormalSections(sections: any[]): string {
  return sections.map(s => {
    switch (s.type) {
      case 'heading': {
        const lv = s.level || 2
        if (lv === 1) return '' // H1 文档标题已单独渲染
        const sizes: Record<number,string> = { 2: '1.3em', 3: '1.15em', 4: '1.05em' }
        return `<h${lv} style="font-weight:bold;margin:14px 0 6px 0;font-size:${sizes[lv] || '1em'}">${esc(s.text)}</h${lv}>`
      }
      case 'paragraph':
        return `<p style="text-indent:2em;margin:6px 0;line-height:1.8">${esc(s.text)}</p>`
      case 'list': {
        const items = (s.items || []).map((item: string) => `<li>${esc(item)}</li>`).join('')
        const tag = s.ordered ? 'ol' : 'ul'
        return `<${tag} style="margin:6px 0 6px 1.5em;padding:0;line-height:1.8">${items}</${tag}>`
      }
      case 'quote':
        return `<blockquote style="border-left:3px solid #ccc;margin:8px 0;padding:4px 12px;line-height:1.8">${esc(s.text)}${s.source ? `<footer>— ${esc(s.source)}</footer>` : ''}</blockquote>`
      default:
        return `<p style="text-indent:2em;margin:6px 0;line-height:1.8">${esc(s.text || '')}</p>`
    }
  }).join('\n')
}

// fallback: 纯文本按行解析（当 sections 不可用时）
function renderTextAsHTML(text: string, isGongwen: boolean): string {
  return text.split('\n').map(line => {
    const trimmed = line.trim()
    if (!trimmed) return '' // 空行跳过，不用 <br>
    if (isGongwen) {
      if (/^[一二三四五六七八九十]+、/.test(trimmed) && trimmed.length < 80)
        return `<h2 style="font-family:SimHei,黑体,sans-serif;font-size:16pt;font-weight:normal;margin:10px 0 4px 0;line-height:29.45pt">${esc(trimmed)}</h2>`
      if (/^（[一二三四五六七八九十\d]+）/.test(trimmed) && trimmed.length < 80)
        return `<h3 style="font-family:KaiTi,楷体,STKaiti,serif;font-size:16pt;font-weight:bold;margin:8px 0 2px 0;line-height:29.45pt">${esc(trimmed)}</h3>`
      if (/^\d+\./.test(trimmed) && trimmed.length < 80 && !/^\d+\.\d+/.test(trimmed))
        return `<h4 style="font-family:FangSong,仿宋,STFangsong,serif;font-size:16pt;font-weight:bold;margin:6px 0 2px 0;line-height:29.45pt">${esc(trimmed)}</h4>`
      if (/^（\d+）/.test(trimmed) && trimmed.length < 80)
        return `<h5 style="font-family:FangSong,仿宋,STFangsong,serif;font-size:16pt;margin:4px 0 2px 0;line-height:29.45pt">${esc(trimmed)}</h5>`
      return `<p style="font-family:FangSong,仿宋,STFangsong,serif;font-size:16pt;text-indent:2em;margin:0;line-height:29.45pt">${esc(trimmed)}</p>`
    }
    // 落款：签名/日期行右对齐
    const isSign = /^(?:签名|姓\s*名|日\s*期|年\s+月\s+日)/.test(trimmed) || /^\d{4}\s*年\s*\d{1,2}\s*月\s*\d{1,2}\s*日/.test(trimmed)
    if (isGongwen && isSign)
      return `<p style="font-family:FangSong,仿宋,STFangsong,serif;font-size:16pt;text-align:right;margin:0;line-height:29.45pt">${esc(trimmed)}</p>`
    if (/^[一二三四五六七八九十]/.test(trimmed) && trimmed.length < 30) return `<h2>${esc(trimmed)}</h2>`
    if (trimmed.endsWith('：') && trimmed.length < 30) return `<h3>${esc(trimmed)}</h3>`
    return `<p style="text-indent:2em;margin:6px 0;line-height:1.8">${esc(trimmed)}</p>`
  }).filter(Boolean).join('\n')
}

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

// 预览：用 text 字段（纯文本），截断 3000 字符
function renderPreviewText(result: { text?: string; sections?: any[] }): string {
  const source = result.text || sectionsToText(result.sections) || ''
  return source.length > 3000 ? source.slice(0, 3000) + '\n\n...' : source
}

// sections 数组转为纯文本预览
function sectionsToText(sections?: any[]): string {
  if (!sections || sections.length === 0) return ''
  return sections.map(s => {
    if (s.type === 'list') return (s.items || []).map((item: string) => `- ${item}`).join('\n')
    return s.text || ''
  }).join('\n\n')
}
