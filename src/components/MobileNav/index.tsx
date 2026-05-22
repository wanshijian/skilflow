import { View, Text } from '@tarojs/components'
import Taro from '@tarojs/taro'
import './index.scss'

const NAV = [
  { label: '生成', path: '/pages/index/index' },
  { label: '文档', path: '/pages/doc/index' },
  { label: '市场', path: '/pages/market/index' },
  { label: '我的', path: '/pages/my/index' },
]

export default function MobileNav() {
  return (
    <View className="mobile-nav">
      {NAV.map(n => (
        <Text key={n.path} className="mobile-nav__item" onClick={() => Taro.navigateTo({ url: n.path })}>
          {n.label}
        </Text>
      ))}
    </View>
  )
}
