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
