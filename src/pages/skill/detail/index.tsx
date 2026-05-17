import { View, Text, Image } from '@tarojs/components'
import { useEffect, useState } from 'react'
import Taro, { useRouter } from '@tarojs/taro'
import Layout from '../../../components/Layout'
import { useSkills } from '../../../hooks/useSkills'
import { skillsApi, commentsApi } from '../../../utils/api'
import type { Skill } from '../../../stores/skillStore'
import './index.scss'

export default function SkillDetailPage() {
  const router = useRouter()
  const { slug } = router.params
  const { fetchSkillBySlug } = useSkills()
  const [skill, setSkill] = useState<Skill | null>(null)
  const [comments, setComments] = useState([])
  const [commentText, setCommentText] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!slug) return
    loadSkill()
    loadComments()
    // 增加点击量
  }, [slug])

  async function loadSkill() {
    setLoading(true)
    const data = await fetchSkillBySlug(slug as string)
    if (data) {
      setSkill(data)
      // 增加点击量
      await skillsApi.incrementClick(data.id)
    }
    setLoading(false)
  }

  async function loadComments() {
    const { data } = await commentsApi.list(slug as string)
    if (data) setComments(data)
  }

  async function handleSubmitComment() {
    if (!commentText.trim()) return
    const { error } = await commentsApi.create({
      skill_id: skill!.id,
      content: commentText.trim()
    })
    if (error) {
      Taro.showToast({ title: '发布失败', icon: 'none' })
    } else {
      Taro.showToast({ title: '评论成功', icon: 'success' })
      setCommentText('')
      loadComments()
    }
  }

  if (loading) {
    return <Layout><Text className="loading">加载中…</Text></Layout>
  }

  if (!skill) {
    return <Layout><Text className="loading">技能未找到</Text></Layout>
  }

  return (
    <Layout className="skill-detail-page">
      {/* JSON-LD 结构化数据 */}
      {/* #ifdef H5 */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'SoftwareApplication',
            name: skill.title,
            description: skill.short_summary,
            url: skill.raw_url,
            applicationCategory: skill.primary_category,
            ...skill.schema_json
          })
        }}
      />
      {/* #endif */}

      {/* 标题区域 */}
      <View className="skill-header">
        <Text className="skill-header__title">{skill.title}</Text>
        <View className="skill-header__meta">
          {skill.author && <Text className="skill-header__author">@{skill.author}</Text>}
          {skill.stars > 0 && (
            <Text className="skill-header__stars">⭐ {skill.stars.toLocaleString()}</Text>
          )}
        </View>
      </View>

      {/* 标签 */}
      <View className="skill-tags">
        {skill.primary_category && (
          <Text className="tag tag--primary">{skill.primary_category}</Text>
        )}
        {skill.sub_tags?.map((tag) => (
          <Text key={tag} className="tag">{tag}</Text>
        ))}
        <Text className="tag tag--pricing">{skill.pricing}</Text>
      </View>

      {/* 简介 */}
      <View className="card">
        <Text className="card__title">简介</Text>
        <Text className="card__text">{skill.short_summary}</Text>
      </View>

      {/* 使用场景 */}
      {skill.use_cases?.length > 0 && (
        <View className="card">
          <Text className="card__title">使用场景</Text>
          {skill.use_cases.map((uc, idx) => (
            <View key={idx} className="use-case">
              <Text className="use-case__title">{uc.title}</Text>
              <Text className="use-case__desc">{uc.description}</Text>
            </View>
          ))}
        </View>
      )}

      {/* 配置代码片段 */}
      {skill.code_snippet && (
        <View className="card">
          <Text className="card__title">快速开始</Text>
          <View className="code-block">
            <Text className="code-block__text">{skill.code_snippet}</Text>
          </View>
        </View>
      )}

      {/* 参数说明 */}
      {skill.params && Object.keys(skill.params).length > 0 && (
        <View className="card">
          <Text className="card__title">接口参数</Text>
          {skill.params.inputs && (
            <View className="params-row">
              <Text className="params-row__label">输入</Text>
              <Text className="params-row__value">{skill.params.inputs.join(', ')}</Text>
            </View>
          )}
          {skill.params.outputs && (
            <View className="params-row">
              <Text className="params-row__label">输出</Text>
              <Text className="params-row__value">{skill.params.outputs.join(', ')}</Text>
            </View>
          )}
        </View>
      )}

      {/* 跳转按钮 */}
      <View className="skill-actions">
        <View
          className="btn btn--primary"
          onClick={() => {
            if (skill.github_url) {
              // 复制链接到剪贴板
              Taro.setClipboardData({ data: skill.github_url })
              Taro.showToast({ title: '链接已复制' })
            }
          }}
        >
          <Text className="btn__text">复制项目链接</Text>
        </View>
      </View>

      {/* 评论区 */}
      <View className="card">
        <Text className="card__title">用户评论 ({comments.length})</Text>
        {comments.map((c) => (
          <View key={c.id} className="comment">
            <Text className="comment__author">{c.profiles?.nickname || '匿名'}</Text>
            <Text className="comment__text">{c.content}</Text>
          </View>
        ))}
        <View className="comment-input">
          <input
            className="comment-input__field"
            value={commentText}
            onInput={(e) => setCommentText(e.detail.value)}
            placeholder="写下你的使用心得..."
          />
          <View className="comment-input__btn" onClick={handleSubmitComment}>
            <Text>发送</Text>
          </View>
        </View>
      </View>
    </Layout>
  )
}
