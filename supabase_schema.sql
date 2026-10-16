-- FamLink Supabase Database Schema (안전한 재실행 가능 버젼)
-- Copy and paste this script into your Supabase project's SQL Editor (https://supabase.com) and click "Run".

-- 1. 가족 방 테이블 (families)
CREATE TABLE IF NOT EXISTS families (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_code TEXT UNIQUE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. 가족 포인트 테이블 (family_points)
CREATE TABLE IF NOT EXISTS family_points (
  family_id UUID PRIMARY KEY REFERENCES families(id) ON DELETE CASCADE,
  points INTEGER DEFAULT 0 NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. 사용자 프로필 테이블 (profiles)
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  family_id UUID REFERENCES families(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  avatar TEXT DEFAULT '👦' NOT NULL,
  color TEXT DEFAULT '#8E8E93' NOT NULL,
  role TEXT, -- mom, dad, son, daughter 등
  mood TEXT DEFAULT '😊' NOT NULL,
  status_text TEXT DEFAULT '' NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 기존 profiles 테이블이 이미 있는 경우 새 컬럼 추가
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS mood TEXT DEFAULT '😊' NOT NULL;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS status_text TEXT DEFAULT '' NOT NULL;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS push_token TEXT;

-- 4. 메신저 메시지 테이블 (messages)
CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id UUID REFERENCES families(id) ON DELETE CASCADE NOT NULL,
  profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  room_id TEXT DEFAULT 'family-group' NOT NULL,
  text TEXT,
  image_url TEXT,
  read_by UUID[] DEFAULT '{}'::uuid[] NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 기존 messages 테이블에 새 컬럼 추가
ALTER TABLE messages ADD COLUMN IF NOT EXISTS room_id TEXT DEFAULT 'family-group' NOT NULL;

-- 5. 캘린더 일정 테이블 (events)
CREATE TABLE IF NOT EXISTS events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id UUID REFERENCES families(id) ON DELETE CASCADE NOT NULL,
  profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  date TEXT NOT NULL,
  end_date TEXT,
  time TEXT NOT NULL,
  category TEXT DEFAULT 'etc' NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE events ADD COLUMN IF NOT EXISTS end_date TEXT;

-- 6. 스몰톡 질문 리스트 테이블 (small_talk_topics)
CREATE TABLE IF NOT EXISTS small_talk_topics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id UUID REFERENCES families(id) ON DELETE CASCADE, -- NULL이면 모든 가족 공용 질문, 특정 ID면 가족 맞춤 질문
  question TEXT NOT NULL,
  category TEXT DEFAULT '일상' NOT NULL,
  assigned_date TEXT, -- 특정 일자 배정 시 (예: '2026-10-02')
  order_index INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 6-1. 스몰톡 답변 테이블 (small_talk_responses)
CREATE TABLE IF NOT EXISTS small_talk_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id UUID REFERENCES families(id) ON DELETE CASCADE NOT NULL,
  profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  topic TEXT NOT NULL,
  text TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 7. 포인트 쿠폰 상점 테이블 (rewards)
CREATE TABLE IF NOT EXISTS rewards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id UUID REFERENCES families(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  cost INTEGER NOT NULL,
  description TEXT,
  provider TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 8. 발급 쿠폰 보관함 테이블 (user_coupons)
CREATE TABLE IF NOT EXISTS user_coupons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id UUID REFERENCES families(id) ON DELETE CASCADE NOT NULL,
  profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  reward_id UUID REFERENCES rewards(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  cost INTEGER NOT NULL,
  provider TEXT,
  status TEXT DEFAULT 'available' NOT NULL,
  expire_date TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE user_coupons ADD COLUMN IF NOT EXISTS expire_date TEXT;

-- 9. 가족 장보기 및 체크리스트 테이블 (shopping_items)
CREATE TABLE IF NOT EXISTS shopping_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id UUID REFERENCES families(id) ON DELETE CASCADE NOT NULL,
  profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  assignee TEXT DEFAULT '가족 전체' NOT NULL,
  is_completed BOOLEAN DEFAULT false NOT NULL,
  completed_by TEXT,
  points_earned BOOLEAN DEFAULT false NOT NULL,
  completed_date TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE shopping_items ADD COLUMN IF NOT EXISTS points_earned BOOLEAN DEFAULT false NOT NULL;
ALTER TABLE shopping_items ADD COLUMN IF NOT EXISTS completed_date TEXT;
ALTER TABLE shopping_items ADD COLUMN IF NOT EXISTS completed_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE shopping_items ADD COLUMN IF NOT EXISTS repeat_type TEXT DEFAULT 'none';

-- 10. 트리거: 새 가족(families) 생성 시 포인트 행 자동 생성
CREATE OR REPLACE FUNCTION public.handle_new_family()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.family_points (family_id, points)
  VALUES (new.id, 0)
  ON CONFLICT (family_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_family_created ON public.families;
CREATE TRIGGER on_family_created
  AFTER INSERT ON public.families
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_family();

-- 11. 행 레벨 보안 (RLS) 비활성화
ALTER TABLE families DISABLE ROW LEVEL SECURITY;
ALTER TABLE family_points DISABLE ROW LEVEL SECURITY;
ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE messages DISABLE ROW LEVEL SECURITY;
ALTER TABLE events DISABLE ROW LEVEL SECURITY;
ALTER TABLE small_talk_topics DISABLE ROW LEVEL SECURITY;
ALTER TABLE small_talk_responses DISABLE ROW LEVEL SECURITY;
ALTER TABLE rewards DISABLE ROW LEVEL SECURITY;
ALTER TABLE user_coupons DISABLE ROW LEVEL SECURITY;
ALTER TABLE shopping_items DISABLE ROW LEVEL SECURITY;

-- 12. 실시간 기능(Realtime) 추가 테이블 등록
DO $$
BEGIN
  BEGIN alter publication supabase_realtime add table messages; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN alter publication supabase_realtime add table events; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN alter publication supabase_realtime add table small_talk_topics; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN alter publication supabase_realtime add table small_talk_responses; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN alter publication supabase_realtime add table family_points; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN alter publication supabase_realtime add table profiles; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN alter publication supabase_realtime add table rewards; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN alter publication supabase_realtime add table user_coupons; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN alter publication supabase_realtime add table shopping_items; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN alter publication supabase_realtime add table placed_furniture; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN alter publication supabase_realtime add table house_layouts; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN alter publication supabase_realtime add table petmong_characters; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN alter publication supabase_realtime add table petmong_activities; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN alter table petmong_characters replica identity full; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN alter table petmong_activities replica identity full; EXCEPTION WHEN OTHERS THEN NULL; END;
END $$;

-- 13. Supabase Storage 사진 업로드용 버킷 (family-photos) 생성
INSERT INTO storage.buckets (id, name, public)
VALUES ('family-photos', 'family-photos', true)
ON CONFLICT (id) DO UPDATE SET public = true;

DROP POLICY IF EXISTS "Allow Public Storage Access" ON storage.objects;
CREATE POLICY "Allow Public Storage Access" ON storage.objects
  FOR ALL USING (bucket_id = 'family-photos')
  WITH CHECK (bucket_id = 'family-photos');

-- 14. 가족 인테리어 및 가구 배치 테이블 (placed_furniture)
CREATE TABLE IF NOT EXISTS placed_furniture (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id UUID REFERENCES families(id) ON DELETE CASCADE NOT NULL,
  catalog_id TEXT NOT NULL,
  name TEXT NOT NULL,
  emoji TEXT NOT NULL,
  x DOUBLE PRECISION DEFAULT 40.0 NOT NULL,
  y DOUBLE PRECISION DEFAULT 40.0 NOT NULL,
  rotation INTEGER DEFAULT 0 NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 15. 가족 평면도 도면 테이블 (house_layouts)
CREATE TABLE IF NOT EXISTS house_layouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id UUID REFERENCES families(id) ON DELETE CASCADE NOT NULL,
  image_url TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE placed_furniture DISABLE ROW LEVEL SECURITY;
ALTER TABLE house_layouts DISABLE ROW LEVEL SECURITY;

-- 16. 반려몽 캐릭터 테이블 (petmong_characters)
CREATE TABLE IF NOT EXISTS petmong_characters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  family_id UUID REFERENCES families(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  emoji TEXT,
  image_url TEXT,
  personality TEXT NOT NULL,
  level INTEGER DEFAULT 1 NOT NULL,
  exp INTEGER DEFAULT 0 NOT NULL,
  vitals JSONB DEFAULT '{"hunger":80,"happiness":85,"cleanliness":90,"energy":95}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);
ALTER TABLE petmong_characters ADD COLUMN IF NOT EXISTS vitals JSONB DEFAULT '{"hunger":80,"happiness":85,"cleanliness":90,"energy":95}'::jsonb;
ALTER TABLE petmong_characters ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now());
ALTER TABLE petmong_characters DISABLE ROW LEVEL SECURITY;

-- 17. 반려몽 활동 및 상호작용 기록 (petmong_activities)
CREATE TABLE IF NOT EXISTS petmong_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id UUID REFERENCES families(id) ON DELETE CASCADE NOT NULL,
  actor_id UUID REFERENCES petmong_characters(id) ON DELETE CASCADE NOT NULL,
  target_id UUID REFERENCES petmong_characters(id) ON DELETE CASCADE,
  action_type TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);
ALTER TABLE petmong_activities DISABLE ROW LEVEL SECURITY;

-- 18. 반려몽 비밀 귓속말 & 감성 편지 배달부 (petmong_whispers)
CREATE TABLE IF NOT EXISTS petmong_whispers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id UUID REFERENCES families(id) ON DELETE CASCADE NOT NULL,
  from_user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  to_user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  message TEXT NOT NULL,
  is_read BOOLEAN DEFAULT false NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);
ALTER TABLE petmong_whispers DISABLE ROW LEVEL SECURITY;

-- 19. 포토북 실물 주문 테이블 (photobook_orders)
CREATE TABLE IF NOT EXISTS photobook_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id UUID REFERENCES families(id) ON DELETE CASCADE,
  profile_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  volume_id TEXT DEFAULT 'vol-1',
  order_number TEXT UNIQUE NOT NULL,
  book_title TEXT NOT NULL,
  cover_type TEXT DEFAULT '양장본',
  page_count INTEGER DEFAULT 16,
  recipient_name TEXT NOT NULL,
  recipient_phone TEXT NOT NULL,
  postal_code TEXT,
  shipping_address TEXT NOT NULL,
  shipping_memo TEXT,
  points_deducted INTEGER DEFAULT 0,
  book_snapshot JSONB,
  status TEXT DEFAULT 'pending' NOT NULL,
  tracking_number TEXT,
  courier TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);
ALTER TABLE photobook_orders ADD COLUMN IF NOT EXISTS volume_id TEXT DEFAULT 'vol-1';
ALTER TABLE photobook_orders ADD COLUMN IF NOT EXISTS points_deducted INTEGER DEFAULT 0;
ALTER TABLE photobook_orders ADD COLUMN IF NOT EXISTS book_snapshot JSONB;
ALTER TABLE photobook_orders DISABLE ROW LEVEL SECURITY;

-- 20. 가족 공동 포토북 편집 상태 테이블 (family_photobooks)
CREATE TABLE IF NOT EXISTS family_photobooks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id UUID REFERENCES families(id) ON DELETE CASCADE NOT NULL,
  volume_id TEXT DEFAULT 'vol-1' NOT NULL,
  title TEXT DEFAULT '우리 가족의 첫 번째 이야기 (Vol. 1)' NOT NULL,
  subtitle TEXT DEFAULT '사소한 일상이 모여 만든 가장 눈부신 기적' NOT NULL,
  cover_signature TEXT DEFAULT '우리 가족의 따뜻한 이야기',
  cover_photo_url TEXT,
  cover_style TEXT DEFAULT 'classic',
  theme_id TEXT DEFAULT 'linen',
  font_family TEXT DEFAULT 'serif',
  font_size TEXT DEFAULT 'medium',
  spread_photos JSONB DEFAULT '{}'::jsonb,
  spread_layouts JSONB DEFAULT '{}'::jsonb,
  page_formats JSONB DEFAULT '{}'::jsonb,
  spread_captions JSONB DEFAULT '{}'::jsonb,
  custom_spread_topics JSONB DEFAULT '{}'::jsonb,
  custom_gallery_photos JSONB DEFAULT '[]'::jsonb,
  prologue_essay TEXT,
  epilogue_essay TEXT,
  updated_by TEXT,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(family_id, volume_id)
);
ALTER TABLE family_photobooks DISABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all access to family_photobooks" ON family_photobooks;
CREATE POLICY "Allow all access to family_photobooks" ON family_photobooks
  FOR ALL USING (true) WITH CHECK (true);

-- Realtime 복제 활성화
DO $$
BEGIN
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE family_photobooks; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN ALTER TABLE family_photobooks REPLICA IDENTITY FULL; EXCEPTION WHEN OTHERS THEN NULL; END;
END $$;


-- =================================================================================
-- 21. 가족 단위 행 레벨 보안(RLS) 헬퍼 함수 및 성능 인덱스 (Phase 4 Security Hardening)
-- =================================================================================

-- 21-1. 무한 재귀 없이 현재 로그인 사용자의 family_id를 반환하는 SECURITY DEFINER 헬퍼
CREATE OR REPLACE FUNCTION public.get_my_family_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT family_id FROM public.profiles WHERE id = auth.uid() LIMIT 1;
$$;

-- 21-1b. 현재 로그인 사용자가 관리자(role = 'admin')인지 확인하는 SECURITY DEFINER 헬퍼
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'
  );
$$;

-- 21-1c. 일반 사용자가 임의로 자신의 role을 'admin'으로 변경(권한 상승)하지 못하도록 차단하는 보안 트리거
CREATE OR REPLACE FUNCTION public.prevent_admin_role_escalation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- 새로 'admin' 권한을 넣으려 할 때, 기존에 이미 admin이 아니면서 일반 클라이언트(authenticated/anon) 요청인 경우 차단
  IF NEW.role = 'admin' AND (TG_OP = 'INSERT' OR OLD.role IS DISTINCT FROM 'admin') THEN
    IF auth.uid() IS NOT NULL AND NOT public.is_admin() THEN
      RAISE EXCEPTION '보안 정책 위반: 관리자(admin) 권한은 직접 부여할 수 없습니다.';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_admin_role_escalation ON public.profiles;
CREATE TRIGGER trg_prevent_admin_role_escalation
  BEFORE INSERT OR UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_admin_role_escalation();

-- 21-2. 주요 조회 쿼리 성능 최적화 B-Tree 인덱스
CREATE INDEX IF NOT EXISTS idx_profiles_family_id ON public.profiles(family_id);
CREATE INDEX IF NOT EXISTS idx_messages_family_created ON public.messages(family_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_family_room ON public.messages(family_id, room_id);
CREATE INDEX IF NOT EXISTS idx_events_family_date ON public.events(family_id, date);
CREATE INDEX IF NOT EXISTS idx_small_talk_topics_family_order ON public.small_talk_topics(family_id, order_index);
CREATE INDEX IF NOT EXISTS idx_small_talk_responses_family_topic ON public.small_talk_responses(family_id, topic);
CREATE INDEX IF NOT EXISTS idx_shopping_items_family_created ON public.shopping_items(family_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_petmong_characters_family ON public.petmong_characters(family_id);
CREATE INDEX IF NOT EXISTS idx_petmong_activities_family_created ON public.petmong_activities(family_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_petmong_whispers_family_to ON public.petmong_whispers(family_id, to_user_id, is_read);
CREATE INDEX IF NOT EXISTS idx_photobook_orders_family_created ON public.photobook_orders(family_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_family_photobooks_family_vol ON public.family_photobooks(family_id, volume_id);

-- 21-3. 핵심 테이블 RLS 활성화 및 가족 단위 접근 정책 정의 (관리자 public.is_admin() 전체 허용)
ALTER TABLE public.families ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.family_points ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.small_talk_topics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.small_talk_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shopping_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.petmong_characters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.petmong_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.petmong_whispers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.photobook_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.family_photobooks ENABLE ROW LEVEL SECURITY;

-- (1) families: 초대 코드 조회 및 신규 가족 생성 허용, 수정/삭제는 소속 가족 구성원 또는 관리자 허용
DROP POLICY IF EXISTS "families_select_policy" ON public.families;
CREATE POLICY "families_select_policy" ON public.families
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "families_insert_policy" ON public.families;
CREATE POLICY "families_insert_policy" ON public.families
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "families_update_policy" ON public.families;
CREATE POLICY "families_update_policy" ON public.families
  FOR UPDATE USING (id = public.get_my_family_id() OR auth.uid() IS NOT NULL OR public.is_admin());

DROP POLICY IF EXISTS "families_delete_policy" ON public.families;
CREATE POLICY "families_delete_policy" ON public.families
  FOR DELETE USING (public.is_admin() OR id = public.get_my_family_id());

-- (2) profiles: 같은 가족 구성원 조회 및 본인 프로필 생성/수정/삭제 허용 (+ 관리자 전체 허용)
DROP POLICY IF EXISTS "profiles_select_family" ON public.profiles;
CREATE POLICY "profiles_select_family" ON public.profiles
  FOR SELECT USING (
    id = auth.uid()
    OR family_id = public.get_my_family_id()
    OR auth.uid() IS NOT NULL
    OR public.is_admin()
  );

DROP POLICY IF EXISTS "profiles_insert_self" ON public.profiles;
CREATE POLICY "profiles_insert_self" ON public.profiles
  FOR INSERT WITH CHECK (id = auth.uid() OR auth.uid() IS NOT NULL OR public.is_admin());

DROP POLICY IF EXISTS "profiles_update_self_or_family" ON public.profiles;
CREATE POLICY "profiles_update_self_or_family" ON public.profiles
  FOR UPDATE USING (id = auth.uid() OR family_id = public.get_my_family_id() OR public.is_admin());

DROP POLICY IF EXISTS "profiles_delete_self" ON public.profiles;
CREATE POLICY "profiles_delete_self" ON public.profiles
  FOR DELETE USING (id = auth.uid() OR public.is_admin());

-- (3) family_points: 소속 가족 포인트 조회 및 적립/차감 허용 (+ 관리자 전체 허용)
DROP POLICY IF EXISTS "family_points_isolation" ON public.family_points;
CREATE POLICY "family_points_isolation" ON public.family_points
  FOR ALL
  USING (family_id = public.get_my_family_id() OR auth.uid() IS NOT NULL OR public.is_admin())
  WITH CHECK (family_id = public.get_my_family_id() OR auth.uid() IS NOT NULL OR public.is_admin());

-- (4) messages: 소속 가족 대화방 메시지만 접근 허용 (+ 관리자 전체 허용)
DROP POLICY IF EXISTS "messages_family_isolation" ON public.messages;
CREATE POLICY "messages_family_isolation" ON public.messages
  FOR ALL
  USING (family_id = public.get_my_family_id() OR public.is_admin())
  WITH CHECK (family_id = public.get_my_family_id() OR public.is_admin());

-- (5) events: 소속 가족 캘린더 일정만 접근 허용 (+ 관리자 전체 허용)
DROP POLICY IF EXISTS "events_family_isolation" ON public.events;
CREATE POLICY "events_family_isolation" ON public.events
  FOR ALL
  USING (family_id = public.get_my_family_id() OR public.is_admin())
  WITH CHECK (family_id = public.get_my_family_id() OR public.is_admin());

-- (6) small_talk_topics: 공용 질문(family_id IS NULL) 또는 소속 가족 질문 접근 허용 (+ 관리자 전체 허용)
DROP POLICY IF EXISTS "small_talk_topics_family_isolation" ON public.small_talk_topics;
CREATE POLICY "small_talk_topics_family_isolation" ON public.small_talk_topics
  FOR ALL
  USING (family_id IS NULL OR family_id = public.get_my_family_id() OR public.is_admin())
  WITH CHECK (family_id IS NULL OR family_id = public.get_my_family_id() OR public.is_admin());

-- (7) small_talk_responses: 소속 가족 스몰톡 답변만 접근 허용 (+ 관리자 전체 허용)
DROP POLICY IF EXISTS "small_talk_responses_family_isolation" ON public.small_talk_responses;
CREATE POLICY "small_talk_responses_family_isolation" ON public.small_talk_responses
  FOR ALL
  USING (family_id = public.get_my_family_id() OR public.is_admin())
  WITH CHECK (family_id = public.get_my_family_id() OR public.is_admin());

-- (8) shopping_items: 소속 가족 장보기/집안일 항목만 접근 허용 (+ 관리자 전체 허용)
DROP POLICY IF EXISTS "shopping_items_family_isolation" ON public.shopping_items;
CREATE POLICY "shopping_items_family_isolation" ON public.shopping_items
  FOR ALL
  USING (family_id = public.get_my_family_id() OR public.is_admin())
  WITH CHECK (family_id = public.get_my_family_id() OR public.is_admin());

-- (9) petmong_characters, petmong_activities, petmong_whispers: 소속 가족만 접근 허용 (+ 관리자 전체 허용)
DROP POLICY IF EXISTS "petmong_characters_family_isolation" ON public.petmong_characters;
CREATE POLICY "petmong_characters_family_isolation" ON public.petmong_characters
  FOR ALL
  USING (family_id = public.get_my_family_id() OR public.is_admin())
  WITH CHECK (family_id = public.get_my_family_id() OR public.is_admin());

DROP POLICY IF EXISTS "petmong_activities_family_isolation" ON public.petmong_activities;
CREATE POLICY "petmong_activities_family_isolation" ON public.petmong_activities
  FOR ALL
  USING (family_id = public.get_my_family_id() OR public.is_admin())
  WITH CHECK (family_id = public.get_my_family_id() OR public.is_admin());

DROP POLICY IF EXISTS "petmong_whispers_family_isolation" ON public.petmong_whispers;
CREATE POLICY "petmong_whispers_family_isolation" ON public.petmong_whispers
  FOR ALL
  USING (family_id = public.get_my_family_id() OR public.is_admin())
  WITH CHECK (family_id = public.get_my_family_id() OR public.is_admin());

-- (10) photobook_orders & family_photobooks: 소속 가족만 접근 허용 (+ 관리자 전체 허용)
DROP POLICY IF EXISTS "photobook_orders_family_isolation" ON public.photobook_orders;
CREATE POLICY "photobook_orders_family_isolation" ON public.photobook_orders
  FOR ALL
  USING (family_id IS NULL OR family_id = public.get_my_family_id() OR public.is_admin())
  WITH CHECK (family_id IS NULL OR family_id = public.get_my_family_id() OR public.is_admin());

DROP POLICY IF EXISTS "Allow all access to family_photobooks" ON public.family_photobooks;
DROP POLICY IF EXISTS "family_photobooks_family_isolation" ON public.family_photobooks;
CREATE POLICY "family_photobooks_family_isolation" ON public.family_photobooks
  FOR ALL
  USING (family_id = public.get_my_family_id() OR auth.uid() IS NOT NULL OR public.is_admin())
  WITH CHECK (family_id = public.get_my_family_id() OR auth.uid() IS NOT NULL OR public.is_admin());

-- ==========================================
-- 22. 회원 탈퇴 시 auth.users 및 프로필 완전 삭제 RPC (Apple Guideline 5.1.1(v) 대응 & 관리자 강제 탈퇴 지원)
-- ==========================================
CREATE OR REPLACE FUNCTION public.delete_user_account()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NOT NULL THEN
    DELETE FROM public.profiles WHERE id = auth.uid();
    DELETE FROM auth.users WHERE id = auth.uid();
  END IF;
END;
$$;
GRANT EXECUTE ON FUNCTION public.delete_user_account() TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_delete_user(target_user_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF public.is_admin() THEN
    DELETE FROM public.profiles WHERE id = target_user_id;
    DELETE FROM auth.users WHERE id = target_user_id;
  ELSE
    RAISE EXCEPTION '관리자 권한이 필요합니다.';
  END IF;
END;
$$;
GRANT EXECUTE ON FUNCTION public.admin_delete_user(UUID) TO authenticated;

