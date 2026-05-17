import { View, Text } from '@tarojs/components'
import { useEffect } from 'react'
import Taro, { useRouter } from '@tarojs/taro'
import Layout from '../../../components/Layout'
import FilterPanel from '../../../components/FilterPanel'
import TagBar from '../../../components/TagBar'
import SearchBox from '../../../components/SearchBox'
import SkillCard from '../../../components/SkillCard'
import { useSkills } from '../../../hooks/useSkills'
import { useFilterStore } from '../../../stores/filterStore'
import './index.scss'

export default function SkillListPage() {
  const router = useRouter()
  const { skills, totalCount, isLoading, page, fetchSkills, fetchSkillBySlug } = useSkills()
  const { setSearch, setCategory, toggleTag } = useFilterStore()

  useEffect(() => {
    const urlSearch = router.params.search
    const urlTag = router.params.tag
    if (urlSearch) {
      setSearch(decodeURIComponent(urlSearch))
    }
    if (urlTag) {
      toggleTag(decodeURIComponent(urlTag))
    }
    fetchSkills(1)
  }, [])

  const handleSkillClick = (slug: string) => {
    Taro.navigateTo({
      url: `/pages/skill/detail/index?slug=${slug}`
    })
  }

  return (
    <Layout className="skill-list-page">
      {/* 搜索框 */}
      <View className="search-bar">
        <SearchBox
          onSearch={(keyword) => {
            setSearch(keyword)
            fetchSkills(1)
          }}
          placeholder='搜索技能名称、标签...'
        />
      </View>

      {/* 小程序端：横向滚动标签栏 */}
      {/* #ifdef WEAPP */}
      <TagBar
        onTagClick={(tag) => {
          toggleTag(tag)
          fetchSkills(1)
        }}
      />
      {/* #endif */}

      {/* H5 端：侧边栏筛选器 */}
      {/* #ifdef H5 */}
      <View className="h5-layout">
        <View className="h5-layout__sidebar">
          <FilterPanel
            onFilterChange={() => fetchSkills(1)}
          />
        </View>
        <View className="h5-layout__main">
      {/* #endif */}

      {/* 结果统计 */}
      <View className="result-header">
        <Text className="result-header__count">共 {totalCount} 个技能</Text>
      </View>

      {/* 技能列表 */}
      {isLoading ? (
        <Text className="loading">加载中…</Text>
      ) : skills.length === 0 ? (
        <View className="empty">
          <Text className="empty__text">暂无匹配的技能</Text>
          <Text className="empty__hint">试试调整筛选条件或搜索关键词</Text>
        </View>
      ) : (
        <View className="skill-list">
          {skills.map((skill) => (
            <SkillCard
              key={skill.id}
              skill={skill}
              onClick={() => handleSkillClick(skill.slug)}
            />
          ))}
        </View>
      )}

      {/* #ifdef H5 */}
        </View>
      </View>
      {/* #endif */}

      {/* 小程序端：浮窗筛选按钮 */}
      {/* #ifdef WEAPP */}
      <View className="filter-fab" onClick={() => {
        Taro.showActionSheet({
          itemList: ['按行业筛选', '按能力筛选', '按平台筛选', '按价格筛选', '清除筛选'],
          success: (res) => {
            // 简版筛选交互，复杂筛选使用详情页
          }
        })
      }}>
        <Text className="filter-fab__icon">🔍</Text>
      </View>
      {/* #endif */}
    </Layout>
  )
}
