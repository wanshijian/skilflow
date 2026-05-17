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
