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
