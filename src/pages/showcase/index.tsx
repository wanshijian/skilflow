import { View, Text } from '@tarojs/components'
import { useEffect, useState } from 'react'
import Taro from '@tarojs/taro'
import Layout from '../../components/Layout'
import AppCard from '../../components/AppCard'
import { appFactoryApi } from '../../utils/api'
import './index.scss'

export default function ShowcasePage() {
  const [apps, setApps] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadShowcase()
  }, [])

  async function loadShowcase() {
    setLoading(true)
    const { data } = await appFactoryApi.getShowcase({ page: 1, pageSize: 30 })
    if (data) setApps(data)
    setLoading(false)
  }

  return (
    <Layout className="showcase-page">
      <View className="page-header">
        <Text className="page-header__title">🌟 应用展示廊</Text>
        <Text className="page-header__subtitle">
          社区用户通过 AI 生成的应用，所有代码均经沙箱验证可运行
        </Text>
      </View>

      {loading ? (
        <Text className="loading">加载中…</Text>
      ) : apps.length === 0 ? (
        <View className="empty">
          <Text className="empty__icon">📭</Text>
          <Text className="empty__text">还没有公开展示的应用</Text>
          <View
            className="empty__btn"
            onClick={() => Taro.navigateTo({ url: '/pages/app-factory/index' })}
          >
            <Text className="empty__btn-text">去生成第一个</Text>
          </View>
        </View>
      ) : (
        <View className="app-list">
          {apps.map((app) => (
            <AppCard
              key={app.id}
              app={app}
              onClick={() => {
                Taro.navigateTo({ url: `/pages/app-factory/result?id=${app.id}` })
              }}
            />
          ))}
        </View>
      )}
    </Layout>
  )
}
