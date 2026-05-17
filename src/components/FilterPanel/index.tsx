import { View, Text, Checkbox } from '@tarojs/components'
import { TAG_DIMENSIONS } from '../../utils/constants'
import { useFilterStore } from '../../stores/filterStore'
import './index.scss'

interface FilterPanelProps {
  onFilterChange?: () => void
}

export default function FilterPanel({ onFilterChange }: FilterPanelProps) {
  const {
    selectedCategory, selectedTags, selectedPricing,
    setCategory, toggleTag, setPricing, clearAll
  } = useFilterStore()

  const handleCategoryClick = (cat: string) => {
    setCategory(selectedCategory === cat ? null : cat)
    onFilterChange?.()
  }

  const handleTagClick = (tag: string) => {
    toggleTag(tag)
    onFilterChange?.()
  }

  const handlePricingClick = (p: string) => {
    setPricing(selectedPricing === p ? null : p)
    onFilterChange?.()
  }

  return (
    <View className="filter-panel">
      <View className="filter-panel__header">
        <Text className="filter-panel__title">筛选</Text>
        <Text className="filter-panel__clear" onClick={clearAll}>清除</Text>
      </View>

      {/* 维度 A: 行业领域 */}
      <View className="filter-section">
        <Text className="filter-section__label">{TAG_DIMENSIONS[0].label}</Text>
        <View className="filter-section__items">
          {TAG_DIMENSIONS[0].options.map((opt) => (
            <Text
              key={opt.value}
              className={`filter-tag ${selectedCategory === opt.value ? 'filter-tag--active' : ''}`}
              onClick={() => handleCategoryClick(opt.value)}
            >
              {opt.label}
            </Text>
          ))}
        </View>
      </View>

      {/* 维度 B: 能力类型 */}
      <View className="filter-section">
        <Text className="filter-section__label">{TAG_DIMENSIONS[1].label}</Text>
        <View className="filter-section__items">
          {TAG_DIMENSIONS[1].options.map((opt) => (
            <Text
              key={opt.value}
              className={`filter-tag ${selectedTags.includes(opt.value) ? 'filter-tag--active' : ''}`}
              onClick={() => handleTagClick(opt.value)}
            >
              {opt.label}
            </Text>
          ))}
        </View>
      </View>

      {/* 维度 C: 适用平台 */}
      <View className="filter-section">
        <Text className="filter-section__label">{TAG_DIMENSIONS[2].label}</Text>
        <View className="filter-section__items">
          {TAG_DIMENSIONS[2].options.map((opt) => (
            <Text
              key={opt.value}
              className={`filter-tag ${selectedTags.includes(opt.value) ? 'filter-tag--active' : ''}`}
              onClick={() => handleTagClick(opt.value)}
            >
              {opt.label}
            </Text>
          ))}
        </View>
      </View>

      {/* 维度 D: 价格属性 */}
      <View className="filter-section">
        <Text className="filter-section__label">{TAG_DIMENSIONS[3].label}</Text>
        <View className="filter-section__items">
          {TAG_DIMENSIONS[3].options.map((opt) => (
            <Text
              key={opt.value}
              className={`filter-tag ${selectedPricing === opt.value ? 'filter-tag--active' : ''}`}
              onClick={() => handlePricingClick(opt.value)}
            >
              {opt.label}
            </Text>
          ))}
        </View>
      </View>
    </View>
  )
}
