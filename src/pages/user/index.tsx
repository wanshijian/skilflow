import { View, Text, Image } from '@tarojs/components'
import { useEffect, useState } from 'react'
import Taro from '@tarojs/taro'
import Layout from '../../components/Layout'
import QuotaBar from '../../components/QuotaBar'
import { useAuth } from '../../hooks/useAuth'
import { useAuthStore } from '../../stores/authStore'
import { quotaApi, appFactoryApi, paymentApi } from '../../utils/api'
import './index.scss'

export default function UserPage() {
  const { signInWithGitHub, signInWithWechat } = useAuth()
  const { user, isAuthenticated } = useAuthStore()
  const [quota, setQuota] = useState<any>(null)
  const [remainingQuota, setRemaining] = useState(0)
  const [myApps, setMyApps] = useState<any[]>([])
  const [tab, setTab] = useState<'profile' | 'apps' | 'upgrade'>('profile')

  useEffect(() => {
    if (isAuthenticated && user?.id) {
      loadQuota()
      if (tab === 'apps') loadMyApps()
    }
  }, [isAuthenticated, user, tab])

  async function loadQuota() {
    if (!user?.id) return
    const { data: rem } = await quotaApi.getRemaining(user.id)
    setRemaining(rem || 0)
    const { data: det } = await quotaApi.getDetail(user.id)
    if (det) setQuota(det)
  }

  async function loadMyApps() {
    if (!user?.id) return
    const { data } = await appFactoryApi.listMine(user.id)
    if (data) setMyApps(data)
  }

  const handleLogin = () => {
    // #ifdef H5
    signInWithGitHub()
    // #endif
    // #ifdef WEAPP
    signInWithWechat()
    // #endif
  }

  const handlePurchase = async (type: 'single_purchase' | 'pro_monthly') => {
    if (!user?.id) return
    Taro.showLoading({ title: '创建订单...' })
    try {
      const { data: result } = await paymentApi.createOrder(user.id, type)
      Taro.hideLoading()
      if (result?.success) {
        // #ifdef WEAPP
        // 调起微信支付
        Taro.requestPayment({
          timeStamp: result.wechat_pay_params.timeStamp,
          nonceStr: result.wechat_pay_params.nonceStr,
          package: result.wechat_pay_params.package,
          signType: 'MD5' as any,
          paySign: result.wechat_pay_params.paySign,
          success: () => {
            Taro.showToast({ title: '支付成功！', icon: 'success' })
            loadQuota()
          },
          fail: () => Taro.showToast({ title: '支付取消', icon: 'none' })
        })
        // #endif
        // #ifdef H5
        Taro.showToast({ title: 'H5暂只支持微信小程序支付', icon: 'none' })
        // #endif
      }
    } catch {
      Taro.hideLoading()
      Taro.showToast({ title: '订单创建失败', icon: 'none' })
    }
  }

  const menuItems = [
    {
      title: '我的应用', icon: '🛠️', badge: myApps.length, action: () => setTab('apps')
    },
    {
      title: '我的收藏', icon: '⭐', action: () => { }
    },
    {
      title: '我的反馈', icon: '💬', action: () => { }
    },
    {
      title: '关于 SkillFlow', icon: 'ℹ️', action: () => {
        Taro.showModal({
          title: 'SkillFlow v2.0',
          content: 'AI 技能枢纽平台\n应用工厂 · 技能聚合 · GEO 优化',
          showCancel: false
        })
      }
    }
  ]

  if (user?.role === 'admin') {
    menuItems.unshift({
      title: '管理后台', icon: '⚙️', badge: undefined,
      action: () => Taro.navigateTo({ url: '/pages/admin/index' })
    } as any)
  }

  // 升级会员视图
  if (tab === 'upgrade') {
    return (
      <Layout className="user-page">
        <View className="back-btn" onClick={() => setTab('profile')}>
          <Text className="back-btn__text">&lt; 返回</Text>
        </View>

        <Text className="upgrade-title">升级你的创造力</Text>

        {/* 单次购买 */}
        <View className="pricing-card">
          <Text className="pricing-card__icon">⚡</Text>
          <Text className="pricing-card__title">单次购买</Text>
          <Text className="pricing-card__price">¥9.9</Text>
          <Text className="pricing-card__desc">获得 5 次生成配额</Text>
          <View className="pricing-card__btn" onClick={() => handlePurchase('single_purchase')}>
            <Text className="pricing-card__btn-text">立即购买</Text>
          </View>
        </View>

        {/* Pro 订阅 */}
        <View className="pricing-card pricing-card--pro">
          <View className="pricing-card__badge">推荐</View>
          <Text className="pricing-card__icon">👑</Text>
          <Text className="pricing-card__title">Pro 会员</Text>
          <Text className="pricing-card__price">¥29.9<span className="pricing-card__period">/月</span></Text>
          <Text className="pricing-card__desc">无限生成 · 优先支持 · 专属展示</Text>
          <View className="pricing-card__btn pricing-card__btn--gold" onClick={() => handlePurchase('pro_monthly')}>
            <Text className="pricing-card__btn-text">订阅 Pro</Text>
          </View>
        </View>
      </Layout>
    )
  }

  // 我的应用视图
  if (tab === 'apps') {
    return (
      <Layout className="user-page">
        <View className="back-btn" onClick={() => setTab('profile')}>
          <Text className="back-btn__text">&lt; 返回</Text>
        </View>

        <Text className="section-title">我生成的应用</Text>
        {myApps.length === 0 ? (
          <View className="empty-state">
            <Text className="empty-state__text">还没有生成应用</Text>
            <View className="empty-state__btn" onClick={() => Taro.navigateTo({ url: '/pages/app-factory/index' })}>
              <Text className="empty-state__btn-text">去应用工厂</Text>
            </View>
          </View>
        ) : (
          <View className="app-list">
            {myApps.map((app) => (
              <View key={app.id} className="my-app-card">
                <View className="my-app-card__header">
                  <Text className="my-app-card__lang">{app.language.toUpperCase()}</Text>
                  <Text className={`my-app-card__status my-app-card__status--${app.status}`}>
                    {app.status === 'completed' ? '✅' : app.status === 'failed' ? '❌' : '⏳'}
                  </Text>
                </View>
                <Text className="my-app-card__prompt">{app.prompt}</Text>
                <Text className="my-app-card__date">
                  {new Date(app.created_at).toLocaleDateString()}
                </Text>
              </View>
            ))}
          </View>
        )}
      </Layout>
    )
  }

  return (
    <Layout className="user-page">
      {/* 用户信息卡片 */}
      <View className="user-card">
        {isAuthenticated && user ? (
          <>
            <View className="user-avatar">
              {user.avatar ? (
                <Image className="user-avatar__img" src={user.avatar} mode="aspectFill" />
              ) : (
                <Text className="user-avatar__placeholder">
                  {(user.nickname || user.email || '?')[0].toUpperCase()}
                </Text>
              )}
            </View>
            <Text className="user-name">{user.nickname || user.email}</Text>
            <Text className="user-role">
              {user.role === 'admin' ? '管理员 · ' : ''}{quota?.is_pro ? 'Pro 会员' : '免费用户'}
            </Text>
          </>
        ) : (
          <>
            <View className="user-avatar">
              <Text className="user-avatar__placeholder">?</Text>
            </View>
            <Text className="user-name">未登录</Text>
            <View className="login-btn" onClick={handleLogin}>
              <Text className="login-btn__text">登录 / 注册</Text>
            </View>
          </>
        )}
      </View>

      {/* v2.0 配额展示 */}
      {isAuthenticated && (
        <QuotaBar
          remaining={remainingQuota}
          isPro={quota?.is_pro}
          proExpiresAt={quota?.pro_expires_at}
        />
      )}

      {/* 功能菜单 */}
      <View className="menu-list">
        {menuItems.map((item, idx) => (
          <View key={idx} className="menu-item" onClick={item.action}>
            <Text className="menu-item__icon">{item.icon}</Text>
            <Text className="menu-item__title">{item.title}</Text>
            {item.badge !== undefined && (
              <Text className="menu-item__badge">{item.badge}</Text>
            )}
            <Text className="menu-item__arrow">&gt;</Text>
          </View>
        ))}
      </View>

      {/* 升级入口（非Pro用户显示） */}
      {isAuthenticated && !quota?.is_pro && (
        <View className="upgrade-entry" onClick={() => setTab('upgrade')}>
          <Text className="upgrade-entry__icon">🚀</Text>
          <View className="upgrade-entry__content">
            <Text className="upgrade-entry__title">升级 Pro 会员</Text>
            <Text className="upgrade-entry__desc">无限生成 · 每月 ¥29.9</Text>
          </View>
          <Text className="upgrade-entry__arrow">&gt;</Text>
        </View>
      )}
    </Layout>
  )
}
