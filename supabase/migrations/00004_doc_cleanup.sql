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
