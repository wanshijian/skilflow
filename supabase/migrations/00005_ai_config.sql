-- SkillFlow: AI 配置系统
-- 将 skills/pipelines/settings 从文件系统迁移到数据库
-- 管理员通过 Supabase Dashboard 实时修改，VPS 服务热加载

-- ============================================================
-- 1. AI 技能定义表
-- ============================================================
CREATE TABLE ai_skills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL UNIQUE,
  display_name VARCHAR(200),
  layer INT NOT NULL DEFAULT 3,             -- 1=项目身份 2=核心任务 3=设计质量 4=专项
  category VARCHAR(50) DEFAULT 'general',    -- identity/task/design/specialty
  content TEXT NOT NULL,
  priority INT DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  usage_hint TEXT,                           -- 告诉 AI 何时启用
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- 2. AI 流水线定义表
-- ============================================================
CREATE TABLE ai_pipelines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL UNIQUE,
  display_name VARCHAR(200),
  description TEXT,
  steps JSONB NOT NULL DEFAULT '[]',
  skill_ids UUID[] DEFAULT '{}',
  model VARCHAR(100) DEFAULT 'claude-sonnet-4-20250514',
  max_tokens INT DEFAULT 8192,
  temperature DECIMAL(3,2) DEFAULT 0.7,
  retry_limit INT DEFAULT 1,
  is_active BOOLEAN DEFAULT true,
  config JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- 3. AI 全局设置表
