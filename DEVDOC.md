# SkillFlow v3 开发文档

> 最后更新：2026-05-10

## 一、产品定位

**AI 小工具工厂** — 用户用自然语言描述需求，AI 生成单文件 HTML 工具，双击浏览器即用。

### 核心功能
1. **应用工厂**：结构化表单 → Claude 生成 HTML → 沙箱验证 → 下载
2. **工具市场**：用户生成的工具自动上架，供浏览和下载
3. **精品区**：官方打磨工具，独立定价 ¥19.9–49.9
4. **定制开发**：加微信线下接单

### 三条收入线
- 自助生成：终生 2 次免费，之后 ¥6.99/次 或 分享 +1
- 精品区：¥19.9–49.9/个
- 定制开发：¥500–5000/单（线下）

---

## 二、技术栈

| 层 | 技术 |
|---|------|
| 前端 | Taro 3 (React) + TypeScript |
| 后端 | Supabase (PostgreSQL + Auth + Storage + Edge Functions) |
| AI | Claude API（开发阶段）/ Claude Code on VPS（部署后） |
| 沙箱 | Docker + Playwright |
| 支付 | 微信支付（小程序端） |
| 部署 | Vercel (H5) + 微信小程序 |

---

## 三、页面结构

共 6 页，无 TabBar（用自定义导航）：

| 页面 | 路由 | 功能 |
|------|------|------|
| 首页 | `pages/index/index` | 输入框 + 类型/风格选择 + 示例 |
| 生成页 | `pages/generate/index` | 流式代码输出 + iframe 预览 + 下载门 |
| 工具详情 | `pages/tool/detail` | 在线试用 + 下载（分享/付费） |
| 工具市场 | `pages/market/index` | 搜索 + 分类 + 排行榜 |
| 精品区 | `pages/premium/index` | 官方打磨工具，独立定价 |
| 我的 | `pages/my/index` | 配额 + 生成记录 + 下载记录 |

### 导航方式
- **桌面端 (>768px)**：顶部 Header 导航（64px 高，毛玻璃）
- **手机端 (<768px)**：底部 MobileNav（56px 高，毛玻璃）

---

## 四、UI 设计规范（SaaS 极简主义）

### 全局
- 字体：`Inter, system-ui, -apple-system, sans-serif`
- 背景：`#0F172A`（午夜蓝，参考 Antigravity——不是纯黑）
- 抗锯齿：`-webkit-font-smoothing: antialiased`

### 导航栏
- 高度：64px
- 背景：`rgba(0,0,0,0.5)` + `backdrop-filter: blur(12px)`
- 底部边框：`1px solid rgba(255,255,255,0.05)`
- Logo：15px font-weight 700
- 链接：13px `color: rgba(255,255,255,0.5)`，hover 变白

### 页面容器
- 桌面：`max-width: 768px; margin: 0 auto; padding: 80px 24px 0`
- 手机：`padding: 0 16px`

### 卡片
- 背景：`#1E293B`（slate-800，参考 Antigravity——有蓝色暖意）
- 圆角：16px
- 边框：`1px solid #1E293B`
- Hover：边框变 `#334155`

### 输入框
- 无边框，透明背景
- Placeholder：`color: #94A3B8; font-size: 16px`

### 标签 / 分类按钮
- 背景：`rgba(255,255,255,0.05)`
- 圆角：8px
- 字号：12px
- 激活态：`rgba(255,255,255,0.1)` + 文字变白

### 主按钮
- 背景：`linear-gradient(135deg, #ea580c, #f97316)`
- 圆角：12px (`rounded-xl`)
- 外发光：`box-shadow: 0 4px 20px rgba(249,115,22,0.2)`
- 字号：16px font-weight 600

### 底部导航（仅手机端）
- 高度：56px
- 背景：`rgba(0,0,0,0.7)` + `backdrop-filter: blur(12px)`
- 顶部边框：`1px solid rgba(255,255,255,0.05)`
- 桌面端：`display: none`

---

## 五、数据库设计

```sql
-- users
CREATE TABLE users (
  id UUID PRIMARY KEY,
  email VARCHAR(255),
  nickname VARCHAR(100),
  avatar TEXT,
  lifetime_free_remaining INT DEFAULT 2,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- tools
CREATE TABLE tools (
  id UUID PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  slug VARCHAR(255) UNIQUE NOT NULL,
  description TEXT,
  prompt TEXT NOT NULL,
  tool_type VARCHAR(30),
  style VARCHAR(20),
  html_code TEXT NOT NULL,
  download_count INT DEFAULT 0,
  is_premium BOOLEAN DEFAULT false,
  premium_price DECIMAL(10,2),
  user_id UUID REFERENCES users(id),
  status VARCHAR(20) DEFAULT 'published',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- downloads
CREATE TABLE downloads (
  id UUID PRIMARY KEY,
  tool_id UUID REFERENCES tools(id),
  user_id UUID REFERENCES users(id),
  method VARCHAR(20), -- free / share / paid
  created_at TIMESTAMPTZ DEFAULT now()
);

-- custom_requests
CREATE TABLE custom_requests (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  description TEXT NOT NULL,
  contact VARCHAR(100),
  status VARCHAR(20) DEFAULT 'new',
  created_at TIMESTAMPTZ DEFAULT now()
);
```

---

