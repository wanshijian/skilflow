import { View, Text } from '@tarojs/components'
import type { Skill } from '../../stores/skillStore'
import './index.scss'

interface SkillCardProps {
  skill: Skill
  rank?: number
  onClick?: () => void
}

export default function SkillCard({ skill, rank, onClick }: SkillCardProps) {
  return (
    <View className="skill-card" onClick={onClick}>
      <View className="skill-card__header">
        {rank ? <Text className="skill-card__rank">{String(rank).padStart(2, '0')}</Text> : null}
        <View className="skill-card__header-text">
          <Text className="skill-card__title">{skill.title}</Text>
          <Text className="skill-card__stars">{skill.stars.toLocaleString()}</Text>
        </View>
      </View>
      <Text className="skill-card__summary">{skill.short_summary || '暂无简介'}</Text>
      <View className="skill-card__tags">
        {skill.primary_category && (
          <Text className="skill-card__tag skill-card__tag--primary">{skill.primary_category}</Text>
        )}
        {skill.sub_tags?.slice(0, 3).map((tag: string) => (
          <Text key={tag} className="skill-card__tag">{tag}</Text>
        ))}
      </View>
      <View className="skill-card__footer">
        {skill.author ? <Text className="skill-card__author">@{skill.author}</Text> : <View />}
        <Text className="skill-card__pricing">{skill.pricing}</Text>
      </View>
    </View>
  )
}
