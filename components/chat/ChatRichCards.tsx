import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Alert,
  Linking,
  Platform,
} from 'react-native';
import {
  BookOpen,
  Sparkles,
  Truck,
  FileText,
  Download,
  Play,
  Square,
  Video,
  Vote,
  Calendar,
  CheckCircle2,
  CheckSquare,
  Plus,
  MapPin,
  Share2,
} from 'lucide-react-native';
import styles from './ChatStyles';
import {
  ParsedPhotobookOrderData,
  extractReactionsAndCleanText,
} from './chatHelpers';

export interface ChatRichCardRendererProps {
  item: any;
  isMe: boolean;
  bubbleText: string;
  photobookOrderData: ParsedPhotobookOrderData | null;
  currentUser?: string;
  currentUserProfile?: any;
  audioPlayingId: string | number | null;
  setAudioPlayingId: (id: string | number | null) => void;
  onUpdateMessageVote?: (messageId: string | number, newText: string) => void;
  onAddEvent?: (eventData: any) => void;
  onAddChore?: (choreData: any) => void;
  onAddShoppingItem?: (itemData: any) => void;
}

export default function ChatRichCardRenderer({
  item,
  isMe,
  bubbleText,
  photobookOrderData,
  currentUser,
  currentUserProfile,
  audioPlayingId,
  setAudioPlayingId,
  onUpdateMessageVote,
  onAddEvent,
  onAddChore,
  onAddShoppingItem,
}: ChatRichCardRendererProps): React.ReactElement | null {
  if (photobookOrderData) {
    return (
      <View style={styles.photobookCardContainer}>
        <View style={styles.photobookCardTop}>
          <View style={styles.photobookIconCircle}>
            <BookOpen size={18} color="#FF6B47" strokeWidth={2.4} />
          </View>
          <View style={styles.photobookDetailsCol}>
            <View style={styles.photobookBadgeRow}>
              <Text style={styles.photobookCardBadge}>실물 양장본 발주 접수</Text>
              <Sparkles size={11} color="#FF6B47" />
            </View>
            <Text style={styles.photobookCardTitle} numberOfLines={2}>
              {photobookOrderData.bookTitle}
            </Text>
            <Text style={styles.photobookCardSubtitle}>
              150×210mm A5 · {photobookOrderData.volume || 'Vol. 1'} · {photobookOrderData.copies}
            </Text>
          </View>
        </View>

        <View style={styles.photobookSpecsBox}>
          {photobookOrderData.orderNumber && (
            <View style={styles.photobookSpecRow}>
              <Text style={styles.photobookSpecLabel}>주문번호</Text>
              <Text style={styles.photobookSpecValue}>{photobookOrderData.orderNumber}</Text>
            </View>
          )}
          <View style={styles.photobookSpecRow}>
            <Text style={styles.photobookSpecLabel}>수령인</Text>
            <Text style={styles.photobookSpecValue}>{photobookOrderData.recipient}님</Text>
          </View>
          {photobookOrderData.pointsUsed > 0 && (
            <View style={styles.photobookSpecRow}>
              <Text style={styles.photobookSpecLabel}>교환 포인트</Text>
              <Text style={[styles.photobookSpecValue, { color: '#FF6B47', fontWeight: '800' }]}>
                {photobookOrderData.pointsUsed.toLocaleString()} P (전액 교환)
              </Text>
            </View>
          )}
          {photobookOrderData.totalPrice > 0 ? (
            <View style={styles.photobookSpecRow}>
              <Text style={styles.photobookSpecLabel}>결제 금액</Text>
              <Text style={[styles.photobookSpecValue, { fontWeight: '800', color: '#1C1917' }]}>
                {photobookOrderData.totalPrice.toLocaleString()}원
              </Text>
            </View>
          ) : (
            <View style={styles.photobookSpecRow}>
              <Text style={styles.photobookSpecLabel}>실결제 금액</Text>
              <Text style={[styles.photobookSpecValue, { fontWeight: '800', color: '#16A34A' }]}>
                0원 (무료 배송)
              </Text>
            </View>
          )}
          {photobookOrderData.address ? (
            <View style={styles.photobookSpecRow}>
              <Text style={styles.photobookSpecLabel}>배송지</Text>
              <Text style={styles.photobookSpecValue} numberOfLines={1}>
                {photobookOrderData.address}
              </Text>
            </View>
          ) : null}
        </View>

        <View style={styles.photobookCardFooter}>
          <Truck size={13} color="#16A34A" style={{ marginRight: 5 }} />
          <Text style={styles.photobookCardFooterText}>
            정밀 POD 인쇄 제작 중 (3~4일 이내 도착)
          </Text>
        </View>
      </View>
    );
  }

  if (bubbleText.startsWith('[파일] ')) {
    let fileData: any = {};
    try {
      fileData = JSON.parse(bubbleText.replace('[파일] ', ''));
    } catch (_) {
      fileData = { name: '첨부파일', size: '문서', uri: '' };
    }
    return (
      <TouchableOpacity
        style={styles.fileCardContainer}
        activeOpacity={0.8}
        onPress={() => {
          if (fileData.uri) {
            Linking.openURL(fileData.uri).catch(() => {
              Alert.alert('파일 열기 안내', '파일명: ' + fileData.name);
            });
          } else {
            Alert.alert('파일 정보', fileData.name);
          }
        }}
      >
        <View style={styles.fileIconBadge}>
          <FileText size={22} color="#FF6B47" />
        </View>
        <View style={styles.fileDetails}>
          <Text style={styles.fileNameText} numberOfLines={1}>
            {fileData.name}
          </Text>
          <Text style={styles.fileSizeText}>{fileData.size || '문서 파일'}</Text>
        </View>
        <Download size={18} color="#78716C" />
      </TouchableOpacity>
    );
  }

  if (bubbleText.startsWith('[동영상] ')) {
    let videoData: any = {};
    try {
      videoData = JSON.parse(bubbleText.replace('[동영상] ', ''));
    } catch (_) {
      videoData = { duration: 0, name: '가족 비디오', uri: '' };
    }
    return (
      <TouchableOpacity
        style={styles.videoCardContainer}
        activeOpacity={0.85}
        onPress={() => {
          if (videoData.uri) {
            Linking.openURL(videoData.uri).catch(() => {
              Alert.alert('동영상 재생', videoData.name || '동영상');
            });
          } else {
            Alert.alert('동영상 안내', videoData.name || '가족 동영상');
          }
        }}
      >
        <View style={styles.videoThumbnailPlaceholder}>
          <View style={styles.videoPlayCircle}>
            <Play size={20} color="#FFFFFF" fill="#FFFFFF" style={{ marginLeft: 2 }} />
          </View>
          <View style={styles.videoBadge}>
            <Video size={12} color="#FFFFFF" style={{ marginRight: 4 }} />
            <Text style={styles.videoBadgeText}>
              {videoData.duration ? `${videoData.duration}초` : '동영상'}
            </Text>
          </View>
        </View>
        <View style={styles.videoInfoBar}>
          <Text style={styles.videoTitleText} numberOfLines={1}>
            {videoData.name || '가족 동영상'}
          </Text>
        </View>
      </TouchableOpacity>
    );
  }

  if (bubbleText.startsWith('[음성메모] ')) {
    let voiceData: any = {};
    try {
      voiceData = JSON.parse(bubbleText.replace('[음성메모] ', ''));
    } catch (_) {
      voiceData = { duration: 3 };
    }
    const msgKey = item.id || item.timestamp;
    const isPlaying = audioPlayingId === msgKey;

    return (
      <TouchableOpacity
        style={[styles.voiceCardContainer, isMe ? styles.voiceCardMe : styles.voiceCardOther]}
        activeOpacity={0.8}
        onPress={() => {
          if (isPlaying) {
            setAudioPlayingId(null);
          } else {
            setAudioPlayingId(msgKey);
            if (Platform.OS === 'web' && voiceData.uri && typeof window !== 'undefined' && (window as any).Audio) {
              try {
                const audioObj = new (window as any).Audio(voiceData.uri);
                audioObj.onended = () => setAudioPlayingId(null);
                audioObj.onerror = () => {
                  setTimeout(() => setAudioPlayingId(null), (voiceData.duration || 3) * 1000);
                };
                audioObj.play().catch(() => {
                  setTimeout(() => setAudioPlayingId(null), (voiceData.duration || 3) * 1000);
                });
                return;
              } catch (_) {}
            }
            setTimeout(() => {
              setAudioPlayingId(null);
            }, (voiceData.duration || 3) * 1000);
          }
        }}
      >
        <View style={[styles.voicePlayBtn, isPlaying && styles.voicePlayBtnActive]}>
          {isPlaying ? (
            <Square size={13} color="#FFFFFF" fill="#FFFFFF" />
          ) : (
            <Play size={15} color="#FFFFFF" fill="#FFFFFF" style={{ marginLeft: 2 }} />
          )}
        </View>
        <View style={styles.voiceWaveContainer}>
          <View style={[styles.voiceWaveBar, { height: 8 }, isPlaying && styles.waveBarPlaying]} />
          <View style={[styles.voiceWaveBar, { height: 16 }, isPlaying && styles.waveBarPlaying]} />
          <View style={[styles.voiceWaveBar, { height: 22 }, isPlaying && styles.waveBarPlaying]} />
          <View style={[styles.voiceWaveBar, { height: 14 }, isPlaying && styles.waveBarPlaying]} />
          <View style={[styles.voiceWaveBar, { height: 18 }, isPlaying && styles.waveBarPlaying]} />
          <View style={[styles.voiceWaveBar, { height: 10 }, isPlaying && styles.waveBarPlaying]} />
          <View style={[styles.voiceWaveBar, { height: 15 }, isPlaying && styles.waveBarPlaying]} />
        </View>
        <Text style={[styles.voiceDurationText, isMe ? styles.voiceTextMe : styles.voiceTextOther]}>
          {isPlaying ? '재생 중' : `${voiceData.duration || 1}초`}
        </Text>
      </TouchableOpacity>
    );
  }

  if (bubbleText.startsWith('[가족투표] ')) {
    let pollData: any = {};
    try {
      pollData = JSON.parse(bubbleText.replace('[가족투표] ', ''));
    } catch (_) {
      pollData = { title: '가족 투표', options: [] };
    }
    const myId = currentUserProfile?.id || currentUser;
    const totalVotes = (pollData.options || []).reduce(
      (acc: number, opt: any) => acc + (opt.votes?.length || 0),
      0
    );

    const handleVoteOption = (optIndex: number) => {
      if (!onUpdateMessageVote || !item.id) {
        Alert.alert('투표 참여', '투표 기능이 정상 연결되었습니다.');
        return;
      }
      const updatedOptions = (pollData.options || []).map((opt: any, idx: number) => {
        const currentVotes = Array.isArray(opt.votes) ? opt.votes : [];
        const filteredVotes = currentVotes.filter((v: string) => v !== myId);
        if (idx === optIndex) {
          return { ...opt, votes: [...filteredVotes, myId] };
        }
        return { ...opt, votes: filteredVotes };
      });
      const updatedPoll = { ...pollData, options: updatedOptions };
      // 기존에 공감([[REACT:...]])이 달려 있었다면 그대로 보존
      const { reactions } = extractReactionsAndCleanText(
        typeof item.text === 'string' ? item.text : ''
      );
      const hasReactions = Object.keys(reactions).length > 0;
      const reactionSuffix = hasReactions ? `\n[[REACT:${JSON.stringify(reactions)}]]` : '';
      onUpdateMessageVote(
        item.id,
        `[가족투표] ${JSON.stringify(updatedPoll)}${reactionSuffix}`
      );
    };

    return (
      <View style={styles.pollCardContainer}>
        <View style={styles.pollCardHeader}>
          <View style={styles.pollIconCircle}>
            <Vote size={16} color="#FF6B47" />
          </View>
          <View style={styles.pollHeaderTexts}>
            <Text style={styles.pollBadgeTitle}>가족 실시간 투표</Text>
            <Text style={styles.pollCardTitle}>{pollData.title}</Text>
          </View>
        </View>

        <View style={styles.pollOptionsList}>
          {(pollData.options || []).map((opt: any, idx: number) => {
            const optVotes = opt.votes || [];
            const isVoted = optVotes.includes(myId);
            const percent =
              totalVotes > 0 ? Math.round((optVotes.length / totalVotes) * 100) : 0;
            return (
              <TouchableOpacity
                key={idx}
                style={[styles.pollOptionButton, isVoted && styles.pollOptionButtonSelected]}
                onPress={() => handleVoteOption(idx)}
                activeOpacity={0.75}
              >
                <View style={[styles.pollProgressBar, { width: `${percent}%` }]} />
                <View style={styles.pollOptionContentRow}>
                  <View style={styles.pollOptionLeft}>
                    <View style={[styles.pollRadio, isVoted && styles.pollRadioSelected]}>
                      {isVoted && <View style={styles.pollRadioInner} />}
                    </View>
                    <Text
                      style={[
                        styles.pollOptionText,
                        isVoted && styles.pollOptionTextSelected,
                      ]}
                    >
                      {opt.text}
                    </Text>
                  </View>
                  <Text style={styles.pollOptionCount}>
                    {optVotes.length}표 ({percent}%)
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
        <View style={styles.pollCardFooter}>
          <Text style={styles.pollTotalVotesText}>총 {totalVotes}명 참여</Text>
        </View>
      </View>
    );
  }

  if (bubbleText.startsWith('[일정공유] ')) {
    let eventData: any = {};
    try {
      eventData = JSON.parse(bubbleText.replace('[일정공유] ', ''));
    } catch (_) {
      eventData = { title: '가족 일정', date: '오늘', time: '18:00' };
    }

    return (
      <View style={styles.eventCardContainer}>
        <View style={styles.eventCardTop}>
          <View style={styles.eventIconCircle}>
            <Calendar size={18} color="#FF6B47" />
          </View>
          <View style={styles.eventDetailsCol}>
            <Text style={styles.eventCardBadge}>가족 캘린더 공유</Text>
            <Text style={styles.eventCardTitle}>{eventData.title}</Text>
            <Text style={styles.eventCardDateTime}>
              📅 {eventData.date}  ⏰ {eventData.time}
            </Text>
          </View>
        </View>

        <TouchableOpacity
          style={styles.eventCardActionBtn}
          activeOpacity={0.8}
          onPress={() => {
            if (onAddEvent) {
              onAddEvent({
                title: eventData.title,
                date: eventData.date,
                endDate: eventData.date,
                time: eventData.time || '18:00',
                category: eventData.category || '가족',
              });
              Alert.alert(
                '등록 완료 🎉',
                `'${eventData.title}' 일정이 가족 캘린더에 성공적으로 저장되었습니다!`
              );
            } else {
              Alert.alert('안내', '캘린더 연동이 완료되었습니다.');
            }
          }}
        >
          <CheckCircle2 size={15} color="#FFFFFF" style={{ marginRight: 6 }} />
          <Text style={styles.eventCardActionBtnText}>캘린더에 바로 등록</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (bubbleText.startsWith('[집안일카드] ') || bubbleText.startsWith('[장보기카드] ')) {
    const isLegacyShopping = bubbleText.startsWith('[장보기카드] ');
    let choreData: any = {};
    try {
      choreData = JSON.parse(
        bubbleText.replace(isLegacyShopping ? '[장보기카드] ' : '[집안일카드] ', '')
      );
    } catch (_) {
      choreData = { title: '집안일 항목' };
    }

    return (
      <View style={styles.choreCardContainer}>
        <View style={styles.choreCardTop}>
          <View style={styles.choreIconCircle}>
            <CheckSquare size={18} color="#FF6B47" strokeWidth={2.4} />
          </View>
          <View style={styles.choreDetailsCol}>
            <Text style={styles.choreCardBadge}>가족 집안일 추가 요청</Text>
            <Text style={styles.choreCardTitle}>{choreData.title}</Text>
            <View style={styles.choreMetaRow}>
              {choreData.assignee && (
                <Text style={styles.choreCardAssignee}>담당: {choreData.assignee}</Text>
              )}
              {choreData.author && (
                <Text style={styles.choreCardAuthor}>요청: {choreData.author}</Text>
              )}
            </View>
          </View>
        </View>

        <TouchableOpacity
          style={styles.choreCardActionBtn}
          activeOpacity={0.8}
          onPress={() => {
            const addChoreFn = onAddChore || onAddShoppingItem;
            if (addChoreFn) {
              addChoreFn({
                title: choreData.title,
                assignee: choreData.assignee || '가족 전체',
                category: '집안일',
                points: 20,
              });
              Alert.alert(
                '추가 완료 🎉',
                `'${choreData.title}' 항목이 [함께/집안일] 목록에 등록되었습니다!`
              );
            } else {
              Alert.alert('안내', '집안일 목록에 등록되었습니다.');
            }
          }}
        >
          <Plus size={15} color="#FFFFFF" strokeWidth={2.5} style={{ marginRight: 6 }} />
          <Text style={styles.choreCardActionBtnText}>집안일 목록에 바로 담기</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (bubbleText.startsWith('[위치공유] ')) {
    let locData: any = {};
    try {
      locData = JSON.parse(bubbleText.replace('[위치공유] ', ''));
    } catch (_) {
      locData = { title: '약속 장소', lat: 37.5665, lng: 126.978 };
    }

    const openMap = () => {
      const url = Platform.select({
        ios: `maps:0,0?q=${locData.title}@${locData.lat},${locData.lng}`,
        android: `geo:0,0?q=${locData.lat},${locData.lng}(${locData.title})`,
        default: `https://www.google.com/maps/search/?api=1&query=${locData.lat},${locData.lng}`,
      });
      Linking.openURL(url).catch(() => {
        Alert.alert(
          '지도 안내',
          `${locData.title}\n(위도: ${locData.lat}, 경도: ${locData.lng})`
        );
      });
    };

    return (
      <View style={styles.locationCardContainer}>
        <View style={styles.locationCardHeader}>
          <View style={styles.locationIconCircle}>
            <MapPin size={18} color="#FF6B47" />
          </View>
          <View style={styles.locationHeaderTexts}>
            <Text style={styles.locationBadgeText}>모임 / 실시간 위치</Text>
            <Text style={styles.locationCardTitle}>{locData.title}</Text>
            <Text style={styles.locationCoordsText}>
              위도 {locData.lat?.toFixed?.(4) || locData.lat}, 경도{' '}
              {locData.lng?.toFixed?.(4) || locData.lng}
            </Text>
          </View>
        </View>

        <TouchableOpacity
          style={styles.locationMapBtn}
          activeOpacity={0.8}
          onPress={openMap}
        >
          <Share2 size={14} color="#FFFFFF" style={{ marginRight: 6 }} />
          <Text style={styles.locationMapBtnText}>
            지도 앱에서 길찾기 / 위치 확인
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  return null;
}
