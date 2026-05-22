import { View, Text } from '@tarojs/components'
import Taro from '@tarojs/taro'
import './index.scss'

const NAV = [
  { label: '生成', path: '/pages/index/index' },
  { label: '文档', path: '/pages/doc/index' },
  { label: '市场', path: '/pages/market/index' },
  { label: '我的', path: '/pages/my/index' },
]

export default function Header() {
  return (
    <View className="site-header">
      <View className="site-header__inner">
        <Text className="site-header__logo" onClick={() => Taro.navigateTo({ url: '/pages/index/index' })}>
          成品
        </Text>
        <View className="site-header__nav">
          {NAV.map(n => (
            <Text key={n.path} className="site-header__link" onClick={() => Taro.navigateTo({ url: n.path })}>
              {n.label}
            </Text>
          ))}
        </View>
      </View>
    </View>
  )
}
