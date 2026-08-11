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
  text TEXT,
  image_url TEXT,
  read_by UUID[] DEFAULT '{}'::uuid[] NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

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

-- 6. 스몰톡 답변 테이블 (small_talk_responses)
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
ALTER TABLE small_talk_responses DISABLE ROW LEVEL SECURITY;
ALTER TABLE rewards DISABLE ROW LEVEL SECURITY;
ALTER TABLE user_coupons DISABLE ROW LEVEL SECURITY;
ALTER TABLE shopping_items DISABLE ROW LEVEL SECURITY;

-- 12. 실시간 기능(Realtime) 추가 테이블 등록
DO $$
BEGIN
  BEGIN alter publication supabase_realtime add table messages; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN alter publication supabase_realtime add table events; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN alter publication supabase_realtime add table small_talk_responses; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN alter publication supabase_realtime add table family_points; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN alter publication supabase_realtime add table profiles; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN alter publication supabase_realtime add table rewards; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN alter publication supabase_realtime add table user_coupons; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN alter publication supabase_realtime add table shopping_items; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN alter publication supabase_realtime add table placed_furniture; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN alter publication supabase_realtime add table house_layouts; EXCEPTION WHEN OTHERS THEN NULL; END;
END $$;

-- 13. Supabase Storage 사진 업로드용 버킷 (family-photos) 생성
INSERT INTO storage.buckets (id, name, public)
VALUES ('family-photos', 'family-photos', true)
ON CONFLICT (id) DO NOTHING;

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
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);
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
