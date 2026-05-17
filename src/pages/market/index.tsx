import { View, Text, Input, ScrollView } from '@tarojs/components'
import { useEffect, useMemo, useState } from 'react'
import Taro from '@tarojs/taro'
import Layout from '../../components/Layout'
import ToolCard from '../../components/ToolCard'
import { toolsApi } from '../../utils/api'
import type { Tool } from '../../stores/toolStore'
import './index.scss'

const CATEGORIES = [
  { key: '', label: '全部' },
  { key: 'utility', label: '实用工具' },
  { key: 'converter', label: '格式转换' },
  { key: 'game', label: '小游戏' },
  { key: 'generator', label: '生成器' },
  { key: 'calculator', label: '计算器' },
  { key: 'text-tool', label: '文本工具' },
]

export default function MarketPage() {
  const [tools, setTools] = useState<Tool[]>([])
  const [loading, setLoading] = useState(true)
  const [category, setCategory] = useState('')
  const [sort, setSort] = useState('hot')
  const [query, setQuery] = useState('')

  useEffect(() => { loadTools() }, [category, sort])

  async function loadTools() {
    setLoading(true)
    const { data } = await toolsApi.list({ toolType: category || undefined, sort })
    if (data) setTools(data)
    setLoading(false)
  }

  const filteredTools = useMemo(() => {
    const keyword = query.trim().toLowerCase()
    if (!keyword) return tools
    return tools.filter((tool) =>
      `${tool.title || ''} ${tool.description || ''}`.toLowerCase().includes(keyword)
    )
  }, [query, tools])

  return (
    <Layout className="market-page">
      <View className="market-hero">
        <View>
          <Text className="market-hero__eyebrow">工具市场</Text>
          <Text className="market-hero__title">发现已经做好的小工具</Text>
          <Text className="market-hero__desc">按类型浏览、按热度排序，也可以搜索你想要的功能。</Text>
        </View>
        <View className="market-hero__meta">
          <Text className="market-hero__count">{filteredTools.length}</Text>
          <Text className="market-hero__label">当前结果</Text>
        </View>
      </View>

      <View className="toolbar">
        <Input
          className="search-input"
          value={query}
          onInput={(e) => setQuery(e.detail.value)}
          placeholder="搜索工具名称或描述"
        />
        <View className="sort-bar">
          <Text className={`sort-item ${sort === 'hot' ? 'sort-item--active' : ''}`} onClick={() => setSort('hot')}>最热</Text>
          <Text className={`sort-item ${sort === 'new' ? 'sort-item--active' : ''}`} onClick={() => setSort('new')}>最新</Text>
        </View>
      </View>

      <ScrollView className="cat-bar" scrollX showScrollbar={false}>
        {CATEGORIES.map(c => (
          <Text key={c.key} className={`cat-item ${category === c.key ? 'cat-item--active' : ''}`} onClick={() => setCategory(c.key)}>
            {c.label}
          </Text>
        ))}
      </ScrollView>

      {loading ? <Text className="loading">加载中...</Text> : filteredTools.length === 0 ? <Text className="empty">还没有找到匹配的工具</Text> : (
        <View className="tool-grid">
          {filteredTools.map(t => (
            <ToolCard key={t.id} tool={t} onClick={() => Taro.navigateTo({ url: `/pages/tool/detail?id=${t.id}` })} />
          ))}
        </View>
      )}

      <View className="custom-entry">
        <Text className="custom-entry__title">没找到想要的？</Text>
        <Text className="custom-entry__desc">回到首页描述需求，直接生成一个专属版本。</Text>
      </View>
    </Layout>
  )
}
