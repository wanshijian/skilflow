-- SkillFlow 数据库初始化迁移

-- 启用 uuid 和全文检索扩展
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- ============================================================
-- skills 表
-- ============================================================
CREATE TABLE skills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(255) NOT NULL,
  slug VARCHAR(255) UNIQUE NOT NULL,
  raw_url TEXT NOT NULL,
  github_url TEXT,
  stars INT DEFAULT 0,
  author VARCHAR(255),

  -- AI 生成字段
  short_summary TEXT,
  use_cases JSONB DEFAULT '[]',
  params JSONB DEFAULT '{}',
  code_snippet TEXT,

  -- 多维标签
  primary_category VARCHAR(50),
  sub_tags TEXT[] DEFAULT '{}',
  pricing VARCHAR(20) DEFAULT '免费',

  -- 状态与统计
  status VARCHAR(20) DEFAULT 'draft'
    CHECK (status IN ('draft', 'published', 'archived')),
  click_count INT DEFAULT 0,
  schema_json JSONB DEFAULT '{}',

  -- 全文检索向量（自动从 title, short_summary, sub_tags 生成）
  search_vector tsvector,

  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- news 表
-- ============================================================
CREATE TABLE news (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(255) NOT NULL,
  content TEXT NOT NULL,
  summary TEXT,
  source VARCHAR(255),
  source_url TEXT,
  publish_date DATE NOT NULL DEFAULT CURRENT_DATE,
  is_top3 BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- profiles 表 (关联 Supabase auth.users)
-- ============================================================
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email VARCHAR(255),
  nickname VARCHAR(100),
  avatar TEXT,
  role VARCHAR(20) DEFAULT 'user'
    CHECK (role IN ('user', 'admin')),
  wechat_openid VARCHAR(100),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 新用户注册时自动创建 profile
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, email, nickname, avatar)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    NEW.raw_user_meta_data->>'avatar_url'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ============================================================
-- feedback 表
-- ============================================================
CREATE TABLE feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  content TEXT NOT NULL,
  upvotes INT DEFAULT 0,
  target_skill_id UUID REFERENCES skills(id) ON DELETE SET NULL,
  is_wishlist BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- comments 表
