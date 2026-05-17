import { View, Text } from '@tarojs/components'
import Layout from '../../components/Layout'
import './index.scss'

export default function LabsPage() {
  const articles = [
    { id: 1, title: 'Claude 4 Prompt 优化指南', summary: '分享几个提升 Claude 4 输出质量的实用 Prompt 技巧', date: '2026-05-08' },
    { id: 2, title: '用 AI 自动化代码审查流程', summary: '如何结合 GitHub Actions 和 AI 实现自动代码审查', date: '2026-05-06' },
    { id: 3, title: 'Stable Diffusion 提示词进阶', summary: '从入门到精通的 Stable Diffusion Prompt Engineering 技巧', date: '2026-05-04' }
  ]

  return (
    <Layout className="labs-page">
      <Text className="page-title">🧪 技巧实验室</Text>
      <Text className="page-subtitle">Prompt 优化经验与 AI 实践分享</Text>

      {articles.map((article) => (
        <View key={article.id} className="lab-card">
          <Text className="lab-card__title">{article.title}</Text>
          <Text className="lab-card__summary">{article.summary}</Text>
          <View className="lab-card__footer">
            <Text className="lab-card__date">{article.date}</Text>
            <Text className="lab-card__link">阅读更多 &gt;</Text>
          </View>
        </View>
      ))}
    </Layout>
  )
}
