import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Dimensions,
  Animated,
  Easing,
  Platform,
  useWindowDimensions,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Svg, { Circle, Line, G, Text as SvgText } from 'react-native-svg';
import { Sparkles, Star, RotateCcw } from 'lucide-react-native';
import { supabase } from '../../lib/supabase';
import { GUARDIAN_CONSTELLATIONS } from './petmongConstants';
import styles from './PetmongStyles';
import type { PetmongCharacter } from '../../types/domain';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const USE_NATIVE_DRIVER = Platform.OS !== 'web';

export interface DragPos {
  x: number;
  y: number;
}

export interface PetmongConstellationCanvasProps {
  character?: PetmongCharacter | any;
  todayStr: string;
  todayStartIso: string;
  isNightMode: boolean;
  lightsDimAnim: Animated.Value;
  checkIsNightTime: () => boolean;
  onGainExp?: (amount: number, reason?: string) => void;
  onUpdateVitals?: (newVitals: any) => void;
  onSpawnHeartToast: (text?: string) => void;
  onSetDialogue: (text: string) => void;
  onSetLivingRoutine: (routine: string) => void;
}

export const PetmongConstellationCanvas = React.memo(
  function PetmongConstellationCanvas({
    character,
    todayStr,
    todayStartIso,
    isNightMode,
    lightsDimAnim,
    checkIsNightTime,
    onGainExp,
    onUpdateVitals,
    onSpawnHeartToast,
    onSetDialogue,
    onSetLivingRoutine,
  }: PetmongConstellationCanvasProps) {
    const [constellationIndex, setConstellationIndex] = useState(() =>
      Math.floor(Math.random() * GUARDIAN_CONSTELLATIONS.length)
    );
    const currentConstellation =
      GUARDIAN_CONSTELLATIONS[constellationIndex] || GUARDIAN_CONSTELLATIONS[0];

    const [connectedStarIds, setConnectedStarIds] = useState<number[]>([1]);
    const [dragCurrentPos, setDragCurrentPos] = useState<DragPos | null>(null);
    const [isConstCompleted, setIsConstCompleted] = useState(false);

    const { width: windowWidth } = useWindowDimensions();
    const activeRoomWidth = windowWidth || SCREEN_WIDTH;
    const [canvasLayout, setCanvasLayout] = useState({
      width: activeRoomWidth,
      height: 230,
    });

    const constGlowAnim = useRef(new Animated.Value(1.0)).current;
    const isMouseActiveRef = useRef(false);
    const nightReturnTimerRef = useRef<any>(null);
    const [hasAwardedConstExpToday, setHasAwardedConstExpToday] =
      useState(false);

    useEffect(() => {
      return () => {
        if (nightReturnTimerRef.current) {
          clearTimeout(nightReturnTimerRef.current);
        }
      };
    }, []);

    // 오늘 별자리 완성 EXP 보상을 이미 수령했는지 DB(petmong_activities) 및 로컬 캐시 확인
    useEffect(() => {
      let isMounted = true;
      const expKey = `@famlink_const_exp_${todayStr}`;

      const checkConstellationCompleted = async () => {
        if (character?.id) {
          try {
            const { data, error } = await supabase
              .from('petmong_activities')
              .select('id, action_type')
              .eq('actor_id', character.id)
              .gte('created_at', todayStartIso)
              .ilike('action_type', 'CONSTELLATION:%');

            if (!error && Array.isArray(data) && data.length > 0) {
              if (isMounted) {
                setHasAwardedConstExpToday(true);
                AsyncStorage.setItem(expKey, 'true').catch(() => {});
              }
              return;
            }
          } catch (e) {
            console.warn('Constellation db sync note:', e);
          }
        }

        AsyncStorage.getItem(expKey)
          .then((val) => {
            if (!isMounted) return;
            if (val === 'true') {
              setHasAwardedConstExpToday(true);
            }
          })
          .catch(() => {});
      };

      checkConstellationCompleted();
      return () => {
        isMounted = false;
      };
    }, [character?.id, todayStr, todayStartIso]);

    const handleCompleteInRoomConstellation = () => {
      setIsConstCompleted(true);
      setDragCurrentPos(null);

      Animated.parallel([
        Animated.timing(lightsDimAnim, {
          toValue: 0,
          duration: 1100,
          easing: Easing.out(Easing.ease),
          useNativeDriver: USE_NATIVE_DRIVER,
        }),
        Animated.sequence([
          Animated.timing(constGlowAnim, {
            toValue: 1.45,
            duration: 400,
            useNativeDriver: USE_NATIVE_DRIVER,
          }),
          Animated.timing(constGlowAnim, {
            toValue: 1.0,
            duration: 700,
            useNativeDriver: USE_NATIVE_DRIVER,
          }),
        ]),
      ]).start();

      const isFirstTimeToday = !hasAwardedConstExpToday;
      const awardedExp = isFirstTimeToday ? 35 : 0;
      if (awardedExp > 0 && onGainExp) {
        onGainExp(awardedExp);
      }
      if (onUpdateVitals) {
        onUpdateVitals((prev: any) => ({
          ...prev,
          energy: 100,
          happiness: 100,
        }));
      }

      if (isFirstTimeToday) {
        setHasAwardedConstExpToday(true);
        const expKey = `@famlink_const_exp_${todayStr}`;
        AsyncStorage.setItem(expKey, 'true').catch(() => {});
        onSpawnHeartToast(
          `+${awardedExp} EXP [${currentConstellation.name}] 완성! 🌟`
        );
        onSetDialogue(
          `별자리가 완성되어 은하수가 환하게 빛났어요! "${currentConstellation.meaning}"의 별빛 축복으로 몽이의 꿀잠 에너지가 충전됐어요 몽 🌟✨`
        );

        if (character?.id && character?.family_id) {
          supabase
            .from('petmong_activities')
            .insert({
              family_id: character.family_id,
              actor_id: character.id,
              action_type: `CONSTELLATION:${currentConstellation.id}`,
            })
            .then(
              () => {},
              (e) => console.warn('Constellation log error:', e)
            );
        }
      } else {
        onSpawnHeartToast(`[${currentConstellation.name}] 완성! 🌟`);
        onSetDialogue(
          `새로운 별자리가 완성되어 은하수가 포근하게 빛났어요! "${currentConstellation.meaning}"의 별빛을 받으며 몽이가 쉬고 있어요 몽 🌟✨`
        );
      }

      if (nightReturnTimerRef.current) clearTimeout(nightReturnTimerRef.current);
      nightReturnTimerRef.current = setTimeout(() => {
        const nextIdx =
          (constellationIndex + 1) % GUARDIAN_CONSTELLATIONS.length;
        setConstellationIndex(nextIdx);
        setIsConstCompleted(false);
        setConnectedStarIds([1]);
        setDragCurrentPos(null);

        if (checkIsNightTime() || isNightMode) {
          Animated.timing(lightsDimAnim, {
            toValue: 1,
            duration: 1500,
            easing: Easing.out(Easing.ease),
            useNativeDriver: USE_NATIVE_DRIVER,
          }).start();
          onSetLivingRoutine('napping');
          onSetDialogue(
            `몽이가 은하수 별빛을 받으며 다시 포근하게 잠들었어요 zZ 🌙 새로운 별자리 "${GUARDIAN_CONSTELLATIONS[nextIdx]?.name}"를 이어보세요 ✨`
          );
          onSpawnHeartToast(
            `새로운 별자리: ${GUARDIAN_CONSTELLATIONS[nextIdx]?.name} ✨`
          );
        }
      }, 5000);
    };

    const processConstellationPoint = (x: number, y: number) => {
      if (isConstCompleted) return;
      setDragCurrentPos({ x, y });

      const stars = currentConstellation.stars;
      const w = canvasLayout.width || SCREEN_WIDTH;
      const h = canvasLayout.height || 230;

      const currentList = connectedStarIds;
      if (currentList.length === 0) {
        const star1 = stars[0];
        const s1x = star1.normX * w;
        const s1y = star1.normY * h;
        if (Math.hypot(x - s1x, y - s1y) < 38) {
          setConnectedStarIds([star1.id]);
          onSpawnHeartToast('✨ 첫 번째 별 연결!');
        }
        return;
      }

      const lastConnectedId = currentList[currentList.length - 1];
      if (lastConnectedId < stars.length) {
        const nextStar = stars.find((s) => s.id === lastConnectedId + 1);
        if (nextStar) {
          const nx = nextStar.normX * w;
          const ny = nextStar.normY * h;
          if (Math.hypot(x - nx, y - ny) < 38) {
            const nextList = [...currentList, nextStar.id];
            setConnectedStarIds(nextList);

            if (nextList.length === stars.length) {
              handleCompleteInRoomConstellation();
            } else {
              onSpawnHeartToast(`✨ ${nextStar.id}번 별 연결!`);
            }
          }
        }
      }
    };

    const handleResetConstellation = () => {
      if (nightReturnTimerRef.current) clearTimeout(nightReturnTimerRef.current);
      const nextIdx = (constellationIndex + 1) % GUARDIAN_CONSTELLATIONS.length;
      setConstellationIndex(nextIdx);
      setIsConstCompleted(false);
      setConnectedStarIds([1]);
      setDragCurrentPos(null);
      Animated.timing(lightsDimAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: USE_NATIVE_DRIVER,
      }).start();
      onSpawnHeartToast(
        `새로운 수호 별자리: ${GUARDIAN_CONSTELLATIONS[nextIdx]?.name} ✨`
      );
      onSetDialogue(
        `새로운 수호 별자리 "${GUARDIAN_CONSTELLATIONS[nextIdx]?.name}"가 밤하늘에 떠올랐어요 🌙 별을 순서대로 이어보세요 ✨`
      );
    };

    const handleConstellationTouch = (e: any) => {
      if (isConstCompleted) return;
      const t = e.nativeEvent?.touches?.[0] || e.nativeEvent;
      const x = t.locationX != null ? t.locationX : t.pageX || 0;
      const y = t.locationY != null ? t.locationY : t.pageY ? t.pageY - 55 : 0;
      processConstellationPoint(x, y);
    };

    const handleConstellationWebMouse = (e: any) => {
      if (isConstCompleted) return;
      const x =
        e.nativeEvent?.offsetX ?? (e.nativeEvent?.locationX ?? (e.clientX || 0));
      const y =
        e.nativeEvent?.offsetY ??
        (e.nativeEvent?.locationY ?? (e.clientY ? e.clientY - 55 : 0));
      processConstellationPoint(x, y);
    };

    const handleConstellationTouchEnd = () => {
      isMouseActiveRef.current = false;
      setDragCurrentPos(null);
    };

    const connectedConstellationLines = useMemo(() => {
      const lines = [];
      const stars = currentConstellation.stars;
      const w = canvasLayout.width || SCREEN_WIDTH;
      const h = canvasLayout.height || 230;

      for (let i = 0; i < connectedStarIds.length - 1; i++) {
        const s1 = stars.find((s) => s.id === connectedStarIds[i]);
        const s2 = stars.find((s) => s.id === connectedStarIds[i + 1]);
        if (s1 && s2) {
          lines.push({
            id: `line_${s1.id}_${s2.id}`,
            x1: s1.normX * w,
            y1: s1.normY * h,
            x2: s2.normX * w,
            y2: s2.normY * h,
          });
        }
      }
      return lines;
    }, [connectedStarIds, currentConstellation, canvasLayout]);

    const lastConnectedStar = useMemo(() => {
      const lastId = connectedStarIds[connectedStarIds.length - 1];
      return currentConstellation.stars.find((s) => s.id === lastId);
    }, [connectedStarIds, currentConstellation]);

    const dragStartPoint = useMemo(() => {
      if (!lastConnectedStar) return null;
      const w = canvasLayout.width || SCREEN_WIDTH;
      const h = canvasLayout.height || 230;
      return {
        x: lastConnectedStar.normX * w,
        y: lastConnectedStar.normY * h,
      };
    }, [lastConnectedStar, canvasLayout]);

    const nextTargetStarId = useMemo(() => {
      const lastId = connectedStarIds[connectedStarIds.length - 1] || 0;
      return lastId < currentConstellation.stars.length ? lastId + 1 : null;
    }, [connectedStarIds, currentConstellation]);

    return (
      <View
        style={[styles.inRoomConstellationCanvas, { width: '100%' }]}
        onLayout={(e) => {
          const { width, height } = e.nativeEvent.layout;
          if (width > 0 && height > 0) {
            setCanvasLayout({ width, height });
          }
        }}
        onTouchStart={handleConstellationTouch}
        onTouchMove={handleConstellationTouch}
        onTouchEnd={handleConstellationTouchEnd}
        {...({
          onMouseDown: (e: any) => {
            isMouseActiveRef.current = true;
            handleConstellationWebMouse(e);
          },
          onMouseMove: (e: any) => {
            if (isMouseActiveRef.current) handleConstellationWebMouse(e);
          },
          onMouseUp: handleConstellationTouchEnd,
          onMouseLeave: handleConstellationTouchEnd,
        } as any)}
      >
        <View style={styles.constellationHeaderRow} pointerEvents="box-none">
          {!isConstCompleted ? (
            <View style={styles.constellationHeaderPill}>
              <Sparkles size={12} color="#FDE047" fill="#FDE047" />
              <Text
                style={styles.constellationHeaderText}
                numberOfLines={1}
                ellipsizeMode="tail"
              >
                수호 별자리: {currentConstellation.name} · 별을 순서대로 이어보세요
              </Text>
            </View>
          ) : (
            <View style={styles.constellationCompletedRow}>
              <View style={styles.constellationHeaderPillDone}>
                <Star size={12} color="#FDE047" fill="#FDE047" />
                <Text
                  style={styles.constellationHeaderTextDone}
                  numberOfLines={1}
                  ellipsizeMode="tail"
                >
                  {currentConstellation.name} 완성! ✨ {currentConstellation.meaning}
                </Text>
              </View>
              <TouchableOpacity
                onPress={handleResetConstellation}
                style={styles.constellationResetBtn}
                activeOpacity={0.7}
              >
                <RotateCcw size={11} color="#FEF08A" />
                <Text style={styles.constellationResetText}>다음 별자리</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        <Svg
          width={canvasLayout.width}
          height={canvasLayout.height}
          style={StyleSheet.absoluteFill}
          pointerEvents="none"
        >
          {connectedConstellationLines.map((line) => (
            <Line
              key={line.id}
              x1={line.x1}
              y1={line.y1}
              x2={line.x2}
              y2={line.y2}
              stroke={isConstCompleted ? '#FDE047' : '#93C5FD'}
              strokeWidth={isConstCompleted ? 2.8 : 2.2}
              strokeLinecap="round"
              opacity={isConstCompleted ? 0.95 : 0.85}
            />
          ))}

          {dragStartPoint && dragCurrentPos && (
            <Line
              x1={dragStartPoint.x}
              y1={dragStartPoint.y}
              x2={dragCurrentPos.x}
              y2={dragCurrentPos.y}
              stroke="#FDE047"
              strokeWidth={2.2}
              strokeDasharray="4, 4"
              strokeLinecap="round"
              opacity={0.9}
            />
          )}

          {currentConstellation.stars.map((star) => {
            const sx = star.normX * canvasLayout.width;
            const sy = star.normY * canvasLayout.height;
            const isConnected = connectedStarIds.includes(star.id);
            const isNext = star.id === nextTargetStarId;

            return (
              <G key={`star_${star.id}`}>
                {isConnected && (
                  <Circle
                    cx={sx}
                    cy={sy}
                    r={isConstCompleted ? 14 : 11}
                    fill={
                      isConstCompleted
                        ? 'rgba(253, 224, 71, 0.35)'
                        : 'rgba(147, 197, 253, 0.35)'
                    }
                  />
                )}
                {isNext && (
                  <Circle
                    cx={sx}
                    cy={sy}
                    r={13}
                    fill="rgba(253, 224, 71, 0.3)"
                  />
                )}
                <Circle
                  cx={sx}
                  cy={sy}
                  r={
                    isConnected
                      ? isConstCompleted
                        ? 6.5
                        : 5.5
                      : isNext
                      ? 5.5
                      : 4
                  }
                  fill={
                    isConnected ? '#FDE047' : isNext ? '#FEF08A' : '#CBD5E1'
                  }
                  stroke={isConnected ? '#FFFFFF' : '#94A3B8'}
                  strokeWidth={1.5}
                />
                <SvgText
                  x={sx}
                  y={sy - 9}
                  fill={
                    isConnected ? '#FEF08A' : isNext ? '#FDE047' : '#94A3B8'
                  }
                  fontSize="10"
                  fontWeight="bold"
                  textAnchor="middle"
                >
                  {star.id}
                </SvgText>
              </G>
            );
          })}
        </Svg>
      </View>
    );
  }
);
