import { View, Text, Input } from '@tarojs/components'
import { useEffect, useState } from 'react'
import Taro from '@tarojs/taro'
import Layout from '../../components/Layout'
import { skillsApi, adminApi } from '../../utils/api'
import { useAuthStore } from '../../stores/authStore'
import type { Skill } from '../../stores/skillStore'
import './index.scss'

type AdminTab = 'skills' | 'pricing' | 'stats'

export default function AdminPage() {
  const { user } = useAuthStore()
  const [tab, setTab] = useState<AdminTab>('skills')
  const [skills, setSkills] = useState<Skill[]>([])
  const [loading, setLoading] = useState(true)
  const [configs, setConfigs] = useState<Record<string, string>>({})
  const [stats, setStats] = useState({ payments: 0, apps: 0, users: 0 })

  useEffect(() => {
    if (user?.role !== 'admin') {
      Taro.showToast({ title: '无权限访问', icon: 'none' })
      return
    }
    if (tab === 'skills') loadDrafts()
    else if (tab === 'pricing') loadConfigs()
    else if (tab === 'stats') loadStats()
  }, [tab, user])

  // === Skills Management ===
  async function loadDrafts() {
    setLoading(true)
    const { data } = await skillsApi.list({ status: 'draft', pageSize: 50 })
    if (data) setSkills(data)
    setLoading(false)
  }

  async function handlePublish(id: string) {
    const { error } = await adminApi.updateSkillStatus(id, 'published')
    if (error) { Taro.showToast({ title: '发布失败', icon: 'none' }) }
    else { Taro.showToast({ title: '已发布', icon: 'success' }); loadDrafts() }
  }

  async function handleArchive(id: string) {
    const { error } = await adminApi.updateSkillStatus(id, 'archived')
    if (error) { Taro.showToast({ title: '操作失败', icon: 'none' }) }
    else { Taro.showToast({ title: '已下架', icon: 'success' }); loadDrafts() }
  }

  // === Pricing Config ===
  async function loadConfigs() {
    const { data } = await adminApi.getConfig()
    if (data) {
      const map: Record<string, string> = {}
      data.forEach((c: any) => { map[c.key] = c.value })
      setConfigs(map)
    }
  }

  async function saveConfig(key: string, value: string) {
    await adminApi.updateConfig(key, value)
    Taro.showToast({ title: '已保存', icon: 'success' })
    loadConfigs()
  }

  // === Stats ===
  async function loadStats() {
    const { count: payCount } = await adminApi.getPaymentStats()
    setStats(prev => ({ ...prev, payments: payCount || 0 }))
  }

  if (user?.role !== 'admin') {
    return <Layout><Text className="no-access">需要管理员权限</Text></Layout>
  }

  return (
    <Layout className="admin-page">
      <Text className="page-title">管理后台</Text>

      {/* Tab 切换 */}
      <View className="admin-tabs">
        {[
          { key: 'skills' as AdminTab, label: '技能审核' },
          { key: 'pricing' as AdminTab, label: '定价配置' },
          { key: 'stats' as AdminTab, label: '数据统计' }
        ].map((t) => (
          <Text
            key={t.key}
            className={`admin-tabs__item ${tab === t.key ? 'admin-tabs__item--active' : ''}`}
            onClick={() => setTab(t.key)}
          >
            {t.label}
          </Text>
        ))}
      </View>

      {/* === Skills Tab === */}
      {tab === 'skills' && (
        <>
          <Text className="section-title">待审核技能: {skills.length}</Text>
          {loading ? (
            <Text className="loading">加载中…</Text>
          ) : skills.length === 0 ? (
            <Text className="empty">没有待审核的技能</Text>
          ) : (
            <View className="admin-list">
              {skills.map((skill) => (
                <View key={skill.id} className="admin-card">
                  <Text className="admin-card__title">{skill.title}</Text>
                  <Text className="admin-card__summary">{skill.short_summary}</Text>
                  <View className="admin-card__tags">
                    {skill.sub_tags?.map((tag) => (
                      <Text key={tag} className="admin-card__tag">{tag}</Text>
                    ))}
                  </View>
                  <View className="admin-card__actions">
                    <View className="action-btn action-btn--publish" onClick={() => handlePublish(skill.id)}>
                      <Text>发布</Text>
                    </View>
                    <View className="action-btn action-btn--archive" onClick={() => handleArchive(skill.id)}>
                      <Text>下架</Text>
                    </View>
                  </View>
                </View>
              ))}
            </View>
          )}
        </>
      )}

      {/* === Pricing Tab === */}
      {tab === 'pricing' && (
        <View className="config-list">
          {[
            { key: 'single_pay_price', label: '单次购买价格 (元)' },
            { key: 'single_pay_quota', label: '单次购买配额 (次)' },
            { key: 'pro_monthly_price', label: 'Pro 月费 (元)' },
            { key: 'max_daily_free', label: '每日免费次数' },
            { key: 'max_daily_share_bonus', label: '每日分享额外次数上限' },
            { key: 'share_bonus_quota', label: '每次分享获得次数' }
          ].map((cfg) => (
            <View key={cfg.key} className="config-item">
              <Text className="config-item__label">{cfg.label}</Text>
              <View className="config-item__row">
                <Input
                  className="config-item__input"
                  value={configs[cfg.key] || ''}
                  onInput={(e) => setConfigs({ ...configs, [cfg.key]: e.detail.value })}
                />
                <View className="config-item__save" onClick={() => saveConfig(cfg.key, configs[cfg.key] || '')}>
                  <Text className="config-item__save-text">保存</Text>
                </View>
              </View>
            </View>
          ))}
        </View>
      )}

      {/* === Stats Tab === */}
      {tab === 'stats' && (
        <View className="stats-grid">
          <View className="stat-card">
            <Text className="stat-card__value">{stats.payments}</Text>
            <Text className="stat-card__label">支付订单数</Text>
          </View>
          <View className="stat-card">
            <Text className="stat-card__value">{stats.apps}</Text>
            <Text className="stat-card__label">生成应用数</Text>
          </View>
          <View className="stat-card">
            <Text className="stat-card__value">{stats.users}</Text>
            <Text className="stat-card__label">注册用户数</Text>
          </View>
        </View>
      )}
    </Layout>
  )
}