-- ============================================================
CREATE TABLE comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  skill_id UUID REFERENCES skills(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- 索引
-- ============================================================
CREATE INDEX idx_skills_search ON skills USING GIN(search_vector);
CREATE INDEX idx_skills_tags ON skills USING GIN(sub_tags);
CREATE INDEX idx_skills_category ON skills(primary_category, status, pricing);
CREATE INDEX idx_skills_slug ON skills(slug);
CREATE INDEX idx_skills_status ON skills(status);
CREATE INDEX idx_skills_click_count ON skills(click_count DESC);
CREATE INDEX idx_news_publish_date ON news(publish_date DESC);
CREATE INDEX idx_news_top3 ON news(is_top3) WHERE is_top3 = true;
CREATE INDEX idx_feedback_wishlist ON feedback(is_wishlist, upvotes DESC);
CREATE INDEX idx_comments_skill_id ON comments(skill_id, created_at DESC);

-- ============================================================
-- 全文检索自动更新触发器
-- ============================================================
CREATE OR REPLACE FUNCTION update_skills_search_vector()
RETURNS TRIGGER AS $$
BEGIN
  NEW.search_vector :=
    setweight(to_tsvector('simple', COALESCE(NEW.title, '')), 'A') ||
    setweight(to_tsvector('simple', COALESCE(NEW.short_summary, '')), 'B') ||
    setweight(to_tsvector('simple', COALESCE(array_to_string(NEW.sub_tags, ' '), '')), 'C');
  NEW.updated_at := now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_skills_search_vector
  BEFORE INSERT OR UPDATE ON skills
  FOR EACH ROW EXECUTE FUNCTION update_skills_search_vector();

-- ============================================================
-- RPC 函数
-- ============================================================

-- 增加技能点击量
CREATE OR REPLACE FUNCTION increment_skill_click(skill_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE skills SET click_count = click_count + 1 WHERE id = skill_id;
END;
$$ LANGUAGE plpgsql;

-- 增加反馈点赞
CREATE OR REPLACE FUNCTION increment_feedback_upvote(feedback_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE feedback SET upvotes = upvotes + 1 WHERE id = feedback_id;
END;
$$ LANGUAGE plpgsql;

-- 获取热门标签（使用频次最高的前 N 个标签）
CREATE OR REPLACE FUNCTION get_popular_tags(limit_count INT DEFAULT 10)
RETURNS TABLE(tag TEXT, count BIGINT) AS $$
BEGIN
  RETURN QUERY
    SELECT unnest(sub_tags) AS tag, COUNT(*) AS count
    FROM skills
    WHERE status = 'published'
    GROUP BY tag
    ORDER BY count DESC
    LIMIT limit_count;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- RLS (Row Level Security) 策略
-- ============================================================
ALTER TABLE skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE news ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;

-- 已发布技能所有人可读
CREATE POLICY "Published skills are viewable by everyone"
  ON skills FOR SELECT USING (status = 'published');

-- 只有管理员可以写入 skills
CREATE POLICY "Admins can insert skills"
  ON skills FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );
CREATE POLICY "Admins can update skills"
  ON skills FOR UPDATE USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- profiles: 用户可读所有人，只能修改自己
CREATE POLICY "Profiles are viewable by everyone"
  ON profiles FOR SELECT USING (true);
CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE USING (id = auth.uid());

-- news 所有人可读
CREATE POLICY "News are viewable by everyone"
  ON news FOR SELECT USING (true);

-- feedback 所有人可读，认证用户可写
CREATE POLICY "Feedback is viewable by everyone"
  ON feedback FOR SELECT USING (true);
CREATE POLICY "Authenticated users can create feedback"
  ON feedback FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- comments 所有人可读，认证用户可写
CREATE POLICY "Comments are viewable by everyone"
  ON comments FOR SELECT USING (true);
CREATE POLICY "Authenticated users can create comments"
  ON comments FOR INSERT WITH CHECK (auth.role() = 'authenticated');
-- SkillFlow v2.0 升级迁移：应用工厂 + 配额 + 付费 + 配置
-- 前置条件: 已执行 00001_schema.sql

-- ============================================================
-- generated_apps: 用户通过 AI 生成的应用
-- ============================================================
CREATE TABLE generated_apps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  prompt TEXT NOT NULL,
  language VARCHAR(20) DEFAULT 'python'
    CHECK (language IN ('python', 'html', 'nodejs', 'shell')),
  generated_code TEXT,
  output_files TEXT[] DEFAULT '{}',
  download_url TEXT,
  status VARCHAR(20) DEFAULT 'pending'
    CHECK (status IN ('pending', 'generating', 'testing', 'completed', 'failed')),
  error_log TEXT,
  expires_at TIMESTAMPTZ DEFAULT (now() + INTERVAL '48 hours'),
  is_public BOOLEAN DEFAULT false,
  download_count INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_generated_apps_user ON generated_apps(user_id, created_at DESC);
CREATE INDEX idx_generated_apps_public ON generated_apps(is_public, created_at DESC)
  WHERE is_public = true AND status = 'completed';

-- ============================================================
-- user_quotas: 配额管理
-- ============================================================
CREATE TABLE user_quotas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE UNIQUE,
  daily_free INT DEFAULT 1,
  extra_earned INT DEFAULT 0,
  purchased INT DEFAULT 0,
  last_reset_date DATE DEFAULT CURRENT_DATE,
  is_pro BOOLEAN DEFAULT false,
  pro_expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 新用户注册时自动创建配额记录
CREATE OR REPLACE FUNCTION handle_new_user_quota()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO user_quotas (user_id) VALUES (NEW.id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_new_user_quota
  AFTER INSERT ON profiles
  FOR EACH ROW EXECUTE FUNCTION handle_new_user_quota();

-- ============================================================
-- payments: 支付记录
-- ============================================================
CREATE TABLE payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  amount DECIMAL(10,2) NOT NULL,
  type VARCHAR(30) NOT NULL
    CHECK (type IN ('single_purchase', 'pro_monthly')),
  status VARCHAR(20) DEFAULT 'pending'
    CHECK (status IN ('pending', 'paid', 'refunded', 'expired')),
  wechat_transaction_id VARCHAR(255),
  quota_added INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_payments_user ON payments(user_id, created_at DESC);

-- ============================================================
-- app_config: 动态配置
-- ============================================================
CREATE TABLE app_config (
  key VARCHAR(100) PRIMARY KEY,
  value TEXT NOT NULL,
  description TEXT,
  updated_at TIMESTAMPTZ DEFAULT now()
);

INSERT INTO app_config (key, value, description) VALUES
  ('single_pay_price', '9.9', '单次购买价格(元)'),
  ('single_pay_quota', '5', '单次购买获得的配额次数'),
  ('pro_monthly_price', '29.9', 'Pro会员月费(元)'),
  ('max_daily_free', '1', '每日免费配额'),
  ('max_daily_share_bonus', '5', '每日分享获取最大额外次数'),
  ('share_bonus_quota', '1', '每次分享获得的配额');

-- ============================================================
-- RPC 函数
-- ============================================================

-- 获取用户剩余总配额（含每日重置逻辑）
CREATE OR REPLACE FUNCTION get_user_remaining_quota(uid UUID)
RETURNS INT AS $$
DECLARE
  quota RECORD;
  total INT;
BEGIN
  SELECT * INTO quota FROM user_quotas WHERE user_id = uid;
  IF NOT FOUND THEN
    RETURN 0;
  END IF;

  -- 每日重置
  IF quota.last_reset_date < CURRENT_DATE THEN
    total := 0;
  ELSE
    total := quota.daily_free + quota.extra_earned + quota.purchased;
  END IF;

  -- Pro 会员无限
  IF quota.is_pro AND (quota.pro_expires_at IS NULL OR quota.pro_expires_at > now()) THEN
    RETURN 999;
  END IF;

  RETURN GREATEST(total, 0);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 扣减配额（事务安全，行锁防并发）
CREATE OR REPLACE FUNCTION consume_quota(uid UUID)
RETURNS BOOLEAN AS $$
DECLARE
  quota RECORD;
BEGIN
  SELECT * INTO quota FROM user_quotas WHERE user_id = uid FOR UPDATE;
  IF NOT FOUND THEN
    RETURN false;
  END IF;

  -- Pro 会员跳过扣减
  IF quota.is_pro AND (quota.pro_expires_at IS NULL OR quota.pro_expires_at > now()) THEN
    RETURN true;
  END IF;

  -- 每日重置
  IF quota.last_reset_date < CURRENT_DATE THEN
    UPDATE user_quotas SET
      daily_free = (SELECT value::int FROM app_config WHERE key = 'max_daily_free'),
      extra_earned = 0,
      last_reset_date = CURRENT_DATE
    WHERE user_id = uid;
    SELECT * INTO quota FROM user_quotas WHERE user_id = uid;
  END IF;

  -- 扣减逻辑：先扣 extra，再扣 purchased，再扣 daily
  IF quota.extra_earned > 0 THEN
    UPDATE user_quotas SET extra_earned = extra_earned - 1 WHERE user_id = uid;
  ELSIF quota.purchased > 0 THEN
    UPDATE user_quotas SET purchased = purchased - 1 WHERE user_id = uid;
  ELSIF quota.daily_free > 0 THEN
    UPDATE user_quotas SET daily_free = daily_free - 1 WHERE user_id = uid;
  ELSE
    RETURN false;
  END IF;

  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 增加分享配额
CREATE OR REPLACE FUNCTION add_share_quota(uid UUID)
RETURNS BOOLEAN AS $$
DECLARE
  max_bonus INT;
  bonus_quota INT;
  current_earned INT;
BEGIN
  SELECT value::int INTO max_bonus FROM app_config WHERE key = 'max_daily_share_bonus';
  SELECT value::int INTO bonus_quota FROM app_config WHERE key = 'share_bonus_quota';

  -- 每日重置检查
  UPDATE user_quotas SET
    daily_free = (SELECT value::int FROM app_config WHERE key = 'max_daily_free'),
    extra_earned = 0,
    last_reset_date = CURRENT_DATE
  WHERE user_id = uid AND last_reset_date < CURRENT_DATE;

  SELECT extra_earned INTO current_earned FROM user_quotas WHERE user_id = uid;
  IF NOT FOUND THEN
    INSERT INTO user_quotas (user_id, extra_earned) VALUES (uid, bonus_quota);
    RETURN true;
  END IF;

  IF current_earned >= max_bonus THEN
    RETURN false;
  END IF;

  UPDATE user_quotas SET extra_earned = extra_earned + bonus_quota WHERE user_id = uid;
  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 清理过期应用
CREATE OR REPLACE FUNCTION cleanup_expired_apps()
RETURNS INT AS $$
DECLARE
  deleted_count INT;
BEGIN
  DELETE FROM generated_apps
  WHERE expires_at < now() AND status != 'completed'
  RETURNING COUNT(*) INTO deleted_count;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- RLS 策略
-- ============================================================
ALTER TABLE generated_apps ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_quotas ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_config ENABLE ROW LEVEL SECURITY;

-- generated_apps: 自己的应用可读写，公开应用所有人可读
CREATE POLICY "Users can CRUD own apps"
  ON generated_apps FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Public apps are viewable"
  ON generated_apps FOR SELECT
  USING (is_public = true AND status = 'completed');

-- user_quotas: 只能查看自己的配额
CREATE POLICY "Users can read own quota"
  ON user_quotas FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can update own quota"
  ON user_quotas FOR UPDATE
  USING (user_id = auth.uid());

-- payments: 只能查看自己的支付记录
CREATE POLICY "Users can read own payments"
  ON payments FOR SELECT
  USING (user_id = auth.uid());

-- app_config: 所有人可读，管理员可写
CREATE POLICY "Config readable by all"
  ON app_config FOR SELECT USING (true);

CREATE POLICY "Admins can write config"
  ON app_config FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));
-- SkillFlow v3: 工具工厂 + 工具市场
-- 取代旧的 skills/news/feedback/comments 全部表

-- ============================================================
-- users (精简)
-- ============================================================
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE,
  nickname VARCHAR(100),
  avatar TEXT,
  lifetime_free_remaining INT DEFAULT 2,
  total_generated INT DEFAULT 0,
  total_downloaded INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- tools (用户生成 + 精品)
-- ============================================================
CREATE TABLE IF NOT EXISTS tools (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(255) NOT NULL,
  slug VARCHAR(255) UNIQUE NOT NULL,
  description TEXT,
  prompt TEXT NOT NULL,
  tool_type VARCHAR(30) DEFAULT 'utility',
  style VARCHAR(20) DEFAULT 'clean',
  html_code TEXT NOT NULL,
  screenshot_url TEXT,
  download_count INT DEFAULT 0,
  view_count INT DEFAULT 0,
  is_premium BOOLEAN DEFAULT false,
  premium_price DECIMAL(10,2),
  user_id UUID REFERENCES users(id),
  retry_count INT DEFAULT 0,
  status VARCHAR(20) DEFAULT 'published',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_tools_type ON tools(tool_type, status);
CREATE INDEX idx_tools_premium ON tools(is_premium) WHERE is_premium = true;
CREATE INDEX idx_tools_download ON tools(download_count DESC);
CREATE INDEX idx_tools_created ON tools(created_at DESC);
CREATE INDEX idx_tools_slug ON tools(slug);

-- ============================================================
-- downloads
-- ============================================================
CREATE TABLE IF NOT EXISTS downloads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tool_id UUID REFERENCES tools(id),
  user_id UUID REFERENCES users(id),
  method VARCHAR(20) NOT NULL, -- free / share / paid
  ip_address VARCHAR(45),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_downloads_tool ON downloads(tool_id, created_at DESC);
CREATE INDEX idx_downloads_user ON downloads(user_id, created_at DESC);

-- ============================================================
-- custom_requests (定制开发线索)
-- ============================================================
CREATE TABLE IF NOT EXISTS custom_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  description TEXT NOT NULL,
  contact VARCHAR(100),
  status VARCHAR(20) DEFAULT 'new',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- share_tracking (分享追踪)
-- ============================================================
CREATE TABLE IF NOT EXISTS share_tracking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tool_id UUID REFERENCES tools(id),
  sharer_user_id UUID REFERENCES users(id),
  visitor_ip VARCHAR(45),
  visitor_ua TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- RPC Functions
-- ============================================================

-- 扣减免费额度
CREATE OR REPLACE FUNCTION consume_free_quota(uid UUID)
RETURNS BOOLEAN AS $$
DECLARE
  remaining INT;
BEGIN
  SELECT lifetime_free_remaining INTO remaining FROM users WHERE id = uid FOR UPDATE;
  IF NOT FOUND OR remaining IS NULL OR remaining <= 0 THEN
    RETURN false;
  END IF;
  UPDATE users SET lifetime_free_remaining = remaining - 1 WHERE id = uid;
  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 记录分享解锁
CREATE OR REPLACE FUNCTION record_share_unlock(
  sharer_uid UUID,
  tool_uid UUID,
  visitor_ip_addr VARCHAR(45),
  visitor_ua_text TEXT
) RETURNS BOOLEAN AS $$
BEGIN
  INSERT INTO share_tracking (tool_id, sharer_user_id, visitor_ip, visitor_ua)
  VALUES (tool_uid, sharer_uid, visitor_ip_addr, visitor_ua_text);
  RETURN true;
END;
$$ LANGUAGE plpgsql;

-- 增加下载计数
CREATE OR REPLACE FUNCTION increment_tool_download(tool_uid UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE tools SET download_count = download_count + 1 WHERE id = tool_uid;
END;
$$ LANGUAGE plpgsql;

-- 增量工具浏览量
CREATE OR REPLACE FUNCTION increment_tool_view(tool_uid UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE tools SET view_count = COALESCE(view_count, 0) + 1 WHERE id = tool_uid;
END;
$$ LANGUAGE plpgsql;

-- 热门标签（分析高频 tool_type）
CREATE OR REPLACE FUNCTION get_popular_tags(limit_count INT DEFAULT 8)
RETURNS TABLE(tag TEXT, count BIGINT) AS $$
BEGIN
  RETURN QUERY
    SELECT tool_type AS tag, COUNT(*) AS count
    FROM tools WHERE status = 'published'
    GROUP BY tool_type ORDER BY count DESC LIMIT limit_count;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- RLS
-- ============================================================
ALTER TABLE tools ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE downloads ENABLE ROW LEVEL SECURITY;
ALTER TABLE custom_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tools are viewable by everyone" ON tools FOR SELECT USING (status = 'published');
CREATE POLICY "Users can insert own tools" ON tools FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can read own data" ON users FOR SELECT USING (id = auth.uid());
CREATE POLICY "Users can update own data" ON users FOR UPDATE USING (id = auth.uid());
CREATE POLICY "Users can read own downloads" ON downloads FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Anyone can insert downloads" ON downloads FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can insert custom requests" ON custom_requests FOR INSERT WITH CHECK (true);

-- ============================================================
-- Seed: 精品区示例工具
-- ============================================================
INSERT INTO tools (title, slug, description, prompt, tool_type, html_code, is_premium, premium_price, status) VALUES
(
  'Word 转 PDF',
  'word-to-pdf-pro',
  '拖拽上传 Word 文档，一键导出高质量 PDF，支持预览和页面选择',
  'Word to PDF converter',
  'converter',
  '<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Word 转 PDF</title><script src="https://cdn.jsdelivr.net/npm/mammoth@1.6.0/mammoth.browser.min.js"></script><style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:system-ui,sans-serif;background:#f5f5f7;min-height:100vh;display:flex;flex-direction:column;align-items:center;padding:20px}.container{max-width:640px;width:100%;background:#fff;border-radius:16px;padding:32px;box-shadow:0 2px 12px rgba(0,0,0,.08)}h1{font-size:24px;margin-bottom:8px;color:#1a1a1a}p{color:#666;margin-bottom:24px}.dropzone{border:2px dashed #ccc;border-radius:12px;padding:48px 24px;text-align:center;transition:border-color .2s}.dropzone:hover,.dropzone.active{border-color:#007aff;background:#f0f7ff}.dropzone input{display:none}.dropzone label{font-size:16px;color:#007aff;cursor:pointer}#result{margin-top:24px;padding:16px;background:#f5f5f7;border-radius:8px;max-height:400px;overflow:auto;display:none}#preview{max-height:500px;overflow:auto;border:1px solid #e5e5ea;border-radius:8px;padding:24px;margin-top:16px;display:none}.btn{display:inline-flex;align-items:center;gap:8px;padding:12px 24px;background:#007aff;color:#fff;border:none;border-radius:8px;font-size:16px;cursor:pointer;margin-top:16px}.btn:hover{opacity:.9}</style></head><body><div class="container"><h1>📄 Word 转 PDF</h1><p>拖拽 Word 文件或点击下方区域上传。支持 .docx 格式。</p><div class="dropzone" id="dropzone"><input type="file" id="fileInput" accept=".docx"><label for="fileInput">点击选择文件 或拖拽到此处</label></div><div id="preview"></div><div id="result"></div><button class="btn" onclick="window.print()" style="display:none" id="printBtn">🖨️ 导出 PDF</button></div><script>const dz=document.getElementById("dropzone");const fi=document.getElementById("fileInput");const preview=document.getElementById("preview");const result=document.getElementById("result");const printBtn=document.getElementById("printBtn");dz.addEventListener("dragover",e=>{e.preventDefault();dz.classList.add("active")});dz.addEventListener("dragleave",()=>dz.classList.remove("active"));dz.addEventListener("drop",e=>{e.preventDefault();dz.classList.remove("active");handleFile(e.dataTransfer.files[0])});fi.addEventListener("change",e=>handleFile(e.target.files[0]));function handleFile(file){if(!file||!file.name.endsWith(".docx")){result.style.display="block";result.innerHTML="❌ 请上传 .docx 格式文件";return}result.style.display="block";result.innerHTML="⏳ 正在转换…";const reader=new FileReader();reader.onload=function(e){const arrayBuffer=e.target.result;mammoth.convertToHtml({arrayBuffer}).then(function(r){preview.innerHTML=r.value;preview.style.display="block";result.style.display="none";printBtn.style.display="inline-flex"}).catch(function(){result.innerHTML="❌ 转换失败，请检查文件是否正确"})};reader.readAsArrayBuffer(file)}</script></body></html>',
  true, 19.9, 'published'
);
-- SkillFlow: 文档整理模块
-- 格式配置表 + 用户配额扩展 + 处理记录

-- ============================================================
-- doc_formats: 文档格式配置（后端控制，不改前端）
-- ============================================================
CREATE TABLE IF NOT EXISTS doc_formats (
  id SERIAL PRIMARY KEY,
  key VARCHAR(50) UNIQUE NOT NULL,
  name VARCHAR(100) NOT NULL,
  prompt_template TEXT NOT NULL,
  active BOOLEAN DEFAULT true,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 初始插入：普通文档
INSERT INTO doc_formats (key, name, prompt_template, sort_order) VALUES
('normal', '普通文档', '清洗 Markdown 符号，识别标题/段落层次，生成格式清晰的文档。', 1);

-- ============================================================
-- 用户表扩展示例（如果 users 表已存在，用 ALTER）
-- ============================================================
-- ALTER TABLE users ADD COLUMN IF NOT EXISTS doc_lifetime_free INT DEFAULT 1;
-- ALTER TABLE users ADD COLUMN IF NOT EXISTS doc_used INT DEFAULT 0;

-- ============================================================
-- doc_records: 文档处理记录
-- ============================================================
CREATE TABLE IF NOT EXISTS doc_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  original_text_length INT,
  format VARCHAR(50),
  result_json TEXT,
  download_method VARCHAR(20),  -- free / share / paid
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_doc_records_user ON doc_records(user_id, created_at DESC);

-- ============================================================
-- RLS
-- ============================================================
ALTER TABLE doc_formats ENABLE ROW LEVEL SECURITY;
ALTER TABLE doc_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Formats readable by all" ON doc_formats FOR SELECT USING (active = true);
CREATE POLICY "Users can insert own records" ON doc_records FOR INSERT WITH CHECK (true);
