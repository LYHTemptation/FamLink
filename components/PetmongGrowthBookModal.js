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
} from 'react-native';
import Svg, { Circle, Path, G, Defs, RadialGradient, Stop } from 'react-native-svg';
import {
  BookOpen,
  Sparkles,
  Star,
  Crown,
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
  detectSpecies,
} from '../lib/petmongEvolutionService';

const { width: SCREEN_WIDTH } = Dimensions.get('window');



// Stage Celestial Aura Decorator
function StageAuraVisual({ stageNum, size = 200 }) {
  const half = size / 2;
  switch (stageNum) {
    case 1:
      return (
        <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={StyleSheet.absoluteFillObject}>
          <Circle cx={half} cy={half} r={half * 0.88} fill="rgba(255, 107, 71, 0.12)" stroke="#FF6B47" strokeWidth="1.5" strokeDasharray="4 4" />
          <Circle cx={half} cy={half} r={half * 0.7} fill="rgba(255, 240, 242, 0.65)" />
        </Svg>
      );
    case 2:
      return (
        <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={StyleSheet.absoluteFillObject}>
          <Circle cx={half} cy={half} r={half * 0.9} fill="rgba(16, 185, 129, 0.12)" stroke="#10B981" strokeWidth="2" strokeDasharray="6 3" />
          <Circle cx={half} cy={half} r={half * 0.74} fill="rgba(236, 253, 245, 0.7)" />
        </Svg>
      );
    case 3:
      return (
        <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={StyleSheet.absoluteFillObject}>
          <Circle cx={half} cy={half} r={half * 0.92} fill="rgba(59, 130, 246, 0.12)" stroke="#3B82F6" strokeWidth="2" />
          <Circle cx={half} cy={half} r={half * 0.8} stroke="#93C5FD" strokeWidth="1.5" strokeDasharray="3 3" />
          <Circle cx={half} cy={half} r={half * 0.72} fill="rgba(239, 246, 255, 0.75)" />
        </Svg>
      );
    case 4:
    default:
      return (
        <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={StyleSheet.absoluteFillObject}>
          <Circle cx={half} cy={half} r={half * 0.95} fill="rgba(245, 158, 11, 0.16)" stroke="#F59E0B" strokeWidth="2.5" />
          <Circle cx={half} cy={half} r={half * 0.84} stroke="#FDE68A" strokeWidth="1.5" strokeDasharray="5 3" />
          <Circle cx={half} cy={half} r={half * 0.72} fill="rgba(255, 251, 235, 0.85)" />
        </Svg>
      );
  }
}

