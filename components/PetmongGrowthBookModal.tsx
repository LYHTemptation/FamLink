import React, { useState, useMemo, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  Modal,
  TouchableOpacity,
  ScrollView,
  Image,
  Dimensions,
  Platform,
  ActivityIndicator,
  Alert,
  useWindowDimensions,
} from 'react-native';
import {
  BookOpen,
  Sparkles,
  Star,
  Lock,
  CheckCircle2,
  X,
  Heart,
  Trophy,
  Zap,
  Shield,
  Award,
  Utensils,
  Gamepad2,
  Droplets,
  Flame,
  ChevronRight,
  Check,
} from 'lucide-react-native';
import {
  EVOLUTION_STAGES,
  getEvolutionStage,
  getEvolvedEmoji,
  getStageNameWithPet,
} from '../lib/petmongEvolution';
import {
  getPetmongStageImages,
  savePetmongStageImage,
  generateStageAiImage,
  startBackgroundStagePreGeneration,
  subscribePetmongStageUpdates,
  isStageGenerationRunning,
  detectSpecies,
} from '../lib/petmongEvolutionService';
import { colors, typography, commonStyles } from '../theme';

import { PetmongCharacter, FamilyMember, UserProfile } from '../types/domain';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export interface PetmongGrowthBookModalProps {
  visible: boolean;
  onClose: () => void;
  character?: PetmongCharacter | null;
  allCharacters?: PetmongCharacter[];
  familyMembers?: FamilyMember[];
  currentUserProfile?: UserProfile | null;
  initialTab?: string;
  onSelectCharacter?: (char: any) => void;
}

