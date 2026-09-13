import React, { useState, useEffect } from 'react';
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
  TabChatIcon,
  TabCalendarIcon,
  TabSmallTalkIcon,
  TabShoppingIcon,
  TabAlbumIcon,
  TabPetIcon,
  TabFamilyIcon,
} from './components/icons';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';

// Import Screens & Libs
import ChatScreen from './components/ChatScreen';
import CalendarScreen from './components/CalendarScreen';
import SmallTalkScreen from './components/SmallTalkScreen';
import FamilyScreen from './components/FamilyScreen';
import ShoppingListScreen from './components/ShoppingListScreen';
import PhotoAlbumScreen from './components/PhotoAlbumScreen';
import InteriorScreen from './components/InteriorScreen';
import AuthScreen from './screens/AuthScreen';
import { supabase, isSupabaseReady } from './lib/supabase';
import { getTopicForToday } from './utils/topics';
import { showError } from './utils/errorHandler';
import * as Notifications from 'expo-notifications';
import { registerForPushNotificationsAsync, sendExpoPushNotification } from './utils/notifications';

const FAMILY_MEMBERS = {
  mom: { name: '엄마', avatar: '👩‍🦰', color: '#FF7E82' },
  dad: { name: '아빠', avatar: '👨‍💼', color: '#4A90E2' },
  son: { name: '아들', avatar: '👦', color: '#2ECC71' },
  daughter: { name: '딸', avatar: '👧', color: '#F39C12' },
};

const INITIAL_MOCK_REWARDS = [
  {
    id: 'r1',
    title: '설거지 1회 면제권 🧼',
    cost: 150,
    desc: '가장 하기 싫은 설거지를 다른 가족에게 양도합니다.',
    provider: '엄마',
  },
  {
    id: 'r2',
    title: '어깨 안마 15분 💆‍♂️',
    cost: 100,
    desc: '원할 때 언제든 시원한 등/어깨 마사지를 제공합니다.',
    provider: '아들',
  },
  {
    id: 'r3',
    title: '치킨 기프티콘 교환권 🍗',
    cost: 300,
    desc: '주말 저녁에 치킨을 쏠 수 있는 황금 쿠폰입니다.',
    provider: '아빠',
  },
];

const INITIAL_MOCK_USER_COUPONS = [
  { id: 'uc1', title: '설거지 1회 면제권 🧼', cost: 150, provider: '엄마', status: 'available' },
];

