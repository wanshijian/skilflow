import { View, Text } from '@tarojs/components'
import { useEffect, useState } from 'react'
import Taro from '@tarojs/taro'
import Layout from '../../../components/Layout'
import NewsCard from '../../../components/NewsCard'
import { newsApi } from '../../../utils/api'
import './index.scss'

export default function NewsListPage() {
  const [newsList, setNewsList] = useState<any[]>([])
  const [top3List, setTop3List] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadNews()
  }, [])

  async function loadNews() {
    setLoading(true)
    const [top3Res, allRes] = await Promise.all([
      newsApi.list({ isTop3: true }),
      newsApi.list({ page: 1, pageSize: 20 })
    ])
    if (top3Res.data) setTop3List(top3Res.data)
    if (allRes.data) setNewsList(allRes.data)
    setLoading(false)
  }

  if (loading) {
    return <Layout><Text className="loading">加载中…</Text></Layout>
  }

  return (
    <Layout className="news-list-page">
      {/* 今日 Top 3 */}
      {top3List.length > 0 && (
        <View className="section">
          <Text className="section__title">🔥 今日 AI 速递 Top 3</Text>
          {top3List.map((item) => (
            <NewsCard
              key={item.id}
              news={item}
              onClick={() => Taro.navigateTo({ url: `/pages/news/detail/index?id=${item.id}` })}
            />
          ))}
        </View>
      )}

      {/* 全部资讯 */}
      <View className="section">
        <Text className="section__title">全部资讯</Text>
        {newsList.map((item) => (
          <NewsCard
            key={item.id}
            news={item}
            onClick={() => Taro.navigateTo({ url: `/pages/news/detail/index?id=${item.id}` })}
          />
        ))}
      </View>
    </Layout>
  )
}
