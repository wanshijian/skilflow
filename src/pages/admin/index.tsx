import { View, Text, Input } from '@tarojs/components'
import { useEffect, useState } from 'react'
import Taro from '@tarojs/taro'
import Layout from '../../components/Layout'
import { adminApi } from '../../utils/api'
import { useAuthStore } from '../../stores/authStore'
import './index.scss'

type AdminTab = 'tools' | 'demands' | 'pricing'

export default function AdminPage() {
  const { user } = useAuthStore()
  const [tab, setTab] = useState<AdminTab>('tools')
  const [tools, setTools] = useState<any[]>([])
  const [demands, setDemands] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [editPrice, setEditPrice] = useState<{ id: string; price: string }>({ id: '', price: '' })

  useEffect(() => {
    if (user?.role !== 'admin') {
      Taro.showToast({ title: '无权限访问', icon: 'none' })
      return
    }
    loadData()
  }, [tab, user])

  async function loadData() {
    setLoading(true)
    if (tab === 'tools') {
      const { data } = await adminApi.listTools()
      if (data) setTools(data)
    } else if (tab === 'demands') {
      const { data } = await adminApi.getTopDemands(20)
      if (data) setDemands(data)
    }
    setLoading(false)
  }

  async function handlePublish(id: string) {
    await adminApi.updateToolStatus(id, 'published')
    Taro.showToast({ title: '已发布', icon: 'success' })
    loadData()
  }

  async function handleUnpublish(id: string) {
    await adminApi.updateToolStatus(id, 'draft')
    Taro.showToast({ title: '已下架', icon: 'success' })
    loadData()
  }

  async function handleSetPremium(id: string) {
    const price = parseFloat(editPrice.price)
    if (!price || price <= 0) {
      Taro.showToast({ title: '请输入有效价格', icon: 'none' })
      return
    }
    await adminApi.setPremium(id, price)
    Taro.showToast({ title: '已设为精品', icon: 'success' })
    setEditPrice({ id: '', price: '' })
    loadData()
  }

  async function handleUnsetPremium(id: string) {
    await adminApi.unsetPremium(id)
    Taro.showToast({ title: '已取消精品', icon: 'success' })
    loadData()
  }

  if (!user || user.role !== 'admin') {
    return (
      <Layout className="admin-page">
        <View className="status-message">
          <Text>需要管理员权限</Text>
        </View>
      </Layout>
    )
  }

  return (
    <Layout className="admin-page">
      <View className="page-header">
        <Text className="page-header__title">管理后台</Text>
      </View>

      <View className="chip-group" style={{ marginBottom: 'var(--sp-5)' }}>
        {(['tools', 'demands', 'pricing'] as AdminTab[]).map(t => (
          <View key={t} className={`chip ${tab === t ? 'chip--active' : ''}`} onClick={() => setTab(t)}>
            <Text>{t === 'tools' ? '工具管理' : t === 'demands' ? '高频需求' : '定价'}</Text>
          </View>
        ))}
      </View>

      {loading && <View className="status-message"><Text>加载中...</Text></View>}

      {tab === 'tools' && !loading && (
        <View>
          {tools.map(tool => (
            <View key={tool.id} className="card" style={{ marginBottom: 'var(--sp-3)' }}>
              <View style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontWeight: 700, display: 'block', marginBottom: 4 }}>{tool.title}</Text>
                  <Text style={{ color: 'var(--color-text-muted)', fontSize: 'var(--text-xs)', display: 'block', marginBottom: 4 }}>
                    {tool.tool_type} · {tool.style} · 下载 {tool.download_count} · {tool.status}
                    {tool.is_premium ? ` · 精品 ¥${tool.premium_price}` : ''}
                  </Text>
                  <Text style={{ color: 'var(--color-text-muted)', fontSize: 'var(--text-xs)' }}>
                    {tool.prompt?.slice(0, 80)}...
                  </Text>
                </View>
              </View>

              <View style={{ display: 'flex', gap: 'var(--sp-2)', marginTop: 'var(--sp-3)', flexWrap: 'wrap' }}>
                {tool.status !== 'published' ? (
                  <View className="chip chip--active" onClick={() => handlePublish(tool.id)}>
                    <Text>发布上线</Text>
                  </View>
                ) : (
                  <View className="chip" onClick={() => handleUnpublish(tool.id)}>
                    <Text>下架</Text>
                  </View>
                )}

                {!tool.is_premium ? (
                  <View style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                    <Input
                      style={{ width: 60, padding: '4px 8px', border: '1px solid var(--color-border)', borderRadius: 6, fontSize: 12 }}
                      placeholder="价格"
                      value={editPrice.id === tool.id ? editPrice.price : ''}
                      onFocus={() => setEditPrice({ id: tool.id, price: '' })}
                      onInput={(e) => setEditPrice({ id: tool.id, price: e.detail.value })}
                    />
                    <View className="chip chip--green--active" onClick={() => handleSetPremium(tool.id)}>
                      <Text>设为精品</Text>
                    </View>
                  </View>
                ) : (
                  <View className="chip" onClick={() => handleUnsetPremium(tool.id)}>
                    <Text>取消精品</Text>
                  </View>
                )}
              </View>
            </View>
          ))}
        </View>
      )}

      {tab === 'demands' && !loading && (
        <View>
          {demands.map((d, i) => (
            <View key={i} className="card" style={{ marginBottom: 'var(--sp-3)' }}>
              <Text style={{ fontWeight: 700, display: 'block', marginBottom: 4 }}>{d.representative_prompt}</Text>
              <Text style={{ color: 'var(--color-text-muted)', fontSize: 'var(--text-xs)' }}>
                请求 {d.request_count} 次 · {d.unique_users} 用户 · 类型 {d.tool_type}
              </Text>
            </View>
          ))}
        </View>
      )}

      {tab === 'pricing' && (
        <View className="card">
          <Text style={{ color: 'var(--color-text-muted)' }}>定价管理功能开发中。当前精品工具定价可在"工具管理"标签中逐个设置。</Text>
        </View>
      )}
    </Layout>
  )
}