-- ============================================================
CREATE TABLE ai_settings (
  key VARCHAR(100) PRIMARY KEY,
  value JSONB NOT NULL,
  description TEXT,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- 4. 索引
-- ============================================================
CREATE INDEX idx_ai_skills_layer ON ai_skills(layer, priority);
CREATE INDEX idx_ai_skills_active ON ai_skills(is_active);
CREATE INDEX idx_ai_pipelines_active ON ai_pipelines(is_active);

-- ============================================================
-- 5. 种子数据：全局设置
-- ============================================================
INSERT INTO ai_settings (key, value, description) VALUES
  ('design_tokens', '{"bg":"#0F172A","bg_card":"#1E293B","text":"#FAFAF9","text_2":"#94A3B8","text_3":"#64748B","accent":"#F97316","border":"rgba(255,255,255,0.1)","border_hover":"rgba(255,255,255,0.15)","font":"Inter, system-ui, -apple-system, sans-serif","radius_card":"16px","radius_input":"12px","radius_button":"12px","radius_tag":"8px","shadow_button":"0 4px 20px rgba(249,115,22,.2)","shadow_button_hover":"0 6px 30px rgba(249,115,22,.3)"}', '设计令牌（来自 DESIGN.md）'),
  ('brand_name', '"SkillFlow"', '品牌名称'),
  ('default_locale', '"zh-CN"', '默认语言'),
  ('max_retry', '1', '生成审查失败最大重试次数'),
  ('quality_checks', '["file_protocol","mobile_responsive","error_handling","visual_hierarchy","self_explanatory"]', '工具生成质量 checklist');

-- ============================================================
-- 6. 种子数据：Skills（L1-L4）
-- ============================================================

-- L1: 项目身份（非协商约束）
INSERT INTO ai_skills (name, display_name, layer, category, content, priority, usage_hint) VALUES
  ('project-identity', '项目身份与设计令牌', 1, 'identity',
   E'# Project Identity & Design Tokens\n\nYou are building tools for SkillFlow, an AI tool factory platform.\n\n## Non-Negotiable Design Tokens\n\nAll generated HTML must use these CSS variables:\n\n```css\n:root {\n  --bg: #0F172A;\n  --bg-card: #1E293B;\n  --text: #FAFAF9;\n  --text-2: #94A3B8;\n  --text-3: #64748B;\n  --accent: #F97316;\n  --border: rgba(255,255,255,0.1);\n  --border-hover: rgba(255,255,255,0.15);\n  --font: Inter, system-ui, -apple-system, sans-serif;\n  --radius-card: 16px;\n  --radius-input: 12px;\n  --radius-button: 12px;\n  --radius-tag: 8px;\n  --shadow-button: 0 4px 20px rgba(249,115,22,.2);\n  --shadow-button-hover: 0 6px 30px rgba(249,115,22,.3);\n}\n\nbody {\n  font-family: var(--font);\n  -webkit-font-smoothing: antialiased;\n  background: var(--bg);\n  color: var(--text);\n}\n```\n\n## Key Rules\n- Background must be #0F172A (NOT pure black)\n- Cards use #1E293B with subtle border\n- Accent color is #F97316 (orange)\n- Buttons use gradient: linear-gradient(135deg, #ea580c, #f97316)\n- Font is Inter (this overrides other skill advice about avoiding Inter — the platform standard is Inter)\n- Mobile-first responsive design\n- Use 8px spacing baseline',
   0, '始终启用 — 所有生成必须遵守的设计令牌和品牌约束'),

  ('platform-context', '平台技术上下文', 1, 'identity',
   E'# Platform Context\n\n## Delivery Format\n- Output is single-file HTML (inline CSS + JS)\n- Must work via file:// protocol (double-click to open)\n- Zero external dependencies unless CDN library is absolutely essential\n- Include `<meta name="viewport" content="width=device-width, initial-scale=1.0">`\n- Language: zh-CN (Chinese UI)\n\n## Constraints\n- NOT a React/Next.js app — plain HTML/CSS/JS only\n- No build step, no npm, no framework\n- Must work offline (no API calls to external services)\n- Mobile responsive using flexbox/grid\n- Touch events for mobile interaction\n\n## User Experience\n- Self-explanatory UI — user should understand immediately\n- Handle errors gracefully with Chinese error messages\n- Include clear title and brief usage instructions\n- Professional appearance with proper spacing and typography',
   1, '始终启用 — 平台交付格式和技术约束');

-- L2: 核心任务 Skills
INSERT INTO ai_skills (name, display_name, layer, category, content, priority, usage_hint) VALUES
  ('tool-generator', '工具生成规范', 2, 'task',
   E'# Tool Generator\n\nGenerate production-ready single-file HTML tools. Every tool must work when double-clicked and opened in any browser.\n\n## Rules\n\n1. Output ONLY the complete HTML file. No markdown wrappers, no explanations.\n2. Self-contained: inline CSS + JS. Zero external dependencies unless CDN library is essential.\n3. Must work via `file://` protocol (no server needed).\n4. Responsive: mobile + desktop. Use touch events for mobile interaction.\n5. Include `<meta name="viewport" content="width=device-width, initial-scale=1.0">`.\n6. Clear UI with title, instructions, and visual hierarchy.\n7. Graceful error handling with user-friendly messages.\n8. Professional appearance — not bare-bones. Use proper spacing, colors, and typography.\n\n## Quality Checklist\n\nBefore outputting, verify:\n- [ ] Opens via double-click in any browser\n- [ ] All interactions work without errors\n- [ ] Handles empty/invalid input gracefully\n- [ ] Mobile responsive (flexbox/grid, touch events)\n- [ ] Visual hierarchy clear (heading, body, actions)\n- [ ] Self-explanatory — user doesn''t need instructions\n\n## Common Tool Types\n\n- **converter**: Format conversion (Word→PDF, image compression, JSON↔CSV)\n- **generator**: Generate output from input (QR code, password, UUID)\n- **calculator**: Compute results (BMI, mortgage, unit conversion)\n- **text-tool**: Text manipulation (Markdown preview, regex tester, diff viewer)\n- **game**: Simple games (snake, 2048, minesweeper, memory card)\n- **utility**: Miscellaneous (timer, todo list, notes, clipboard tools)\n\n## Output Format\n\n```html\n<!DOCTYPE html>\n<html lang="zh-CN">\n<head>\n  <meta charset="UTF-8">\n  <meta name="viewport" content="width=device-width, initial-scale=1.0">\n  <title>Tool Name</title>\n  <style>/* Complete styles here */</style>\n</head>\n<body>\n  <!-- Tool UI here -->\n  <script>// All logic here</script>\n</body>\n</html>\n```',
   0, '代码生成时始终启用 — 定义输出格式和质量标准'),

  ('doc-cleanup', '文档整理规范', 2, 'task',
   E'# Document Cleanup\n\nYou are a document formatting expert. Receive AI-generated text pasted by users and clean/format it.\n\n## Steps\n\n1. **Clean Markdown**:\n   - Remove all ##, **, *, -, +, >, `, ``` symbols\n   - Replace curly quotes ""'' with straight quotes ""\n   - Remove zero-width characters and control chars\n   - Normalize line breaks\n\n2. **Identify Structure**:\n   - Find article title (first line or most prominent short sentence)\n   - Identify heading levels (by semantic meaning, not symbols)\n   - Distinguish body paragraphs, lists, quotes\n   - Merge overly short paragraphs\n\n3. **Format Output**:\n   - Title centered and bold\n   - Paragraphs with first-line indent\n   - Even paragraph spacing\n   - Preserve original semantic structure\n\n## Output Format (Strict JSON)\n\n```json\n{\n  "title": "Article Title",\n  "format": "normal",\n  "sections": [\n    { "type": "paragraph", "text": "Body text..." },\n    { "type": "heading", "level": 1, "text": "Heading" },\n    { "type": "list", "items": ["Item 1", "Item 2"] }\n  ],\n  "stats": { "chars": 1234, "paragraphs": 8, "headings": 2 }\n}\n```\n\nNote: Output ONLY JSON, no markdown wrapping, no explanation text.',
   0, '文档整理时启用 — 定义清洗规则和输出 JSON 格式');

-- L3: 设计质量 Skills
INSERT INTO ai_skills (name, display_name, layer, category, content, priority, usage_hint) VALUES
  ('frontend-design', '前端设计规范', 3, 'design',
   E'# Frontend Design\n\nCreate distinctive, production-grade frontend interfaces that avoid generic "AI slop" aesthetics.\n\n## Design Thinking\n\nBefore coding, commit to a BOLD aesthetic direction:\n- **Purpose**: What problem does this interface solve? Who uses it?\n- **Tone**: Pick an extreme: brutally minimal, maximalist chaos, retro-futuristic, organic/natural, luxury/refined, playful/toy-like, editorial/magazine, brutalist/raw, art deco/geometric, soft/pastel, industrial/utilitarian.\n- **Differentiation**: What makes this UNFORGETTABLE?\n\nCRITICAL: Choose a clear conceptual direction and execute it with precision. Bold maximalism and refined minimalism both work — the key is intentionality, not intensity.\n\n## Frontend Aesthetics\n\nFocus on:\n- **Typography**: Choose beautiful, unique fonts. Avoid generic Arial/Inter (unless platform standard overrides).\n- **Color & Theme**: Commit to a cohesive aesthetic. Use CSS variables. Dominant colors with sharp accents outperform timid palettes.\n- **Motion**: Use animations for effects and micro-interactions. Prioritize CSS-only solutions. Focus on high-impact moments: staggered reveals, scroll-triggering, hover states that surprise.\n- **Spatial Composition**: Unexpected layouts. Asymmetry. Overlap. Diagonal flow. Generous negative space OR controlled density.\n- **Backgrounds & Visual Details**: Create atmosphere and depth. Gradient meshes, noise textures, geometric patterns, layered transparencies, dramatic shadows, decorative borders, custom cursors, grain overlays.\n\nNEVER use generic AI-generated aesthetics: overused font families, cliched color schemes (purple gradients on white), predictable layouts. Interpret creatively and make unexpected choices.',
   10, '设计生成时启用 — 避免 AI slop，提供有辨识度的设计方向'),

  ('ui-design-aesthetics', 'UI 设计美学', 3, 'design',
   E'# UI Design & Aesthetics\n\nExpert guidance for beautiful, high-performance user interfaces.\n\n## Core Capabilities\n- **Aesthetic Direction**: avoiding "AI slop" by enforcing distinctive typography, color, and depth.\n- **Performance Architecture**: ensuring UI components load dynamically to minimize initial payload.\n- **Progressive Disclosure**: designing interfaces that reveal complexity only when needed.\n\n## Design Workflow\n1. **Analyze & Select Aesthetic**: Choose a cohesive theme and reject generic defaults.\n2. **Architect for Performance**: Identify heavy components for lazy loading.\n3. **Design Interaction**: Plan staggered reveals and interaction-based loading.\n4. **Implement**: Write code enforcing the design system.\n\n## Performance Requirements\n- **Initial Payload**: Critical path CSS/JS only.\n- **Dynamic Loading**: Secondary components load on interaction or visibility.\n- **Latency**: Design optimistic UI states for interactions > 100ms.',
   20, '设计生成时启用 — 性能意识和渐进展示'),

  ('web-design-guidelines', 'Web 界面规范', 3, 'design',
   E'# Web Interface Guidelines\n\nEnsure generated HTML follows web best practices:\n\n## Accessibility\n- Use semantic HTML elements (header, main, nav, section, article)\n- Add aria-labels to interactive elements without visible text\n- Ensure keyboard navigation (tabIndex, onKeyDown)\n- Maintain sufficient color contrast\n- Use alt text for any images\n\n## UX Best Practices\n- Clear visual hierarchy\n- Consistent spacing and alignment\n- Obvious clickable/tappable areas (minimum 44x44px touch targets)\n- Loading states for async operations\n- Helpful error messages\n\n## Responsive Design\n- Mobile-first approach\n- Use flexbox/grid for layout\n- Avoid fixed widths; use max-width containers\n- Test at 375px, 768px, 1024px breakpoints',
   30, '设计生成时启用 — 无障碍和 UX 最佳实践');

-- L4: 专项 Skills
INSERT INTO ai_skills (name, display_name, layer, category, content, priority, usage_hint) VALUES
  ('creative-frontend-aesthetics', '创意前端美学', 4, 'specialty',
   E'# Creative Frontend Aesthetics\n\nBuild original, sophisticated UIs that escape the "AI-generated" look.\n\n## Key Points\n\n### Typography\n- Choose beautiful, unique, interesting fonts.\n- AVOID: Arial, Inter (unless platform standard overrides), generic system fonts.\n- PREFER: Distinctive fonts that elevate aesthetics.\n\n### Color & Theme\n- Commit to a cohesive aesthetic.\n- Use CSS variables for consistency.\n- Dominant color + sharp accent beats timid, evenly-distributed palettes.\n- Inspiration: IDE themes, cultural aesthetics (cyberpunk, retro, Nordic modern).\n\n### Motion\n- Effective animations and micro-interactions.\n- CSS-only solutions for HTML. Motion library for React.\n- Strategy: Focus on high-impact moments (staggered page load) rather than scattered micro-interactions.\n\n### Backgrounds\n- Avoid solid colors. Create atmosphere and depth.\n- Layer CSS gradients, geometric patterns, contextual background effects.\n\n## AVOID "AI Slop" Characteristics\n- Fonts: Inter, Roboto, Arial overuse\n- Colors: White background + purple gradient (too typical)\n- Layout: Predictable component placement, template-like design\n- Character: Context-ignoring "generic" design\n\nMake bold, unexpected choices. No design should look the same.',
   100, '需要额外设计创意时启用 — 反 AI slop 专项'),

  ('glassmorphism', '毛玻璃效果', 4, 'specialty',
   E'# Glassmorphism Pattern\n\nCreate frosted glass effects for overlays and floating UI elements.\n\n## Core Pattern\n```css\n.glass {\n  background: rgba(0,0,0,0.2);\n  backdrop-filter: blur(12px);\n  -webkit-backdrop-filter: blur(12px);\n  border: 1px solid rgba(255,255,255,0.1);\n}\n```\n\n## Variations\n- **Dark overlay** (on images): bg-black/20, backdrop-blur-md, border-white/10\n- **Light overlay** (on dark bg): bg-white/10, backdrop-blur-md, border-white/20\n- **Subtle glass**: bg-black/10, backdrop-blur-sm, border-white/5\n- **Strong glass**: bg-black/40, backdrop-blur-lg, border-white/20\n\n## Common Uses\n- Navigation bars (fixed, over content)\n- Floating action buttons\n- Tooltips and popovers\n- Modal/dialog backdrops\n- Carousel indicators\n\n## Performance Note\nbackdrop-blur can impact low-end devices. Use smaller blur values for frequently updated elements. Test on mobile.',
   200, '需要毛玻璃/半透明效果时启用'),

  ('elegance-sophistication', '优雅动画', 4, 'specialty',
   E'# Elegance & Sophistication Animation\n\nCreate animations that convey refinement and understated excellence.\n\n## Principles\n- Elegance = restrained, perfectly timed motion\n- Sophistication = animations noticed for quality, not quantity\n\n## Timing\n| Element | Duration | Easing |\n|---------|----------|--------|\n| Fade | 300-400ms | ease-in-out |\n| Slide | 400-500ms | ease-out |\n| Scale | 350-450ms | ease-in-out |\n| Reveal | 500-700ms | ease-out |\n\n## CSS Easing\n```css\n--elegant-smooth: cubic-bezier(0.4, 0, 0.2, 1);\n--elegant-enter: cubic-bezier(0.0, 0, 0.2, 1);\n--elegant-flow: cubic-bezier(0.45, 0, 0.55, 1);\n```\n\n## Design Principles\n- White space is active, not empty\n- Motion reveals content, doesn''t decorate it\n- Timing shows confidence and quality\n- Every animation earns its place\n- Restraint demonstrates mastery',
   300, '需要优雅/高级感动画时启用'),

  ('aceternity-ui', 'Aceternity UI 组件参考', 4, 'specialty',
   E'# Aceternity UI Reference\n\nReference for animated component patterns. These are React/Tailwind components — adapt patterns to plain HTML/CSS.\n\n## Relevant Patterns\n\n### Background Effects\n- Animated gradient backgrounds\n- Grid/dot pattern backgrounds\n- Aurora/meteor/beam effects (CSS-only adaptations)\n\n### Card Effects\n- 3D card transforms with CSS perspective\n- Hover spotlight effects\n- Expandable cards\n\n### Text Effects\n- Typewriter effect (JS setInterval)\n- Gradient text (background-clip: text)\n- Staggered reveal animations\n\n### Glass Effects\nSee glassmorphism skill for detailed patterns.\n\n## Adaptation Note\nThese are React/Tailwind components. For single-file HTML tools:\n- Translate Tailwind classes to vanilla CSS\n- Replace Framer Motion with CSS transitions/animations\n- Replace React state with vanilla JS variables',
   400, '需要复杂动画/组件参考时启用');

-- ============================================================
-- 7. 种子数据：Pipelines（暂用占位 UUID，后续由 VPS 服务在首次启动时按 name 匹配补充 skill_ids）
-- ============================================================

-- tool_generation pipeline
INSERT INTO ai_pipelines (name, display_name, description, steps, model, max_tokens, temperature, retry_limit, config) VALUES
  ('tool_generation', '工具生成流水线', '用户描述需求 → 生成单文件 HTML 工具',
   '[
     {"name": "understand", "model": "claude-haiku-4-5-20251001", "max_tokens": 512, "prompt_template": "Analyze this tool request and identify: 1) Tool type/category 2) Complexity level 3) Required features 4) Best UI pattern. Request: {prompt}"},
     {"name": "generate", "model": "claude-sonnet-4-20250514", "max_tokens": 8192, "prompt_template": "Create a complete single-file HTML tool based on the requirement: {prompt}. Tool type: {toolType}. Style: {style}. Follow ALL the rules and design tokens provided in the system prompt."},
     {"name": "review", "model": "claude-haiku-4-5-20251001", "max_tokens": 1024, "prompt_template": "Review this HTML against the quality checklist: 1) Works via file:// 2) Mobile responsive 3) Error handling 4) Visual hierarchy 5) Self-explanatory UI. Output: PASS or FAIL with specific issues."}
   ]'::jsonb,
   'claude-sonnet-4-20250514', 8192, 0.7, 1,
   '{"output_format": "html", "extract_pattern": "```html\\s*([\\\\s\\\\S]*?)```"}'::jsonb
  );

