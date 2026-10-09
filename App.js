import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Modal,
  StatusBar,
  Alert,
  Platform,
  ActivityIndicator,
  KeyboardAvoidingView,
} from 'react-native';
import { StatusBar as ExpoStatusBar } from 'expo-status-bar';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { MessageSquare, Calendar, Award, Users, Trophy, LogOut, ShoppingCart, Image as ImageIcon, Heart, RotateCcw } from 'lucide-react-native';
import {
  TabHomeIcon,
  TabQuestIcon,
  TabPetIcon,
  TabChatIcon,
  TabBookIcon,
  TabAlbumIcon,
  TabCalendarIcon,
  TabSmallTalkIcon,
  TabShoppingIcon,
  TabFamilyIcon,
} from './components/icons';
import UserAvatar from './components/UserAvatar';
import { getRequiredExpForLevel, getEvolutionStage } from './lib/petmongEvolution';

// Web Polyfill for Alert.alert (react-native-web has empty stub alert() {})
if (Platform.OS === 'web') {
  Alert.alert = (title, message, buttons) => {
    const text = [title, message].filter(Boolean).join('\n\n');
    if (!buttons || buttons.length === 0) {
      if (typeof window !== 'undefined' && window.alert) {
        window.alert(text);
      }
      return;
    }
    if (buttons.length === 1) {
      if (typeof window !== 'undefined' && window.alert) {
        window.alert(text);
      }
      if (buttons[0].onPress) buttons[0].onPress();
      return;
    }
    const cancelBtn = buttons.find(b => b.style === 'cancel');
    const confirmBtn = buttons.find(b => b.style !== 'cancel') || buttons[buttons.length - 1];

    if (typeof window !== 'undefined' && window.confirm) {
      const confirmed = window.confirm(text);
      if (confirmed) {
        if (confirmBtn && confirmBtn.onPress) confirmBtn.onPress();
      } else {
        if (cancelBtn && cancelBtn.onPress) cancelBtn.onPress();
      }
    } else {
      if (confirmBtn && confirmBtn.onPress) confirmBtn.onPress();
    }
  };
}
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';

// Import Screens & Libs
import HomeScreen from './components/HomeScreen';
import ChatScreen, { parsePhotobookOrderData } from './components/ChatScreen';
import CalendarScreen from './components/CalendarScreen';
import SmallTalkScreen from './components/SmallTalkScreen';
import FamilyScreen from './components/FamilyScreen';
import ShoppingListScreen from './components/ShoppingListScreen';
import PhotoAlbumScreen from './components/PhotoAlbumScreen';
import InteriorScreen from './components/InteriorScreen';
import AuthScreen from './screens/AuthScreen';
import { supabase, isSupabaseReady } from './lib/supabase';
import { getTopicForToday, stripEmojis } from './utils/topics';
import { fetchSmallTalkTopicsFromDB, getTopicForDateFromList } from './services/smallTalkService';
import { showError } from './utils/errorHandler';
import * as Notifications from 'expo-notifications';
import { registerForPushNotificationsAsync, sendExpoPushNotification } from './utils/notifications';

const FAMILY_MEMBERS = {
  mom: { name: '엄마', avatar: '👩‍🦰', color: '#FF6B47' },
  dad: { name: '아빠', avatar: '👨‍💼', color: '#4A90E2' },
  son: { name: '아들', avatar: '👦', color: '#2ECC71' },
  daughter: { name: '딸', avatar: '👧', color: '#F39C12' },
};

const INITIAL_MOCK_SHOPPING = [];

const INITIAL_MOCK_POINT_HISTORY = [
  {
    id: 'ph-1',
    type: 'earn',
    amount: 100,
    balance: 100,
    title: '스몰톡 소통 미션 가족 전원 완료',
    category: 'smalltalk',
    date: '2026-09-12 21:00',
    user: '가족 전체',
  },
  {
    id: 'ph-2',
    type: 'earn',
    amount: 10,
    balance: 110,
    title: '장보기 완료 (우유 2팩 사오기)',
    category: 'shopping',
    date: '2026-09-13 11:30',
    user: '아들',
  },
  {
    id: 'ph-3',
    type: 'earn',
    amount: 10,
    balance: 120,
    title: '장보기 완료 (주말 음식물 쓰레기 버리기)',
    category: 'shopping',
    date: '2026-09-13 14:15',
    user: '엄마',
  },
];

// Initial Mock Data (for Local Mock Sandbox Mode)
const INITIAL_MOCK_DATA = {
  points: 120,
  messages: [
    {
      id: '1',
      sender: 'son',
      text: '엄마 아빠 오늘 저녁 치킨 먹어요!! 🍗',
      timestamp: '오후 6:00',
      created_at: new Date(Date.now() - 35 * 60 * 1000).toISOString(),
      readBy: ['son', 'mom', 'dad'],
    },
    {
      id: '2',
      sender: 'mom',
      text: '그래? 아빠 퇴근할 때 시켜달라고 하자~',
      timestamp: '오후 6:02',
      created_at: new Date(Date.now() - 33 * 60 * 1000).toISOString(),
      readBy: ['son', 'mom', 'dad'],
    },
    {
      id: '3',
      sender: 'dad',
      text: '좋지! 아빠가 치킨 쏠게 퇴근하고 보자! 😎',
      timestamp: '오후 6:05',
      created_at: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
      readBy: ['son', 'mom', 'dad'],
    },
  ],
  events: [],
  smallTalk: {
    topic: getTopicForToday(),
    responses: {},
    pointsAwarded: false,
  },
};

