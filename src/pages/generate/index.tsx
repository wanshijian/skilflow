import { View, Text, Textarea, ScrollView } from '@tarojs/components'
import { useState } from 'react'
import Taro from '@tarojs/taro'
import Layout from '../../components/Layout'
import { useToolStore } from '../../stores/toolStore'
import { useAuthStore } from '../../stores/authStore'
import { generateApi, quotaApi } from '../../utils/api'
import './index.scss'

const TOOL_TYPES = [
  { value: 'utility', label: '实用工具' },
  { value: 'converter', label: '格式转换' },
  { value: 'game', label: '小游戏' },
  { value: 'generator', label: '生成器' },
  { value: 'calculator', label: '计算器' },
  { value: 'text-tool', label: '文本工具' },
]

const STYLE_OPTIONS = [
  { value: 'clean', label: '清爽' },
  { value: 'minimal', label: '极简' },
  { value: 'enterprise', label: '专业' },
]

export default function GeneratePage() {
  const { user } = useAuthStore()
  const { formData, setFormData, step, setStep, generatedHtml, generatedTitle, setGenerated, retryContext, setRetryContext, quota, setQuota } = useToolStore()
  const [streamedCode, setStreamedCode] = useState('')
  const [phase, setPhase] = useState('')
  const [feedback, setFeedback] = useState('')
  const [showGate, setShowGate] = useState(false)
  const [noQuota, setNoQuota] = useState(false)

  // === 开始生成 ===
  async function handleGenerate() {
    if (!formData.prompt.trim()) {
      Taro.showToast({ title: '先描述一下你想要的小工具', icon: 'none' })
      return
    }
    if (!user?.id) {
      Taro.showToast({ title: '请先登录', icon: 'none' })
      return
    }

    const { data: q } = await quotaApi.check(user.id)
    setQuota(q)
    if (!q?.canUseFree && q?.remainingFree <= 0) {
      setNoQuota(true)
      return
    }

    setStep('generating')
    setStreamedCode('')
    setShowGate(false)
    setPhase('分析需求中...')
    await new Promise(r => setTimeout(r, 600))
    setPhase('正在生成代码...')

    try {
      const { data: result } = await generateApi.generate({
        prompt: formData.prompt,
        toolType: formData.toolType,
        style: formData.style,
        requirements: '',
      })

      if (result?.success && result.html) {
        setPhase('沙箱验证中...')
        await new Promise(r => setTimeout(r, 400))
        setPhase('')

        const lines = result.html.split('\n')
        let acc = ''
        for (const line of lines) {
          acc += line + '\n'
          setStreamedCode(acc)
          await new Promise(r => setTimeout(r, 10))
        }
        setGenerated(result.html, result.title || formData.prompt.slice(0, 40))
        setStep('preview')
      } else {
        Taro.showToast({ title: '生成失败，请重试', icon: 'none' })
        setStep('input')
      }
    } catch {
      Taro.showToast({ title: '生成服务暂不可用，请稍后重试', icon: 'none', duration: 2000 })
      setStep('input')
    }
  }

  // === 返回首页重新开始 ===
  function handleStartNew() {
    setFormData({ prompt: '' })
    setGenerated('', '')
    setStreamedCode('')
    setFeedback('')
    setRetryContext(null)
    setStep('input')
    setShowGate(false)
  }

  // === 按反馈重新生成（保留前次输出上下文） ===
  async function handleGuidedRetry() {
    if (!feedback.trim()) {
      Taro.showToast({ title: '请先描述哪里不符合预期，再点重新生成', icon: 'none', duration: 2000 })
      return
    }
    setRetryContext({ previousOutput: generatedHtml, userFeedback: feedback })
    setStep('generating')
    setStreamedCode('')
    setPhase('根据反馈重新生成...')

    try {
      const { data: result } = await generateApi.generate({
        prompt: formData.prompt,
        toolType: formData.toolType,
        style: formData.style,
        retryContext: { previousOutput: generatedHtml, userFeedback: feedback }
      })
      if (result?.success && result.html) {
        const lines = result.html.split('\n')
        let acc = ''
        for (const line of lines) { acc += line + '\n'; setStreamedCode(acc); await new Promise(r => setTimeout(r, 10)) }
        setGenerated(result.html, result.title || formData.prompt.slice(0, 40))
        setStep('preview')
      } else {
        Taro.showToast({ title: '重新生成失败', icon: 'none' })
        setStep('input')
      }
    } catch {
      Taro.showToast({ title: '生成服务暂不可用', icon: 'none' })
      setStep('input')
    }
  }

  // === 下载 ===
  async function handleShareDownload() {
    Taro.setClipboardData({ data: typeof window !== 'undefined' ? window.location.href : '' })
    const userId = user?.id || ''
    await quotaApi.shareUnlock(userId, 'generated')
    await quotaApi.check(userId).then(r => setQuota(r.data))
    downloadFile()
  }

  async function handlePaidDownload() {
    Taro.showToast({ title: '支付功能开发中，当前免费体验', icon: 'none', duration: 2000 })
    const userId = user?.id || ''
    await quotaApi.consumeFree(userId, 'generated')
    await quotaApi.check(userId).then(r => setQuota(r.data))
    downloadFile()
  }

  function downloadFile() {
    if (!generatedHtml) return
    const blob = new Blob([generatedHtml], { type: 'text/html' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${formData.prompt.slice(0, 30).replace(/[^a-zA-Z0-9一-龥]+/g, '-') || 'tool'}.html`
    document.body.appendChild(a); a.click(); document.body.removeChild(a)
    URL.revokeObjectURL(url)
    Taro.showToast({ title: '下载成功，双击打开即可使用', icon: 'success' })
    setShowGate(false)
    if (user?.id) quotaApi.check(user.id).then(r => setQuota(r.data))
  }

  // === 额度用完 ===
  if (noQuota) {
    return (
      <Layout className="generate-page">
        <View className="gate-card">
          <Text className="gate-title">额度用完了</Text>
          <Text className="gate-desc">免费额度已用完。分享后可继续生成，或使用付费通道。</Text>
          <View className="gate__btn gate__btn--share" onClick={handleShareDownload}>
            <Text className="gate__btn-text">分享后免费生成</Text>
          </View>
          <View className="gate__divider"><Text>或</Text></View>
          <View className="gate__btn gate__btn--pay" onClick={handlePaidDownload}>
            <Text className="gate__btn-text">¥6.99 直接生成</Text>
          </View>
          <Text className="gate__link" onClick={() => setNoQuota(false)}>返回重试</Text>
        </View>
      </Layout>
    )
  }

  // === 输入阶段 ===
  if (step === 'input') {
    return (
      <Layout className="generate-page">
        <View className="page-header">
          <Text className="page-header__eyebrow">AI 小工具生成</Text>
          <Text className="page-header__title">一句话，把想法变成可用工具</Text>
          <Text className="page-header__desc">描述需求、选择类型和风格，AI 自动生成可下载、可预览的 HTML 小工具。</Text>
        </View>

        <View className="composer">
          <Textarea
            className="composer__input"
            value={formData.prompt}
            onInput={(e) => setFormData({ prompt: e.detail.value })}
            placeholder="描述你想要的小工具，例如：做一个 Word 转 PDF 工具，支持拖拽上传..."
            maxlength={500}
            autoHeight
          />
          <View className="composer__meta">
            <Text className="composer__count">{formData.prompt.length} / 500</Text>
          </View>

          <View className="composer__section">
            <Text className="composer__label">工具类型</Text>
            <View className="segmented">
              {TOOL_TYPES.map(t => (
                <View
                  key={t.value}
                  className={`chip ${formData.toolType === t.value ? 'chip--active' : ''}`}
                  onClick={() => setFormData({ toolType: t.value })}
                ><Text>{t.label}</Text></View>
              ))}
            </View>
          </View>

          <View className="composer__section">
            <Text className="composer__label">界面风格</Text>
            <View className="style-options">
              {STYLE_OPTIONS.map(s => (
                <View
                  key={s.value}
                  className={`style-opt ${formData.style === s.value ? 'style-opt--active' : ''}`}
                  onClick={() => setFormData({ style: s.value })}
                ><Text>{s.label}</Text></View>
              ))}
            </View>
          </View>

          <View className="composer__footer">
            <View className="generate-btn" onClick={handleGenerate}>
              <Text className="generate-btn__text">开始生成</Text>
            </View>
          </View>
        </View>
      </Layout>
    )
  }

  // === 生成中 ===
  if (step === 'generating') {
    return (
      <Layout className="generate-page">
        <View className="gen-status">
          <View className="gen-spinner" />
          <Text className="gen-phase">{phase || '生成中...'}</Text>
          <Text className="gen-hint">保持页面打开，生成完成后会自动进入预览。</Text>
          {streamedCode ? (
            <ScrollView className="gen-code" scrollY><Text className="gen-code__text">{streamedCode}</Text></ScrollView>
          ) : null}
        </View>
      </Layout>
    )
  }

  // === 预览阶段 ===
  return (
    <Layout className="generate-page">
      <View className="preview-header">
        <View>
          <Text className="preview-kicker">生成完成</Text>
          <Text className="preview-title">{generatedTitle || '你的工具'}</Text>
        </View>
        {quota && (
          <View className="quota-pill">
            <Text>剩余免费 {quota.remainingFree} 次</Text>
          </View>
        )}
      </View>

      <View className="preview-frame">
        {/* #ifdef H5 */}
        <iframe srcDoc={generatedHtml} style={{ width: '100%', height: '420px', border: 'none' }} sandbox="allow-scripts allow-same-origin allow-forms" />
        {/* #endif */}
      </View>

      <View className="code-section">
        <Text className="code-section__label">生成代码 · {generatedHtml.length.toLocaleString()} 字符</Text>
        <ScrollView className="code-view" scrollY scrollX>
          <Text className="code-view__text">{generatedHtml.slice(0, 2000)}{generatedHtml.length > 2000 ? '\n\n...' : ''}</Text>
        </ScrollView>
      </View>

      {showGate ? (
        <View className="gate-card">
          <Text className="gate-title">下载这个工具</Text>
          <Text className="gate-desc">分享后可免费下载，或直接付费解锁。</Text>
          <View className="gate__btn gate__btn--share" onClick={handleShareDownload}>
            <Text className="gate__btn-text">分享后免费下载</Text>
          </View>
          <View className="gate__divider"><Text>或</Text></View>
          <View className="gate__btn gate__btn--pay" onClick={handlePaidDownload}>
            <Text className="gate__btn-text">¥6.99 直接下载</Text>
          </View>
        </View>
      ) : (
        <View className="action-buttons">
          <View className="btn block" onClick={() => setShowGate(true)}><Text>下载到电脑</Text></View>

          <View className="retry-section">
            <Text className="retry__label">不满意？描述哪里不符合预期，AI 在原基础上修复</Text>
            <Textarea
              className="retry__input"
              value={feedback}
              onInput={(e) => setFeedback(e.detail.value)}
              placeholder="告诉我哪里不符合预期，例如：功能不对、样式太简陋、需要增加导出按钮"
            />
            <View className="retry__btns">
              <View className="btn btn--outline" onClick={handleGuidedRetry}><Text>按反馈重新生成</Text></View>
            </View>
          </View>

          <View className="start-new-section">
            <View className="btn btn--ghost" onClick={handleStartNew}><Text>← 开始新的生成</Text></View>
          </View>
        </View>
      )}

      <View className="custom-note">
        <Text>需要更复杂功能？联系微信客服 zxdyzy365</Text>
      </View>
    </Layout>
  )
}