## 六、组件树

```
App
├── Header (桌面端顶部导航)
│   ├── Logo: "SkillFlow"
│   └── NavLinks: 生成 | 市场 | 精品 | 我的
├── Layout
│   ├── Header
│   ├── Page Content
│   └── MobileNav (手机端底部导航)
├── Pages
│   ├── IndexPage (首页)
│   │   ├── Hero (标题 + 副标题)
│   │   ├── InputCard (输入框 + 类型选择 + 风格选择)
│   │   ├── GenerateButton
│   │   ├── Examples (示例列表)
│   │   └── MarketEntry (跳转市场卡片)
│   ├── GeneratePage (生成页)
│   │   ├── GeneratingView (流式代码 + 阶段提示)
│   │   └── PreviewView (iframe + 代码 + 下载门 + 重试)
│   ├── ToolDetailPage (工具详情)
│   │   ├── ToolMeta (标题 + 类型 + 下载量)
│   │   ├── Preview (iframe 在线试用)
│   │   ├── DownloadGate (分享/付费)
│   │   └── CustomCTA (定制开发入口)
│   ├── MarketPage (工具市场)
│   │   ├── SearchBox
│   │   ├── CategoryBar
│   │   ├── SortBar
│   │   ├── ToolGrid (ToolCard 列表)
│   │   └── CustomEntry (定制入口)
│   ├── PremiumPage (精品区)
│   │   ├── PremiumHeader
│   │   ├── ToolGrid
│   │   └── CustomCTA
│   └── MyPage (我的)
│       ├── UserCard
│       ├── QuotaCard
│       ├── MenuList
│       └── DownloadHistory
├── Components
│   ├── ToolCard (工具卡片)
│   ├── SearchBox (搜索框)
│   └── Icon (SVG 图标)
└── Stores
    ├── toolStore (工具 + 生成状态)
    └── authStore (认证状态)
```

---

## 七、Edge Functions

| 函数 | 用途 |
|------|------|
| `code-gen` | Claude API 代码生成（开发）/ 转发 VPS（部署） |
| `quota-handler` | 配额检查、扣减、分享解锁、付费记录 |
| `wechat-pay` | 微信支付下单 + 回调（部署后接） |

---

## 八、开发阶段

### Phase 1：全功能 H5 版本（当前）
- 6 个页面前端完整实现
- Claude API 直连生成代码
- Docker 沙箱本地验证
- 配额逻辑 mock 化
- 无需 VPS、无需小程序许可

### Phase 2：部署准备
- 购买 VPS，部署 Claude Code + skills
- 申请微信小程序 AppID + 支付商户号
- 配置域名 + 备案
- 切 code-gen 从 Claude API → VPS Claude Code

### Phase 3：上线运营
- 精品区内容填充
- 定制开发微信对接
- 数据分析 + 迭代

---

## 九、适配策略（参考 CLAUDE.md）

### 跨平台（Taro 双端编译）
- H5 端 + 小程序端用同一套 Taro 代码
- 平台差异用条件编译：`// #ifdef WEAPP` / `// #ifdef H5`
- 样式使用 px 单位，Taro 自动转 rpx 适配小程序
- API 安全：所有外部调用通过 Supabase Edge Functions 中转

### 响应式（桌面 + 手机）
- 移动优先：基础样式为手机端（375-480px），桌面端通过 `@media (min-width: 768px)` 叠加
- 桌面容器：`max-width: 768px; margin: 0 auto` 居中
- 手机容器：全宽 + 16px 内边距
- 导航自适应：桌面端顶部 Header + 手机端底部 MobileNav

---

## 十、已安装 UI 技能（开发前必须读取）

项目 `.claude/skills/` 下有 8 个 UI 相关技能，开发前应先读取其规范：

| 技能 | 来源 | 用途 |
|------|------|------|
| `frontend-design` | anthropics/skills | 避免 AI slop，创造有辨识度的前端 |
| `web-design-guidelines` | vercel-labs | Web 界面规范审计 |
| `creative-frontend-aesthetics` | seika139 | 避免通用字体和配色 |
| `ui-design-aesthetics` | nickcrew | 高性能 UI + 渐进展示 |
| `aceternity-ui` | secondsky | 100+ 动画组件（Next.js/Tailwind） |
| `glassmorphism` | ainergiz | 毛玻璃效果规范 |
| `elegance-sophistication` | dylantarre | 优雅动画原则（300-500ms） |
| `tool-generator` | 自定义 | 单文件 HTML 工具生成规范 |
| `suggest-lucide-icons` | nweii | Lucide 图标推荐 |

**每次 UI 任务前**：先 `Read` 相关技能文件，再编码。

---

## 十一、关键设计决策

1. **交付格式**：仅单文件 HTML。全平台零依赖，双击即用。
2. **不做 Tailwind**：Taro 小程序不兼容。所有 Tailwind 规范翻译为 SCSS。
3. **不做纯黑背景**：始终 `#09090b`（有微弱暖意）。
4. **不做 TabBar**：Taro TabBar 桌面端无法隐藏。用自定义 Header(桌面) + MobileNav(手机) 替代。
5. **移动优先**：手机端为基础，桌面端通过 `@media (min-width: 768px)` 覆盖。
6. **生成保障**：不满意引导重试（不扣额度），沙箱验证失败自动修复。
