import { View, Text, Textarea, ScrollView } from '@tarojs/components'
import { useEffect, useState } from 'react'
import Taro from '@tarojs/taro'
import Layout from '../../components/Layout'
import { useToolStore } from '../../stores/toolStore'
import { generateApi, quotaApi } from '../../utils/api'
import { useAuthStore } from '../../stores/authStore'
import './index.scss'

export default function GeneratePage() {
  const { formData, step, setStep, generatedHtml, generatedTitle, setGenerated, retryContext, setRetryContext, quota, setQuota } = useToolStore()
  const { user } = useAuthStore()
  const [streamedCode, setStreamedCode] = useState('')
  const [phase, setPhase] = useState('')
  const [feedback, setFeedback] = useState('')
  const [showGate, setShowGate] = useState(false)
  const [noQuota, setNoQuota] = useState(false)

  useEffect(() => {
    if (step === 'input') checkAndGenerate()
  }, [])

  async function checkAndGenerate() {
    if (!user?.id) return
    const { data: q } = await quotaApi.check(user.id)
    setQuota(q)

    if (!q?.canUseFree && q?.remainingFree <= 0) {
      setNoQuota(true)
      return
    }
    startGenerate()
  }

  async function startGenerate(retry = false) {
    setStep('generating')
    setStreamedCode('')
    setPhase('分析需求中...')
    await new Promise(r => setTimeout(r, 600))
    setPhase('正在生成代码...')

    const params: any = { prompt: formData.prompt, toolType: formData.toolType, style: formData.style }
    if (retry && retryContext) params.retryContext = retryContext

    const { data: result } = await generateApi.generate(params)
    setPhase('沙箱验证中...')
    await new Promise(r => setTimeout(r, 400))
    setPhase('')

    if (result?.success && result.html) {
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
  }

  function handleRetry() {
    setFeedback('')
    setRetryContext(null)
    startGenerate(true)
  }

  function handleGuidedRetry() {
    if (!feedback.trim()) {
      Taro.showToast({ title: '请描述哪里不满意', icon: 'none' })
      return
    }
    setRetryContext({ previousOutput: generatedHtml, userFeedback: feedback })
    startGenerate(true)
  }

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
    a.download = `${formData.prompt.slice(0, 30).replace(/[^a-zA-Z0-9\u4e00-\u9fa5]+/g, '-') || 'tool'}.html`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    Taro.showToast({ title: '下载成功，双击打开即可使用', icon: 'success' })
    setShowGate(false)
    quotaApi.check((user?.id ? user : { id: '' }).id).then(r => setQuota(r.data))
  }

  if (noQuota) {
    return (
      <Layout className="generate-page">
        <View className="download-gate download-gate--standalone">
          <Text className="gate__title">额度用完了</Text>
          <Text className="gate__desc">免费额度已用完。分享后可继续生成，或使用付费通道。</Text>
          <View className="gate__btn gate__btn--share" onClick={handleShareDownload}>
            <Text className="gate__btn-text">分享后免费生成</Text>
          </View>
          <View className="gate__divider"><Text>或</Text></View>
          <View className="gate__btn gate__btn--pay" onClick={handlePaidDownload}>
            <Text className="gate__btn-text">¥6.99 直接生成</Text>
          </View>
          <Text className="gate__link" onClick={() => { setNoQuota(false); startGenerate() }}>返回重试</Text>
        </View>
      </Layout>
    )
  }

  return (
    <Layout className="generate-page">
      {step === 'generating' && (
        <View className="gen-status">
          <View className="gen-spinner" />
          <Text className="gen-phase">{phase || '生成中...'}</Text>
          <Text className="gen-hint">保持页面打开，生成完成后会自动进入预览。</Text>
          {streamedCode ? <ScrollView className="gen-code" scrollY><Text className="gen-code__text">{streamedCode}</Text></ScrollView> : null}
        </View>
      )}

      {step === 'preview' && (
        <View className="preview-section">
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
            <iframe srcDoc={generatedHtml} style={{ width:'100%',height:'420px',border:'none' }} sandbox="allow-scripts allow-same-origin allow-forms" />
            {/* #endif */}
          </View>

          <View className="code-section">
            <Text className="code-section__label">生成代码 · {generatedHtml.length.toLocaleString()} 字符</Text>
            <ScrollView className="code-view" scrollY scrollX>
              <Text className="code-view__text">{generatedHtml.slice(0, 2000)}{generatedHtml.length > 2000 ? '\n\n...' : ''}</Text>
            </ScrollView>
          </View>

          {showGate ? (
            <View className="download-gate">
              <Text className="gate__title">下载这个工具</Text>
              <Text className="gate__desc">终身 2 次免费，分享可获得额外次数。</Text>
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
                <Text className="retry__label">不满意？重新生成不扣额度</Text>
                <Textarea
                  className="retry__input"
                  value={feedback}
                  onInput={(e) => setFeedback(e.detail.value)}
                  placeholder="告诉我哪里不符合预期，例如：功能不对、样式太简陋、需要增加导出按钮"
                />
                <View className="retry__btns">
                  {feedback.trim() ? (
                    <View className="btn btn--outline" onClick={handleGuidedRetry}><Text>按反馈重新生成</Text></View>
                  ) : (
                    <View className="btn btn--outline" onClick={handleRetry}><Text>直接重新生成</Text></View>
                  )}
                </View>
              </View>
            </View>
          )}

          <View className="custom-note">
            <Text>需要更复杂的功能？可以回到首页补充需求后重新生成。</Text>
          </View>
        </View>
      )}
    </Layout>
  )
}
