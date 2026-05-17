import { View, Text, ScrollView } from '@tarojs/components'
import { TAG_DIMENSIONS } from '../../utils/constants'
import './index.scss'

interface TagBarProps {
  onTagClick?: (tag: string) => void
  activeTags?: string[]
}

export default function TagBar({ onTagClick, activeTags = [] }: TagBarProps) {
  const allTags = [
    { value: 'all', label: '全部' },
    ...TAG_DIMENSIONS[1].options,
    ...TAG_DIMENSIONS[0].options
  ]

  return (
    <ScrollView className="tag-bar" scrollX showScrollbar={false}>
      {allTags.map((tag) => {
        const isActive = tag.value === 'all'
          ? activeTags.length === 0
          : activeTags.includes(tag.value)
        return (
          <Text
            key={tag.value}
            className={`tag-bar__item ${isActive ? 'tag-bar__item--active' : ''}`}
            onClick={() => onTagClick?.(tag.value === 'all' ? '' : tag.value)}
          >
            {tag.label}
          </Text>
        )
      })}
    </ScrollView>
  )
}