-- app_factory pipeline
INSERT INTO ai_pipelines (name, display_name, description, steps, model, max_tokens, temperature, retry_limit, config) VALUES
  ('app_factory', '应用工厂流水线', '用户描述应用 → 生成 Python/HTML/Node.js 代码',
   '[
     {"name": "understand", "model": "claude-haiku-4-5-20251001", "max_tokens": 512, "prompt_template": "Analyze this app request: 1) Language 2) App type 3) Complexity 4) Required libraries. Request: {prompt}"},
     {"name": "generate", "model": "claude-sonnet-4-20250514", "max_tokens": 8192, "prompt_template": "Generate {language} code for this app: {prompt}. Follow all platform design tokens and constraints."},
     {"name": "review", "model": "claude-haiku-4-5-20251001", "max_tokens": 1024, "prompt_template": "Review this code: 1) No dangerous imports 2) Complete and runnable 3) Error handling present 4) Follows language best practices. Output: PASS or FAIL with specific issues."}
   ]'::jsonb,
   'claude-sonnet-4-20250514', 8192, 0.7, 1,
   '{"output_format": "code", "supported_languages": ["python", "html", "nodejs"]}'::jsonb
  );

-- doc_cleanup pipeline
INSERT INTO ai_pipelines (name, display_name, description, steps, model, max_tokens, temperature, retry_limit, config) VALUES
  ('doc_cleanup', '文档整理流水线', '用户粘贴 AI 文本 → 清洗排版 → 返回结构化 JSON',
   '[
     {"name": "analyze", "model": "claude-haiku-4-5-20251001", "max_tokens": 512, "prompt_template": "Analyze this text: identify structure, headings, lists, markdown artifacts. Text length: {text_length} chars."},
     {"name": "clean_and_format", "model": "claude-sonnet-4-20250514", "max_tokens": 4096, "prompt_template": "Clean and format this text according to {format} format rules. Remove all markdown symbols, normalize quotes, identify structure, output strict JSON."},
     {"name": "verify", "model": "claude-haiku-4-5-20251001", "max_tokens": 512, "prompt_template": "Verify this JSON output: 1) Valid JSON 2) All sections have required fields 3) Stats are accurate. Output: PASS or FAIL."}
   ]'::jsonb,
   'claude-sonnet-4-20250514', 4096, 0.3, 1,
   '{"output_format": "json", "extract_pattern": "\\\\{[\\\\s\\\\S]*\\\\}"}'::jsonb
  );

-- ============================================================
-- 8. RLS: 仅 service_role 可写，anon 可读
-- ============================================================
ALTER TABLE ai_skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_pipelines ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_settings ENABLE ROW LEVEL SECURITY;

-- 任何人都可以读取（前端公开信息）
CREATE POLICY "AI config is publicly readable" ON ai_skills FOR SELECT USING (true);
CREATE POLICY "AI config is publicly readable" ON ai_pipelines FOR SELECT USING (true);
CREATE POLICY "AI config is publicly readable" ON ai_settings FOR SELECT USING (true);

-- 仅 service_role 可以修改（通过 Dashboard 或 Edge Function）
CREATE POLICY "Only service_role can modify skills" ON ai_skills FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Only service_role can modify pipelines" ON ai_pipelines FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Only service_role can modify settings" ON ai_settings FOR ALL USING (auth.role() = 'service_role');
