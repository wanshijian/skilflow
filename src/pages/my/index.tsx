import { View, Text } from '@tarojs/components'
import { useEffect, useState } from 'react'
import Taro from '@tarojs/taro'
import Layout from '../../components/Layout'
import { useAuthStore } from '../../stores/authStore'
import { quotaApi, downloadApi, devMode } from '../../utils/api'
import './index.scss'

export default function MyPage() {
  const { user, isAuthenticated } = useAuthStore()
  const [quota, setQuota] = useState<any>(null)
  const [downloads, setDownloads] = useState<any[]>([])

  useEffect(() => {
    if (devMode.isActive) {
      const devUser = devMode.getUser()
      useAuthStore.setState({ user: { id: devUser.id, email: devUser.email, nickname: devUser.nickname, role: 'user' }, isAuthenticated: true })
    }
    loadData()
  }, [])

  async function loadData() {
    const userId = user?.id || devMode.getUser().id
    const [q, d] = await Promise.all([quotaApi.check(userId), downloadApi.listMine(userId)])
    if (q.data) setQuota(q.data)
    if (d.data) setDownloads(d.data)
  }

  return (
    <Layout className="my-page">
      <View className="profile-card">
        {isAuthenticated ? (
          <>
            <View className="my-avatar"><Text className="my-avatar__text">{(user?.nickname || user?.email || 'U')[0].toUpperCase()}</Text></View>
            <View className="profile-card__copy">
              <Text className="my-name">{user?.nickname || user?.email}</Text>
              <Text className="my-subtitle">欢迎回来，继续把想法做成工具。</Text>
            </View>
          </>
        ) : (
          <>
            <View className="my-avatar"><Text className="my-avatar__text">?</Text></View>
            <View className="profile-card__copy">
              <Text className="my-name">未登录</Text>
              <Text className="my-subtitle">登录后可同步额度和下载记录。</Text>
            </View>
            <View className="login-btn" onClick={() => Taro.showToast({ title: '登录开发中', icon: 'none' })}><Text className="login-btn__text">登录</Text></View>
          </>
        )}
      </View>

      {isAuthenticated && (
        <View className="quota-card">
          <View>
            <Text className="quota-card__label">剩余免费次数</Text>
            <Text className="quota-card__hint">用完后可通过分享或付费继续使用</Text>
          </View>
          <Text className="quota-card__count">{quota?.remainingFree ?? 2}</Text>
        </View>
      )}

      <View className="menu-list">
        <View className="menu-item" onClick={() => Taro.navigateTo({ url: '/pages/index/index' })}>
          <Text className="menu-item__title">生成新工具</Text>
          <Text className="menu-item__desc">描述需求，立即创建</Text>
        </View>
        <View className="menu-item" onClick={() => Taro.navigateTo({ url: '/pages/market/index' })}>
          <Text className="menu-item__title">浏览工具市场</Text>
          <Text className="menu-item__desc">看看可直接使用的工具</Text>
        </View>
        <View className="menu-item" onClick={() => Taro.navigateTo({ url: '/pages/premium/index' })}>
          <Text className="menu-item__title">精品工具区</Text>
          <Text className="menu-item__desc">官方打磨的进阶工具</Text>
        </View>
      </View>

      {isAuthenticated && downloads.length > 0 && (
        <View className="history">
          <Text className="section-title">下载记录</Text>
          {downloads.map(d => (
            <View key={d.id} className="history-item">
              <Text className="history-item__name">{d.tools?.title || '未知工具'}</Text>
              <Text className="history-item__method">{d.method === 'free' ? '免费' : d.method === 'share' ? '分享' : '付费'}</Text>
            </View>
          ))}
        </View>
      )}
    </Layout>
  )
}