export default function PetmongGrowthBookModal({
  visible,
  onClose,
  character,
}) {
  const [selectedStageNum, setSelectedStageNum] = useState(1);
  const [stageImages, setStageImages] = useState({});
  const [generatingStages, setGeneratingStages] = useState({});

  // Active family petmong
  const activeChar = character || null;

  // Current real stage of the petmong
  const currentCharStage = useMemo(() => {
    return getEvolutionStage(activeChar?.level || 1);
  }, [activeChar?.level]);

  // Sync selected stage with pet's stage when opening
  useEffect(() => {
    if (activeChar && visible) {
      setSelectedStageNum(getEvolutionStage(activeChar.level || 1).stage);
    }
  }, [activeChar?.id, visible]);

  // Load cached stage images for activeChar and generate any missing stages
  const loadStageImages = useCallback(async () => {
    if (!activeChar?.id) return;
    try {
      const cached = await getPetmongStageImages(activeChar.id);
      // Ensure Stage 1 has the base image
      if (!cached[1] && activeChar.image_url) {
        cached[1] = activeChar.image_url;
        await savePetmongStageImage(activeChar.id, 1, activeChar.image_url);
      }
      setStageImages(cached);

      // If any stages (2, 3, 4) are missing, trigger sequential generation
      if (activeChar.image_url && (!cached[2] || !cached[3] || !cached[4])) {
        const missing = [2, 3, 4].filter(s => !cached[s]);
        setGeneratingStages(prev => {
          const next = { ...prev };
          missing.forEach(s => { next[s] = true; });
          return next;
        });

        startBackgroundStagePreGeneration(activeChar, (stage, url) => {
          setStageImages(prev => ({ ...prev, [stage]: url }));
          setGeneratingStages(prev => ({ ...prev, [stage]: false }));
        }).finally(() => {
          setGeneratingStages({});
        });
      }
    } catch (err) {
      console.warn('loadStageImages error:', err);
    }
  }, [activeChar]);

  useEffect(() => {
    if (visible && activeChar?.id) {
      loadStageImages();
    }
  }, [visible, activeChar?.id, loadStageImages]);

  const handleSelectStage = useCallback(async (sNum) => {
    setSelectedStageNum(sNum);
    if (!stageImages[sNum] && activeChar?.id && activeChar?.image_url && !generatingStages[sNum]) {
      setGeneratingStages(prev => ({ ...prev, [sNum]: true }));
      try {
        const url = await generateStageAiImage(activeChar, sNum);
        if (url) {
          setStageImages(prev => ({ ...prev, [sNum]: url }));
        }
      } catch (e) {
        console.warn(`On-demand stage ${sNum} generation error:`, e);
      } finally {
        setGeneratingStages(prev => ({ ...prev, [sNum]: false }));
      }
    }
  }, [stageImages, activeChar, generatingStages]);

  if (!visible) return null;

  const selectedStageData = EVOLUTION_STAGES[selectedStageNum] || EVOLUTION_STAGES[1];
  const isPastStage = currentCharStage.stage > selectedStageNum;
  const isCurrentStage = currentCharStage.stage === selectedStageNum;
  const isFutureStage = currentCharStage.stage < selectedStageNum;

  // Next level milestone calculation
  const nextMilestoneLevel = selectedStageNum < 4 ? EVOLUTION_STAGES[selectedStageNum + 1]?.minLevel : null;
  const levelsLeftForNext = nextMilestoneLevel ? Math.max(0, nextMilestoneLevel - (activeChar?.level || 1)) : 0;

  // Detect animal species badge
  const detectedAnimalBadge = (() => {
    if (!activeChar) return '가족 반려친구 🐾';
    const spec = detectSpecies(activeChar.emoji, activeChar.name);
    const map = {
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
        <View style={styles.modalContainer}>
          {/* Header Bar */}
          <View style={styles.headerRow}>
            <View style={styles.headerTitleWrap}>
              <View style={styles.headerIconBox}>
                <BookOpen size={18} color="#FF4D6D" />
              </View>
              <View>
                <Text style={styles.headerTitle}>
                  {activeChar ? `${activeChar.name}의 성장 앨범` : '가족 반려친구 성장 앨범'}
                </Text>
                {activeChar && (
                  <View style={styles.headerSubRow}>
                    <Text style={styles.headerSubName}>{activeChar.name}</Text>
                    <View style={styles.headerLvBadge}>
                      <Text style={styles.headerLvBadgeText}>Lv.{activeChar.level || 1}</Text>
                    </View>
                    <Text style={styles.headerStageText}>
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
            <View style={styles.stageStepperCard}>
              <Text style={styles.stageStepperGuide}>
                단계 카드를 탭하여 성장 전·후 모습을 확인하세요 ✨
              </Text>

              <View style={styles.stageStepperRow}>
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
              <View style={styles.pedestalContainer}>
                <StageAuraVisual stageNum={selectedStageNum} size={210} />

                {/* Overlaid Special Stage Accents */}
                {selectedStageNum === 4 && (
                  <View style={styles.guardianHaloBadge}>
                    <Crown size={22} color="#F59E0B" fill="#FDE68A" />
                  </View>
                )}
                {selectedStageNum === 3 && (
                  <View style={styles.starBadgeDecor}>
                    <Star size={18} color="#3B82F6" fill="#BFDBFE" />
                  </View>
                )}
                {selectedStageNum === 2 && (
                  <View style={styles.sproutBadgeDecor}>
                    <Sparkles size={16} color="#10B981" fill="#A7F3D0" />
                  </View>
                )}

                {/* Scaled Sprite Box */}
                <View
                  style={[
                    styles.petSpriteBox,
                    {
                      transform: [{ scale: selectedStageData.scale }],
                      opacity: isFutureStage ? 0.92 : 1.0,
                    },
                  ]}
                >
                  {stageImages[selectedStageNum] ? (
                    <Image
                      source={{ uri: stageImages[selectedStageNum] }}
                      style={styles.petShowcaseImage}
                      resizeMode="contain"
                    />
                  ) : generatingStages[selectedStageNum] ? (
                    <View style={styles.stageLoadingWrap}>
                      <ActivityIndicator size="small" color="#FF6B47" />
                      <Text style={styles.stageLoadingText}>
                        {selectedStageNum}단계 AI 생성 중... ✨
                      </Text>
                    </View>
                  ) : activeChar?.image_url ? (
                    <Image
                      source={{ uri: activeChar.image_url }}
                      style={[styles.petShowcaseImage, { opacity: selectedStageNum === 1 ? 1 : 0.65 }]}
                      resizeMode="contain"
                    />
                  ) : (
                    <Text style={styles.petShowcaseEmoji}>
                      {getEvolvedEmoji(activeChar?.emoji || '🐶', selectedStageData.minLevel)}
                    </Text>
                  )}
                </View>

                {/* Ground Soft Shadow */}
                <View
                  style={[
                    styles.pedestalShadow,
                    { width: Math.round(76 * selectedStageData.scale) },
                  ]}
                />
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

                <View style={styles.warmthMetricRow}>
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
                    🎁 <Text style={{ fontWeight: '800', color: '#FF6B47' }}>온기 수확 보상</Text>: 오늘 소통이 1건이라도 발생하면 거실에서 온기를 수확해 <Text style={{ fontWeight: '700', color: '#1C1917' }}>+30 EXP 성장 경험치</Text>와 <Text style={{ fontWeight: '700', color: '#1C1917' }}>행복도·에너지 100% 완충</Text>을 받으세요! (가족 포인트는 집안일·스몰톡에서 획득)
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
    fontSize: 16.5,
    fontWeight: '800',
    color: '#0F172A',
  },
  headerSubRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
    gap: 5,
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
    fontSize: 11.5,
    color: '#64748B',
    fontWeight: '600',
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
    padding: 12,
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
    paddingVertical: 10,
    paddingHorizontal: 4,
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
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 5,
  },
  stageStepName: {
    fontSize: 11,
    fontWeight: '700',
    color: '#475569',
  },
  stageStepLevel: {
    fontSize: 9,
    color: '#94A3B8',
    marginTop: 2,
    fontWeight: '600',
  },
  currentStepBadge: {
    position: 'absolute',
    top: -6,
    right: -4,
    paddingHorizontal: 5,
    paddingVertical: 1.5,
    borderRadius: 7,
  },
  currentStepBadgeText: {
    color: '#FFFFFF',
    fontSize: 8.5,
    fontWeight: '900',
  },

  // Showcase Hero Card
  showcaseCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    padding: 18,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#FFE4E8',
    shadowColor: '#FF4D6D',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 3,
    marginBottom: 14,
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
    width: 220,
    height: 190,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    marginVertical: 4,
  },
  guardianHaloBadge: {
    position: 'absolute',
    top: 6,
    zIndex: 5,
  },
  starBadgeDecor: {
    position: 'absolute',
    top: 12,
    right: 28,
    zIndex: 5,
  },
  sproutBadgeDecor: {
    position: 'absolute',
    top: 16,
    right: 36,
    zIndex: 5,
  },
  petSpriteBox: {
    width: 120,
    height: 120,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  petShowcaseImage: {
    width: 115,
    height: 115,
  },
  petShowcaseEmoji: {
    fontSize: 72,
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
    height: 14,
    borderRadius: 7,
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
    position: 'absolute',
    bottom: 22,
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