const INITIAL_MOCK_SHOPPING = [
  { id: 's1', title: '우유 2팩 사오기 🥛', assignee: '아들', is_completed: false, completed_by: null, points_earned: false },
  { id: 's2', title: '주말 음식물 쓰레기 버리기 🧹', assignee: '가족 전체', is_completed: true, completed_by: '엄마', points_earned: true, completed_date: '2026-08-03' },
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
      readBy: ['son', 'mom', 'dad'],
    },
    {
      id: '2',
      sender: 'mom',
      text: '그래? 아빠 퇴근할 때 시켜달라고 하자~',
      timestamp: '오후 6:02',
      readBy: ['son', 'mom', 'dad'],
    },
    {
      id: '3',
      sender: 'dad',
      text: '좋지! 아빠가 치킨 쏠게 퇴근하고 보자! 😎',
      timestamp: '오후 6:05',
      readBy: ['son', 'mom', 'dad'],
    },
  ],
  events: [
    {
      id: 'e1',
      title: '가족 저녁 외식 🍕',
      date: '2026-07-25',
      time: '19:30',
      category: 'dinner',
      creator: 'dad',
    },
    {
      id: 'e2',
      title: '엄마 생신 🎉',
      date: '2026-07-28',
      time: '10:00',
      category: 'anniversary',
      creator: 'mom',
    },
  ],
  smallTalk: {
    topic: getTopicForToday(),
    responses: {},
    pointsAwarded: false,
  },
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
  const [rewardsList, setRewardsList] = useState([]);
  const [userCoupons, setUserCoupons] = useState([]);
  const [shoppingItems, setShoppingItems] = useState([]);
  const [customRooms, setCustomRooms] = useState([]);
  const [placedFurniture, setPlacedFurniture] = useState([]);
  const [floorPlanUrl, setFloorPlanUrl] = useState(null);
  const [petmongCharacters, setPetmongCharacters] = useState([]);

  const [smallTalk, setSmallTalk] = useState({
    topic: getTopicForToday(),
    responses: {},
    pointsAwarded: false,
  });

  const [currentScreen, setCurrentScreen] = useState('chat'); // chat, calendar, smalltalk, shopping, album, family
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

    const profilesChannel = supabase
      .channel(`realtime-profiles-${familyId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles', filter: `family_id=eq.${familyId}` }, () => {
        fetchRealProfiles(familyId);
      })
      .subscribe();

    const rewardsChannel = supabase
      .channel(`realtime-rewards-${familyId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'rewards', filter: `family_id=eq.${familyId}` }, () => {
        fetchRealRewards(familyId);
      })
      .subscribe();

    const couponsChannel = supabase
      .channel(`realtime-coupons-${familyId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'user_coupons', filter: `family_id=eq.${familyId}` }, () => {
        fetchRealUserCoupons(familyId);
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
      supabase.removeChannel(profilesChannel);
      supabase.removeChannel(rewardsChannel);
      supabase.removeChannel(couponsChannel);
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
        .select('*, families(family_code)')
        .eq('id', currentSession.user.id)
        .single();

      if (error) throw error;

      const formatted = {
        ...userProfile,
        family_code: userProfile.families?.family_code || 'FAM-NONE',
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
      fetchRealRewards(familyId),
      fetchRealUserCoupons(familyId),
      fetchRealShoppingItems(familyId),
      fetchRealPlacedFurniture(familyId),
      fetchRealFloorPlan(familyId),
      fetchRealPetmongCharacters(familyId),
    ]);
    setAppLoading(false);
  };

  const fetchRealPlacedFurniture = async (familyId) => {
    const { data } = await supabase
      .from('placed_furniture')
      .select('*')
      .eq('family_id', familyId);
    if (data) {
      const formatted = data.map(f => ({
        id: f.id,
        catalogId: f.catalog_id,
        name: f.name,
        emoji: f.emoji,
        x: f.x,
        y: f.y,
        rotation: f.rotation,
      }));
      setPlacedFurniture(formatted);
    }
  };

  const fetchRealFloorPlan = async (familyId) => {
    const { data } = await supabase
      .from('house_layouts')
      .select('image_url')
      .eq('family_id', familyId)
      .order('created_at', { ascending: false })
      .limit(1);
    if (data && data.length > 0) {
      setFloorPlanUrl(data[0].image_url);
    }
  };

  const fetchRealPetmongCharacters = async (familyId) => {
    const { data } = await supabase
      .from('petmong_characters')
      .select('*')
      .eq('family_id', familyId);
    if (data) {
      setPetmongCharacters(data);
    }
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
          text: m.text || '',
          image: m.image_url || null,
          image_url: m.image_url || null,
          room_id: m.room_id || 'family-group',
          timestamp,
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

  const fetchRealRewards = async (familyId) => {
    const { data } = await supabase
      .from('rewards')
      .select('*')
      .eq('family_id', familyId)
      .order('created_at', { ascending: true });
    if (data) setRewardsList(data);
  };

  const fetchRealUserCoupons = async (familyId) => {
    const { data } = await supabase
      .from('user_coupons')
      .select('*')
      .eq('family_id', familyId)
      .order('created_at', { ascending: false });
    if (data) setUserCoupons(data);
  };

  const fetchRealShoppingItems = async (familyId) => {
    const { data } = await supabase
      .from('shopping_items')
      .select('*')
      .eq('family_id', familyId)
      .order('created_at', { ascending: false });
    if (data) setShoppingItems(data);
  };

  const fetchRealSmallTalk = async (familyId) => {
    const todayTopic = getTopicForToday();
    const [{ data: respData }, { count: memberCount }] = await Promise.all([
      supabase
        .from('small_talk_responses')
        .select('*')
        .eq('family_id', familyId)
        .eq('topic', todayTopic)
        .order('created_at', { ascending: true }),
      supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .eq('family_id', familyId),
    ]);

    const responsesMap = {};
    if (respData) {
      respData.forEach(resp => {
        if (resp.profile_id) {
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
        setMessages(parsed.messages ?? INITIAL_MOCK_DATA.messages);
        setEvents(parsed.events ?? INITIAL_MOCK_DATA.events);
        setRewardsList(parsed.rewardsList ?? INITIAL_MOCK_REWARDS);
        setUserCoupons(parsed.userCoupons ?? INITIAL_MOCK_USER_COUPONS);
        setShoppingItems(parsed.shoppingItems ?? INITIAL_MOCK_SHOPPING);

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
        setRewardsList(INITIAL_MOCK_REWARDS);
        setUserCoupons(INITIAL_MOCK_USER_COUPONS);
        setShoppingItems(INITIAL_MOCK_SHOPPING);
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
        { id: 'm1', name: '엄마', avatar: '👩‍🦰', color: '#FF7E82', role: 'mom', mood: '😊', status_text: '오늘도 화이팅!' },
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

  const saveLocalState = async (
    updatedPoints,
    updatedMessages,
    updatedEvents,
    updatedSmallTalk,
    updatedRewards = rewardsList,
    updatedCoupons = userCoupons,
    updatedShopping = shoppingItems
  ) => {
    try {
      const dataToSave = {
        points: updatedPoints,
        messages: updatedMessages,
        events: updatedEvents,
        smallTalk: updatedSmallTalk,
        rewardsList: updatedRewards,
        userCoupons: updatedCoupons,
        shoppingItems: updatedShopping,
      };
      await AsyncStorage.setItem('FAMLINK_STATE', JSON.stringify(dataToSave));
    } catch (err) {
      console.log('Failed to save state:', err);
    }
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

  const handleAddItem = async (itemData) => {
    const newItem = {
      id: String(Date.now()),
      title: itemData.title,
      assignee: itemData.assignee,
      is_completed: false,
      completed_by: null,
      points_earned: false,
    };

    const updated = [newItem, ...shoppingItems];
    setShoppingItems(updated);

    if (isSupabaseReady) {
      try {
        const { data, error } = await supabase
          .from('shopping_items')
          .insert({
            family_id: profile.family_id,
            profile_id: session.user.id,
            title: itemData.title,
            assignee: itemData.assignee,
          })
          .select();
        if (error) throw error;
        if (data && data.length > 0) {
          setShoppingItems(prev => prev.map(i => i.id === newItem.id ? data[0] : i));
        }
      } catch (e) {
        showError(e, '장보기 항목 추가에 실패했습니다.');
        fetchRealShoppingItems(profile.family_id);
      }
    } else {
      saveLocalState(points, messages, events, smallTalk, rewardsList, userCoupons, updated);
    }
  };

  const handleAwardPetmongExp = async (targetUserId, expGain, reason = '') => {
    const targetChar = petmongCharacters.find(c => c.user_id === targetUserId) ||
      (petmongCharacters.length > 0 ? petmongCharacters[0] : null);

    if (!targetChar) return;

    let newExp = (targetChar.exp || 0) + expGain;
    let newLevel = targetChar.level || 1;
    let leveledUp = false;

    while (newExp >= 100) {
      newExp -= 100;
      newLevel += 1;
      leveledUp = true;
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
      Alert.alert(
        '🎊 반려몽 레벨업! 🎊',
        `우리 가족 ${targetChar.name}의 레벨이 Lv.${newLevel}로 올랐습니다! 무럭무럭 자라고 있어요! 🌱`
      );
    }
  };

  const handleToggleItem = async (item, isCompleted) => {
    const completedByStr = isCompleted ? (profile ? profile.name : currentUser) : null;
    const todayStr = getTodayString();

    let newPoints = points;
    let willEarnPoints = false;

    // Proposal 1 & 2: Check if points should be awarded
    if (isCompleted) {
      // Award EXP to petmong
      handleAwardPetmongExp(session?.user?.id || profile?.id, 10, '집안일/장보기 완료 (+10 EXP)');

      if (!item.points_earned) {
        const todayEarnedCount = shoppingItems.filter(
          i => i.points_earned && i.completed_date === todayStr
        ).length;

        if (todayEarnedCount < 3) {
          newPoints += 10;
          willEarnPoints = true;
          Alert.alert('미션 완료 🎉', `+10 포인트와 함께 반려몽이 +10 EXP를 획득했어요! (오늘 보상: ${(todayEarnedCount + 1) * 10}/30P)`);
        } else {
          Alert.alert('완료 처리 됨 ✅', '오늘의 장보기 포인트 한도(하루 30P / 3건)를 모두 채웠습니다. 반려몽이 +10 EXP를 획득했어요!');
        }
      }
    }

    const localItemUpdate = {
      is_completed: isCompleted,
      completed_by: completedByStr,
      points_earned: item.points_earned || willEarnPoints,
      completed_date: item.completed_date || (willEarnPoints ? todayStr : null),
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
          is_completed: isCompleted,
          completed_by: completedByStr,
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
        }
      } catch (e) {
        console.error('Toggle shopping item error:', e);
      }
    } else {
      saveLocalState(newPoints, messages, events, smallTalk, rewardsList, userCoupons, updated);
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
      saveLocalState(points, messages, events, smallTalk, rewardsList, userCoupons, updated);
    }
  };

  const handleUseCoupon = async (couponId) => {
    if (isSupabaseReady) {
      try {
        const { error } = await supabase
          .from('user_coupons')
          .update({ status: 'used' })
          .eq('id', couponId);
        if (error) throw error;
      } catch (e) {
        showError(e, '쿠폰 사용 처리 실패');
      }
    } else {
      const updated = userCoupons.map(c => c.id === couponId ? { ...c, status: 'used' } : c);
      setUserCoupons(updated);
      saveLocalState(points, messages, events, smallTalk, rewardsList, updated, shoppingItems);
    }
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

  const handleRedeemReward = async (reward) => {
    const cost = reward.cost;
    const newPoints = points - cost;
    const todayStr = getTodayString();
    const expireDateStr = addDaysToDateStr(todayStr, 30);

    const couponPayload = {
      family_id: profile ? profile.family_id : null,
      profile_id: session ? session.user.id : null,
      reward_id: reward.id,
      title: reward.title,
      cost: reward.cost,
      provider: reward.provider,
      status: 'available',
      expire_date: expireDateStr,
    };

    if (isSupabaseReady) {
      try {
        const { error: ptsError } = await supabase
          .from('family_points')
          .update({ points: newPoints })
          .eq('family_id', profile.family_id);
        if (ptsError) throw ptsError;

        const { error: cError } = await supabase
          .from('user_coupons')
          .insert(couponPayload);

        if (cError) {
          if (cError.code === 'PGRST204' || (cError.message && cError.message.includes('expire_date'))) {
            delete couponPayload.expire_date;
            const { error: fallbackError } = await supabase
              .from('user_coupons')
              .insert(couponPayload);
            if (fallbackError) throw fallbackError;
          } else {
            throw cError;
          }
        }

        setPoints(newPoints);
      } catch (e) {
        showError(e, '쿠폰 교환에 실패했습니다.');
      }
    } else {
      const newCoupon = {
        id: String(Date.now()),
        title: reward.title,
        cost: reward.cost,
        provider: reward.provider,
        status: 'available',
        expire_date: expireDateStr,
      };
      const updatedCoupons = [newCoupon, ...userCoupons];
      setPoints(newPoints);
      setUserCoupons(updatedCoupons);
      saveLocalState(newPoints, messages, events, smallTalk, rewardsList, updatedCoupons, shoppingItems);
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
      text: messageData.text || '',
      image: messageData.image || null,
      image_url: messageData.image || null,
      room_id: messageData.roomId || 'family-group',
      timestamp,
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
    if (isSupabaseReady) {
      try {
        const payload = {
          family_id: profile.family_id,
          profile_id: session.user.id,
          title: eventData.title,
          date: eventData.date,
          end_date: eventData.endDate || eventData.date,
          time: eventData.time,
          category: eventData.category,
        };

        const { error } = await supabase
          .from('events')
          .insert(payload);

        if (error) {
          // Fallback if end_date column is not present in Supabase DB yet
          if (error.code === 'PGRST204' || (error.message && error.message.includes('end_date'))) {
            delete payload.end_date;
            const { error: fallbackError } = await supabase.from('events').insert(payload);
            if (fallbackError) throw fallbackError;
          } else {
            throw error;
          }
        }
      } catch (e) {
        showError(e, '일정 추가에 실패했습니다.');
      }
    } else {
      const newEvent = {
        id: String(Date.now()),
        ...eventData,
        endDate: eventData.endDate || eventData.date,
      };
      const updated = [...events, newEvent];
      setEvents(updated);
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
        const { error } = await supabase
          .from('small_talk_responses')
          .insert({
            family_id: profile.family_id,
            profile_id: myId,
            topic: smallTalk.topic,
            text: answerText,
          });
        if (error) throw error;

        // Award +20 EXP for answering small talk
        if (myId) {
          handleAwardPetmongExp(myId, 20, '스몰톡 답변 완료 (+20 EXP)');
        }

        const updatedResponses = {
          ...smallTalk.responses,
          ...(myId ? { [myId]: answerText } : { [user]: answerText }),
        };
        const totalMembers = familyMembersList.length || 4;
        const answeredCount = familyMembersList.length > 0
          ? familyMembersList.filter(m => updatedResponses[m.id]).length
          : Object.keys(updatedResponses).length;
        const complete = totalMembers > 0 && answeredCount >= totalMembers;

        if (complete && !smallTalk.pointsAwarded) {
          const { error: ptsError } = await supabase
            .from('family_points')
            .update({ points: points + 100 })
            .eq('family_id', profile.family_id);

          if (!ptsError) {
            setCelebrationVisible(true);
            // Award +50 EXP bonus to all petmong characters for complete family participation!
            petmongCharacters.forEach(char => {
              handleAwardPetmongExp(char.user_id, 50, '스몰톡 가족 전원 완료 보너스 (+50 EXP)');
            });
          }
        }

        setSmallTalk(prev => ({
          ...prev,
          responses: updatedResponses,
          pointsAwarded: complete,
        }));
      } catch (e) {
        showError(e, '답변 등록에 실패했습니다.');
      }
    } else {
      const updatedResponses = {
        ...smallTalk.responses,
        [user]: answerText,
      };

      // Local mock mode award exp
      handleAwardPetmongExp(user, 20, '스몰톡 답변 완료 (+20 EXP)');

      const totalMembers = familyMembersList.length || 4;
      const answeredCount = Object.keys(updatedResponses).length;
      const isCompleted = answeredCount === totalMembers;

      let pointsEarned = 0;
      let pointsAwardedStatus = smallTalk.pointsAwarded;

      if (isCompleted && !smallTalk.pointsAwarded) {
        pointsEarned = 100;
        pointsAwardedStatus = true;
        setCelebrationVisible(true);
        petmongCharacters.forEach(char => {
          handleAwardPetmongExp(char.user_id, 50, '스몰톡 가족 전원 완료 보너스 (+50 EXP)');
        });
      }

      const updatedSmallTalk = {
        ...smallTalk,
        responses: updatedResponses,
        pointsAwarded: pointsAwardedStatus,
      };

      const newPoints = points + pointsEarned;
      setPoints(newPoints);
      setSmallTalk(updatedSmallTalk);
      saveLocalState(newPoints, messages, events, updatedSmallTalk);
    }
  };

  const handleAddReward = async (rewardData) => {
    if (isSupabaseReady) {
      try {
        const { error } = await supabase
          .from('rewards')
          .insert({
            family_id: profile.family_id,
            title: rewardData.title,
            cost: rewardData.cost,
            description: rewardData.desc || rewardData.description,
            provider: rewardData.provider,
          });
        if (error) throw error;
      } catch (e) {
        showError(e, '쿠폰 등록에 실패했습니다.');
      }
    } else {
      const newReward = {
        id: String(Date.now()),
        ...rewardData,
      };
      const updated = [...rewardsList, newReward];
      setRewardsList(updated);
      saveLocalState(points, messages, events, smallTalk, updated);
    }
  };

  const handleUpdatePlacedFurniture = async (updatedList) => {
    setPlacedFurniture(updatedList);
    if (isSupabaseReady && profile?.family_id) {
      try {
        await supabase.from('placed_furniture').delete().eq('family_id', profile.family_id);
        if (updatedList.length > 0) {
          const insertData = updatedList.map(item => ({
            family_id: profile.family_id,
            catalog_id: item.catalogId || item.id,
            name: item.name,
            emoji: item.emoji,
            x: item.x,
            y: item.y,
            rotation: item.rotation,
          }));
          await supabase.from('placed_furniture').insert(insertData);
        }
      } catch (e) {
        console.log('Error updating placed furniture:', e);
      }
    }
  };

  const handleUpdateFloorPlan = async (newUrl) => {
    setFloorPlanUrl(newUrl);
    if (isSupabaseReady && profile?.family_id) {
      try {
        await supabase.from('house_layouts').insert({
          family_id: profile.family_id,
          image_url: newUrl,
        });
      } catch (e) {
        console.log('Error updating floor plan URL:', e);
      }
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
            setRewardsList(INITIAL_MOCK_REWARDS);
            setUserCoupons(INITIAL_MOCK_USER_COUPONS);
            setShoppingItems(INITIAL_MOCK_SHOPPING);
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
    switch (currentScreen) {
      case 'chat':
        return (
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
          />
        );
      case 'calendar':
        return (
          <CalendarScreen
            events={events}
            currentUser={currentUser}
            currentUserProfile={profile}
            familyMembers={familyMembersList}
            onAddEvent={handleAddEvent}
            onUpdateEvent={handleUpdateEvent}
            onDeleteEvent={handleDeleteEvent}
          />
        );
      case 'smalltalk':
        return (
          <SmallTalkScreen
            smallTalkState={smallTalk}
            currentUser={currentUser}
            currentUserProfile={profile}
            points={points}
            onAddResponse={handleAddResponse}
            onRedeemReward={handleRedeemReward}
            familyMembers={familyMembersList}
            rewardsList={rewardsList}
            onAddReward={handleAddReward}
            userCoupons={userCoupons}
            onUseCoupon={handleUseCoupon}
          />
        );
      case 'shopping':
        return (
          <ShoppingListScreen
            shoppingItems={shoppingItems}
            currentUserProfile={profile}
            familyMembers={familyMembersList}
            onAddItem={handleAddItem}
            onToggleItem={handleToggleItem}
            onDeleteItem={handleDeleteItem}
          />
        );
      case 'album':
        return (
          <PhotoAlbumScreen
            currentUser={currentUser}
            familyMembers={familyMembersList}
          />
        );
      case 'interior':
        return (
          <InteriorScreen
            points={points}
            onDeductPoints={(cost) => handleUpdatePoints(Math.max(0, points - cost))}
            placedFurniture={placedFurniture}
            onUpdatePlacedFurniture={handleUpdatePlacedFurniture}
            floorPlanUrl={floorPlanUrl}
            onUpdateFloorPlan={handleUpdateFloorPlan}
            currentUser={currentUser}
            currentUserProfile={profile}
            familyId={profile.family_id}
            petmongCharacters={petmongCharacters}
            setPetmongCharacters={setPetmongCharacters}
            onAwardExp={handleAwardPetmongExp}
          />
        );
      case 'family':
        return (
          <FamilyScreen
            familyCode={profile.family_code}
            familyMembersList={familyMembersList}
            currentUserProfile={profile}
            onUpdateMood={handleUpdateMood}
            onlineUsers={onlineUsers}
          />
        );
      default:
        return <View style={styles.flexOne} />;
    }
  };

  // Loading indicator for database syncing
  if (appLoading) {
    return (
      <SafeAreaProvider>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#FF7E82" />
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
      <SafeAreaView style={styles.container} edges={['top', 'bottom', 'left', 'right']}>
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

            {/* User Switcher Emulator Widget */}
            {!isSupabaseReady ? (
              <TouchableOpacity
                style={[styles.userSwitcherButton, { borderColor: activeMember.color }]}
                onPress={() => setUserModalVisible(true)}
              >
                <Text style={styles.switcherAvatar}>{activeMember.avatar}</Text>
                <Text style={styles.switcherName}>{activeMember.name} (시뮬)</Text>
              </TouchableOpacity>
            ) : (
              <View style={[styles.userBadge, { borderColor: activeMember.color }]}>
                <Text style={styles.switcherAvatar}>{activeMember.avatar}</Text>
                <Text style={styles.switcherName}>{profile.name}</Text>
              </View>
            )}

            {/* Logout Button */}
            <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
              <LogOut size={16} color="#8E8E93" />
            </TouchableOpacity>
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

          {/* Custom Tabbar (7 Tabs) */}
          <View style={styles.tabbar}>
            <TouchableOpacity
              style={[styles.tabItem, currentScreen === 'chat' && styles.tabItemActive]}
              onPress={() => setCurrentScreen('chat')}
            >
              <TabChatIcon size={19} color={currentScreen === 'chat' ? '#FF7E82' : '#8E8E93'} focused={currentScreen === 'chat'} />
              <Text style={[styles.tabLabel, currentScreen === 'chat' && styles.tabLabelActive]}>메신저</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.tabItem, currentScreen === 'calendar' && styles.tabItemActive]}
              onPress={() => setCurrentScreen('calendar')}
            >
              <TabCalendarIcon size={19} color={currentScreen === 'calendar' ? '#FF7E82' : '#8E8E93'} focused={currentScreen === 'calendar'} />
              <Text style={[styles.tabLabel, currentScreen === 'calendar' && styles.tabLabelActive]}>캘린더</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.tabItem, currentScreen === 'smalltalk' && styles.tabItemActive]}
              onPress={() => setCurrentScreen('smalltalk')}
            >
              <TabSmallTalkIcon size={19} color={currentScreen === 'smalltalk' ? '#FF7E82' : '#8E8E93'} focused={currentScreen === 'smalltalk'} />
              <Text style={[styles.tabLabel, currentScreen === 'smalltalk' && styles.tabLabelActive]}>스몰톡</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.tabItem, currentScreen === 'shopping' && styles.tabItemActive]}
              onPress={() => setCurrentScreen('shopping')}
            >
              <TabShoppingIcon size={19} color={currentScreen === 'shopping' ? '#FF7E82' : '#8E8E93'} focused={currentScreen === 'shopping'} />
              <Text style={[styles.tabLabel, currentScreen === 'shopping' && styles.tabLabelActive]}>장보기</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.tabItem, currentScreen === 'album' && styles.tabItemActive]}
              onPress={() => setCurrentScreen('album')}
            >
              <TabAlbumIcon size={19} color={currentScreen === 'album' ? '#FF7E82' : '#8E8E93'} focused={currentScreen === 'album'} />
              <Text style={[styles.tabLabel, currentScreen === 'album' && styles.tabLabelActive]}>앨범</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.tabItem, currentScreen === 'interior' && styles.tabItemActive]}
              onPress={() => setCurrentScreen('interior')}
            >
              <TabPetIcon size={19} color={currentScreen === 'interior' ? '#FF7E82' : '#8E8E93'} focused={currentScreen === 'interior'} />
              <Text style={[styles.tabLabel, currentScreen === 'interior' && styles.tabLabelActive]}>반려몽</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.tabItem, currentScreen === 'family' && styles.tabItemActive]}
              onPress={() => setCurrentScreen('family')}
            >
              <TabFamilyIcon size={19} color={currentScreen === 'family' ? '#FF7E82' : '#8E8E93'} focused={currentScreen === 'family'} />
              <Text style={[styles.tabLabel, currentScreen === 'family' && styles.tabLabelActive]}>가족</Text>
            </TouchableOpacity>
          </View>
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
                      <Text style={styles.memberSelectAvatar}>{member.avatar}</Text>
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
              <Text style={styles.celebrationSub}>포인트 상점에서 보상 쿠폰을 뽑아보세요.</Text>

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
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F2F2F7',
  },
  logoRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logoText: {
    fontSize: 20,
    fontWeight: '900',
    color: '#FF7E82',
    letterSpacing: -0.5,
  },
  familyCodeBadge: {
    fontSize: 9,
    fontWeight: '800',
    color: '#FF7E82',
    backgroundColor: '#FFF2F3',
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginLeft: 6,
    borderWidth: 0.5,
    borderColor: '#FFA2A5',
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
    backgroundColor: '#F8F9FA',
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
    backgroundColor: '#F8F9FA',
  },
  tabbar: {
    height: 56,
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#F2F2F7',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
  },
  tabItemActive: {},
  tabLabel: {
    fontSize: 9,
    color: '#8E8E93',
    marginTop: 3,
    fontWeight: '600',
  },
  tabLabelActive: {
    color: '#FF7E82',
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
    color: '#FF7E82',
    marginVertical: 10,
  },
  celebrationSub: {
    fontSize: 11,
    color: '#AEAEB2',
    textAlign: 'center',
    marginBottom: 20,
  },
  celebrationCloseButton: {
    backgroundColor: '#FF7E82',
    paddingVertical: 13,
    paddingHorizontal: 36,
    borderRadius: 12,
  },
  celebrationCloseText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 14,
  },
});
