import { View, Text } from '@tarojs/components'
import type { Tool } from '../../stores/toolStore'
import './index.scss'

const typeLabels: Record<string, string> = {
  converter: '转换',
  generator: '生成',
  calculator: '计算',
  'text-tool': '文本',
  game: '游戏',
  utility: '工具',
}

interface Props {
  tool: Tool
  onClick?: () => void
}

export default function ToolCard({ tool, onClick }: Props) {
  return (
    <View className="tool-card" onClick={onClick}>
      <View className="tool-card__header">
        <View className="tool-card__type">{typeLabels[tool.tool_type] || tool.tool_type}</View>
        {tool.is_premium && <View className="tool-card__premium">精品</View>}
      </View>
      <Text className="tool-card__title">{tool.title}</Text>
      {tool.description && <Text className="tool-card__desc">{tool.description}</Text>}
      <View className="tool-card__footer">
        <Text className="tool-card__downloads">{tool.download_count || 0} 次下载</Text>
        {tool.is_premium && tool.premium_price
          ? <Text className="tool-card__price">¥{tool.premium_price}</Text>
          : <Text className="tool-card__free">免费</Text>}
      </View>
    </View>
  )
}
