import { View, Text } from '@tarojs/components'
import './index.scss'

interface AppItem {
  id: string
  prompt: string
  language: string
  download_count: number
  profiles?: { nickname?: string; avatar?: string }
  created_at: string
}

interface AppCardProps {
  app: AppItem
  onClick?: () => void
}

const langLabels: Record<string, string> = {
  python: 'Python',
  html: 'HTML',
  nodejs: 'Node.js',
  shell: 'Shell'
}

const langIcons: Record<string, string> = {
  python: '🐍',
  html: '🌐',
  nodejs: '💚',
  shell: '💻'
}

export default function AppCard({ app, onClick }: AppCardProps) {
  return (
    <View className="app-card" onClick={onClick}>
      <View className="app-card__header">
        <Text className="app-card__icon">{langIcons[app.language] || '📦'}</Text>
        <Text className="app-card__lang">{langLabels[app.language] || app.language}</Text>
      </View>
      <Text className="app-card__prompt">{app.prompt}</Text>
      <View className="app-card__footer">
        <Text className="app-card__author">
          {app.profiles?.nickname || '匿名用户'}
        </Text>
        <Text className="app-card__downloads">⬇ {app.download_count}</Text>
      </View>
    </View>
  )
}
