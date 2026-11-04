import { Alert, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase, isSupabaseReady } from '../lib/supabase';

export interface AppErrorLike {
  code?: string;
  message?: string;
  stack?: string;
  details?: string;
  hint?: string;
}

export type ErrorSeverity = 'fatal' | 'error' | 'warn';

export interface ErrorLoggerContext {
  familyId?: string | null;
  userId?: string | null;
  userName?: string | null;
  screen?: string | null;
}

export interface AppSystemConfig {
  id: string;
  maintenance_mode: boolean;
  maintenance_message: string;
  min_required_version: string;
  notice_banner_enabled: boolean;
  notice_banner_text: string;
  ai_generation_enabled: boolean;
  daily_ai_image_limit: number;
}

export const DEFAULT_SYSTEM_CONFIG: AppSystemConfig = {
  id: 'global',
  maintenance_mode: false,
  maintenance_message:
    '현재 서비스 안정화를 위한 시스템 점검 중입니다. 잠시 후 다시 이용해 주세요.',
  min_required_version: '1.0.0',
  notice_banner_enabled: false,
  notice_banner_text: '',
  ai_generation_enabled: true,
  daily_ai_image_limit: 15,
};

let cachedSystemConfig: AppSystemConfig = { ...DEFAULT_SYSTEM_CONFIG };

export const getSystemConfig = (): AppSystemConfig => cachedSystemConfig;

export const fetchSystemConfig = async (): Promise<AppSystemConfig> => {
  if (!isSupabaseReady) return cachedSystemConfig;
  try {
    const { data, error } = await supabase
      .from('app_system_config')
      .select('*')
      .eq('id', 'global')
      .maybeSingle();

    if (!error && data) {
      cachedSystemConfig = {
        ...DEFAULT_SYSTEM_CONFIG,
        ...data,
      };
    }
  } catch (_) {}
  return cachedSystemConfig;
};

export interface ReportErrorOptions {
  severity?: ErrorSeverity;
  source?: string;
  screen?: string;
  defaultMessage?: string;
  metadata?: Record<string, any>;
}

export interface AppErrorLogEntry {
  id: string;
  family_id?: string | null;
  user_id?: string | null;
  user_name?: string | null;
  severity: ErrorSeverity;
  source: string;
  screen?: string | null;
  error_code?: string | null;
  error_message: string;
  stack_trace?: string | null;
  platform: string;
  metadata?: Record<string, any>;
  is_resolved?: boolean;
  created_at: string;
  is_local_only?: boolean;
}

const LOCAL_ERROR_LOGS_KEY = '@famlink_error_logs_cache_v1';
const MAX_LOCAL_ERROR_LOGS = 50;
const DEDUPE_WINDOW_MS = 60 * 1000; // 1분 내 동일 에러 중복 적재 방지

let currentContext: ErrorLoggerContext = {
  familyId: null,
  userId: null,
  userName: null,
  screen: 'home',
};

const recentErrorFingerprints = new Map<string, number>();

/**
 * 전역 에러 로거 컨텍스트 설정 (App.tsx에서 로그인 프로필 및 현재 탭 변경 시 자동 갱신)
 */
export const setErrorLoggerContext = (
  ctx: Partial<ErrorLoggerContext>
): void => {
  currentContext = {
    ...currentContext,
    ...ctx,
  };
};

export const getErrorLoggerContext = (): ErrorLoggerContext => currentContext;

function extractErrorDetails(error: unknown, fallbackMsg: string): {
  code: string | null;
  message: string;
  stack: string | null;
} {
  if (!error) {
    return { code: null, message: fallbackMsg, stack: null };
  }
  if (error instanceof Error) {
    return {
      code: (error as any).code ? String((error as any).code) : null,
      message: error.message || fallbackMsg,
      stack: error.stack || null,
    };
  }
  if (typeof error === 'object') {
    const obj = error as AppErrorLike;
    const msgParts = [obj.message, obj.details, obj.hint].filter(Boolean);
    return {
      code: obj.code ? String(obj.code) : null,
      message: msgParts.length > 0 ? msgParts.join(' | ') : fallbackMsg,
      stack: obj.stack ? String(obj.stack) : null,
    };
  }
  return {
    code: null,
    message: String(error) || fallbackMsg,
    stack: null,
  };
}

