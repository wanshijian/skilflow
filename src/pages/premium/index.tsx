import { View, Text } from '@tarojs/components'
import { useEffect, useState } from 'react'
import Taro from '@tarojs/taro'
import Layout from '../../components/Layout'
import ToolCard from '../../components/ToolCard'
import { toolsApi } from '../../utils/api'
import type { Tool } from '../../stores/toolStore'
import './index.scss'

export default function PremiumPage() {
  const [tools, setTools] = useState<Tool[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { loadPremium() }, [])

  async function loadPremium() {
    setLoading(true)
    const { data } = await toolsApi.list({ premium: true })
    if (data) setTools(data)
    setLoading(false)
  }

  return (
    <Layout className="premium-page">
      <View className="premium-header">
        <View className="premium-header__badge">精品区</View>
        <Text className="premium-header__title">官方打磨，开箱即用</Text>
        <Text className="premium-header__desc">更完整的功能、更细的交互和更稳定的导出体验。</Text>
      </View>
      {loading ? <Text className="loading">加载中...</Text> : tools.length === 0 ? <Text className="empty">精品工具即将上线</Text> : (
        <View className="tool-grid">
          {tools.map(t => (
            <ToolCard key={t.id} tool={t} onClick={() => Taro.navigateTo({ url: `/pages/tool/detail?id=${t.id}` })} />
          ))}
        </View>
      )}
      <View className="custom-cta">
        <Text className="custom-cta__title">想要专属定制工具？</Text>
        <Text className="custom-cta__text">把需求写清楚，从首页开始生成会更快。</Text>
      </View>
    </Layout>
  )
}
