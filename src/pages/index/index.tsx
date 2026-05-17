import { View, Text, Textarea } from '@tarojs/components'
import Taro from '@tarojs/taro'
import Layout from '../../components/Layout'
import { useToolStore } from '../../stores/toolStore'
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

const EXAMPLES = [
  '做一个 Word 转 PDF 工具，支持拖拽上传',
  '做一个贪吃蛇小游戏，手机也能玩',
  '做一个二维码生成器',
  '做一个番茄钟倒计时',
  '做一个 BMI 计算器',
]

export default function IndexPage() {
  const { formData, setFormData } = useToolStore()

  const handleGenerate = () => {
    if (!formData.prompt.trim()) {
      Taro.showToast({ title: '先描述一下你想要的小工具', icon: 'none' })
      return
    }
    Taro.navigateTo({ url: '/pages/generate/index' })
  }

  const useExample = (example: string) => {
    setFormData({ prompt: example })
    Taro.navigateTo({ url: '/pages/generate/index' })
  }

  return (
    <Layout className="index-page">
      <View className="hero">
        <View className="hero__copy">
          <Text className="hero__eyebrow">AI 小工具工坊</Text>
          <Text className="hero__title">一句话，把想法变成可用工具</Text>
          <Text className="hero__subtitle">
            描述需求、选择类型和风格，成品会自动生成可下载、可预览的小工具。
          </Text>
        </View>
        <View className="hero__stats">
          <View className="hero-stat">
            <Text className="hero-stat__num">2</Text>
            <Text className="hero-stat__label">免费生成额度</Text>
          </View>
          <View className="hero-stat">
            <Text className="hero-stat__num">H5</Text>
            <Text className="hero-stat__label">即开即用</Text>
          </View>
        </View>
      </View>

      <View className="composer">
        <Textarea
          className="composer__input"
          value={formData.prompt}
          onInput={(e) => setFormData({ prompt: e.detail.value })}
          placeholder="描述你想要的小工具，例如：做一个 Word 转 PDF 工具，支持拖拽上传"
          maxlength={500}
          autoHeight
        />

        <View className="composer__section">
          <Text className="composer__label">工具类型</Text>
          <View className="segmented">
            {TOOL_TYPES.map((t) => (
              <View
                key={t.value}
                className={`chip ${formData.toolType === t.value ? 'chip--active' : ''}`}
                onClick={() => setFormData({ toolType: t.value })}
              >
                <Text>{t.label}</Text>
              </View>
            ))}
          </View>
        </View>

        <View className="composer__section">
          <Text className="composer__label">界面风格</Text>
          <View className="style-options">
            {STYLE_OPTIONS.map((s) => (
              <View
                key={s.value}
                className={`style-opt ${formData.style === s.value ? 'style-opt--active' : ''}`}
                onClick={() => setFormData({ style: s.value })}
              >
                <Text>{s.label}</Text>
              </View>
            ))}
          </View>
        </View>

        <View className="composer__footer">
          <Text className="composer__count">{formData.prompt.length}/500</Text>
          <View className="generate-btn" onClick={handleGenerate}>
            <Text className="generate-btn__text">开始生成</Text>
          </View>
        </View>
      </View>

      <View className="quick-panel">
        <View className="examples">
          <Text className="panel-title">试试这些</Text>
          {EXAMPLES.map((ex) => (
            <Text key={ex} className="examples__item" onClick={() => useExample(ex)}>
              {ex}
            </Text>
          ))}
        </View>

        <View className="market-entry" onClick={() => Taro.navigateTo({ url: '/pages/market/index' })}>
          <Text className="market-entry__kicker">工具市场</Text>
          <Text className="market-entry__title">看看别人已经做好的工具</Text>
          <Text className="market-entry__desc">找到合适的可以直接下载使用，也可以拿来改成自己的版本。</Text>
        </View>
      </View>
    </Layout>
  )
}