function isValidUuid(val?: string | null): boolean {
  if (!val || typeof val !== 'string') return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
    val
  );
}

async function appendLocalErrorLog(entry: AppErrorLogEntry): Promise<void> {
  try {
    const raw = await AsyncStorage.getItem(LOCAL_ERROR_LOGS_KEY);
    const list: AppErrorLogEntry[] = raw ? JSON.parse(raw) : [];
    const next = [entry, ...list].slice(0, MAX_LOCAL_ERROR_LOGS);
    await AsyncStorage.setItem(LOCAL_ERROR_LOGS_KEY, JSON.stringify(next));
  } catch (_) {}
}

/**
 * 백그라운드 에러 리포팅 (UI 블로킹 없음, 1분 중복 방지, 로컬 캐시 + Supabase app_error_logs 적재)
 */
export const reportError = (
  error: unknown,
  options: ReportErrorOptions = {}
): void => {
  try {
    const severity: ErrorSeverity = options.severity || 'error';
    const source = options.source || 'app';
    const screen = options.screen || currentContext.screen || 'unknown';
    const { code, message, stack } = extractErrorDetails(
      error,
      options.defaultMessage || '알 수 없는 오류'
    );

    const fingerprint = `${source}:${code || ''}:${message.slice(0, 120)}`;
    const now = Date.now();
    const lastLoggedAt = recentErrorFingerprints.get(fingerprint);
    if (lastLoggedAt && now - lastLoggedAt < DEDUPE_WINDOW_MS) {
      return;
    }
    recentErrorFingerprints.set(fingerprint, now);

    const nowIso = new Date().toISOString();
    const familyId = isValidUuid(currentContext.familyId)
      ? currentContext.familyId
      : null;
    const userId = isValidUuid(currentContext.userId)
      ? currentContext.userId
      : null;

    const localEntry: AppErrorLogEntry = {
      id: `local-${now}-${Math.random().toString(36).slice(2, 7)}`,
      family_id: familyId,
      user_id: userId,
      user_name: currentContext.userName || null,
      severity,
      source,
      screen,
      error_code: code,
      error_message: message.slice(0, 1000),
      stack_trace: stack ? stack.slice(0, 2500) : null,
      platform: Platform.OS,
      metadata: {
        ...(options.metadata || {}),
        defaultMessage: options.defaultMessage || undefined,
      },
      is_resolved: false,
      created_at: nowIso,
      is_local_only: !isSupabaseReady,
    };

    // 1. 로컬 디바이스 링버퍼에 즉시 백업
    appendLocalErrorLog(localEntry);

    // 2. Supabase 원격 관제 테이블(app_error_logs)에 비동기 전송
    if (isSupabaseReady) {
      Promise.resolve(
        supabase.from('app_error_logs').insert({
          family_id: familyId,
          user_id: userId,
          user_name: currentContext.userName || null,
          severity,
          source,
          screen,
          error_code: code,
          error_message: message.slice(0, 1000),
          stack_trace: stack ? stack.slice(0, 2500) : null,
          platform: Platform.OS,
          metadata: localEntry.metadata || {},
        })
      ).catch(() => {});
    }
  } catch (_) {}
};

/**
 * 전역 에러 알림 핸들러 (사용자 Alert 표시 + 백그라운드 에러 로그 자동 적재)
 */
export const showError = (
  error: AppErrorLike | Error | unknown,
  defaultMessage: string = '오류가 발생했습니다.',
  source: string = 'show_error'
): void => {
  if (__DEV__) {
    console.error('App Error:', error);
  }

  reportError(error, {
    severity: 'error',
    source,
    defaultMessage,
  });

  let title = '알림';
  let message = defaultMessage;

  if (error && typeof error === 'object') {
    const errObj = error as AppErrorLike;
    if (errObj.code === '23505') {
      message = '이미 존재하는 데이터입니다.';
    } else if (errObj.message && errObj.message.includes('Network')) {
      title = '네트워크 오류';
      message = '인터넷 연결을 확인해 주세요.';
    }
  }

  Alert.alert(title, message);
};
