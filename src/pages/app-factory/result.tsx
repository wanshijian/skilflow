import { View, Text } from '@tarojs/components'
import { useEffect, useState } from 'react'
import Taro, { useRouter } from '@tarojs/taro'
import Layout from '../../components/Layout'
import { appFactoryApi } from '../../utils/api'
import './index.scss'

export default function AppResultPage() {
  const router = useRouter()
  const { id } = router.params
  const [app, setApp] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!id) return
    loadApp()
  }, [id])

  async function loadApp() {
    const { data } = await appFactoryApi.getById(id as string)
    if (data) setApp(data)
    setLoading(false)
  }

  const handleCopyCode = () => {
    if (app?.generated_code) {
      Taro.setClipboardData({ data: app.generated_code })
      Taro.showToast({ title: '代码已复制', icon: 'success' })
    }
  }

  if (loading) return <Layout><Text className="loading">加载中…</Text></Layout>
  if (!app) return <Layout><Text className="loading">应用未找到</Text></Layout>

  return (
    <Layout className="app-result-page">
      <View className="card">
        <Text className="card__label">需求描述</Text>
        <Text className="card__value">{app.prompt}</Text>
        <View className="card__meta">
          <Text className="card__lang">{app.language}</Text>
          <Text className="card__status">
            {app.status === 'completed' ? '✅ 已完成' : app.status === 'failed' ? '❌ 失败' : '⏳ 处理中'}
          </Text>
        </View>
      </View>

      {app.generated_code && (
        <View className="card">
          <View className="card__header">
            <Text className="card__title">代码</Text>
            <Text className="card__action" onClick={handleCopyCode}>📋 复制代码</Text>
          </View>
          <View className="code-block">
            <Text className="code-block__text">{app.generated_code}</Text>
          </View>
        </View>
      )}

      {app.error_log && (
        <View className="card card--error">
          <Text className="card__title">错误信息</Text>
          <Text className="card__error-text">{app.error_log}</Text>
        </View>
      )}

      <View className="bottom-info">
        <Text className="bottom-info__expires">
          生成于 {new Date(app.created_at).toLocaleString()} · 48小时后过期
        </Text>
      </View>
    </Layout>
  )
}
