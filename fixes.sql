-- === SkillFlow 生产修复 ===
-- 在 Supabase SQL Editor 中运行此文件

-- 1. 修复新用户注册：使用 GitHub 用户名作为昵称
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, nickname, avatar)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(
      NEW.raw_user_meta_data->>'user_name',
      NEW.raw_user_meta_data->>'full_name',
      NEW.raw_user_meta_data->>'name',
      NEW.email
    ),
    COALESCE(NEW.raw_user_meta_data->>'avatar_url', '')
  )
  ON CONFLICT (id) DO UPDATE SET
    nickname = COALESCE(
      NEW.raw_user_meta_data->>'user_name',
      NEW.raw_user_meta_data->>'full_name',
      NEW.raw_user_meta_data->>'name',
      profiles.nickname
    ),
    avatar = COALESCE(NEW.raw_user_meta_data->>'avatar_url', profiles.avatar);
  RETURN NEW;
END;
$$;

-- 2. 同步 auth.users 到 public.users (v3)
CREATE OR REPLACE FUNCTION public.sync_auth_user_to_public()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.users (id, email, nickname, avatar, created_at)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(
      NEW.raw_user_meta_data->>'user_name',
      NEW.raw_user_meta_data->>'full_name',
      NEW.raw_user_meta_data->>'name',
      NEW.email
    ),
    COALESCE(NEW.raw_user_meta_data->>'avatar_url', ''),
    now()
  )
  ON CONFLICT (id) DO UPDATE SET email = EXCLUDED.email;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_auth_user ON auth.users;
CREATE TRIGGER trg_sync_auth_user
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.sync_auth_user_to_public();

-- 3. 同步已有用户数据
INSERT INTO public.users (id, email, nickname, avatar, created_at)
SELECT
  p.id, p.email, p.nickname, p.avatar, COALESCE(p.created_at, now())
FROM public.profiles p
LEFT JOIN public.users u ON p.id = u.id
WHERE u.id IS NULL;

-- 4. 修复 quota 触发器
CREATE OR REPLACE FUNCTION public.handle_new_user_quota()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.user_quotas (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

-- 5. 补充已有 profile 的 quota
INSERT INTO public.user_quotas (user_id)
SELECT p.id FROM public.profiles p
LEFT JOIN public.user_quotas q ON p.id = q.user_id
WHERE q.user_id IS NULL;
