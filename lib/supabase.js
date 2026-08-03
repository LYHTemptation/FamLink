import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';

// If credentials are placeholders or empty, print a warning in the console
const isConfigured = 
  supabaseUrl && 
  supabaseAnonKey && 
  !supabaseUrl.includes('your-project-ref') && 
  !supabaseAnonKey.includes('your-anon-public-key');

if (!isConfigured) {
  console.warn(
    '⚠️ Supabase가 아직 구성되지 않았습니다. 프로젝트 루트의 .env 파일에 실제 Supabase URL과 Anon Key를 입력해 주세요.'
  );
}

export const supabase = createClient(
  isConfigured ? supabaseUrl : 'https://placeholder-project.supabase.co', 
  isConfigured ? supabaseAnonKey : 'placeholder-anon-key', 
  {
    auth: {
      storage: AsyncStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  }
);

export const isSupabaseReady = isConfigured;
