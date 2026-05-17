import { View, Text } from '@tarojs/components'
import { useState, useEffect } from 'react'
import { supabase } from '../../utils/supabase'
import './index.scss'

interface TagCloudProps {
  onTagClick?: (tag: string) => void
}

export default function TagCloud({ onTagClick }: TagCloudProps) {
  const [tags, setTags] = useState<Array<{ tag: string; count: number }>>([])

  useEffect(() => {
    loadPopularTags()
  }, [])

  async function loadPopularTags() {
    const { data } = await supabase.rpc('get_popular_tags', { limit_count: 10 })
    if (data) setTags(data)
  }

  const maxCount = tags.length > 0 ? Math.max(...tags.map((t) => t.count)) : 1

  return (
    <View className="tag-cloud">
      {tags.map((t) => {
        const fontSize = 20 + (t.count / maxCount) * 16
        const opacity = 0.6 + (t.count / maxCount) * 0.4
        return (
          <Text
            key={t.tag}
            className="tag-cloud__item"
            style={{ fontSize: `${fontSize}px`, opacity }}
            onClick={() => onTagClick?.(t.tag)}
          >
            {t.tag}
          </Text>
        )
      })}
    </View>
  )
}