const getTodayString = (dateObj = new Date()) => {
  const y = dateObj.getFullYear();
  const m = String(dateObj.getMonth() + 1).padStart(2, '0');
  const d = String(dateObj.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

const addDaysToDateStr = (dateStr, days) => {
  if (!dateStr || !/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return dateStr;
  const [y, m, d] = dateStr.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  dt.setDate(dt.getDate() + days);
  const ry = dt.getFullYear();
  const rm = String(dt.getMonth() + 1).padStart(2, '0');
  const rd = String(dt.getDate()).padStart(2, '0');
  return `${ry}-${rm}-${rd}`;
};

export default function App() {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [appLoading, setAppLoading] = useState(true);
  const [familyMembersList, setFamilyMembersList] = useState([]);

  // App Core State
  const [currentUser, setCurrentUser] = useState('mom');
  const [points, setPoints] = useState(120);
  const [messages, setMessages] = useState([]);
  const [events, setEvents] = useState([]);
  const [shoppingItems, setShoppingItems] = useState(INITIAL_MOCK_SHOPPING);
  const [pointHistory, setPointHistory] = useState(INITIAL_MOCK_POINT_HISTORY);
  const [customRooms, setCustomRooms] = useState([]);
  const [petmongCharacters, setPetmongCharacters] = useState([]);
  const [petVitals, setPetVitals] = useState({
    hunger: 80,
    happiness: 85,
    cleanliness: 90,
    energy: 95,
  });
  const vitalsSyncTimerRef = useRef(null);

  const [smallTalk, setSmallTalk] = useState({
    topic: getTopicForToday(),
    responses: {},
    pointsAwarded: false,
  });

  const [currentScreen, setCurrentScreen] = useState('home'); // home, chat, interior, smalltalk, calendar, album, family
  const [visitedScreens, setVisitedScreens] = useState(new Set(['home', 'chat', 'interior']));

  useEffect(() => {
    if (currentScreen) {
      setVisitedScreens(prev => {
        if (prev.has(currentScreen)) return prev;
        const next = new Set(prev);
        next.add(currentScreen);
        return next;
      });
    }
  }, [currentScreen]);
  const [userModalVisible, setUserModalVisible] = useState(false);
  const [celebrationVisible, setCelebrationVisible] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState([]);

  // 1. Authentication State Listener & Initialization
  useEffect(() => {
    const initializeAuth = async () => {
      if (!isSupabaseReady) {
        // Load offline sandbox session
        try {
          const cachedSession = await AsyncStorage.getItem('MOCK_SESSION');
          const cachedProfile = await AsyncStorage.getItem('MOCK_PROFILE');
          if (cachedSession && cachedProfile) {
            setSession(JSON.parse(cachedSession));
            const parsedProfile = JSON.parse(cachedProfile);
            setProfile(parsedProfile);
            setCurrentUser(parsedProfile.role || 'mom');
            // Load local mock database state
            await loadLocalMockState();
          }
        } catch (e) {
          console.log('Error loading mock session', e);
        }
        setAppLoading(false);
        return;
      }

      // Real Supabase Auth Setup
      try {
        const { data: { session: initialSession } } = await supabase.auth.getSession();
        if (initialSession) {
          await handleRealUserLogin(initialSession);
        }
      } catch (err) {
        console.log('Error checking supabase session', err);
      } finally {
        setAppLoading(false);
      }

      // Auth change listener
      const { data: { subscription } } = supabase.auth.onAuthStateChange(
        async (event, currentSession) => {
          if (currentSession) {
            setSession(currentSession);
            await handleRealUserLogin(currentSession);
          } else {
            setSession(null);
            setProfile(null);
          }
        }
      );

      return () => {
        subscription.unsubscribe();
      };
    };

    initializeAuth();

    AsyncStorage.getItem('FAMLINK_CUSTOM_ROOMS').then(val => {
      if (val) {
        try {
          const parsed = JSON.parse(val);
          if (Array.isArray(parsed)) setCustomRooms(parsed);
        } catch (e) {}
      }
    });
  }, []);

  // 2. Real Database Sync (Supabase Real-time Subscription)
  useEffect(() => {
    if (!session || !profile || !profile.family_id || !isSupabaseReady) return;

    const familyId = profile.family_id;

    // Load initial data from DB
    fetchRealDatabaseData(familyId);

    // Setup real-time postgres channels for family updates
    const messagesChannel = supabase
      .channel(`realtime-messages-${familyId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'messages', filter: `family_id=eq.${familyId}` }, (payload) => {
        if (payload.eventType === 'UPDATE' && payload.new) {
          // Instantly sync read receipts without full table refetch
          setMessages(prev => prev.map(m => m.id === payload.new.id ? { ...m, readBy: payload.new.read_by || [] } : m));
        } else {
          fetchRealMessages(familyId);
        }
      })
      .subscribe();

    const eventsChannel = supabase
      .channel(`realtime-events-${familyId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'events', filter: `family_id=eq.${familyId}` }, () => {
        fetchRealEvents(familyId);
      })
      .subscribe();

    const pointsChannel = supabase
      .channel(`realtime-points-${familyId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'family_points', filter: `family_id=eq.${familyId}` }, () => {
        fetchRealPoints(familyId);
      })
      .subscribe();

    const responsesChannel = supabase
      .channel(`realtime-responses-${familyId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'small_talk_responses', filter: `family_id=eq.${familyId}` }, () => {
        fetchRealSmallTalk(familyId);
      })
      .subscribe();

    const topicsChannel = supabase
      .channel(`realtime-topics-${familyId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'small_talk_topics' }, () => {
        fetchRealSmallTalk(familyId);
      })
      .subscribe();

    const profilesChannel = supabase
      .channel(`realtime-profiles-${familyId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles', filter: `family_id=eq.${familyId}` }, () => {
        fetchRealProfiles(familyId);
      })
      .subscribe();

    const shoppingChannel = supabase
      .channel(`realtime-shopping-${familyId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'shopping_items', filter: `family_id=eq.${familyId}` }, () => {
        fetchRealShoppingItems(familyId);
      })
      .subscribe();

    const petmongChannel = supabase
      .channel(`realtime-petmong-${familyId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'petmong_characters', filter: `family_id=eq.${familyId}` }, () => {
        fetchRealPetmongCharacters(familyId);
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'petmong_activities', filter: `family_id=eq.${familyId}` }, (payload) => {
        const actionType = payload.new?.action_type || '';
        if (actionType.startsWith('VITALS_UPDATE:')) {
          try {
            const rawJson = actionType.substring('VITALS_UPDATE:'.length).split('__by__')[0];
            const incomingVitals = JSON.parse(rawJson);
            if (incomingVitals && typeof incomingVitals === 'object') {
              setPetVitals(prev => ({ ...prev, ...incomingVitals }));
              AsyncStorage.setItem(`@famlink_game_vitals_${familyId}`, JSON.stringify(incomingVitals)).catch(() => {});
            }
          } catch (e) {
            console.log('Error parsing realtime vitals:', e);
          }
        }
      })
      .subscribe();

    // Supabase Realtime Presence Channel (Online Status)
    const currentKey = session?.user?.id || profile?.id || profile?.role || currentUser;
    const presenceChannel = supabase.channel(`presence-${familyId}`, {
      config: {
        presence: { key: currentKey },
      },
    });

    presenceChannel
      .on('presence', { event: 'sync' }, () => {
        const state = presenceChannel.presenceState();
        const keys = Object.keys(state);
        setOnlineUsers(keys);
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await presenceChannel.track({
            online_at: new Date().toISOString(),
            user_id: currentKey,
            role: profile?.role || currentUser,
          });
        }
      });

    return () => {
      supabase.removeChannel(messagesChannel);
      supabase.removeChannel(eventsChannel);
      supabase.removeChannel(pointsChannel);
      supabase.removeChannel(responsesChannel);
      supabase.removeChannel(topicsChannel);
      supabase.removeChannel(profilesChannel);
      supabase.removeChannel(shoppingChannel);
      supabase.removeChannel(petmongChannel);
      supabase.removeChannel(presenceChannel);
    };
  }, [session, profile]);

  // Push Notification Setup & Listeners
  useEffect(() => {
    if (isSupabaseReady && session?.user?.id && profile?.family_id) {
      registerForPushNotificationsAsync().then(async (token) => {
        if (token) {
          try {
            await supabase
              .from('profiles')
              .update({ push_token: token })
              .eq('id', session.user.id);
          } catch (e) {
            console.log('Push token update error:', e);
          }
        }
      });
    }
  }, [session, profile]);

  useEffect(() => {
    const subscription = Notifications.addNotificationResponseReceivedListener(response => {
      const targetScreen = response?.notification?.request?.content?.data?.screen;
      if (targetScreen) {
        setCurrentScreen(targetScreen);
      }
    });
    return () => subscription.remove();
  }, []);

  const notifyFamilyMembers = async (title, body, targetScreen = 'chat') => {
    if (!isSupabaseReady || !profile?.family_id || !session?.user?.id) return;
    try {
      const { data: members } = await supabase
        .from('profiles')
        .select('push_token')
        .eq('family_id', profile.family_id)
        .neq('id', session.user.id);

      if (members && members.length > 0) {
        members.forEach(m => {
          if (m.push_token) {
            sendExpoPushNotification(m.push_token, title, body, { screen: targetScreen });
          }
        });
      }
    } catch (e) {
      console.log('Push notification send error:', e);
    }
  };

  // Load Real Supabase Profile on Login
  const handleRealUserLogin = async (currentSession) => {
    try {
      const { data: userProfile, error } = await supabase
        .from('profiles')
        .select('*, families(family_code, created_at)')
        .eq('id', currentSession.user.id)
        .single();

      if (error) throw error;

      const formatted = {
        ...userProfile,
        family_code: userProfile.families?.family_code || 'FAM-NONE',
        family_created_at: userProfile.families?.created_at || userProfile.created_at || new Date().toISOString(),
      };
      setProfile(formatted);
      setCurrentUser(formatted.role || 'mom');
    } catch (e) {
      console.log('Error fetching user profile from database', e);
    }
  };

  // Real Database Query Functions
  const fetchRealDatabaseData = async (familyId) => {
    setAppLoading(true);
    await Promise.all([
      fetchRealPoints(familyId),
      fetchRealMessages(familyId),
      fetchRealEvents(familyId),
      fetchRealSmallTalk(familyId),
      fetchRealProfiles(familyId),
      fetchRealShoppingItems(familyId),
      fetchRealPetmongCharacters(familyId, profile?.id),
      fetchRealPetVitals(familyId),
    ]);
    setAppLoading(false);
  };

  const fetchRealPetmongCharacters = async (familyId, userId = profile?.id) => {
    try {
      const { data, error } = await supabase
        .from('petmong_characters')
        .select('*')
        .eq('family_id', familyId)
        .order('created_at', { ascending: true });

      if (error) {
        console.warn('Error fetching petmong characters:', error);
        return;
      }

      if (data && data.length > 0) {
        setPetmongCharacters(data);
      } else if (familyId && (userId || session?.user?.id)) {
        const creatorId = userId || session?.user?.id;
        // DB에 가족 대표 반려몽이 없을 경우, 초기 기본 수호 반려몽('몽이') 자동 입주 & DB 저장
        const defaultPet = {
          user_id: creatorId,
          family_id: familyId,
          name: '몽이',
          emoji: '🐶',
          image_url: null,
          personality: '다정한',
          level: 1,
          exp: 0,
          vitals: { hunger: 80, happiness: 85, cleanliness: 90, energy: 95 },
        };

        const { data: inserted, error: insertErr } = await supabase
          .from('petmong_characters')
          .insert(defaultPet)
          .select();

        if (!insertErr && inserted && inserted.length > 0) {
          setPetmongCharacters(inserted);
          try {
            await supabase.from('petmong_activities').insert({
              family_id: familyId,
              actor_id: inserted[0].id,
              action_type: 'BIRTH',
            });
          } catch (_) {}
        } else {
          setPetmongCharacters([]);
        }
      } else {
        setPetmongCharacters([]);
      }
    } catch (err) {
      console.warn('Exception in fetchRealPetmongCharacters:', err);
    }
  };

  const fetchRealPetVitals = async (familyId) => {
    try {
      // 1. 빠른 렌더링을 위해 로컬 캐시 우선 적용
      const cached = await AsyncStorage.getItem(`@famlink_game_vitals_${familyId}`);
      if (cached) {
        try {
          const parsed = JSON.parse(cached);
          if (parsed && typeof parsed === 'object') setPetVitals(parsed);
        } catch (e) {}
      }

      // 2. Supabase DB에서 가장 최근에 저장된 가족 반려몽 생체 게이지 조회
      const { data, error } = await supabase
        .from('petmong_activities')
        .select('action_type, created_at')
        .eq('family_id', familyId)
        .ilike('action_type', 'VITALS_UPDATE:%')
        .order('created_at', { ascending: false })
        .limit(1);

      if (data && data.length > 0 && !error) {
        const rawJson = data[0].action_type.substring('VITALS_UPDATE:'.length).split('__by__')[0];
        const serverVitals = JSON.parse(rawJson);
        if (serverVitals && typeof serverVitals === 'object') {
          // --- 다마고치 시간 경과에 따른 자연 소모 (Time-based Vital Decay) ---
          const lastUpdated = new Date(data[0].created_at).getTime();
          const now = Date.now();
          const elapsedHours = Math.max(0, (now - lastUpdated) / (1000 * 60 * 60));

          let calculatedVitals = { ...serverVitals };
          if (elapsedHours > 0.25) { // 15분 이상 경과 시 현실적인 다마고치 자연 소모 적용
            calculatedVitals.hunger = Math.max(15, Math.min(100, Math.round(serverVitals.hunger - elapsedHours * 5)));
            calculatedVitals.happiness = Math.max(15, Math.min(100, Math.round(serverVitals.happiness - elapsedHours * 4)));
            calculatedVitals.cleanliness = Math.max(15, Math.min(100, Math.round(serverVitals.cleanliness - elapsedHours * 2.5)));
            calculatedVitals.energy = Math.max(15, Math.min(100, Math.round(serverVitals.energy - elapsedHours * 3)));
          }

          setPetVitals(calculatedVitals);
          AsyncStorage.setItem(`@famlink_game_vitals_${familyId}`, JSON.stringify(calculatedVitals)).catch(() => {});
        }
      }
    } catch (err) {
      console.log('Error fetching pet vitals:', err);
    }
  };

  // 다마고치 앱 실행 중 실시간 자연 소모 및 자정(새로운 날) 감지 타이머 (5분 주기)
  useEffect(() => {
    if (!profile?.family_id) return;
    let lastCheckedDate = getTodayString();

    const decayInterval = setInterval(() => {
      // 1. 자정 전환 감지 시 집안일 루틴 자동 갱신 및 만료 1회성 항목 자동 정리
      const currentDate = getTodayString();
      if (currentDate !== lastCheckedDate) {
        lastCheckedDate = currentDate;
        fetchRealShoppingItems(profile.family_id);
      }

      // 2. 반려몽 자연 소모
      setPetVitals(prev => {
        if (!prev) return prev;
        const next = {
          ...prev,
          hunger: Math.max(15, (prev.hunger || 80) - 1),
          happiness: Math.max(15, (prev.happiness || 85) - 1),
          cleanliness: Math.max(15, Math.round(((prev.cleanliness || 90) - 0.5) * 10) / 10),
          energy: Math.max(15, Math.round(((prev.energy || 95) - 0.5) * 10) / 10),
        };
        AsyncStorage.setItem(`@famlink_game_vitals_${profile.family_id}`, JSON.stringify(next)).catch(() => {});
        return next;
      });
    }, 5 * 60 * 1000);

    return () => clearInterval(decayInterval);
  }, [profile?.family_id]);

  const handleUpdatePetVitals = (updater) => {
    setPetVitals(prev => {
      const next = typeof updater === 'function' ? updater(prev) : { ...prev, ...updater };
      const familyId = profile?.family_id;
      if (familyId) {
        AsyncStorage.setItem(`@famlink_game_vitals_${familyId}`, JSON.stringify(next)).catch(() => {});

        // 디바운스(1.2초) 적용하여 과도한 DB Insert 방지 및 최신 상태 확정 저장
        if (vitalsSyncTimerRef.current) clearTimeout(vitalsSyncTimerRef.current);
        vitalsSyncTimerRef.current = setTimeout(async () => {
          try {
            const charId = petmongCharacters.length > 0 ? petmongCharacters[0].id : null;
            if (charId && isSupabaseReady) {
              await supabase.from('petmong_activities').insert({
                family_id: familyId,
                actor_id: charId,
                action_type: `VITALS_UPDATE:${JSON.stringify(next)}__by__${profile?.name || currentUser}`,
              });
            }
          } catch (e) {
            console.log('Error syncing vitals to DB:', e);
          }
        }, 1200);
      }
      return next;
    });
  };

  const fetchRealProfiles = async (familyId) => {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('family_id', familyId);
    if (data) setFamilyMembersList(data);
  };

  const fetchRealPoints = async (familyId) => {
    const { data } = await supabase
      .from('family_points')
      .select('points')
      .eq('family_id', familyId)
      .single();
    if (data) setPoints(data.points);
  };

  const fetchRealMessages = async (familyId) => {
    const { data } = await supabase
      .from('messages')
      .select('*, profiles(name, avatar, color, role)')
      .eq('family_id', familyId)
      .order('created_at', { ascending: true })
      .limit(200);

    if (data) {
      const formatted = data.map(m => {
        const timestamp = new Date(m.created_at).toLocaleTimeString('ko-KR', {
          hour: '2-digit',
          minute: '2-digit',
          hour12: true
        });
        return {
          id: m.id,
          sender: m.profiles?.role || 'son',
          profile_id: m.profile_id,
          senderObj: m.profiles || null,
          senderName: m.profiles?.name || null,
          text: typeof m.text === 'string'
            ? m.text
            : (typeof m.text === 'object' && m.text !== null
                ? (m.text.bookTitle
                    ? `📦 [실물 포토북 주문] "${m.text.bookTitle}" (수령인: ${m.text.recipient || '가족'}님)`
                    : JSON.stringify(m.text))
                : String(m.text || '')),
          image: m.image_url || null,
          image_url: m.image_url || null,
          room_id: m.room_id || 'family-group',
          timestamp,
          created_at: m.created_at,
          readBy: m.read_by || [],
        };
      });
      setMessages(prev => {
        // Retain any pending optimistic messages that haven't landed in DB yet
        const pending = prev.filter(m => m.isSending);
        if (pending.length === 0) return formatted;
        const dbIds = new Set(formatted.map(d => d.id));
        const stillPending = pending.filter(m => !dbIds.has(m.id));
        return [...formatted, ...stillPending];
      });
    }
  };

  const fetchRealEvents = async (familyId) => {
    const { data } = await supabase
      .from('events')
      .select('*, profiles(id, name, avatar, color, role)')
      .eq('family_id', familyId);

    if (data) {
      const formatted = data.map(e => ({
        id: e.id,
        profile_id: e.profile_id,
        creatorObj: e.profiles,
        title: e.title,
        date: e.date,
        endDate: e.end_date || e.date,
        time: e.time,
        category: e.category,
        creator: e.profiles?.name || e.profiles?.role || 'mom',
      }));
      setEvents(formatted);
    }
  };

  const normalizeRecurringItems = (items) => {
    if (!items || !Array.isArray(items)) return items;
    const todayStr = getTodayString();
    const expiredOneTimeIds = [];
    const resetRecurringIds = [];
    const activeList = [];

    items.forEach(item => {
      const isDaily = item.repeat_type === 'daily';
      const isWeekly = item.repeat_type === 'weekly';
      const isOneTime = !isDaily && !isWeekly;
      const compDate = item.completed_date || (item.completed_at ? item.completed_at.slice(0, 10) : null);

      if (item.is_completed) {
        if (isOneTime) {
          // 📌 1회성 집안일: 완료 날짜가 오늘이 아닌 과거인 경우 다음 날 자동 삭제/정리 대상
          if (compDate && compDate !== todayStr) {
            expiredOneTimeIds.push(item.id);
            return; // UI 목록에서 즉시 제외
          }
        } else if (isDaily) {
          // 🔄 매일 반복 집안일: 완료 날짜가 과거인 경우 자정 리셋하여 오늘 할 일(미완료)로 부활
          if (compDate && compDate !== todayStr) {
            resetRecurringIds.push(item.id);
            activeList.push({
              ...item,
              is_completed: false,
              completed_by: null,
              points_earned: false,
              completed_date: null,
              completed_at: null,
            });
            return;
          }
        } else if (isWeekly) {
          // 주간 반복 집안일: 7일 이상 경과 시 리셋
          if (compDate) {
            const compTime = new Date(compDate).getTime();
            const nowTime = new Date().getTime();
            const diffDays = (nowTime - compTime) / (1000 * 3600 * 24);
            if (diffDays >= 7) {
              resetRecurringIds.push(item.id);
              activeList.push({
                ...item,
                is_completed: false,
                completed_by: null,
                points_earned: false,
                completed_date: null,
                completed_at: null,
              });
              return;
            }
          }
        }
      }

      activeList.push(item);
    });

    // 🚀 Supabase DB 백그라운드 자동 동기화
    if (isSupabaseReady) {
      const isUuid = id => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);

      // 1. 만료된 1회성 완료 항목 DB 영구 삭제
      const targetDeleteUuids = expiredOneTimeIds.filter(isUuid);
      if (targetDeleteUuids.length > 0) {
        supabase
          .from('shopping_items')
          .delete()
          .in('id', targetDeleteUuids)
          .then(({ error }) => {
            if (error) console.log('Auto-cleanup expired one-time chores error:', error);
          })
          .catch(() => {});
      }

      // 2. 자정 지난 반복 루틴 항목 DB 미완료 리셋 동기화
      const targetResetUuids = resetRecurringIds.filter(isUuid);
      if (targetResetUuids.length > 0) {
        supabase
          .from('shopping_items')
          .update({
            is_completed: false,
            completed_by: null,
            points_earned: false,
            completed_date: null,
            completed_at: null,
          })
          .in('id', targetResetUuids)
          .then(({ error }) => {
            if (error) console.log('Auto-reset recurring chores in DB error:', error);
          })
          .catch(() => {});
      }
    }

    return activeList;
  };

  const fetchRealShoppingItems = async (familyId) => {
    const { data } = await supabase
      .from('shopping_items')
      .select('*')
      .eq('family_id', familyId)
      .order('created_at', { ascending: false });
    if (data) {
      const normalized = normalizeRecurringItems(data);
      setShoppingItems(normalized);
    }
  };

  const fetchRealSmallTalk = async (familyId) => {
    let dbTopics = [];
    try {
      dbTopics = await fetchSmallTalkTopicsFromDB(familyId);
    } catch (e) {
      console.warn('Error fetching small talk topics from DB:', e);
    }
    const todayTopic = stripEmojis(getTopicForDateFromList(dbTopics, new Date()));

    const [{ data: respData }, { count: memberCount }] = await Promise.all([
      supabase
        .from('small_talk_responses')
        .select('*')
        .eq('family_id', familyId)
        .order('created_at', { ascending: true }),
      supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .eq('family_id', familyId),
    ]);

    const responsesMap = {};
    if (respData) {
      respData.forEach(resp => {
        if (resp.profile_id && (resp.topic === todayTopic || stripEmojis(resp.topic) === todayTopic)) {
          responsesMap[resp.profile_id] = resp.text;
        }
      });
    }

    const totalMembers = memberCount || familyMembersList.length || 4;
    const answeredCount = Object.keys(responsesMap).length;
    const complete = totalMembers > 0 && answeredCount >= totalMembers;

    setSmallTalk({
      topic: todayTopic,
      responses: responsesMap,
      pointsAwarded: complete,
    });
  };

  // Local Offline Sandbox states loading
  const loadLocalMockState = async () => {
    try {
      const savedData = await AsyncStorage.getItem('FAMLINK_STATE');
      const todayTopic = getTopicForToday();
      if (savedData) {
        const parsed = JSON.parse(savedData);
        setPoints(parsed.points ?? INITIAL_MOCK_DATA.points);
        const rawLoadedMessages = parsed.messages ?? INITIAL_MOCK_DATA.messages;
        const sanitizedLoadedMessages = rawLoadedMessages.map(m => ({
          ...m,
          text: typeof m.text === 'string'
            ? m.text
            : (typeof m.text === 'object' && m.text !== null
                ? (m.text.bookTitle
                    ? `📦 [실물 포토북 주문] "${m.text.bookTitle}" (수령인: ${m.text.recipient || '가족'}님)`
                    : JSON.stringify(m.text))
                : String(m.text || '')),
        }));
        setMessages(sanitizedLoadedMessages);
        const filteredEvents = (parsed.events ?? []).filter(e => e && e.id !== 'e1' && e.id !== 'e2' && !e.title?.includes('가족 저녁 외식') && !e.title?.includes('엄마 생신'));
        setEvents(filteredEvents);
        setShoppingItems(normalizeRecurringItems(parsed.shoppingItems ?? INITIAL_MOCK_SHOPPING));
        setPointHistory(parsed.pointHistory ?? INITIAL_MOCK_POINT_HISTORY);

        let loadedSmallTalk = parsed.smallTalk ?? INITIAL_MOCK_DATA.smallTalk;
        if (loadedSmallTalk.topic !== todayTopic) {
          loadedSmallTalk = {
            topic: todayTopic,
            responses: {},
            pointsAwarded: false,
          };
        }
        setSmallTalk(loadedSmallTalk);
      } else {
        setPoints(INITIAL_MOCK_DATA.points);
        setMessages(INITIAL_MOCK_DATA.messages);
        setEvents(INITIAL_MOCK_DATA.events);
        setShoppingItems(normalizeRecurringItems(INITIAL_MOCK_SHOPPING));
        setPointHistory(INITIAL_MOCK_POINT_HISTORY);
        setSmallTalk({
          topic: todayTopic,
          responses: {},
          pointsAwarded: false,
        });
      }

      // Load mock family members list
      let mockProfileObj = null;
      try {
        const cachedProfile = await AsyncStorage.getItem('MOCK_PROFILE');
        if (cachedProfile) {
          mockProfileObj = JSON.parse(cachedProfile);
        }
      } catch (e) {
        console.log('Error reading mock profile', e);
      }

      const baseMembers = [
        { id: 'm1', name: '엄마', avatar: '👩‍🦰', color: '#FF6B47', role: 'mom', mood: '😊', status_text: '오늘도 화이팅!' },
        { id: 'm2', name: '아빠', avatar: '👨‍💼', color: '#4A90E2', role: 'dad', mood: '💼', status_text: '열일 중!' },
        { id: 'm3', name: '아들', avatar: '👦', color: '#2ECC71', role: 'son', mood: '✏️', status_text: '열공 중!' },
        { id: 'm4', name: '딸', avatar: '👧', color: '#F39C12', role: 'daughter', mood: '🏠', status_text: '휴식 중~' },
      ];

      if (mockProfileObj) {
        const exists = baseMembers.some(m => m.role === mockProfileObj.role);
        const members = exists
          ? baseMembers.map(m => m.role === mockProfileObj.role ? { ...m, ...mockProfileObj } : m)
          : [...baseMembers, { id: mockProfileObj.id || 'm-user', ...mockProfileObj }];
        setFamilyMembersList(members);
      } else {
        setFamilyMembersList(baseMembers);
      }
    } catch (e) {
      console.log('Error loading mock states', e);
    }
  };

  // Auth Completed trigger from AuthScreen
  const handleAuthComplete = async (newSession, newProfile) => {
    setSession(newSession);
    setProfile(newProfile);
    setCurrentUser(newProfile.role || 'mom');

    // 🍎 Apple Reviewer Account (FAM-APPLE01): 10 스몰톡 문답 및 5장 앨범 사진 사전 장전
    if (newProfile?.family_code === 'FAM-APPLE01') {
      const reviewerMembers = [
        { id: 'rev-dad', name: '아빠(심사관)', avatar: '👨‍💼', color: '#4A90E2', role: 'dad', mood: '😊', status_text: '심사관 환영합니다!' },
        { id: 'rev-child', name: '자녀(심사관)', avatar: '👦', color: '#2ECC71', role: 'son', mood: '✨', status_text: '오늘도 즐거운 하루!' },
        { id: 'rev-mom', name: '엄마', avatar: '👩‍🦰', color: '#FF6B47', role: 'mom', mood: '🥰', status_text: '가족 모두 사랑해요' },
        { id: 'rev-daughter', name: '딸', avatar: '👧', color: '#F39C12', role: 'daughter', mood: '🌸', status_text: '책 읽는 중' },
      ];
      setFamilyMembersList(reviewerMembers);

      // 스몰톡 10개 문답 및 완료 상태 보장
      setSmallTalk({
        topic: '가족과 함께한 시간 중 가장 기억에 남는 행복한 순간은?',
        responses: {
          'rev-dad': '다 함께 주말에 공원 피크닉 갔을 때가 제일 행복했어!',
          'rev-child': '가족들이랑 맛있는 저녁 먹고 반려몽 키울 때요!',
          'rev-mom': '온 가족이 둘러앉아 옛날 앨범 이야기 나눈 날',
          'rev-daughter': '아빠랑 자전거 타고 산책했을 때가 생각나요',
        },
        pointsAwarded: true,
      });

      // 앨범 샘플 사진 5장 프리로드
      setMessages(prev => {
        if (prev.filter(m => m.image || m.image_url).length >= 5) return prev;
        const reviewerPhotos = [
          { id: 'rev-p1', sender: 'dad', senderName: '아빠', text: '가족 봄나들이 추억 🌸', image: 'https://images.unsplash.com/photo-1511895426328-dc8714191300?w=600&auto=format&fit=crop&q=80', timestamp: '오전 10:15', created_at: new Date().toISOString() },
          { id: 'rev-p2', sender: 'mom', senderName: '엄마', text: '주말 브런치 식사 ☕', image: 'https://images.unsplash.com/photo-1543353071-873f17a7a088?w=600&auto=format&fit=crop&q=80', timestamp: '오후 12:30', created_at: new Date().toISOString() },
          { id: 'rev-p3', sender: 'son', senderName: '자녀', text: '공원 자전거 라이딩 🚴', image: 'https://images.unsplash.com/photo-1476820865390-c52aeebb9891?w=600&auto=format&fit=crop&q=80', timestamp: '오후 03:20', created_at: new Date().toISOString() },
          { id: 'rev-p4', sender: 'daughter', senderName: '딸', text: '생일 파티 케이크 🎂', image: 'https://images.unsplash.com/photo-1530103862676-de8c9debad1d?w=600&auto=format&fit=crop&q=80', timestamp: '오후 06:00', created_at: new Date().toISOString() },
          { id: 'rev-p5', sender: 'dad', senderName: '아빠', text: '저녁 노을 바닷가 산책 🌅', image: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=600&auto=format&fit=crop&q=80', timestamp: '오후 07:45', created_at: new Date().toISOString() },
        ];
        return [...reviewerPhotos, ...prev];
      });
    }

    if (!isSupabaseReady) {
      await AsyncStorage.setItem('MOCK_SESSION', JSON.stringify(newSession));
      await AsyncStorage.setItem('MOCK_PROFILE', JSON.stringify(newProfile));
      await loadLocalMockState();
    }
  };

  const handleLogout = async () => {
    if (isSupabaseReady) {
      await supabase.auth.signOut();
    } else {
      await AsyncStorage.removeItem('MOCK_SESSION');
      await AsyncStorage.removeItem('MOCK_PROFILE');
      setSession(null);
      setProfile(null);
    }
  };

  // Apple Guideline 5.1.1(v) 회원 탈퇴 (Account Deletion)
  const handleDeleteAccount = async () => {
    if (isSupabaseReady && profile?.id) {
      try {
        const userId = profile.id;
        // 1. 프로필 삭제 (profiles -> cascade 로 messages, small_talk_responses 등 삭제됨)
        const { error: profileDelError } = await supabase
          .from('profiles')
          .delete()
          .eq('id', userId);

        if (profileDelError) {
          console.warn('Profile delete error:', profileDelError.message);
        }

        // 2. Auth 세션 로그아웃
        await supabase.auth.signOut();
        setSession(null);
        setProfile(null);
        Alert.alert('탈퇴 완료', '회원 탈퇴 및 개인정보 삭제가 완료되었습니다. 그동안 FamLink를 이용해 주셔서 감사합니다.');
      } catch (e) {
        console.error('Account deletion failed:', e);
        showError(e, '회원 탈퇴 처리 중 오류가 발생했습니다.');
      }
    } else {
      // 로컬/시뮬레이션 모드 탈퇴
      await AsyncStorage.clear();
      setSession(null);
      setProfile(null);
      Alert.alert('탈퇴 완료', '회원 탈퇴 및 로컬 데이터가 모두 안전하게 삭제되었습니다.');
    }
  };

  const saveLocalState = async (
    updatedPoints,
    updatedMessages,
    updatedEvents,
    updatedSmallTalk,
    updatedShopping = shoppingItems,
    updatedHistory = pointHistory
  ) => {
    try {
      const dataToSave = {
        points: updatedPoints,
        messages: updatedMessages,
        events: updatedEvents,
        smallTalk: updatedSmallTalk,
        shoppingItems: updatedShopping,
        pointHistory: updatedHistory,
      };
      await AsyncStorage.setItem('FAMLINK_STATE', JSON.stringify(dataToSave));
    } catch (err) {
      console.log('Failed to save state:', err);
    }
  };

  const logPointTransaction = async (type, amount, title, newBalance, category = 'etc') => {
    const now = new Date();
    const dateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    const actorName = profile?.name || (familyMembersList.find(m => m.id === currentUser)?.name) || '가족';

    const newTx = {
      id: `ph-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      type, // 'earn' or 'spend'
      amount,
      balance: newBalance,
      title,
      category,
      date: dateStr,
      user: actorName,
    };

    setPointHistory(prev => {
      const updated = [newTx, ...prev];
      saveLocalState(newBalance, messages, events, smallTalk, shoppingItems, updated);
      return updated;
    });
  };

  // Feature Action Handlers
  const handleUpdateMood = async (moodEmoji, statusTextStr) => {
    if (isSupabaseReady && profile) {
      try {
        const { error } = await supabase
          .from('profiles')
          .update({ mood: moodEmoji, status_text: statusTextStr })
          .eq('id', profile.id);
        if (error) throw error;
        setProfile({ ...profile, mood: moodEmoji, status_text: statusTextStr });
        setFamilyMembersList(prev => prev.map(m => m.id === profile.id ? { ...m, mood: moodEmoji, status_text: statusTextStr } : m));
      } catch (e) {
        showError(e, '기분 업데이트에 실패했습니다.');
      }
    } else {
      const updatedProfile = { ...profile, mood: moodEmoji, status_text: statusTextStr };
      setProfile(updatedProfile);
      const myIdentifier = profile?.id || currentUser;
      const updatedMembers = familyMembersList.map(m =>
        (m.id === myIdentifier || (m.role === myIdentifier && !m.id)) ? { ...m, mood: moodEmoji, status_text: statusTextStr } : m
      );
      setFamilyMembersList(updatedMembers);
    }
  };

  const handleUpdateProfile = async (updates) => {
    if (isSupabaseReady && profile) {
      try {
        const { error } = await supabase
          .from('profiles')
          .update(updates)
          .eq('id', profile.id);
        if (error) throw error;
        const updatedProfile = { ...profile, ...updates };
        setProfile(updatedProfile);
        setFamilyMembersList(prev => prev.map(m => m.id === profile.id ? { ...m, ...updates } : m));
        Alert.alert('프로필 저장 완료 ✨', '프로필 정보가 성공적으로 변경되었습니다!');
      } catch (e) {
        showError(e, '프로필 업데이트에 실패했습니다.');
      }
    } else {
      const updatedProfile = { ...profile, ...updates };
      setProfile(updatedProfile);
      const myIdentifier = profile?.id || currentUser;
      const updatedMembers = familyMembersList.map(m =>
        (m.id === myIdentifier || (m.role === myIdentifier && !m.id)) ? { ...m, ...updates } : m
      );
      setFamilyMembersList(updatedMembers);
      Alert.alert('프로필 저장 완료 ✨', '프로필 정보가 변경되었습니다.');
    }
  };

  const handleAddItem = async (itemData) => {
    const nowIso = new Date().toISOString();
    const repType = itemData.repeat_type || 'none';
    const tempId = `chore-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`;
    const newItem = {
      id: tempId,
      title: itemData.title,
      assignee: itemData.assignee || '가족 전체',
      category: itemData.category || '기타',
      points: itemData.points || 20,
      repeat_type: repType,
      is_completed: false,
      completed_by: null,
      points_earned: false,
      created_at: nowIso,
    };

    // 🚀 Optimistic Instant UI Update (0ms delay)
    const updated = [newItem, ...shoppingItems];
    setShoppingItems(updated);

    if (isSupabaseReady && profile?.family_id && session?.user?.id) {
      try {
        const corePayload = {
          family_id: profile.family_id,
          profile_id: session.user.id,
          title: itemData.title,
          assignee: itemData.assignee || '가족 전체',
        };

        // 1. Try full insert with extra columns
        let { data, error } = await supabase
          .from('shopping_items')
          .insert({
            ...corePayload,
            category: itemData.category || '기타',
            points: itemData.points || 20,
            repeat_type: repType,
          })
          .select();

        // 2. Fallback to guaranteed core schema columns if custom columns don't exist
        if (error) {
          console.warn('Initial insert with extra columns failed, falling back to core columns:', error.message);
          const retry = await supabase
            .from('shopping_items')
            .insert(corePayload)
            .select();
          data = retry.data;
          error = retry.error;
        }

        if (error) throw error;

        if (data && data.length > 0) {
          const dbRow = data[0];
          setShoppingItems(prev =>
            prev.map(i =>
              i.id === tempId
                ? {
                    ...dbRow,
                    category: itemData.category || dbRow.category || '기타',
                    points: itemData.points || dbRow.points || 20,
                    repeat_type: repType,
                  }
                : i
            )
          );
        }
      } catch (e) {
        console.warn('Supabase chore insert notice:', e.message);
        // Persist locally if network/db issue occurs so user's chore is never lost
        saveLocalState(points, messages, events, smallTalk, updated, pointHistory);
      }
    } else {
      saveLocalState(points, messages, events, smallTalk, updated, pointHistory);
    }
  };

  const handleAwardPetmongExp = async (targetUserId, expGain, reason = '') => {
    // 1가족 1반려몽: 온 가족이 함께 키우는 대표 반려몽에 경험치 합산
    const targetChar = petmongCharacters.length > 0 ? petmongCharacters[0] : null;

    if (!targetChar) return;

    let newExp = (targetChar.exp || 0) + expGain;
    let newLevel = targetChar.level || 1;
    const oldLevel = newLevel;
    let leveledUp = false;

    // 4개월(14,000 EXP) 밸런스 공식 적용
    let reqExp = getRequiredExpForLevel(newLevel);
    while (newExp >= reqExp) {
      newExp -= reqExp;
      newLevel += 1;
      leveledUp = true;
      reqExp = getRequiredExpForLevel(newLevel);
    }

    const updatedChar = { ...targetChar, exp: newExp, level: newLevel };

    setPetmongCharacters(prev => prev.map(c => 
      c.id === targetChar.id ? updatedChar : c
    ));

    if (isSupabaseReady && targetChar.id) {
      try {
        await supabase
          .from('petmong_characters')
          .update({ exp: newExp, level: newLevel })
          .eq('id', targetChar.id);

        if (reason && profile?.family_id) {
          await supabase.from('petmong_activities').insert({
            family_id: profile.family_id,
            actor_id: targetChar.id,
            action_type: reason,
          });
        }
      } catch (err) {
        console.log('Error updating petmong exp:', err);
      }
    }

    if (leveledUp) {
      const oldStage = getEvolutionStage(oldLevel);
      const newStage = getEvolutionStage(newLevel);
      if (newStage.stage > oldStage.stage) {
        Alert.alert(
          '✨ 축하합니다! 우리 반려몽 진화! ✨',
          `우리 가족의 수호 반려몽 ${targetChar.name}이(가) [${newStage.stageTitle}] 단계로 멋지게 진화했습니다! 온 가족의 사랑이 결실을 맺었어요! 🐾💖`
        );
      } else {
        Alert.alert(
          '🎊 우리 가족 반려몽 레벨업! 🎊',
          `우리 가족의 수호 반려몽 ${targetChar.name}의 레벨이 Lv.${newLevel}로 올랐습니다! 다음 성장까지 함께 힘내요! 🌱`
        );
      }
    }
  };

  const handleToggleItem = async (item, isCompleted) => {
    if (!item) return;
    const targetCompleted = typeof isCompleted === 'boolean' ? isCompleted : !item.is_completed;
    const completedByStr = targetCompleted ? (profile ? profile.name : currentUser) : null;
    const todayStr = getTodayString();

    let newPoints = points;
    let willEarnPoints = false;
    const itemPoints = item.points || 20;

    if (targetCompleted) {
      if (item.points_earned) {
        // 🔒 어뷰징 방지 1: 이미 보상이 지급된 집안일을 체크 해제 후 재체크한 경우
        Alert.alert('완료 처리 됨 ✅', '이미 포인트가 지급된 집안일입니다. (상태만 완료로 변경)');
      } else {
        // 🔒 어뷰징 방지 2: 일일 집안일 포인트 한도 계산 (1일 최대 3건 or 60P)
        const DAILY_MAX_CHORES = 3;
        const DAILY_MAX_POINTS = 60;

        const todayEarnedList = shoppingItems.filter(
          i => i.points_earned &&
               (i.completed_date === todayStr || (i.completed_at && i.completed_at.startsWith(todayStr)))
        );
        const todayEarnedCount = todayEarnedList.length;
        const todayEarnedPoints = todayEarnedList.reduce((sum, i) => sum + (i.points || 20), 0);

        if (todayEarnedCount < DAILY_MAX_CHORES && todayEarnedPoints < DAILY_MAX_POINTS) {
          newPoints += itemPoints;
          willEarnPoints = true;
          Alert.alert(
            '집안일 완료 🎉',
            `+${itemPoints} 가족 포인트를 획득했어요!\n(오늘 달성: ${todayEarnedCount + 1}/${DAILY_MAX_CHORES}건, 총 ${todayEarnedPoints + itemPoints}/${DAILY_MAX_POINTS}P)`
          );
        } else {
          // 일일 상한선 도달 시
          Alert.alert(
            '집안일 완료 ✅',
            `오늘의 집안일 포인트 한도(하루 ${DAILY_MAX_CHORES}건 / 최대 ${DAILY_MAX_POINTS}P)를 모두 채웠습니다!`
          );
        }
      }
    }

    const nowIso = new Date().toISOString();
    const finalPointsEarned = targetCompleted ? true : item.points_earned;
    const finalCompletedDate = targetCompleted ? (item.completed_date || todayStr) : null;
    const finalCompletedAt = targetCompleted ? (item.completed_at || nowIso) : null;

    const localItemUpdate = {
      is_completed: targetCompleted,
      completed_by: completedByStr,
      points_earned: finalPointsEarned,
      completed_date: finalCompletedDate,
      completed_at: finalCompletedAt,
    };

    // Optimistic local state update
    const updated = shoppingItems.map(i =>
      i.id === item.id ? { ...i, ...localItemUpdate } : i
    );
    setShoppingItems(updated);
    if (willEarnPoints) setPoints(newPoints);

    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(item.id);

    if (isSupabaseReady && isUuid) {
      try {
        const dbPayload = {
          is_completed: targetCompleted,
          completed_by: completedByStr,
          completed_at: finalCompletedAt,
          points_earned: finalPointsEarned,
          completed_date: finalCompletedDate,
        };

        const { error } = await supabase
          .from('shopping_items')
          .update(dbPayload)
          .eq('id', item.id);

        if (error) throw error;

        if (willEarnPoints) {
          await supabase
            .from('family_points')
            .update({ points: newPoints })
            .eq('family_id', profile.family_id);
          logPointTransaction('earn', itemPoints, `함께/집안일 완료 (${item.title})`, newPoints, 'quest');
        }
      } catch (e) {
        console.error('Toggle shopping item error:', e);
      }
    } else {
      if (willEarnPoints) {
        logPointTransaction('earn', itemPoints, `함께/집안일 완료 (${item.title})`, newPoints, 'quest');
      }
      saveLocalState(newPoints, messages, events, smallTalk, updated, pointHistory);
    }
  };

  const handleDeleteItem = async (id) => {
    const updated = shoppingItems.filter(i => i.id !== id);
    setShoppingItems(updated);

    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);

    if (isSupabaseReady && isUuid) {
      try {
        const { error } = await supabase
          .from('shopping_items')
          .delete()
          .eq('id', id);
        if (error) throw error;
      } catch (e) {
        console.error('Delete shopping item error:', e);
      }
    } else {
      saveLocalState(points, messages, events, smallTalk, updated);
    }
  };

  const handleClearCompletedItems = async () => {
    // Only delete one-time completed items; recurring items stay preserved in the routine
    const itemsToDelete = shoppingItems.filter(i => i.is_completed && (!i.repeat_type || i.repeat_type === 'none'));
    const completedIds = itemsToDelete.map(i => i.id);

    if (completedIds.length === 0) {
      Alert.alert('알림', '삭제할 1회성 완료 항목이 없습니다.\n매일/반복 할 일은 일일 루틴 유지를 위해 목록에 보존됩니다.');
      return;
    }

    const updated = shoppingItems.filter(i => !completedIds.includes(i.id));
    setShoppingItems(updated);

    if (isSupabaseReady) {
      try {
        const uuidList = completedIds.filter(id =>
          /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)
        );
        if (uuidList.length > 0) {
          const { error } = await supabase
            .from('shopping_items')
            .delete()
            .in('id', uuidList);
          if (error) throw error;
        }
      } catch (e) {
        console.error('Clear completed shopping items error:', e);
      }
    } else {
      saveLocalState(points, messages, events, smallTalk, updated);
    }
  };

  const handleToggleRepeat = async (item) => {
    const nextType = item.repeat_type === 'daily' ? 'none' : 'daily';
    const updated = shoppingItems.map(i => i.id === item.id ? { ...i, repeat_type: nextType } : i);
    setShoppingItems(updated);

    Alert.alert(
      '반복 설정 변경',
      nextType === 'daily'
        ? `'${item.title}' 항목이 [매일 반복]으로 설정되었습니다.\n매일 자정에 새로운 오늘 할 일로 자동 갱신됩니다.`
        : `'${item.title}' 항목의 반복이 해제되어 1회성 항목으로 변경되었습니다.`
    );

    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(item.id);
    if (isSupabaseReady && isUuid) {
      try {
        await supabase
          .from('shopping_items')
          .update({ repeat_type: nextType })
          .eq('id', item.id);
      } catch (err) {
        console.error('Update repeat_type error:', err);
      }
    } else {
      saveLocalState(points, messages, events, smallTalk, updated);
    }
  };

  const handleSendOrderNotice = async (noticePayload) => {
    let orderData = {};
    if (typeof noticePayload === 'object' && noticePayload !== null) {
      orderData = noticePayload;
    } else if (typeof noticePayload === 'string') {
      const parsed = parsePhotobookOrderData ? parsePhotobookOrderData(noticePayload) : null;
      if (parsed) {
        orderData = parsed;
      } else {
        orderData = { bookTitle: noticePayload };
      }
    }
    const cardText = `[포토북카드] ${JSON.stringify(orderData)}`;
    await handleSendMessage({
      text: cardText,
      roomId: 'family-group',
    });
  };

  const handleDeductPoints = async (cost, reason = '포인트 사용') => {
    const newPoints = Math.max(0, points - cost);
    setPoints(newPoints);
    logPointTransaction('spend', cost, reason, newPoints, 'general');

    if (isSupabaseReady && profile?.family_id) {
      await supabase
        .from('family_points')
        .update({ points: newPoints })
        .eq('family_id', profile.family_id);
    }
  };

  const handleAwardFamilyPoints = async (earnedAmount, reason = '반려몽 행복 수확') => {
    if (earnedAmount <= 0) return;
    const newPoints = points + earnedAmount;
    setPoints(newPoints);
    logPointTransaction('earn', earnedAmount, reason, newPoints, 'petmong');

    if (isSupabaseReady && profile?.family_id) {
      try {
        await supabase
          .from('family_points')
          .update({ points: newPoints })
          .eq('family_id', profile.family_id);
      } catch (e) {
        console.log('Error awarding family points:', e);
      }
    } else {
      saveLocalState(newPoints, messages, events, smallTalk, shoppingItems, pointHistory);
    }
  };

  // Messaging Action (Optimistic 0ms UI Rendering + Background Sync)
  const handleSendMessage = async (messageData) => {
    const now = new Date();
    const isPm = now.getHours() >= 12;
    const hours = now.getHours() % 12 || 12;
    const minutes = now.getMinutes() < 10 ? `0${now.getMinutes()}` : now.getMinutes();
    const timestamp = `${isPm ? '오후' : '오전'} ${hours}:${minutes}`;

    const tempId = `temp-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
    const optimisticMsg = {
      id: tempId,
      sender: profile?.role || currentUser,
      profile_id: session?.user?.id || profile?.id || null,
      senderObj: profile || null,
      senderName: profile?.name || null,
      text: typeof messageData.text === 'string'
        ? messageData.text
        : (typeof messageData.text === 'object' && messageData.text !== null
            ? JSON.stringify(messageData.text)
            : String(messageData.text || '')),
      image: messageData.image || null,
      image_url: messageData.image || null,
      room_id: messageData.roomId || 'family-group',
      timestamp,
      created_at: now.toISOString(),
      readBy: [profile?.id || currentUser],
      isSending: true,
    };

    // 🚀 Optimistic Instant Render: message appears in UI immediately (0ms delay)
    setMessages(prev => [...prev, optimisticMsg]);

    if (isSupabaseReady) {
      try {
        let imageUrl = null;

        if (messageData.image) {
          const fileUri = messageData.image;
          const fileName = `${profile.family_id}/${Date.now()}_photo.jpg`;

          try {
            const response = await fetch(fileUri);
            const blob = await response.blob();

            const { data, error: uploadError } = await supabase.storage
              .from('family-photos')
              .upload(fileName, blob, {
                cacheControl: '3600',
                upsert: false,
                contentType: blob.type || 'image/jpeg',
              });

            if (uploadError) {
              console.warn('⚠️ Supabase Storage 업로드 안내 (Base64 전송):', uploadError.message);
              // Storage 버킷이 미생성된 경우에도 다른 가족 브라우저/새로고침 시 사진이 정상 표시되도록 Base64 Data URL로 변환
              try {
                const base64Data = await new Promise((resolve) => {
                  const reader = new FileReader();
                  reader.onloadend = () => resolve(reader.result);
                  reader.onerror = () => resolve(fileUri);
                  reader.readAsDataURL(blob);
                });
                imageUrl = base64Data;
              } catch (b64Err) {
                imageUrl = fileUri;
              }
            } else {
              const { data: { publicUrl } } = supabase.storage
                .from('family-photos')
                .getPublicUrl(fileName);
              imageUrl = publicUrl;
            }
          } catch (imgErr) {
            console.warn('⚠️ 이미지 처리 안내:', imgErr);
            imageUrl = fileUri;
          }
        }

        const { data: insertedData, error } = await supabase
          .from('messages')
          .insert({
            family_id: profile.family_id,
            profile_id: session.user.id,
            text: messageData.text || '',
            image_url: imageUrl,
            room_id: messageData.roomId || 'family-group',
            read_by: [profile.id],
          })
          .select()
          .single();

        if (error) throw error;

        // Reconcile optimistic message with real server record
        if (insertedData) {
          setMessages(prev => prev.map(m => m.id === tempId ? {
            ...m,
            id: insertedData.id,
            image: insertedData.image_url || m.image,
            image_url: insertedData.image_url || m.image_url,
            isSending: false,
          } : m));
        }

        const isDirect = messageData.roomId?.startsWith('direct-');
        const notifTitle = isDirect ? `${profile ? profile.name : currentUser}님의 1:1 메시지 💬` : '가족 단톡방 💬';
        notifyFamilyMembers(
          notifTitle,
          `${profile ? profile.name : currentUser}: ${messageData.text || '사진을 보냈습니다.'}`,
          'chat'
        );
      } catch (e) {
        // Rollback optimistic message if failed
        setMessages(prev => prev.filter(m => m.id !== tempId));
        showError(e, '메시지 전송에 실패했습니다. 사진 크기가 너무 크거나 네트워크 문제가 발생했을 수 있습니다.');
      }
    } else {
      setMessages(prev => prev.map(m => m.id === tempId ? { ...m, isSending: false } : m));
      saveLocalState(points, [...messages, { ...optimisticMsg, isSending: false }], events, smallTalk);
    }
  };

  const handleMarkMessagesAsRead = async (roomId) => {
    const targetRoomId = roomId || 'family-group';
    const myId = profile?.id || currentUser;

    const checkRoomMatch = (msgRoom) => {
      const mRoom = msgRoom || 'family-group';
      if (mRoom === targetRoomId) return true;
      if (targetRoomId.startsWith('direct-') && mRoom.startsWith('direct-')) {
        const targetParts = targetRoomId.replace('direct-', '').split('-');
        const msgParts = mRoom.replace('direct-', '').split('-');
        return msgParts.every(p => targetParts.includes(p));
      }
      return false;
    };

    const unreadMsgs = messages.filter(m => {
      if (!checkRoomMatch(m.room_id)) return false;
      const readList = m.readBy || [];
      const hasRead = readList.includes(myId) || (profile?.id && readList.includes(profile.id)) || readList.includes(currentUser);
      return !hasRead;
    });

    if (unreadMsgs.length === 0) return;

    // Immediately update local state for snappy UI
    const updatedMessages = messages.map(m => {
      if (checkRoomMatch(m.room_id)) {
        const readList = m.readBy || [];
        if (!readList.includes(myId)) {
          return { ...m, readBy: [...readList, myId] };
        }
      }
      return m;
    });
    setMessages(updatedMessages);

    if (isSupabaseReady && profile?.id) {
      try {
        for (const msg of unreadMsgs) {
          const currentReadBy = Array.isArray(msg.readBy) ? msg.readBy : [];
          if (!currentReadBy.includes(profile.id)) {
            const newReadBy = [...currentReadBy, profile.id];
            await supabase
              .from('messages')
              .update({ read_by: newReadBy })
              .eq('id', msg.id);
          }
        }
      } catch (e) {
        console.warn('Failed to update read_by in Supabase:', e);
      }
    } else {
      saveLocalState(points, updatedMessages, events, smallTalk);
    }
  };

  const handleCreateCustomRoom = async (newRoom) => {
    const updated = [newRoom, ...customRooms];
    setCustomRooms(updated);
    try {
      await AsyncStorage.setItem('FAMLINK_CUSTOM_ROOMS', JSON.stringify(updated));
    } catch (e) {
      console.error('Failed to save custom room', e);
    }
  };

  // Calendar Actions
  const handleAddEvent = async (eventData) => {
    const tempId = `evt-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
    const newEvent = {
      id: tempId,
      profile_id: session?.user?.id || profile?.id,
      creatorObj: profile,
      creator: profile?.name || profile?.role || currentUser || '나',
      title: eventData.title,
      date: eventData.date,
      endDate: eventData.endDate || eventData.date,
      time: eventData.time || '18:00',
      category: eventData.category || '가족',
    };

    // 🚀 Optimistic Instant UI Update (0ms delay) - Calendar reflects instantly
    const updated = [...events, newEvent];
    setEvents(updated);

    if (isSupabaseReady && profile?.family_id && session?.user?.id) {
      try {
        const payload = {
          family_id: profile.family_id,
          profile_id: session.user.id,
          title: eventData.title,
          date: eventData.date,
          end_date: eventData.endDate || eventData.date,
          time: eventData.time || '18:00',
          category: eventData.category || '가족',
        };

        let { data, error } = await supabase
          .from('events')
          .insert(payload)
          .select('*, profiles(id, name, avatar, color, role)');

        if (error) {
          // Fallback if end_date column is not present in Supabase DB yet
          if (error.code === 'PGRST204' || (error.message && error.message.includes('end_date'))) {
            delete payload.end_date;
            const retry = await supabase
              .from('events')
              .insert(payload)
              .select('*, profiles(id, name, avatar, color, role)');
            data = retry.data;
            error = retry.error;
          }
        }

        if (error) throw error;

        if (data && data.length > 0) {
          const dbRow = data[0];
          setEvents(prev =>
            prev.map(e =>
              e.id === tempId
                ? {
                    id: dbRow.id,
                    profile_id: dbRow.profile_id,
                    creatorObj: dbRow.profiles || profile,
                    title: dbRow.title,
                    date: dbRow.date,
                    endDate: dbRow.end_date || dbRow.date,
                    time: dbRow.time,
                    category: dbRow.category,
                    creator: dbRow.profiles?.name || dbRow.profiles?.role || profile?.name || '가족',
                  }
                : e
            )
          );
        }
      } catch (e) {
        console.warn('일정 Supabase 저장 경고 (로컬 유지):', e.message);
        saveLocalState(points, messages, updated, smallTalk);
      }
    } else {
      saveLocalState(points, messages, updated, smallTalk);
    }
  };

  const handleDeleteEvent = async (id) => {
    if (isSupabaseReady) {
      try {
        const { error } = await supabase
          .from('events')
          .delete()
          .eq('id', id);
        if (error) throw error;
      } catch (e) {
        showError(e, '일정 삭제에 실패했습니다.');
      }
    } else {
      const updated = events.filter(e => e.id !== id);
      setEvents(updated);
      saveLocalState(points, messages, updated, smallTalk);
    }
  };

  const handleUpdateEvent = async (id, eventData) => {
    if (isSupabaseReady) {
      try {
        const payload = {
          title: eventData.title,
          date: eventData.date,
          end_date: eventData.endDate || eventData.date,
          time: eventData.time,
          category: eventData.category,
        };

        const { error } = await supabase
          .from('events')
          .update(payload)
          .eq('id', id);

        if (error) {
          if (error.code === 'PGRST204' || (error.message && error.message.includes('end_date'))) {
            delete payload.end_date;
            const { error: fallbackError } = await supabase
              .from('events')
              .update(payload)
              .eq('id', id);
            if (fallbackError) throw fallbackError;
          } else {
            throw error;
          }
        }
      } catch (e) {
        showError(e, '일정 수정에 실패했습니다.');
      }
    } else {
      const updated = events.map(e => (e.id === id ? { ...e, ...eventData, endDate: eventData.endDate || eventData.date } : e));
      setEvents(updated);
      saveLocalState(points, messages, updated, smallTalk);
    }
  };

  // Small Talk Actions
  const handleAddResponse = async (user, answerText) => {
    if (isSupabaseReady) {
      try {
        const myId = session?.user?.id || profile?.id;
        const isFirstAnswer = !smallTalk.responses?.[myId || user];

        const { error } = await supabase
          .from('small_talk_responses')
          .insert({
            family_id: profile.family_id,
            profile_id: myId,
            topic: stripEmojis(smallTalk.topic),
            text: answerText,
          });
        if (error) throw error;
 
        const updatedResponses = {
          ...smallTalk.responses,
          ...(myId ? { [myId]: answerText } : { [user]: answerText }),
        };
        const totalMembers = familyMembersList.length || 4;
        const answeredCount = familyMembersList.length > 0
          ? familyMembersList.filter(m => updatedResponses[m.id]).length
          : Object.keys(updatedResponses).length;
        const complete = totalMembers > 0 && answeredCount >= totalMembers;

        // Tokenomics: +5P for individual answer, +30P bonus if all family complete!
        let addedPoints = 0;
        if (isFirstAnswer) {
          addedPoints += 5;
        }
        const willAwardAllBonus = complete && !smallTalk.pointsAwarded;
        if (willAwardAllBonus) {
          addedPoints += 30;
        }

        if (addedPoints > 0) {
          const newPoints = points + addedPoints;
          const { error: ptsError } = await supabase
            .from('family_points')
            .update({ points: newPoints })
            .eq('family_id', profile.family_id);

          if (!ptsError) {
            setPoints(newPoints);
            const myName = profile?.name || user;
            if (isFirstAnswer) {
              logPointTransaction('earn', 5, `${myName}님의 스몰톡 답변 (+5P)`, newPoints - (willAwardAllBonus ? 30 : 0), 'smalltalk');
            }
            if (willAwardAllBonus) {
              setCelebrationVisible(true);
              logPointTransaction('earn', 30, '스몰톡 가족 전원 완료 보너스 (+30P)', newPoints, 'smalltalk');
            }
          }
        }

        setSmallTalk(prev => ({
          ...prev,
          responses: updatedResponses,
          pointsAwarded: complete || prev.pointsAwarded,
        }));
      } catch (e) {
        showError(e, '답변 등록에 실패했습니다.');
      }
    } else {
      const isFirstAnswer = !smallTalk.responses?.[user];
      const updatedResponses = {
        ...smallTalk.responses,
        [user]: answerText,
      };

      const totalMembers = familyMembersList.length || 4;
      const answeredCount = Object.keys(updatedResponses).length;
      const isCompleted = answeredCount === totalMembers;

      let pointsEarned = 0;
      let pointsAwardedStatus = smallTalk.pointsAwarded;

      if (isFirstAnswer) {
        pointsEarned += 5;
      }
      const willAwardAllBonus = isCompleted && !smallTalk.pointsAwarded;
      if (willAwardAllBonus) {
        pointsEarned += 30;
        pointsAwardedStatus = true;
        setCelebrationVisible(true);
      }

      const updatedSmallTalk = {
        ...smallTalk,
        responses: updatedResponses,
        pointsAwarded: pointsAwardedStatus,
      };

      const newPoints = points + pointsEarned;
      const myName = profile?.name || user;
      if (isFirstAnswer) {
        logPointTransaction('earn', 5, `${myName}님의 스몰톡 답변 (+5P)`, newPoints - (willAwardAllBonus ? 30 : 0), 'smalltalk');
      }
      if (willAwardAllBonus) {
        logPointTransaction('earn', 30, '스몰톡 가족 전원 완료 보너스 (+30P)', newPoints, 'smalltalk');
      }
      setPoints(newPoints);
      setSmallTalk(updatedSmallTalk);
      saveLocalState(newPoints, messages, events, updatedSmallTalk);
    }
  };

  const handleResetData = () => {
    Alert.alert(
      '데이터 초기화',
      '모든 대화, 일정, 포인트 내역을 초기 목업 데이터 상태로 리셋하시겠습니까?',
      [
        { text: '취소', style: 'cancel' },
        {
          text: '초기화',
          style: 'destructive',
          onPress: async () => {
            setPoints(INITIAL_MOCK_DATA.points);
            setMessages(INITIAL_MOCK_DATA.messages);
            setEvents(INITIAL_MOCK_DATA.events);
            setSmallTalk(INITIAL_MOCK_DATA.smallTalk);
            setShoppingItems(INITIAL_MOCK_SHOPPING);
            setPointHistory(INITIAL_MOCK_POINT_HISTORY);
            await AsyncStorage.removeItem('FAMLINK_STATE');
            Alert.alert('초기화 완료', '앱 데이터가 성공적으로 리셋되었습니다.');
          }
        }
      ]
    );
  };

  const switchUser = (memberOrKey) => {
    if (typeof memberOrKey === 'object' && memberOrKey !== null) {
      setCurrentUser(memberOrKey.id || memberOrKey.role || 'mom');
      if (memberOrKey.name) {
        setProfile(prev => prev ? { ...prev, ...memberOrKey } : memberOrKey);
      }
    } else {
      setCurrentUser(memberOrKey);
      const match = familyMembersList.find(m => m.id === memberOrKey || m.role === memberOrKey);
      if (match) {
        setProfile(prev => prev ? { ...prev, ...match } : match);
      }
    }
    setUserModalVisible(false);
  };

  const renderActiveScreen = () => {
    return (
      <View style={styles.flexOne}>
        {visitedScreens.has('home') && (
          <View
            style={[
              styles.screenLayer,
              currentScreen === 'home' ? styles.screenLayerVisible : styles.screenLayerHidden,
            ]}
            pointerEvents={currentScreen === 'home' ? 'auto' : 'none'}
          >
            <HomeScreen
              points={points}
              events={events}
              messages={messages}
              currentUser={currentUser}
              currentUserProfile={profile}
              familyMembers={familyMembersList}
              shoppingItems={shoppingItems}
              petmongCharacters={petmongCharacters}
              petVitals={petVitals}
              smallTalkState={smallTalk}
              onNavigateScreen={setCurrentScreen}
              onToggleQuest={handleToggleItem}
              onAwardPoints={handleAwardFamilyPoints}
              onAddResponse={handleAddResponse}
            />
          </View>
        )}
        {visitedScreens.has('chat') && (
          <View
            style={[
              styles.screenLayer,
              currentScreen === 'chat' ? styles.screenLayerVisible : styles.screenLayerHidden,
            ]}
            pointerEvents={currentScreen === 'chat' ? 'auto' : 'none'}
          >
            <ChatScreen
              messages={messages}
              currentUser={currentUser}
              currentUserProfile={profile}
              onSendMessage={handleSendMessage}
              onMarkAsRead={handleMarkMessagesAsRead}
              memberCount={familyMembersList.length}
              familyMembers={familyMembersList}
              smallTalk={smallTalk}
              onNavigateScreen={setCurrentScreen}
              customRooms={customRooms}
              onCreateCustomRoom={handleCreateCustomRoom}
              onAddEvent={handleAddEvent}
              onAddShoppingItem={handleAddItem}
              onAddChore={handleAddItem}
              onUpdateMessageVote={async (messageId, newText) => {
                // Optimistically update message text for poll
                setMessages(prev => prev.map(m => m.id === messageId ? { ...m, text: newText } : m));
                if (isSupabaseReady) {
                  try {
                    await supabase
                      .from('messages')
                      .update({ text: newText })
                      .eq('id', messageId);
                  } catch (err) {
                    console.warn('Failed to update poll message:', err);
                  }
                }
              }}
            />
          </View>
        )}
        {visitedScreens.has('interior') && (
          <View
            style={[
              styles.screenLayer,
              currentScreen === 'interior' ? styles.screenLayerVisible : styles.screenLayerHidden,
            ]}
            pointerEvents={currentScreen === 'interior' ? 'auto' : 'none'}
          >
            <InteriorScreen
              points={points}
              onDeductPoints={(cost) => handleDeductPoints(cost, '반려몽 외형 변경')}
              onAwardPoints={handleAwardFamilyPoints}
              currentUser={currentUser}
              currentUserProfile={profile}
              familyId={profile?.family_id}
              petmongCharacters={petmongCharacters}
              setPetmongCharacters={setPetmongCharacters}
              onAwardExp={handleAwardPetmongExp}
              familyMembers={familyMembersList}
              petVitals={petVitals}
              onUpdateVitals={handleUpdatePetVitals}
              messages={messages}
              smallTalkState={smallTalk}
            />
          </View>
        )}
        {visitedScreens.has('smalltalk') && (
          <View
            style={[
              styles.screenLayer,
              currentScreen === 'smalltalk' ? styles.screenLayerVisible : styles.screenLayerHidden,
            ]}
            pointerEvents={currentScreen === 'smalltalk' ? 'auto' : 'none'}
          >
            <SmallTalkScreen
              smallTalkState={smallTalk}
              currentUser={currentUser}
              currentUserProfile={profile}
              points={points}
              pointHistory={pointHistory}
              onAddResponse={handleAddResponse}
              familyMembers={familyMembersList}
              messages={messages}
              onSendOrderNotice={handleSendOrderNotice}
              shoppingItems={shoppingItems}
              onAddItem={handleAddItem}
              onToggleItem={handleToggleItem}
              onDeleteItem={handleDeleteItem}
              onClearCompleted={handleClearCompletedItems}
              onToggleRepeat={handleToggleRepeat}
              petCharacter={petmongCharacters && petmongCharacters.length > 0 ? petmongCharacters[0] : null}
              onAwardPetExp={handleAwardPetmongExp}
              onAwardPoints={handleAwardFamilyPoints}
            />
          </View>
        )}
        {visitedScreens.has('calendar') && (
          <View
            style={[
              styles.screenLayer,
              currentScreen === 'calendar' ? styles.screenLayerVisible : styles.screenLayerHidden,
            ]}
            pointerEvents={currentScreen === 'calendar' ? 'auto' : 'none'}
          >
            <CalendarScreen
              events={events}
              currentUser={currentUser}
              currentUserProfile={profile}
              familyMembers={familyMembersList}
              onAddEvent={handleAddEvent}
              onUpdateEvent={handleUpdateEvent}
              onDeleteEvent={handleDeleteEvent}
            />
          </View>
        )}
        {visitedScreens.has('album') && (
          <View
            style={[
              styles.screenLayer,
              currentScreen === 'album' ? styles.screenLayerVisible : styles.screenLayerHidden,
            ]}
            pointerEvents={currentScreen === 'album' ? 'auto' : 'none'}
          >
            <PhotoAlbumScreen
              currentUser={currentUser}
              familyMembers={familyMembersList}
              messages={messages}
              smallTalkState={smallTalk}
              currentUserProfile={profile}
              onSendOrderNotice={handleSendOrderNotice}
              points={points}
              onDeductPoints={handleDeductPoints}
              petmongCharacters={petmongCharacters}
            />
          </View>
        )}
        {visitedScreens.has('family') && (
          <View
            style={[
              styles.screenLayer,
              currentScreen === 'family' ? styles.screenLayerVisible : styles.screenLayerHidden,
            ]}
            pointerEvents={currentScreen === 'family' ? 'auto' : 'none'}
          >
            <FamilyScreen
              familyCode={profile?.family_code}
              familyMembersList={familyMembersList}
              currentUserProfile={profile}
              onUpdateMood={handleUpdateMood}
              onUpdateProfile={handleUpdateProfile}
              onlineUsers={onlineUsers}
              onLogout={handleLogout}
              onDeleteAccount={handleDeleteAccount}
              onNavigateScreen={setCurrentScreen}
            />
          </View>
        )}
        {visitedScreens.has('shopping') && (
          <View
            style={[
              styles.screenLayer,
              currentScreen === 'shopping' ? styles.screenLayerVisible : styles.screenLayerHidden,
            ]}
            pointerEvents={currentScreen === 'shopping' ? 'auto' : 'none'}
          >
            <ShoppingListScreen
              shoppingItems={shoppingItems}
              currentUserProfile={profile}
              familyMembers={familyMembersList}
              onAddItem={handleAddItem}
              onToggleItem={handleToggleItem}
              onDeleteItem={handleDeleteItem}
              onClearCompleted={handleClearCompletedItems}
              onToggleRepeat={handleToggleRepeat}
            />
          </View>
        )}
      </View>
    );
  };

  // Loading indicator for database syncing
  if (appLoading) {
    return (
      <SafeAreaProvider>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#FF6B47" />
          <Text style={styles.loadingText}>가족 데이터를 동기화하는 중...</Text>
        </View>
      </SafeAreaProvider>
    );
  }

  // Not authenticated screen routing
  if (!session || !profile) {
    return (
      <SafeAreaProvider>
        <SafeAreaView style={styles.container} edges={['top', 'bottom', 'left', 'right']}>
          <AuthScreen onAuthComplete={handleAuthComplete} />
        </SafeAreaView>
      </SafeAreaProvider>
    );
  }

  const activeMember = profile
    || (profile?.id && familyMembersList.find(m => m.id === profile.id))
    || familyMembersList.find(m => m.id === currentUser)
    || familyMembersList.find(m => m.role === currentUser) 
    || { name: currentUser, avatar: '👦', color: '#8E8E93' };

  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
        <ExpoStatusBar style="dark" />

        {/* Top Navbar */}
        <View style={styles.topNavbar}>
          <View style={styles.logoRow}>
            <Text style={styles.logoText}>FamLink</Text>
          </View>

          <View style={styles.topRightControls}>
            {/* Points Display */}
            <View style={styles.pointIndicator}>
              <Trophy size={14} color="#F1C40F" style={{ marginRight: 4 }} />
              <Text style={styles.pointIndicatorText}>{points} P</Text>
            </View>

            {/* User Profile Button (Navigates to Family Screen) */}
            {!isSupabaseReady ? (
              <TouchableOpacity
                style={[styles.userSwitcherButton, { borderColor: activeMember.color }]}
                onPress={() => setCurrentScreen('family')}
                activeOpacity={0.7}
              >
                <UserAvatar avatar={activeMember.avatar} size={22} style={{ marginRight: 6 }} />
                <Text style={styles.switcherName}>{activeMember.name} (시뮬)</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={[styles.userBadge, { borderColor: activeMember.color }]}
                onPress={() => setCurrentScreen('family')}
                activeOpacity={0.7}
              >
                <UserAvatar avatar={activeMember.avatar} size={22} style={{ marginRight: 6 }} />
                <Text style={styles.switcherName}>{profile.name}</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Screen Area and Tabbar wrapped in KeyboardAvoidingView */}
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : undefined} 
          style={styles.flexOne}
        >
          {/* Screen Area */}
          <View style={styles.screenArea}>
            {renderActiveScreen()}
          </View>

          {/* Custom Tabbar (5 Tabs: [홈, 퀘스트, 반려몽, 채팅, 앨범] - Figma node-id 5:361 Spec) */}
          <SafeAreaView edges={['bottom']} style={styles.tabbarContainer}>
            <View style={styles.tabbar}>
              {/* 1. 홈 (Home) */}
              <TouchableOpacity
                style={[styles.tabItem, currentScreen === 'home' && styles.tabItemActive]}
                onPress={() => setCurrentScreen('home')}
                activeOpacity={0.8}
              >
                <TabHomeIcon size={20} color={currentScreen === 'home' ? '#FF6B47' : '#A8A29E'} focused={currentScreen === 'home'} />
                <Text style={[styles.tabLabel, currentScreen === 'home' && styles.tabLabelActive]}>홈</Text>
              </TouchableOpacity>

              {/* 2. 오늘 함께 (Together / SmallTalk & Chores) */}
              <TouchableOpacity
                style={[styles.tabItem, currentScreen === 'smalltalk' && styles.tabItemActive]}
                onPress={() => setCurrentScreen('smalltalk')}
                activeOpacity={0.8}
              >
                <TabQuestIcon size={20} color={currentScreen === 'smalltalk' ? '#FF6B47' : '#A8A29E'} focused={currentScreen === 'smalltalk'} />
                <Text style={[styles.tabLabel, currentScreen === 'smalltalk' && styles.tabLabelActive]}>함께</Text>
              </TouchableOpacity>

              {/* 3. 반려몽 (Pet) */}
              <TouchableOpacity
                style={[styles.tabItem, currentScreen === 'interior' && styles.tabItemActive]}
                onPress={() => setCurrentScreen('interior')}
                activeOpacity={0.8}
              >
                <TabPetIcon size={20} color={currentScreen === 'interior' ? '#FF6B47' : '#A8A29E'} focused={currentScreen === 'interior'} />
                <Text style={[styles.tabLabel, currentScreen === 'interior' && styles.tabLabelActive]}>반려몽</Text>
              </TouchableOpacity>

              {/* 4. 채팅 (Chat) */}
              <TouchableOpacity
                style={[styles.tabItem, currentScreen === 'chat' && styles.tabItemActive]}
                onPress={() => setCurrentScreen('chat')}
                activeOpacity={0.8}
              >
                <TabChatIcon size={20} color={currentScreen === 'chat' ? '#FF6B47' : '#A8A29E'} focused={currentScreen === 'chat'} />
                <Text style={[styles.tabLabel, currentScreen === 'chat' && styles.tabLabelActive]}>채팅</Text>
              </TouchableOpacity>

              {/* 5. 앨범 (Album / Book) */}
              <TouchableOpacity
                style={[styles.tabItem, currentScreen === 'album' && styles.tabItemActive]}
                onPress={() => setCurrentScreen('album')}
                activeOpacity={0.8}
              >
                <TabBookIcon size={20} color={currentScreen === 'album' ? '#FF6B47' : '#A8A29E'} focused={currentScreen === 'album'} />
                <Text style={[styles.tabLabel, currentScreen === 'album' && styles.tabLabelActive]}>앨범</Text>
              </TouchableOpacity>
            </View>
          </SafeAreaView>
        </KeyboardAvoidingView>


        {/* User Switcher Modal */}
        <Modal
          animationType="fade"
          transparent={true}
          visible={userModalVisible}
          onRequestClose={() => setUserModalVisible(false)}
        >
          <TouchableOpacity
            style={styles.modalOverlay}
            activeOpacity={1}
            onPress={() => setUserModalVisible(false)}
          >
            <View style={styles.switcherModal}>
              <Text style={styles.switcherModalTitle}>시뮬레이터 계정 전환</Text>
              <Text style={styles.switcherModalDesc}>가족 역할을 바꾸며 테스트해 보세요.</Text>

              <View style={styles.membersGrid}>
                {familyMembersList.map((member) => {
                  const isCurrent = (profile?.id && member.id)
                    ? profile.id === member.id
                    : (currentUser === member.id || currentUser === member.role);
                  return (
                    <TouchableOpacity
                      key={member.id || member.role}
                      style={[
                        styles.memberSelectCard,
                        { borderColor: isCurrent ? member.color : '#EBEBEB' },
                        isCurrent && { backgroundColor: member.color + '10' }
                      ]}
                      onPress={() => switchUser(member)}
                    >
                      <UserAvatar avatar={member.avatar} size={36} style={{ marginBottom: 4 }} />
                      <Text style={[styles.memberSelectName, isCurrent && { fontWeight: 'bold', color: member.color }]}>
                        {member.name}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <TouchableOpacity style={styles.resetButton} onPress={handleResetData}>
                <RotateCcw size={13} color="#E74C3C" style={{ marginRight: 6 }} />
                <Text style={styles.resetButtonText}>목업 데이터 리셋</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.closeButton} onPress={() => setUserModalVisible(false)}>
                <Text style={styles.closeButtonText}>닫기</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </Modal>

        {/* Mission Complete Celebration Modal */}
        <Modal
          animationType="fade"
          transparent={true}
          visible={celebrationVisible}
          onRequestClose={() => setCelebrationVisible(false)}
        >
          <View style={styles.celebrationOverlay}>
            <View style={styles.celebrationCard}>
              <Text style={styles.celebrationEmoji}>🎉🏆🎉</Text>
              <Text style={styles.celebrationTitle}>가족 전원 답변 완료!</Text>
              <Text style={styles.celebrationText}>오늘의 스몰톡 미션이 완료되었습니다.</Text>
              <Text style={styles.celebrationPoints}>+100 포인트 적립!</Text>
              <Text style={styles.celebrationSub}>차곡차곡 모아 가족 포토북을 발주해보세요 ✨</Text>

              <TouchableOpacity
                style={styles.celebrationCloseButton}
                onPress={() => setCelebrationVisible(false)}
              >
                <Text style={styles.celebrationCloseText}>신난다!</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#8E8E93',
    fontWeight: '600',
  },
  flexOne: {
    flex: 1,
  },
  topNavbar: {
    height: 60,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    backgroundColor: '#FAF8F3',
    borderBottomWidth: 1,
    borderBottomColor: '#F5F0E8',
  },
  logoRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logoText: {
    fontSize: 20,
    fontWeight: '900',
    color: '#FF6B47',
    letterSpacing: -0.5,
  },
  familyCodeBadge: {
    fontSize: 9,
    fontWeight: '800',
    color: '#FF6B47',
    backgroundColor: '#FFF5F2',
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginLeft: 6,
    borderWidth: 0.5,
    borderColor: '#FED7AA',
  },
  topRightControls: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  pointIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF9E6',
    borderWidth: 1,
    borderColor: '#FFEAA7',
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 12,
    marginRight: 10,
  },
  pointIndicatorText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#D4AC0D',
  },
  userSwitcherButton: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderRadius: 16,
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: '#FFFFFF',
  },
  userBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderRadius: 16,
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: '#FAF8F3',
  },
  switcherAvatar: {
    fontSize: 14,
    marginRight: 4,
  },
  switcherName: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1C1C1E',
  },
  logoutButton: {
    padding: 8,
    marginLeft: 6,
  },
  screenArea: {
    flex: 1,
    backgroundColor: '#FAF8F3',
    position: 'relative',
  },
  screenLayer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  screenLayerVisible: {
    opacity: 1,
    zIndex: 10,
  },
  screenLayerHidden: {
    opacity: 0,
    zIndex: -1,
  },
  tabbarContainer: {
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#F5F0E8',
  },
  tabbar: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    paddingTop: 6,
    paddingBottom: Platform.OS === 'ios' ? 2 : 6,
    paddingHorizontal: 8,
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
  },
  tabItemActive: {},
  tabLabel: {
    fontSize: 10.5,
    color: '#A8A29E',
    marginTop: 2,
    fontWeight: '700',
  },
  tabLabelActive: {
    color: '#FF6B47',
    fontWeight: '800',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  switcherModal: {
    width: '85%',
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
  },
  switcherModalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1C1C1E',
    marginBottom: 4,
  },
  switcherModalDesc: {
    fontSize: 12,
    color: '#8E8E93',
    marginBottom: 20,
  },
  membersGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: 16,
  },
  memberSelectCard: {
    width: '47%',
    borderWidth: 1.5,
    borderRadius: 14,
    padding: 12,
    alignItems: 'center',
    marginBottom: 12,
    backgroundColor: '#FFFFFF',
  },
  memberSelectAvatar: {
    fontSize: 24,
    marginBottom: 6,
  },
  memberSelectName: {
    fontSize: 13,
    color: '#1C1C1E',
    fontWeight: '600',
  },
  resetButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#FFEBEB',
    backgroundColor: '#FFF8F8',
    width: '100%',
    marginBottom: 12,
  },
  resetButtonText: {
    fontSize: 12,
    color: '#E74C3C',
    fontWeight: '700',
  },
  closeButton: {
    paddingVertical: 13,
    width: '100%',
    alignItems: 'center',
    backgroundColor: '#F1F2F4',
    borderRadius: 12,
  },
  closeButtonText: {
    fontSize: 13,
    color: '#8E8E93',
    fontWeight: '700',
  },
  celebrationOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  celebrationCard: {
    width: '80%',
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 30,
    alignItems: 'center',
  },
  celebrationEmoji: {
    fontSize: 40,
    marginBottom: 16,
  },
  celebrationTitle: {
    fontSize: 20,
    fontWeight: '950',
    color: '#1C1C1E',
    marginBottom: 8,
  },
  celebrationText: {
    fontSize: 13,
    color: '#8E8E93',
    textAlign: 'center',
    marginBottom: 4,
  },
  celebrationPoints: {
    fontSize: 22,
    fontWeight: '900',
    color: '#FF6B47',
    marginVertical: 10,
  },
  celebrationSub: {
    fontSize: 11,
    color: '#AEAEB2',
    textAlign: 'center',
    marginBottom: 20,
  },
  celebrationCloseButton: {
    backgroundColor: '#FF6B47',
    paddingVertical: 13,
    paddingHorizontal: 36,
    borderRadius: 16,
  },
  celebrationCloseText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 14,
  },
});
