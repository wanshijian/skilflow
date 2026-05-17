import { View, Text, Textarea } from '@tarojs/components'
import { useEffect } from 'react'
import Taro from '@tarojs/taro'
import Layout from '../../components/Layout'
import QuotaBar from '../../components/QuotaBar'
import { useAppFactory } from '../../hooks/useAppFactory'
import './index.scss'

const LANGUAGES = [
  { value: 'python', label: 'Python', icon: '🐍', desc: '数据处理/自动化' },
  { value: 'html', label: 'HTML', icon: '🌐', desc: '网页/小工具' },
  { value: 'nodejs', label: 'Node.js', icon: '💚', desc: 'API/后端服务' }
]

const PLACEHOLDERS: Record<string, string> = {
  python: '例如：写一个批量重命名文件的工具，支持正则匹配和预览',
  html: '例如：做一个番茄钟倒计时页面，有工作/休息切换和音效提醒',
  nodejs: '例如：创建一个简单的 REST API，支持增删改查待办事项'
}

export default function AppFactoryPage() {
  const {
    flowStep, currentPrompt, currentLanguage, currentApp,
    generatedCode, sandboxResult, remainingQuota, quota,
    generateApp, testInSandbox, shareForQuota, loadQuota,
    reset, setPrompt, setLanguage
  } = useAppFactory()

  useEffect(() => {
    loadQuota()
  }, [])

  const handleGenerate = () => {
    generateApp(currentPrompt, currentLanguage)
  }

  const handleTest = () => {
    if (generatedCode) testInSandbox(generatedCode, currentLanguage)
  }

  const handleCopyCode = () => {
    Taro.setClipboardData({ data: generatedCode })
    Taro.showToast({ title: '代码已复制', icon: 'success' })
  }

  const handleShare = () => {
    shareForQuota()
  }

  // 结果视图
  if (flowStep === 'done' || flowStep === 'testing') {
    return (
      <Layout className="app-factory-page">
        {/* 配额条 */}
        <QuotaBar
          remaining={remainingQuota}
          isPro={quota?.is_pro}
          proExpiresAt={quota?.pro_expires_at}
        />

        {/* 需求确认 */}
        <View className="card">
          <Text className="card__label">你的需求</Text>
          <Text className="card__value">{currentPrompt}</Text>
          <View className="card__lang-badge">
            <Text>{currentLanguage.toUpperCase()}</Text>
          </View>
        </View>

        {/* 生成的代码 */}
        <View className="card">
          <View className="card__header">
            <Text className="card__title">生成的代码</Text>
            <View className="card__actions">
              <Text className="card__action" onClick={handleCopyCode}>📋 复制</Text>
            </View>
          </View>
          <View className="code-block">
            <Text className="code-block__text">{generatedCode}</Text>
          </View>
        </View>

        {/* 沙箱测试结果 */}
        {sandboxResult && (
          <View className={`card test-result ${sandboxResult.success ? 'test-result--pass' : 'test-result--fail'}`}>
            <Text className="card__title">
              {sandboxResult.success ? '✅ 测试通过' : '❌ 测试失败'}
            </Text>
            {sandboxResult.stdout ? (
              <View className="test-output">
                <Text className="test-output__label">输出：</Text>
                <Text className="test-output__text">{sandboxResult.stdout}</Text>
              </View>
            ) : null}
            {sandboxResult.stderr ? (
              <View className="test-output test-output--error">
                <Text className="test-output__label">错误：</Text>
                <Text className="test-output__text">{sandboxResult.stderr}</Text>
              </View>
            ) : null}
            {sandboxResult.error ? (
              <Text className="test-error">{sandboxResult.error}</Text>
            ) : null}
          </View>
        )}

        {/* 操作按钮 */}
        <View className="action-buttons">
          {!sandboxResult && (
            <View className="btn btn--test" onClick={handleTest}>
              <Text className="btn__text">🛡️ 沙箱测试</Text>
            </View>
          )}
          <View className="btn btn--share" onClick={handleShare}>
            <Text className="btn__text">📤 分享获取配额</Text>
          </View>
          <View className="btn btn--retry" onClick={reset}>
            <Text className="btn__text">🔄 重新生成</Text>
          </View>
        </View>
      </Layout>
    )
  }

  // 生成中视图
  if (flowStep === 'generating') {
    return (
      <Layout className="app-factory-page">
        <View className="generating">
          <View className="generating__spinner" />
          <Text className="generating__title">AI 正在生成代码...</Text>
          <Text className="generating__subtitle">Gemini 1.5 Pro 正在理解你的需求</Text>
          <View className="generating__steps">
            <View className="generating__step generating__step--active">
              <Text>1. 分析需求</Text>
            </View>
            <View className="generating__step">
              <Text>2. 生成代码</Text>
            </View>
            <View className="generating__step">
              <Text>3. 优化完成</Text>
            </View>
          </View>
        </View>
      </Layout>
    )
  }

  // 默认输入视图
  return (
    <Layout className="app-factory-page">
      {/* 配额条 */}
      <QuotaBar
        remaining={remainingQuota}
        isPro={quota?.is_pro}
        proExpiresAt={quota?.pro_expires_at}
      />

      {/* 标题 */}
      <View className="page-header">
        <Text className="page-header__title">🛠️ 应用工厂</Text>
        <Text className="page-header__subtitle">
          用自然语言描述需求，AI 自动生成可运行的应用
        </Text>
      </View>

      {/* 语言选择 */}
      <View className="lang-selector">
        {LANGUAGES.map((lang) => (
          <View
            key={lang.value}
            className={`lang-option ${currentLanguage === lang.value ? 'lang-option--active' : ''}`}
            onClick={() => setLanguage(lang.value)}
          >
            <Text className="lang-option__icon">{lang.icon}</Text>
            <Text className="lang-option__name">{lang.label}</Text>
            <Text className="lang-option__desc">{lang.desc}</Text>
          </View>
        ))}
      </View>

      {/* 输入区域 */}
      <View className="input-area">
        <Text className="input-area__label">描述你想要的应用</Text>
        <Textarea
          className="input-area__field"
          value={currentPrompt}
          onInput={(e) => setPrompt(e.detail.value)}
          placeholder={PLACEHOLDERS[currentLanguage] || '描述你想要生成的应用...'}
          maxlength={500}
          autoHeight
        />
        <View className="input-area__footer">
          <Text className="input-area__count">{currentPrompt.length}/500</Text>
        </View>
      </View>

      {/* 生成按钮 */}
      {flowStep === 'failed' && (
        <View className="error-msg">
          <Text className="error-msg__text">生成失败，请重试或修改需求描述</Text>
        </View>
      )}

      <View className="generate-btn" onClick={handleGenerate}>
        <Text className="generate-btn__text">
          {remainingQuota <= 0 ? '🔒 配额不足，点击购买' : '🚀 开始生成'}
        </Text>
      </View>

      {/* 快捷示例 */}
      <View className="examples">
        <Text className="examples__title">💡 试试这些：</Text>
        {[
          '批量压缩图片并生成报告',
          '做一个生日倒计时网页',
          '从 CSV 文件统计销售额并画图'
        ].map((example, idx) => (
          <Text
            key={idx}
            className="examples__item"
            onClick={() => {
              setPrompt(example)
              generateApp(example, currentLanguage)
            }}
          >
            {example}
          </Text>
        ))}
      </View>
    </Layout>
  )
}
