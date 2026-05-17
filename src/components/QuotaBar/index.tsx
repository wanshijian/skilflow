import { View, Text } from '@tarojs/components'
import Taro from '@tarojs/taro'
import './index.scss'

interface QuotaBarProps {
  remaining: number
  isPro?: boolean
  proExpiresAt?: string
}

export default function QuotaBar({ remaining, isPro, proExpiresAt }: QuotaBarProps) {
  return (
    <View className="quota-bar">
      {isPro ? (
        <View className="quota-bar__pro">
          <Text className="quota-bar__icon">👑</Text>
          <Text className="quota-bar__text">Pro 会员 · 无限生成</Text>
          {proExpiresAt && (
            <Text className="quota-bar__expire">
              到期: {new Date(proExpiresAt).toLocaleDateString()}
            </Text>
          )}
        </View>
      ) : (
        <View className="quota-bar__normal">
          <View className="quota-bar__left">
            <Text className="quota-bar__icon">⚡</Text>
            <Text className="quota-bar__text">
              今日剩余 <Text className="quota-bar__count">{remaining}</Text> 次
            </Text>
          </View>
          <View
            className="quota-bar__upgrade"
            onClick={() => Taro.navigateTo({ url: '/pages/user/index?tab=upgrade' })}
          >
            <Text className="quota-bar__upgrade-text">升级 Pro</Text>
          </View>
        </View>
      )}
    </View>
  )
}
