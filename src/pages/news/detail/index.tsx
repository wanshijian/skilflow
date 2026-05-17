import { View, Text } from '@tarojs/components'
import { useEffect, useState } from 'react'
import { useRouter } from '@tarojs/taro'
import Layout from '../../../components/Layout'
import { newsApi } from '../../../utils/api'
import './index.scss'

export default function NewsDetailPage() {
  const router = useRouter()
  const { id } = router.params
  const [news, setNews] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!id) return
    loadNews()
  }, [id])

  async function loadNews() {
    const { data } = await newsApi.getById(id as string)
    if (data) setNews(data)
    setLoading(false)
  }

  if (loading) return <Layout><Text className="loading">加载中…</Text></Layout>
  if (!news) return <Layout><Text className="loading">资讯未找到</Text></Layout>

  return (
    <Layout className="news-detail-page">
      <Text className="news-detail__title">{news.title}</Text>
      <View className="news-detail__meta">
        {news.source && <Text className="news-detail__source">{news.source}</Text>}
        <Text className="news-detail__date">{news.publish_date}</Text>
      </View>
      {news.summary && (
        <View className="news-detail__summary">
          <Text className="news-detail__summary-label">AI 摘要</Text>
          <Text className="news-detail__summary-text">{news.summary}</Text>
        </View>
      )}
      <View className="news-detail__content">
        <Text className="news-detail__content-text">{news.content}</Text>
      </View>
    </Layout>
  )
}
