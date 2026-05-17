import { View, Input } from '@tarojs/components'
import { useState } from 'react'
import Icon from '../Icon'
import './index.scss'

interface SearchBoxProps {
  value?: string
  onChange?: (value: string) => void
  onSearch?: (keyword: string) => void
  placeholder?: string
}

export default function SearchBox({ value, onChange, onSearch, placeholder }: SearchBoxProps) {
  const [innerValue, setInnerValue] = useState(value || '')

  const currentValue = value !== undefined ? value : innerValue

  const handleInput = (e: any) => {
    const val = e.detail.value
    setInnerValue(val)
    onChange?.(val)
  }

  const handleConfirm = () => {
    onSearch?.(currentValue)
  }

  return (
    <View className="search-box">
      <View className="search-box__icon">
        <Icon name="search" size={18} />
      </View>
      <Input
        className="search-box__input"
        value={currentValue}
        onInput={handleInput}
        onConfirm={handleConfirm}
        placeholder={placeholder || '搜索技能...'}
        confirmType="search"
      />
      {currentValue ? (
        <View className="search-box__clear" onClick={() => { setInnerValue(''); onChange?.('') }}>
          <Icon name="x" size={16} />
        </View>
      ) : null}
    </View>
  )
}
