-- 种子数据：示例技能卡片
INSERT INTO skills (title, slug, raw_url, github_url, stars, author, short_summary, use_cases, params, primary_category, sub_tags, pricing, status, code_snippet) VALUES
(
  'AutoGPT',
  'autogpt',
  'https://github.com/Significant-Gravitas/AutoGPT',
  'https://github.com/Significant-Gravitas/AutoGPT',
  168000,
  'Significant-Gravitas',
  '让 AI 自主完成复杂任务的自动化代理，像私人管家一样帮你干活',
  '[
    {"title": "自动生成商业报告", "description": "输入公司行业，自动抓取数据并生成分析报告"},
    {"title": "自动化代码审查", "description": "连接 GitHub 仓库，自动 review PR 并给出修改建议"},
    {"title": "旅行规划助手", "description": "输入目的地和预算，自动规划完整的行程安排"}
  ]'::jsonb,
  '{"inputs": ["任务描述文本", "API Keys"], "outputs": ["任务执行结果", "过程日志"]}'::jsonb,
  '程序员',
  ARRAY['代码开发', '自动化流', 'ChatGPT'],
  '完全免费',
  'published',
  '# 安装与运行
git clone https://github.com/Significant-Gravitas/AutoGPT.git
cd AutoGPT
pip install -r requirements.txt
python -m autogpt'
),
(
  'Midjourney Prompt Generator',
  'midjourney-prompt-gen',
  'https://github.com/example/mj-prompt-gen',
  'https://github.com/example/mj-prompt-gen',
  3200,
  'prompt-master',
  '用自然语言描述需求，自动生成专业 Midjourney 绘图提示词',
  '[
    {"title": "电商产品图", "description": "描述产品风格，生成适合电商展示的 MJ prompt"},
    {"title": "游戏原画设计", "description": "输入角色设定，输出风格化的绘图指令"},
    {"title": "室内设计效果图", "description": "描述空间需求，生成写实渲染风格 prompt"}
  ]'::jsonb,
  '{"inputs": ["创意描述", "风格偏好"], "outputs": ["Midjourney Prompt", "参考图片链接"]}'::jsonb,
  '自媒体',
  ARRAY['图像处理', '文本写作', 'Midjourney'],
  '按次付费',
  'published',
  '# 使用方法
访问 https://example.com/mj-gen
在输入框用中文描述你想要的效果
点击生成即可获得 MJ prompt'
),
(
  'AI 法律合同审查',
  'legal-contract-review',
  'https://github.com/example/legal-ai',
  'https://github.com/example/legal-ai',
  8900,
  'legal-tech',
  '上传合同文档，AI 自动标注风险条款并给出修改建议',
  '[
    {"title": "劳动合同审查", "description": "检查雇佣合同中的不合理条款"},
    {"title": "投资协议分析", "description": "识别投资条款中的潜在陷阱"},
    {"title": "隐私政策审核", "description": "确保网站的隐私政策符合 GDPR 要求"}
  ]'::jsonb,
  '{"inputs": ["合同文档(PDF/DOCX)"], "outputs": ["风险标注报告", "条款修改建议", "合规评分"]}'::jsonb,
  '法律',
  ARRAY['文本写作', '数据分析', 'ChatGPT', 'Claude'],
  '订阅制',
  'published',
  '# Web 端使用
访问 https://legal.example.com
上传合同文档
等待 AI 分析完成，下载审查报告'
);
