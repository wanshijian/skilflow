import { View, Text, Image } from '@tarojs/components'
import './index.scss'

interface NewsItem {
  id: string
  title: string
  summary?: string
  source?: string
  publish_date: string
  is_top3?: boolean
}

interface NewsCardProps {
  news: NewsItem
  onClick?: () => void
}

export default function NewsCard({ news, onClick }: NewsCardProps) {
  return (
    <View className="news-card" onClick={onClick}>
      {news.is_top3 && <Text className="news-card__badge">🔥 热门</Text>}
      <Text className="news-card__title">{news.title}</Text>
      {news.summary && <Text className="news-card__summary">{news.summary}</Text>}
      <View className="news-card__footer">
        {news.source && <Text className="news-card__source">{news.source}</Text>}
        <Text className="news-card__date">{news.publish_date}</Text>
      </View>
    </View>
  )
}
