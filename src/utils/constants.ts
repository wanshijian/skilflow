// ============================================================
// 多维标签库常量定义
// 维度 A: 行业领域 | 维度 B: 能力类型 | 维度 C: 平台 | 维度 D: 价格
// ============================================================

export interface TagCategory {
  key: string
  label: string
  options: TagOption[]
}

export interface TagOption {
  value: string
  label: string
  icon?: string
}

export const TAG_DIMENSIONS: TagCategory[] = [
  {
    key: 'industry',
    label: '行业领域',
    options: [
      { value: '法律', label: '法律' },
      { value: '医疗', label: '医疗' },
      { value: '金融', label: '金融' },
      { value: '跨境电商', label: '跨境电商' },
      { value: '教育', label: '教育' },
      { value: '自媒体', label: '自媒体' },
      { value: '程序员', label: '程序员' },
      { value: '通用', label: '通用' }
    ]
  },
  {
    key: 'capability',
    label: '能力类型',
    options: [
      { value: '文本写作', label: '文本写作' },
      { value: '代码开发', label: '代码开发' },
      { value: '图像处理', label: '图像处理' },
      { value: '音频视频', label: '音频/视频' },
      { value: '数据分析', label: '数据分析' },
      { value: '自动化流', label: '自动化流' },
      { value: '翻译', label: '翻译' }
    ]
  },
  {
    key: 'platform',
    label: '适用平台',
    options: [
      { value: 'ChatGPT', label: 'ChatGPT' },
      { value: 'Claude', label: 'Claude' },
      { value: 'Midjourney', label: 'Midjourney' },
      { value: 'DeepSeek', label: 'DeepSeek' },
      { value: 'Dify', label: 'Dify' },
      { value: 'Stable Diffusion', label: 'Stable Diffusion' }
    ]
  },
  {
    key: 'pricing',
    label: '价格属性',
    options: [
      { value: '完全免费', label: '完全免费' },
      { value: '限时免费', label: '限时免费' },
      { value: '按次付费', label: '按次付费' },
      { value: '订阅制', label: '订阅制' }
    ]
  }
]

// 扁平化所有标签选项
export const ALL_TAGS = TAG_DIMENSIONS.flatMap(d => d.options)

// 语义搜索映射：关键词 → 匹配标签
export const SEMANTIC_MAP: Record<string, string[]> = {
  '写代码': ['代码开发'],
  '编程': ['代码开发'],
  '开发': ['代码开发'],
  '画画': ['图像处理'],
  '绘图': ['图像处理'],
  '作图': ['图像处理'],
  '写作': ['文本写作'],
  '写文章': ['文本写作'],
  '文案': ['文本写作'],
  '视频': ['音频视频'],
  '音频': ['音频视频'],
  '音乐': ['音频视频'],
  '自动': ['自动化流'],
  '自动化': ['自动化流'],
  '分析': ['数据分析'],
  '数据': ['数据分析'],
  '翻译': ['翻译'],
  '免费': ['完全免费'],
  '不要钱': ['完全免费'],
  '付费': ['按次付费', '订阅制']
}
