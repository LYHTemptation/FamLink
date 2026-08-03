import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase, isSupabaseReady } from '../lib/supabase';
import { User, Lock, Mail, Heart, ArrowRight, ShieldAlert } from 'lucide-react-native';

const AVATAR_LIST = ['👩‍🦰', '👨‍💼', '👦', '👧', '👵', '👴', '🧑', '👱', '👶', '🐱', '🐶'];

const COLOR_LIST = [
  '#FF7E82', // Coral Pink
  '#4A90E2', // Soft Blue
  '#2ECC71', // Emerald Green
  '#F39C12', // Warm Orange
  '#9B59B6', // Amethyst Purple
  '#1ABC9C', // Turquoise/Teal
];

export default function AuthScreen({ onAuthComplete }) {
  const insets = useSafeAreaInsets();
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);

  // Input States
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [roleName, setRoleName] = useState('아들'); // Custom role name
  const [selectedAvatar, setSelectedAvatar] = useState(AVATAR_LIST[2]); // Default 👦
  const [selectedColor, setSelectedColor] = useState(COLOR_LIST[2]); // Default Green
  const [familyOption, setFamilyOption] = useState('create'); // 'create' or 'join'
  const [familyCode, setFamilyCode] = useState('');

  // Local/Developer Mock signup helper
  const handleLocalMockAuth = () => {
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      
      const mockSession = {
        user: { id: `mock-user-${Date.now()}`, email },
      };

      const mockProfile = {
        name: isLogin ? '엄마' : name || roleName,
        avatar: isLogin ? '👩‍🦰' : selectedAvatar,
        color: isLogin ? '#FF7E82' : selectedColor,
        role: isLogin ? 'mom' : roleName.trim(),
        family_code: familyOption === 'join' ? familyCode.toUpperCase() : `FAM-${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
      };

      Alert.alert('개발자 모드 로그인 완료', `인터넷 서버 없이 로컬 시뮬레이션 모드로 로그인되었습니다. (역할: ${mockProfile.name})`);
      onAuthComplete(mockSession, mockProfile);
    }, 1000);
  };

  const handleAuth = async () => {
    // Basic validation
    if (!email.trim() || !password.trim()) {
      Alert.alert('오류', '이메일과 비밀번호를 입력해주세요.');
      return;
    }

    if (!isSupabaseReady) {
      // Run Developer Mock authentication
      handleLocalMockAuth();
      return;
    }

    setLoading(true);

    try {
      if (isLogin) {
        // 1. Supabase Sign In
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        
        if (error) throw error;

        // 2. Fetch User Profile
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('*, families(family_code)')
          .eq('id', data.user.id)
          .single();

        if (profileError) {
          // If profile fetch fails, user is logged in but profile is missing
          Alert.alert('로그인 성공', '프로필 정보가 유실되어 기본값으로 복구합니다.');
          onAuthComplete(data.session, {
            name: '가족',
            avatar: '👦',
            color: '#8E8E93',
            role: 'son',
            family_code: 'MOCKED-CODE',
          });
          return;
        }

        const formattedProfile = {
          ...profile,
          family_code: profile.families?.family_code || 'FAM-NONE',
        };

        onAuthComplete(data.session, formattedProfile);
      } else {
        // Sign Up Flow
        if (!name.trim()) {
          Alert.alert('오류', '이름을 입력해주세요.');
          setLoading(false);
          return;
        }
        if (familyOption === 'join' && !familyCode.trim()) {
          Alert.alert('오류', '가족 코드를 입력해주세요.');
          setLoading(false);
          return;
        }

        // 1. Supabase Sign Up
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
        });

        if (error) throw error;
        if (!data.user) throw new Error('회원가입 결과를 받아오지 못했습니다.');

        let targetFamilyId = null;
        let finalFamilyCode = '';

        if (familyOption === 'create') {
          // Create Family Code
          const newCode = `FAM-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
          const { data: newFamily, error: familyError } = await supabase
            .from('families')
            .insert({ family_code: newCode })
            .select()
            .single();
          
          if (familyError) throw familyError;
          targetFamilyId = newFamily.id;
          finalFamilyCode = newCode;
        } else {
          // Join Family Code
          const cleanCode = familyCode.trim().toUpperCase();
          const { data: existingFamily, error: findFamilyError } = await supabase
            .from('families')
            .select('*')
            .eq('family_code', cleanCode)
            .single();

          if (findFamilyError || !existingFamily) {
            throw new Error('일치하는 가족 코드가 없습니다. 코드를 확인해 주세요.');
          }
          targetFamilyId = existingFamily.id;
          finalFamilyCode = cleanCode;
        }

        // 2. Create Profile row
        const newProfile = {
          id: data.user.id,
          family_id: targetFamilyId,
          name: name.trim(),
          avatar: selectedAvatar,
          color: selectedColor,
          role: roleName.trim(),
        };

        const { error: profileCreateError } = await supabase
          .from('profiles')
          .insert(newProfile);

        if (profileCreateError) throw profileCreateError;

        Alert.alert('가입 완료 🎉', '회원가입이 완료되었습니다. 로그인을 시도해주세요!');
        setIsLogin(true);
      }
    } catch (err) {
      Alert.alert('실패', err.message || '인증 처리에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
      keyboardVerticalOffset={Platform.OS === 'ios' ? insets.top : 0}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* App Logo/Header */}
        <View style={styles.headerBox}>
          <Heart size={44} color="#FF7E82" fill="#FF7E82" style={{ marginBottom: 12 }} />
          <Text style={styles.logoTitle}>FamLink</Text>
          <Text style={styles.logoSub}>사랑하는 우리 가족을 위한 프라이빗 소통 공간</Text>
        </View>

        {/* Warning Banner if Supabase not ready */}
        {!isSupabaseReady && (
          <View style={styles.warningBanner}>
            <ShieldAlert size={16} color="#D35400" style={{ marginRight: 6 }} />
            <Text style={styles.warningText}>
              개발자 테스트 모드: 서버 연결 없이 기기 내부 시뮬레이션으로 바로 테스트가 가능합니다.
            </Text>
          </View>
        )}

        {/* Form Container */}
        <View style={styles.formCard}>
          <Text style={styles.formTitle}>{isLogin ? '가족방 로그인' : '가족방 가입하기'}</Text>

          {/* Email Input */}
          <Text style={styles.label}>이메일 주소</Text>
          <View style={styles.inputWrapper}>
            <Mail size={16} color="#AEAEB2" style={{ marginRight: 10 }} />
            <TextInput
              style={styles.input}
              placeholder="example@email.com"
              placeholderTextColor="#AEAEB2"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </View>

          {/* Password Input */}
          <Text style={styles.label}>비밀번호</Text>
          <View style={styles.inputWrapper}>
            <Lock size={16} color="#AEAEB2" style={{ marginRight: 10 }} />
            <TextInput
              style={styles.input}
              placeholder="6자리 이상 비밀번호"
              placeholderTextColor="#AEAEB2"
              secureTextEntry
              value={password}
              onChangeText={setPassword}
              autoCapitalize="none"
            />
          </View>

          {/* Sign-up specific inputs */}
          {!isLogin && (
            <View>
              {/* Name */}
              <Text style={styles.label}>이름 (예: 길동, 유진)</Text>
              <View style={styles.inputWrapper}>
                <User size={16} color="#AEAEB2" style={{ marginRight: 10 }} />
                <TextInput
                  style={styles.input}
                  placeholder="실명을 입력해 주세요"
                  placeholderTextColor="#AEAEB2"
                  value={name}
                  onChangeText={setName}
                />
              </View>

              {/* Custom Role */}
              <Text style={styles.label}>가족 내 역할/호칭 (예: 큰딸, 삼촌, 할머니)</Text>
              <View style={styles.inputWrapper}>
                <Heart size={16} color="#AEAEB2" style={{ marginRight: 10 }} />
                <TextInput
                  style={styles.input}
                  placeholder="예: 엄마, 아빠, 삼촌, 할머니"
                  placeholderTextColor="#AEAEB2"
                  value={roleName}
                  onChangeText={setRoleName}
                />
              </View>

              {/* Avatar Selector Scroll */}
              <Text style={styles.label}>프로필 아바타 선택</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.avatarScrollContainer}>
                {AVATAR_LIST.map((avatarItem) => {
                  const isSelected = selectedAvatar === avatarItem;
                  return (
                    <TouchableOpacity
                      key={avatarItem}
                      style={[
                        styles.avatarCell,
                        isSelected && { borderColor: selectedColor, backgroundColor: selectedColor + '15' }
                      ]}
                      onPress={() => setSelectedAvatar(avatarItem)}
                    >
                      <Text style={styles.avatarEmoji}>{avatarItem}</Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>

              {/* Color Selector */}
              <Text style={styles.label}>테마 컬러 선택</Text>
              <View style={styles.colorPaletteRow}>
                {COLOR_LIST.map((colorItem) => {
                  const isSelected = selectedColor === colorItem;
                  return (
                    <TouchableOpacity
                      key={colorItem}
                      style={[
                        styles.colorDot,
                        { backgroundColor: colorItem },
                        isSelected && { borderColor: '#1C1C1E', borderWidth: 2.5 }
                      ]}
                      onPress={() => setSelectedColor(colorItem)}
                    />
                  );
                })}
              </View>

              {/* Family Room Option Selector */}
              <Text style={styles.label}>가족 연결 방식</Text>
              <View style={styles.familyOptionsRow}>
                <TouchableOpacity
                  style={[styles.familyOptButton, familyOption === 'create' && styles.familyOptActive]}
                  onPress={() => setFamilyOption('create')}
                >
                  <Text style={[styles.familyOptText, familyOption === 'create' && styles.familyOptTextActive]}>
                    새 가족방 만들기
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.familyOptButton, familyOption === 'join' && styles.familyOptActive]}
                  onPress={() => setFamilyOption('join')}
                >
                  <Text style={[styles.familyOptText, familyOption === 'join' && styles.familyOptTextActive]}>
                    기존 가족 참여하기
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Join Family Input */}
              {familyOption === 'join' && (
                <View style={styles.inputWrapper}>
                  <TextInput
                    style={styles.input}
                    placeholder="가족 코드 입력 (예: FAM-X891)"
                    placeholderTextColor="#AEAEB2"
                    value={familyCode}
                    onChangeText={setFamilyCode}
                    autoCapitalize="characters"
                  />
                </View>
              )}
            </View>
          )}

          {/* Submit Button */}
          <TouchableOpacity 
            style={[styles.submitButton, loading && styles.submitButtonDisabled]} 
            onPress={handleAuth}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <View style={styles.submitRow}>
                <Text style={styles.submitText}>
                  {isLogin ? '로그인하고 가족방 입장' : '회원가입 완료'}
                </Text>
                <ArrowRight size={16} color="#FFFFFF" style={{ marginLeft: 6 }} />
              </View>
            )}
          </TouchableOpacity>

          {/* Switch Login/Signup Toggle */}
          <TouchableOpacity 
            style={styles.toggleButton} 
            onPress={() => setIsLogin(!isLogin)}
            disabled={loading}
          >
            <Text style={styles.toggleText}>
              {isLogin ? '처음이신가요? 회원가입하기' : '이미 계정이 있나요? 로그인하기'}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  scrollContent: {
    padding: 24,
    paddingTop: 60,
    paddingBottom: 40,
  },
  headerBox: {
    alignItems: 'center',
    marginBottom: 24,
  },
  logoTitle: {
    fontSize: 28,
    fontWeight: '900',
    color: '#FF7E82',
    letterSpacing: -0.5,
  },
  logoSub: {
    fontSize: 12,
    color: '#8E8E93',
    textAlign: 'center',
    marginTop: 4,
    maxWidth: '80%',
  },
  warningBanner: {
    flexDirection: 'row',
    backgroundColor: '#FDF2E9',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#F5CBA7',
    marginBottom: 20,
  },
  warningText: {
    flex: 1,
    fontSize: 10,
    color: '#A04000',
    lineHeight: 14,
    fontWeight: '600',
  },
  formCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: '#EBEBEB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 5,
    elevation: 2,
  },
  formTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1C1C1E',
    marginBottom: 20,
  },
  label: {
    fontSize: 12,
    fontWeight: '700',
    color: '#8E8E93',
    marginBottom: 6,
    marginTop: 14,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F2F4',
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 48,
    borderWidth: 1,
    borderColor: '#EBEBEB',
  },
  input: {
    flex: 1,
    fontSize: 14,
    color: '#1C1C1E',
  },
  avatarScrollContainer: {
    paddingVertical: 6,
    flexDirection: 'row',
  },
  avatarCell: {
    width: 48,
    height: 48,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#EBEBEB',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
    backgroundColor: '#FFFFFF',
  },
  avatarEmoji: {
    fontSize: 24,
  },
  colorPaletteRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
    marginTop: 2,
    width: '100%',
  },
  colorDot: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: 'rgba(0,0,0,0.05)',
  },
  familyOptionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 6,
    marginBottom: 10,
  },
  familyOptButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#EBEBEB',
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
    marginRight: 6,
    backgroundColor: '#FFFFFF',
  },
  familyOptActive: {
    borderColor: '#FF7E82',
    backgroundColor: '#FFF2F3',
  },
  familyOptText: {
    fontSize: 12,
    color: '#8E8E93',
    fontWeight: '600',
  },
  familyOptTextActive: {
    color: '#FF7E82',
    fontWeight: '700',
  },
  submitButton: {
    backgroundColor: '#FF7E82',
    borderRadius: 14,
    height: 52,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 24,
  },
  submitButtonDisabled: {
    backgroundColor: '#FFA2A5',
  },
  submitRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  submitText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 15,
  },
  toggleButton: {
    alignItems: 'center',
    marginTop: 16,
    padding: 6,
  },
  toggleText: {
    fontSize: 12,
    color: '#8E8E93',
    fontWeight: '600',
  },
});
