import { View, Text } from '@tarojs/components'
import Taro from '@tarojs/taro'
import Layout from '../../components/Layout'
import { useToolStore } from '../../stores/toolStore'
import './index.scss'

const EXAMPLES = [
  '做一个 Word 转 PDF 工具，支持拖拽上传',
  '做一个贪吃蛇小游戏，手机也能玩',
  '做一个二维码生成器',
  '做一个番茄钟倒计时',
  '做一个 BMI 计算器',
]

export default function IndexPage() {
  const { setFormData } = useToolStore()

  const goGenerate = (prompt?: string) => {
    if (prompt) setFormData({ prompt })
    Taro.navigateTo({ url: '/pages/generate/index' })
  }

  return (
    <Layout className="index-page">
      <View className="hero">
        <View className="hero__copy">
          <Text className="hero__eyebrow">AI 小工具工坊</Text>
          <Text className="hero__title">一句话，把想法变成可用工具</Text>
          <Text className="hero__subtitle">
            描述需求、选择类型和风格，AI 自动生成可下载、可预览的 HTML 小工具。双击即用，无需安装。
          </Text>
          <View className="hero__cta" onClick={() => goGenerate()}>
            <Text className="hero__cta-text">开始生成</Text>
          </View>
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

      <View className="quick-panel">
        <View className="examples">
          <Text className="panel-title">试试这些</Text>
          {EXAMPLES.map(ex => (
            <Text key={ex} className="examples__item" onClick={() => goGenerate(ex)}>
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