export default function PetmongGrowthBookModal({
  visible,
  onClose,
  character,
  allCharacters,
  familyMembers,
  currentUserProfile,
  initialTab,
  onSelectCharacter,
}: PetmongGrowthBookModalProps) {
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const isMobile = windowWidth < 600;
  const isSmallMobile = windowWidth < 380;

  const [selectedStageNum, setSelectedStageNum] = useState<number>(1);
  const [stageImages, setStageImages] = useState<Record<number, string>>({});
  const [generatingStages, setGeneratingStages] = useState<Record<number, boolean>>({});

  // Active family petmong
  const activeChar = character || null;

  // Current real stage of the petmong
  const currentCharStage = useMemo(() => {
    return getEvolutionStage(activeChar?.level || 1);
  }, [activeChar?.level]);

  const currentStageImageUrl =
    stageImages[selectedStageNum] ||
    (selectedStageNum === currentCharStage.stage ? activeChar?.image_url : null);

  // Sync selected stage with pet's stage when opening
  useEffect(() => {
    if (activeChar && visible) {
      setSelectedStageNum(getEvolutionStage(activeChar.level || 1).stage);
    }
  }, [activeChar?.id, visible]);

  // Real-time subscription to background stage generation events (fixes stale modal when opened right after creation)
  useEffect(() => {
    if (!visible || !activeChar?.id) return;
    const unsub = subscribePetmongStageUpdates(activeChar.id, evt => {
      if (evt.stage && evt.url) {
        setStageImages(prev => ({ ...prev, [evt.stage as number]: evt.url as string }));
        setGeneratingStages(prev => ({ ...prev, [evt.stage as number]: false }));
      }
      if (evt.isRunning === false) {
        setGeneratingStages({});
      }
    });
    return () => {
      unsub();
    };
  }, [visible, activeChar?.id]);

  // Load cached stage images for activeChar and generate any missing stages
  const loadStageImages = useCallback(async () => {
    if (!activeChar?.id) return;
    if (!activeChar.image_url) {
      // Emoji-only character: clear any leftover stage images
      setStageImages({});
      setGeneratingStages({});
      return;
    }
    try {
      const cached = await getPetmongStageImages(activeChar.id, activeChar.image_url);
      // Only seed Stage 1 with activeChar.image_url if the pet is currently at Stage 1 (prevents evolved Lv.5+ image overwriting Stage 1)
      if (!cached[1] && activeChar.image_url && currentCharStage.stage === 1) {
        cached[1] = activeChar.image_url;
        await savePetmongStageImage(activeChar.id, 1, activeChar.image_url);
      } else if (!cached[currentCharStage.stage] && activeChar.image_url) {
        cached[currentCharStage.stage] = activeChar.image_url;
      }
      setStageImages({ ...cached });

      // If any stages (2, 3, 4) are missing, reflect generating state and ensure sequential background queue runs
      const missing = [2, 3, 4].filter(s => !cached[s]);
      if (missing.length > 0) {
        setGeneratingStages(prev => {
          const next = { ...prev };
          missing.forEach(s => {
            next[s] = true;
          });
          return next;
        });

        startBackgroundStagePreGeneration(activeChar, (stage, url) => {
          setStageImages(prev => ({ ...prev, [stage]: url }));
          setGeneratingStages(prev => ({ ...prev, [stage]: false }));
        }).finally(() => {
          if (!isStageGenerationRunning(activeChar.id)) {
            setGeneratingStages({});
          }
        });
      } else {
        setGeneratingStages({});
      }
    } catch (err) {
      console.warn('loadStageImages error:', err);
    }
  }, [activeChar, currentCharStage.stage]);

  useEffect(() => {
    if (visible && activeChar?.id) {
      loadStageImages();
    }
  }, [visible, activeChar?.id, activeChar?.image_url, loadStageImages]);

  const handleSelectStage = useCallback((sNum: number) => {
    // 1. Instant 0ms synchronous state switch: Tab button highlights immediately!
    setSelectedStageNum(sNum);

    // 2. If stage image is missing and character has an AI image:
    // Never fire a competing standalone call if the background queue is already running (preserves 2->3->4 lineage chaining & prevents 429)
    if (!stageImages[sNum] && activeChar?.id && activeChar?.image_url) {
      setGeneratingStages(prev => ({ ...prev, [sNum]: true }));
      if (!isStageGenerationRunning(activeChar.id)) {
        startBackgroundStagePreGeneration(activeChar, (stage, url) => {
          setStageImages(prev => ({ ...prev, [stage]: url }));
          setGeneratingStages(prev => ({ ...prev, [stage]: false }));
        }).finally(() => {
          if (!isStageGenerationRunning(activeChar.id)) {
            setGeneratingStages({});
          }
        });
      }
    }
  }, [stageImages, activeChar]);

  if (!visible) return null;

  const selectedStageData = EVOLUTION_STAGES[selectedStageNum] || EVOLUTION_STAGES[1];
  const isPastStage = currentCharStage.stage > selectedStageNum;
  const isCurrentStage = currentCharStage.stage === selectedStageNum;
  const isFutureStage = currentCharStage.stage < selectedStageNum;

  // Next level milestone calculation (Always based on pet's ACTUAL current stage, not the preview tab)
  const nextMilestoneLevel =
    currentCharStage.stage < 4 ? EVOLUTION_STAGES[currentCharStage.stage + 1]?.minLevel : null;
  const levelsLeftForNext = nextMilestoneLevel
    ? Math.max(0, nextMilestoneLevel - (activeChar?.level || 1))
    : 0;

  // Detect animal species badge
  const detectedAnimalBadge = (() => {
    if (!activeChar) return '가족 반려친구 🐾';
    const spec = detectSpecies(activeChar.emoji, activeChar.name);
    const map: Record<string, string> = {
      canine: '다정한 강아지상 🐶',
      feline: '도도한 고양이상 🐱',
      rabbit: '호기심 토끼상 🐰',
      bear: '듬직한 곰상 🐻',
      bird: '행복의 파랑새상 🐥',
      fox: '영특한 여우상 🦊',
      deer: '맑은 꽃사슴상 🦌',
      rodent: '깜찍한 햄스터상 🐹',
      dragon: '수호 아기용상 🐲',
      aquatic: '온순한 물범상 🦭',
    };
    return map[spec] || '온 가족 반려친구 🐾';
  })();

  return (
    <Modal
      animationType="slide"
      transparent={true}
      visible={visible}
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContainer, isMobile && styles.modalContainerMobile]}>
          {/* Header Bar */}
          <View style={styles.headerRow}>
            <View style={styles.headerTitleWrap}>
              <View style={styles.headerIconBox}>
                <BookOpen size={18} color="#FF4D6D" />
              </View>
              <View style={styles.headerTitleTextCol}>
                <Text style={styles.headerTitle} numberOfLines={1}>
                  {activeChar ? `${activeChar.name}의 성장 앨범` : '가족 반려친구 성장 앨범'}
                </Text>
                {activeChar && (
                  <View style={styles.headerSubRow}>
                    <Text style={styles.headerSubName}>{activeChar.name}</Text>
                    <View style={styles.headerLvBadge}>
                      <Text style={styles.headerLvBadgeText}>Lv.{activeChar.level || 1}</Text>
                    </View>
                    <Text style={styles.headerStageText} numberOfLines={1}>
                      • {getStageNameWithPet(currentCharStage.stage, activeChar.name)}
                    </Text>
                  </View>
                )}
              </View>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn} activeOpacity={0.75}>
              <X size={20} color="#64748B" />
            </TouchableOpacity>
          </View>

          {/* Scrollable Growth Body */}
          <ScrollView
            style={styles.scrollBody}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 34 }}
          >
            {/* 4-Stage Horizontal Stepper */}
            <View style={[styles.stageStepperCard, isSmallMobile && { padding: 8 }]}>
              <Text style={styles.stageStepperGuide}>
                단계 카드를 탭하여 성장 전·후 모습을 확인하세요 ✨
              </Text>

              <View style={[styles.stageStepperRow, isSmallMobile && { gap: 4 }]}>
                {[1, 2, 3, 4].map((sNum) => {
                  const stg = EVOLUTION_STAGES[sNum];
                  const isSelected = selectedStageNum === sNum;
                  const isPetCurrent = currentCharStage.stage === sNum;
                  const isPassed = currentCharStage.stage > sNum;

                  return (
                    <TouchableOpacity
                      key={sNum}
                      style={[
                        styles.stageStepBtn,
                        isSelected && {
                          borderColor: stg.badgeColor,
                          borderWidth: 2,
                          backgroundColor: '#FFF',
                          shadowColor: stg.badgeColor,
                          shadowOpacity: 0.18,
                        },
                      ]}
                      onPress={() => handleSelectStage(sNum)}
                      activeOpacity={0.8}
                    >
                      <View
                        style={[
                          styles.stageStepCircle,
                          { backgroundColor: isSelected ? stg.badgeColor : '#F1F5F9' },
                        ]}
                      >
                        {isPassed ? (
                          <CheckCircle2 size={16} color={isSelected ? '#FFF' : '#10B981'} />
                        ) : isPetCurrent ? (
                          <Sparkles size={16} color={isSelected ? '#FFF' : stg.badgeColor} />
                        ) : (
                          <Lock size={14} color={isSelected ? '#FFF' : '#94A3B8'} />
                        )}
                      </View>

                      <Text
                        style={[
                          styles.stageStepName,
                          isSelected && { color: stg.badgeColor, fontWeight: '800' },
                        ]}
                      >
                        {getStageNameWithPet(sNum, activeChar?.name)}
                      </Text>

                      <Text style={styles.stageStepLevel}>
                        {sNum === 4 ? 'Lv.20+' : `Lv.${stg.minLevel}~${stg.maxLevel}`}
                      </Text>

                      {isPetCurrent && (
                        <View style={[styles.currentStepBadge, { backgroundColor: stg.badgeColor }]}>
                          <Text style={styles.currentStepBadgeText}>현재</Text>
                        </View>
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Showcase Hero Card */}
            <View style={styles.showcaseCard}>
              {/* Badges: Stage Status & Animal Lineage */}
              <View style={styles.stageStatusRow}>
                {isCurrentStage && (
                  <View style={[styles.stageStatusPill, { backgroundColor: selectedStageData.badgeColor }]}>
                    <Sparkles size={12} color="#FFF" style={{ marginRight: 4 }} />
                    <Text style={styles.stageStatusPillText}>현재 우리 {activeChar?.name || '반려친구'} 단계</Text>
                  </View>
                )}
                {isPastStage && (
                  <View style={[styles.stageStatusPill, { backgroundColor: '#10B981' }]}>
                    <CheckCircle2 size={12} color="#FFF" style={{ marginRight: 4 }} />
                    <Text style={styles.stageStatusPillText}>달성 완료 (과거 모습)</Text>
                  </View>
                )}
                {isFutureStage && (
                  <View style={[styles.stageStatusPill, { backgroundColor: '#64748B' }]}>
                    <Lock size={12} color="#FFF" style={{ marginRight: 4 }} />
                    <Text style={styles.stageStatusPillText}>
                      성장 예정 • Lv.{selectedStageData.minLevel} 해금
                    </Text>
                  </View>
                )}

                <View style={styles.speciesPill}>
                  <Text style={styles.speciesPillText}>{detectedAnimalBadge}</Text>
                </View>
              </View>

              {/* Pedestal & Visual Sprite */}
              <View style={[styles.pedestalContainer, isSmallMobile && { width: 190, height: 190 }]}>
                {/* 2. Scaled Sprite Box Centered inside Aura */}
                <View
                  style={[
                    styles.petSpriteBox,
                    {
                      transform: [{ scale: selectedStageData.scale }],
                      opacity: isFutureStage ? 0.92 : 1.0,
                    },
                  ]}
                >
                  {currentStageImageUrl ? (
                    Platform.OS === 'web' ? (
                      <img
                        src={currentStageImageUrl}
                        alt="petmong stage"
                        style={{
                          width: 156,
                          height: 156,
                          objectFit: 'contain',
                          mixBlendMode: 'multiply',
                          display: 'block',
                          pointerEvents: 'none',
                          userSelect: 'none',
                        }}
                      />
                    ) : (
                      <Image
                        source={{ uri: currentStageImageUrl }}
                        style={styles.petShowcaseImage}
                        resizeMode="contain"
                      />
                    )
                  ) : activeChar?.image_url ? (
                    <TouchableOpacity
                      style={styles.stageLoadingWrap}
                      activeOpacity={0.8}
                      onPress={() => handleSelectStage(selectedStageNum)}
                    >
                      <ActivityIndicator size="small" color="#FF6B47" />
                      <Text style={styles.stageLoadingText}>
                        {generatingStages[selectedStageNum] || isStageGenerationRunning(activeChar?.id)
                          ? `${selectedStageNum}단계 AI 성장 모습 그리는 중... ✨`
                          : `터치하여 ${selectedStageNum}단계 모습 불러오기 ✨`}
                      </Text>
                    </TouchableOpacity>
                  ) : (
                    <Text style={styles.petShowcaseEmoji}>
                      {getEvolvedEmoji(activeChar?.emoji || '🐶', selectedStageData.minLevel)}
                    </Text>
                  )}
                </View>
              </View>

              {/* Status Badge only (No re-roll: appearance is managed via 500P Reincarnation) */}
              {activeChar?.image_url && stageImages[selectedStageNum] && (
                <View style={styles.aiActionWrap}>
                  <View style={styles.aiAppliedRow}>
                    <View style={styles.aiSuccessBadge}>
                      <Sparkles size={12} color="#10B981" style={{ marginRight: 4 }} />
                      <Text style={styles.aiSuccessBadgeText}>
                        {selectedStageNum === 1 ? '초기 입주 원본 모습' : 'AI 맞춤 성장 모습'}
                      </Text>
                    </View>
                  </View>
                </View>
              )}

              {/* Stage Description & Lore */}
              <View style={styles.stageDetailsBox}>
                <Text style={[styles.stageDetailName, { color: selectedStageData.badgeColor }]}>
                  Stage {selectedStageNum}. {getStageNameWithPet(selectedStageNum, activeChar?.name)}
                </Text>
                <Text style={styles.stageDetailSubtitle}>
                  {selectedStageData.stageTitle}
                  {selectedStageData.targetPeriod ? ` • ${selectedStageData.targetPeriod}` : ''}
                  {selectedStageData.requiredExp ? ` (${selectedStageData.requiredExp})` : ''}
                </Text>
                <Text style={styles.stageDetailDesc}>
                  {selectedStageData.desc}
                </Text>
              </View>

              {/* Evolution Progress Box (Towards Next Stage) */}
              {currentCharStage.stage < 4 && (
                <View style={styles.progressCard}>
                  <View style={styles.progressHeaderRow}>
                    <Text style={styles.progressTitle}>
                      다음 성장({getStageNameWithPet(currentCharStage.stage + 1, activeChar?.name)})까지
                    </Text>
                    <Text style={styles.progressRemainText}>
                      {levelsLeftForNext > 0 ? `${levelsLeftForNext}레벨 남음` : '성장 준비 완료! ✨'}
                    </Text>
                  </View>
                  <View style={styles.progressBarBg}>
                    <View
                      style={[
                        styles.progressBarFill,
                        {
                          width: `${Math.min(
                            100,
                            Math.max(
                              12,
                              ((activeChar?.level || 1) / (nextMilestoneLevel || 20)) * 100
                            )
                          )}%`,
                        },
                      ]}
                    />
                  </View>
                  <Text style={styles.progressSubText}>
                    현재 Lv.{activeChar?.level || 1} • 4개월(누적 14,000 EXP) 동안 온 가족의 따뜻한 소통으로 최종 성장(평생 식구)에 도달해요!
                  </Text>
                </View>
              )}
            </View>

            {/* Family Growth Guide Card (실제 성장 방법 안내) */}
            <View style={styles.growthGuideCard}>
              <View style={styles.growthGuideHeader}>
                <Sparkles size={16} color="#FF6B47" style={{ marginRight: 6 }} />
                <Text style={styles.growthGuideTitle}>온 가족이 함께 키우는 법</Text>
              </View>

              {/* 1. 가족 대화 온기 채우기 핵심 가이드 */}
              <View style={styles.warmthGuideBanner}>
                <View style={styles.warmthBannerHeader}>
                  <Text style={styles.warmthBannerTitle}>🔥 오늘 가족 대화 온기 채우기</Text>
                  <View style={styles.warmthMaxBadge}>
                    <Text style={styles.warmthMaxBadgeText}>기본 20% ~ 최대 100%</Text>
                  </View>
                </View>
                <Text style={styles.warmthBannerSub}>
                  가족 온기는 온기를 수확해서 올라가는 것이 아니라, 오늘 가족들이 나눈 소통량에 따라 실시간으로 차오릅니다.
                </Text>

                <View style={[styles.warmthMetricRow, isSmallMobile && { flexDirection: 'column' }]}>
                  <View style={styles.warmthMetricCard}>
                    <View style={styles.warmthMetricTop}>
                      <Text style={styles.warmthMetricEmoji}>💬</Text>
                      <Text style={styles.warmthMetricName}>가족 단톡방 대화</Text>
                    </View>
                    <Text style={styles.warmthMetricRate}>건당 +10% <Text style={styles.warmthMetricLimit}>(최대 60%)</Text></Text>
                    <Text style={styles.warmthMetricDesc}>오늘 대화 6개 이상 나누면 만점!</Text>
                  </View>

                  <View style={styles.warmthMetricCard}>
                    <View style={styles.warmthMetricTop}>
                      <Text style={styles.warmthMetricEmoji}>💌</Text>
                      <Text style={styles.warmthMetricName}>오늘의 스몰톡 답변</Text>
                    </View>
                    <Text style={styles.warmthMetricRate}>인당 +20% <Text style={styles.warmthMetricLimit}>(최대 40%)</Text></Text>
                    <Text style={styles.warmthMetricDesc}>가족 2명 이상 답변 시 만점!</Text>
                  </View>
                </View>

                <View style={styles.warmthRewardHintRow}>
                  <Text style={styles.warmthRewardHintText}>
                    🎁 <Text style={{ fontWeight: '800', color: '#FF6B47' }}>온기 수확 보상 (1일 1회)</Text>: 오늘 소통이 1건이라도 발생하면 거실에서 온기를 수확해 <Text style={{ fontWeight: '700', color: '#1C1917' }}>+25 EXP 성장 경험치</Text>, <Text style={{ fontWeight: '700', color: '#FF6B47' }}>+30 가족 활동 포인트(P)</Text>, <Text style={{ fontWeight: '700', color: '#1C1917' }}>행복도·에너지 100% 완충</Text>을 받으세요! ✨
                  </Text>
                </View>
              </View>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    maxHeight: '92%',
    minHeight: '75%',
    paddingTop: 16,
    paddingHorizontal: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 14,
    elevation: 10,
    width: '100%',
    alignSelf: 'center',
    maxWidth: 620,
  },
  modalContainerMobile: {
    paddingHorizontal: 12,
    maxHeight: '94%',
    minHeight: '80%',
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  headerTitleWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
    marginRight: 8,
  },
  headerTitleTextCol: {
    flex: 1,
  },
  headerIconBox: {
    width: 34,
    height: 34,
    borderRadius: 12,
    backgroundColor: '#FFF0F3',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  headerSubRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
    gap: 5,
    flexWrap: 'wrap',
  },
  headerSubName: {
    fontSize: 12,
    fontWeight: '700',
    color: '#334155',
  },
  headerLvBadge: {
    backgroundColor: '#FFE4E8',
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 6,
  },
  headerLvBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#E11D48',
  },
  headerStageText: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '600',
    flexShrink: 1,
  },
  closeBtn: {
    padding: 6,
    borderRadius: 20,
    backgroundColor: '#F8FAFC',
  },
  scrollBody: {
    flex: 1,
    paddingTop: 12,
  },

  // 4-Stage Stepper
  stageStepperCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 18,
    padding: 10,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  stageStepperGuide: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
    marginBottom: 10,
    textAlign: 'center',
  },
  stageStepperRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 6,
  },
  stageStepBtn: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 2,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    position: 'relative',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  stageStepCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  stageStepName: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#475569',
    textAlign: 'center',
  },
  stageStepLevel: {
    fontSize: 8.5,
    color: '#94A3B8',
    marginTop: 2,
    fontWeight: '600',
    textAlign: 'center',
  },
  currentStepBadge: {
    position: 'absolute',
    top: -6,
    right: -4,
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 6,
  },
  currentStepBadgeText: {
    color: '#FFFFFF',
    fontSize: 8,
    fontWeight: '900',
  },

  // Showcase Hero Card
  showcaseCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#FFE4E8',
    shadowColor: '#FF4D6D',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 3,
    marginBottom: 14,
    width: '100%',
  },
  stageStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
    justifyContent: 'center',
    marginBottom: 8,
  },
  stageStatusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  stageStatusPillText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
  },
  speciesPill: {
    backgroundColor: '#FFF7ED',
    borderWidth: 1,
    borderColor: '#FFEDD5',
    paddingHorizontal: 10,
    paddingVertical: 3.5,
    borderRadius: 12,
  },
  speciesPillText: {
    color: '#C2410C',
    fontSize: 11,
    fontWeight: '800',
  },

  // Pedestal & Sprite Box
  pedestalContainer: {
    width: 210,
    height: 210,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    marginVertical: 4,
  },
  petSpriteBox: {
    width: 164,
    height: 164,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
    mixBlendMode: 'multiply',
  },
  petShowcaseImage: {
    width: 156,
    height: 156,
    mixBlendMode: 'multiply',
  },
  petShowcaseEmoji: {
    fontSize: 88,
    textAlign: 'center',
    lineHeight: 96,
  },
  stageLoadingWrap: {
    width: 120,
    height: 120,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  stageLoadingText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#FF6B47',
    textAlign: 'center',
    marginTop: 6,
  },
  pedestalShadow: {
    height: 12,
    borderRadius: 6,
    backgroundColor: 'rgba(0, 0, 0, 0.08)',
    position: 'absolute',
    bottom: 24,
    zIndex: 1,
  },
  // AI Actions
  aiActionWrap: {
    marginTop: 10,
    marginBottom: 8,
    alignItems: 'center',
  },
  aiAppliedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  aiSuccessBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#BBF7D0',
    paddingHorizontal: 10,
    paddingVertical: 4.5,
    borderRadius: 14,
  },
  aiSuccessBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#15803D',
  },

  // Stage Lore
  stageDetailsBox: {
    alignItems: 'center',
    marginTop: 8,
    paddingHorizontal: 12,
  },
  stageDetailName: {
    fontSize: 16.5,
    fontWeight: '900',
    marginBottom: 2,
  },
  stageDetailSubtitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748B',
    marginBottom: 6,
  },
  stageDetailDesc: {
    fontSize: 12,
    color: '#475569',
    textAlign: 'center',
    lineHeight: 18,
  },

  // Progress Card
  progressCard: {
    width: '100%',
    backgroundColor: '#FFF8F5',
    borderRadius: 14,
    padding: 13,
    marginTop: 14,
    borderWidth: 1,
    borderColor: '#FFE4D6',
  },
  progressHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  progressTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#334155',
  },
  progressRemainText: {
    fontSize: 11.5,
    fontWeight: '800',
    color: '#FF4D6D',
  },
  progressBarBg: {
    height: 8,
    backgroundColor: '#FFE0E3',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#FF4D6D',
    borderRadius: 4,
  },
  progressSubText: {
    fontSize: 10,
    color: '#94A3B8',
    marginTop: 6,
    lineHeight: 14,
  },

  // Growth Guide Card
  growthGuideCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: '#F5F0E8',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  growthGuideHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  growthGuideTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#1C1917',
    flex: 1,
  },
  warmthGuideBanner: {
    backgroundColor: '#FFF5F2',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#FFE8E0',
    marginBottom: 16,
  },
  warmthBannerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  warmthBannerTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FF6B47',
  },
  warmthMaxBadge: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    borderWidth: 0.5,
    borderColor: '#FFE8E0',
  },
  warmthMaxBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#FF6B47',
  },
  warmthBannerSub: {
    fontSize: 11,
    color: '#78716C',
    lineHeight: 15,
    marginBottom: 10,
  },
  warmthMetricRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 10,
  },
  warmthMetricCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 10,
    borderWidth: 1,
    borderColor: '#FFE8E0',
  },
  warmthMetricTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 4,
  },
  warmthMetricEmoji: {
    fontSize: 14,
  },
  warmthMetricName: {
    fontSize: 11.5,
    fontWeight: '800',
    color: '#1C1917',
  },
  warmthMetricRate: {
    fontSize: 12,
    fontWeight: '800',
    color: '#FF6B47',
    marginBottom: 2,
  },
  warmthMetricLimit: {
    fontSize: 10,
    fontWeight: '600',
    color: '#78716C',
  },
  warmthMetricDesc: {
    fontSize: 10,
    color: '#78716C',
    lineHeight: 13,
  },
  warmthRewardHintRow: {
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderWidth: 0.5,
    borderColor: '#FFE8E0',
  },
  warmthRewardHintText: {
    fontSize: 10.5,
    color: '#78716C',
    lineHeight: 15,
  },
  careSectionHeader: {
    marginBottom: 10,
    paddingBottom: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#F5F0E8',
  },
  careSectionTitle: {
    fontSize: 12.5,
    fontWeight: '800',
    color: '#1C1917',
  },
  growthTipsList: {
    gap: 12,
  },
  growthTipItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  growthTipLabel: {
    fontSize: 12.5,
    fontWeight: '800',
    color: '#1C1917',
  },
  growthTipDesc: {
    fontSize: 11,
    color: '#78716C',
    marginTop: 2,
    lineHeight: 15,
  },
});
