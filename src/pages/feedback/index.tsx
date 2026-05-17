import { View, Text, Input, Textarea } from '@tarojs/components'
import { useEffect, useState } from 'react'
import Taro from '@tarojs/taro'
import Layout from '../../components/Layout'
import { feedbackApi } from '../../utils/api'
import { useAuthStore } from '../../stores/authStore'
import './index.scss'

export default function FeedbackPage() {
  const { isAuthenticated } = useAuthStore()
  const [items, setItems] = useState<any[]>([])
  const [tab, setTab] = useState<'wishlist' | 'feedback'>('wishlist')
  const [inputVisible, setInputVisible] = useState(false)
  const [content, setContent] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadItems()
  }, [tab])

  async function loadItems() {
    setLoading(true)
    const { data } = await feedbackApi.list(tab === 'wishlist')
    if (data) setItems(data)
    setLoading(false)
  }

  async function handleSubmit() {
    if (!content.trim()) {
      Taro.showToast({ title: '请输入内容', icon: 'none' })
      return
    }
    if (!isAuthenticated) {
      Taro.showToast({ title: '请先登录', icon: 'none' })
      return
    }
    const { error } = await feedbackApi.create({
      content: content.trim(),
      is_wishlist: tab === 'wishlist'
    })
    if (error) {
      Taro.showToast({ title: '提交失败', icon: 'none' })
    } else {
      Taro.showToast({ title: '提交成功', icon: 'success' })
      setContent('')
      setInputVisible(false)
      loadItems()
    }
  }

  async function handleUpvote(id: string) {
    await feedbackApi.upvote(id)
    loadItems()
  }

  return (
    <Layout className="feedback-page">
      {/* Tab 切换 */}
      <View className="tabs">
        <Text
          className={`tabs__item ${tab === 'wishlist' ? 'tabs__item--active' : ''}`}
          onClick={() => setTab('wishlist')}
        >
          许愿墙
        </Text>
        <Text
          className={`tabs__item ${tab === 'feedback' ? 'tabs__item--active' : ''}`}
          onClick={() => setTab('feedback')}
        >
          使用反馈
        </Text>
      </View>

      {/* 发布按钮 */}
      <View className="submit-bar">
        <View className="btn--primary" onClick={() => setInputVisible(!inputVisible)}>
          <Text className="btn__text">
            {tab === 'wishlist' ? '+ 提交心愿' : '+ 发表反馈'}
          </Text>
        </View>
      </View>

      {/* 输入区域 */}
      {inputVisible && (
        <View className="card input-card">
          <Textarea
            className="input-field"
            value={content}
            onInput={(e) => setContent(e.detail.value)}
            placeholder={tab === 'wishlist' ? '描述你想要但找不到的 AI 技能...' : '分享你的使用心得或建议...'}
            maxlength={500}
          />
          <View className="input-actions">
            <Text className="input-actions__count">{content.length}/500</Text>
            <View className="btn--submit" onClick={handleSubmit}>
              <Text className="btn--submit__text">发布</Text>
            </View>
          </View>
        </View>
      )}

      {/* 列表 */}
      {loading ? (
        <Text className="loading">加载中…</Text>
      ) : items.length === 0 ? (
        <View className="empty">
          <Text className="empty__text">
            {tab === 'wishlist' ? '还没有心愿，来做第一个许愿的人吧！' : '还没有反馈'}
          </Text>
        </View>
      ) : (
        <View className="item-list">
          {items.map((item) => (
            <View key={item.id} className="item-card">
              <View className="item-card__header">
                <Text className="item-card__author">
                  {item.profiles?.nickname || '匿名用户'}
                </Text>
                <Text className="item-card__date">
                  {new Date(item.created_at).toLocaleDateString()}
                </Text>
              </View>
              <Text className="item-card__content">{item.content}</Text>
              <View className="item-card__footer">
                <View className="upvote-btn" onClick={() => handleUpvote(item.id)}>
                  <Text className="upvote-btn__icon">👍</Text>
                  <Text className="upvote-btn__count">{item.upvotes}</Text>
                </View>
              </View>
            </View>
          ))}
        </View>
      )}
    </Layout>
  )
}
