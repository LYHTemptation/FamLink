import React, { useState, useMemo } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  Image,
  TouchableOpacity,
  Modal,
  Dimensions,
  Platform,
  Alert,
  TextInput,
} from 'react-native';
import {
  BookOpen,
  Sparkles,
  ShoppingBag,
  ChevronLeft,
  ChevronRight,
  X,
  Heart,
  Award,
  Check,
  Share2,
  FileText,
  Calendar,
  User,
  Package,
} from 'lucide-react-native';
import { colors, typography, commonStyles } from '../theme';

const { width } = Dimensions.get('window');

// Available book cover theme presets
const COVER_THEMES = [
  { id: 'linen', name: '내추럴 린넨', bg: '#F5EBE1', text: '#3E2723', border: '#D7CCC8', accent: '#8D6E63' },
  { id: 'coral', name: '포근한 코랄', bg: '#FFF3F0', text: '#5D2E28', border: '#FFCDD2', accent: '#FF7E82' },
  { id: 'navy', name: '클래식 네이비', bg: '#1A2A3A', text: '#FFFFFF', border: '#2C3E50', accent: '#F1C40F', dark: true },
  { id: 'forest', name: '따뜻한 올리브', bg: '#F1F5E8', text: '#2C3B20', border: '#C5E1A5', accent: '#558B2F' },
];

export default function FamilyStorybookModal({
  visible,
  onClose,
  smallTalkState,
  familyMembers = [],
  messages = [],
  currentUserProfile,
  onSendOrderNotice,
  points = 0,
  onDeductPoints,
}) {
  const [currentPage, setCurrentPage] = useState(0); // 0 to 7 (8 pages)
  const [selectedTheme, setSelectedTheme] = useState(COVER_THEMES[0]);
  const [bookTitle, setBookTitle] = useState('우리 가족의 따뜻한 기록');
  const [bookSubtitle, setBookSubtitle] = useState('FamLink Story Vol.1');
  const [aiGenerating, setAiGenerating] = useState(false);
  const [aiStory, setAiStory] = useState(null);
  const [orderModalVisible, setOrderModalVisible] = useState(false);
  const [orderSuccess, setOrderSuccess] = useState(false);

  // POD Order Form state
  const [coverType, setCoverType] = useState('hardcover'); // hardcover, softcover
  const [recipientName, setRecipientName] = useState(currentUserProfile?.name || '가족 대표');
  const [shippingAddress, setShippingAddress] = useState('');
  const [deliveryNote, setDeliveryNote] = useState('소중한 가족 추억책이니 안전하게 배송 부탁드립니다.');

  // Extract photos from messages
  const photoList = useMemo(() => {
    if (!messages || !Array.isArray(messages)) return [];
    return messages
      .filter((m) => m && (m.image || m.image_url))
      .map((m) => ({
        id: m.id,
        uri: m.image_url || m.image,
        sender: m.sender || m.senderObj?.name || '가족',
        time: m.time || m.created_at || '최근',
        text: m.text || '',
      }))
      .slice(0, 8); // Top 8 photos for storybook
  }, [messages]);

  // Extract smalltalk Q&A
  const smallTalkQuestions = useMemo(() => {
    const topic = smallTalkState?.topic || '오늘 우리 가족에게 가장 고마웠던 순간은?';
    const responses = smallTalkState?.responses || {};

    const items = [];
    if (familyMembers && familyMembers.length > 0) {
      familyMembers.forEach((m) => {
        const role = m.role || m.id;
        const answer = responses[m.id] || responses[role];
        if (answer) {
          items.push({
            name: m.name || role,
            role: m.role || '가족',
            avatar: m.avatar || '👦',
            answer,
          });
        }
      });
    } else {
      Object.entries(responses).forEach(([key, val]) => {
        items.push({
          name: key,
          role: key,
          avatar: '👦',
          answer: val,
        });
      });
    }

    return { topic, items };
  }, [smallTalkState, familyMembers]);

  // Total pages
  const TOTAL_PAGES = 7;

  // AI Story generation using Gemini 2.5 Flash
  const handleGenerateAiStory = async () => {
    setAiGenerating(true);
    try {
      const answersText = smallTalkQuestions.items
        .map((it) => `${it.name}(${it.role}): "${it.answer}"`)
        .join('\n');

      const prompt = `당신은 가족들의 소중한 순간과 일상을 감동적인 에세이로 엮어내는 전문 문예 작가입니다.
가족들이 매일 나눈 스몰톡 대화와 답변을 바탕으로, 실제 출판될 가족 추억책의 메인 에세이를 3~4개 단락(한글 약 450~600자)으로 정갈하고 따뜻하게 작성해 주세요.
가족 구성원들의 성격과 사랑이 느껴지도록 문학적인 문체로 써주세요.

오늘의 주제: ${smallTalkQuestions.topic}
가족들의 답변:
${answersText || '아직 답변이 많지 않지만, 언제나 서로를 아끼고 사랑하는 마음으로 일상을 채워가고 있습니다.'}`;

      const apiKey =
        (typeof process !== 'undefined' && process.env?.EXPO_PUBLIC_GEMINI_API_KEY) || '';

      if (apiKey) {
        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{ parts: [{ text: prompt }] }],
            }),
          }
        );

        if (response.ok) {
          const data = await response.json();
          const generated = data?.candidates?.[0]?.content?.parts?.[0]?.text;
          if (generated) {
            setAiStory(generated);
            setAiGenerating(false);
            return;
          }
        }
      }

      // High-quality literary fallback if API key is not configured or offline
      await new Promise((r) => setTimeout(r, 1200));
      const firstAnswerer = smallTalkQuestions.items[0]?.name || '우리 가족';
      const answersSample =
        smallTalkQuestions.items.map((it) => `"${it.answer}"`).join(', ') ||
        '서로를 향한 따스한 응원과 마음들';

      const fallbackEssay = `계절이 바뀌고 바쁜 하루가 스쳐 지나가도, 우리 가족이 함께 모여 나눈 한마디는 마음속 깊은 곳에 가장 따뜻한 등불로 켜집니다.

"${smallTalkQuestions.topic}"이라는 물음에 대해 ${firstAnswerer}님을 비롯한 우리 가족들은 저마다의 솔직한 마음을 들려주었습니다. ${answersSample}이라는 고백 속에는 평소 쑥스러워 건네지 못했던 진심 어린 애정과 서로를 향한 깊은 배려가 오롯이 담겨 있습니다.

사진첩 속 미소와 우리가 함께 걸어온 발자국들은 시간이 흘러도 바래지 않는 영원한 선물이 될 것입니다. 서로가 있기에 더욱 단단하고 눈부신 우리 집, 앞으로 채워갈 무수한 날들도 언제나 온기와 사랑으로 가득하기를 소망합니다.`;

      setAiStory(fallbackEssay);
    } catch (err) {
      console.log('AI story generation error:', err);
      Alert.alert('안내', '스토리 생성 중 일시적인 오류가 발생했습니다. 잠시 후 다시 시도해주세요.');
    } finally {
      setAiGenerating(false);
    }
  };

  // POD Order Submit (Requires 2,500 Family Points for 6-month cycle)
  const handlePlaceOrder = () => {
    if (!shippingAddress.trim()) {
      Alert.alert('알림', '배송받으실 주소를 입력해주세요.');
      return;
    }

    if ((points || 0) < 2500) {
      Alert.alert(
        '포인트 확인',
        `실물 이야기책 제작에는 가족 포인트 2,500 P가 필요합니다.\n현재 보유: ${(points || 0).toLocaleString()} P (부족: ${(2500 - (points || 0)).toLocaleString()} P)\n\n매일 스몰톡과 집안일을 함께하며 포인트를 모아보세요!`,
        [{ text: '확인' }]
      );
      return;
    }

    if (onDeductPoints) {
      onDeductPoints(2500, `실물 이야기책 양장본 POD 발주 ("${bookTitle}")`);
    }

    const orderId = 'FL-' + Date.now().toString().slice(-6);
    setOrderSuccess(true);

    if (onSendOrderNotice) {
      onSendOrderNotice(
        `📦 [실물 이야기책 양장본 발주 완료]\n` +
          `• 주문번호: ${orderId}\n` +
          `• 사용 포인트: 2,500 P (잔여: ${Math.max(0, (points || 0) - 2500).toLocaleString()} P)\n` +
          `• 제목: "${bookTitle}" (${coverType === 'hardcover' ? '고급 양장 하드커버' : '소프트커버'})\n` +
          `• 수령인: ${recipientName}님\n` +
          `• 배송지: ${shippingAddress}\n` +
          `온 가족이 6개월 동안 모은 포인트로 세상에 단 한 권뿐인 실물 책이 정성껏 제작됩니다! 🎉`
      );
    }
  };

  if (!visible) return null;

  return (
    <Modal visible={visible} animationType="slide" transparent={false}>
      <View style={styles.container}>
        {/* Top Action Bar (No-Print) */}
        <View style={styles.topBar}>
          <TouchableOpacity onPress={onClose} style={styles.iconButton}>
            <X size={24} color="#1C1C1E" />
          </TouchableOpacity>

          <View style={styles.titleBox}>
            <Text style={styles.topBarTitle}>📖 우리 가족 이야기책 스튜디오</Text>
            <Text style={styles.topBarSubtitle}>실물 양장본(POD) 출판 스튜디오</Text>
          </View>

          <View style={styles.actionGroup}>
            <TouchableOpacity
              style={styles.orderBtn}
              onPress={() => {
                setOrderSuccess(false);
                setOrderModalVisible(true);
              }}
            >
              <ShoppingBag size={16} color="#FFFFFF" style={{ marginRight: 4 }} />
              <Text style={styles.orderBtnText}>실물책 발주 신청</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Theme Picker & Navigation Pill (No-Print) */}
        <View style={styles.toolbar}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.themeScroll}>
            <Text style={styles.themeLabel}>표지 테마:</Text>
            {COVER_THEMES.map((theme) => (
              <TouchableOpacity
                key={theme.id}
                style={[
                  styles.themeChip,
                  { backgroundColor: theme.bg, borderColor: theme.border },
                  selectedTheme.id === theme.id && styles.themeChipActive,
                ]}
                onPress={() => setSelectedTheme(theme)}
              >
                <View style={[styles.themeDot, { backgroundColor: theme.accent }]} />
                <Text style={[styles.themeChipText, { color: theme.text }]}>{theme.name}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <View style={styles.pageIndicatorBox}>
            <Text style={styles.pageIndicatorText}>
              {currentPage === 0
                ? '겉표지 (Cover)'
                : currentPage === TOTAL_PAGES
                ? '에필로그 & 판권지'
                : `Page ${currentPage} / ${TOTAL_PAGES}`}
            </Text>
          </View>
        </View>

        {/* Book Viewport */}
        <View style={styles.viewport}>
          <View
            style={[
              styles.bookFrame,
              currentPage === 0 && { backgroundColor: selectedTheme.bg, borderColor: selectedTheme.border },
            ]}
          >
            {/* Left Page Turn Button */}
            {currentPage > 0 && (
              <TouchableOpacity
                style={[styles.turnButton, styles.turnButtonLeft]}
                onPress={() => setCurrentPage((p) => Math.max(0, p - 1))}
              >
                <ChevronLeft size={28} color="#4A4A4A" />
              </TouchableOpacity>
            )}

            {/* Book Inner Content */}
            <ScrollView contentContainerStyle={styles.bookInnerScroll} showsVerticalScrollIndicator={false}>
              {/* PAGE 0: COVER */}
              {currentPage === 0 && (
                <View style={styles.coverPage}>
                  <View style={styles.coverEmbossBorder}>
                    <Text style={[styles.coverTag, { color: selectedTheme.accent }]}>
                      FAMILY CHRONICLE ARCHIVE
                    </Text>
                    <TextInput
                      style={[styles.coverTitle, { color: selectedTheme.text }]}
                      value={bookTitle}
                      onChangeText={setBookTitle}
                      placeholder="책 제목을 입력하세요"
                      placeholderTextColor="#999"
                      multiline
                    />
                    <TextInput
                      style={[styles.coverSubtitle, { color: selectedTheme.accent }]}
                      value={bookSubtitle}
                      onChangeText={setBookSubtitle}
                      placeholder="부제목"
                      placeholderTextColor="#999"
                    />

                    <View style={styles.coverCenterIllustration}>
                      {photoList.length > 0 ? (
                        <Image
                          source={{ uri: photoList[0].uri }}
                          style={styles.coverHeroImage}
                          resizeMode="cover"
                        />
                      ) : (
                        <View style={styles.coverHeroFallback}>
                          <Heart size={48} color={selectedTheme.accent} />
                          <Text style={[styles.coverFallbackText, { color: selectedTheme.text }]}>
                            우리가 함께 써 내려간 이야기
                          </Text>
                        </View>
                      )}
                    </View>

                    <View style={styles.coverFooter}>
                      <Text style={[styles.coverYear, { color: selectedTheme.text }]}>
                        발행일: 2026. 09 • FamLink Press
                      </Text>
                      <Text style={[styles.coverFamilyName, { color: selectedTheme.accent }]}>
                        {currentUserProfile?.name || '가족'}네 따뜻한 보금자리
                      </Text>
                    </View>
                  </View>
                </View>
              )}

              {/* PAGE 1: PROLOGUE & FAMILY MEMBERS */}
              {currentPage === 1 && (
                <View style={styles.pageContent}>
                  <Text style={styles.chapterHeader}>PROLOGUE</Text>
                  <Text style={styles.pageTitle}>우리의 이야기, 그리고 가족들</Text>
                  <Text style={styles.prologueQuote}>
                    "매일 건네는 작은 안부가 쌓여, 우리 삶의 가장 눈부신 시절이 되었습니다."
                  </Text>

                  <View style={styles.memberGrid}>
                    {(familyMembers && familyMembers.length > 0
                      ? familyMembers
                      : [
                          { name: '엄마', role: 'mom', avatar: '👩‍🦰', color: '#FF7E82' },
                          { name: '아빠', role: 'dad', avatar: '👨‍💼', color: '#4A90E2' },
                          { name: '아들', role: 'son', avatar: '👦', color: '#2ECC71' },
                          { name: '딸', role: 'daughter', avatar: '👧', color: '#F39C12' },
                        ]
                    ).map((m, idx) => (
                      <View key={m.id || idx} style={styles.memberCard}>
                        <Text style={styles.memberAvatarBig}>{m.avatar || '👦'}</Text>
                        <Text style={styles.memberCardName}>{m.name}</Text>
                        <Text style={styles.memberCardRole}>
                          {m.role === 'mom'
                            ? '엄마'
                            : m.role === 'dad'
                            ? '아빠'
                            : m.role === 'son'
                            ? '아들'
                            : m.role === 'daughter'
                            ? '딸'
                            : m.role || '가족'}
                        </Text>
                      </View>
                    ))}
                  </View>

                  <View style={styles.pageNotesBox}>
                    <Text style={styles.pageNotesText}>
                      • 수록 기간: 2026년 여름 ~ 가을{'\n'}
                      • 기록 항목: 데일리 스몰톡 답변, 가족 앨범 사진, AI 가족 에세이
                    </Text>
                  </View>
                </View>
              )}

              {/* PAGE 2 & 3: CHAPTER 1 - SMALL TALK INTERVIEWS */}
              {(currentPage === 2 || currentPage === 3) && (
                <View style={styles.pageContent}>
                  <Text style={styles.chapterHeader}>CHAPTER 01</Text>
                  <Text style={styles.pageTitle}>매일의 대화와 마음 ({currentPage === 2 ? '1' : '2'})</Text>

                  <View style={styles.interviewTopicBox}>
                    <Award size={18} color="#FF7E82" style={{ marginRight: 6 }} />
                    <Text style={styles.interviewTopicTitle}>"{smallTalkQuestions.topic}"</Text>
                  </View>

                  <View style={styles.interviewList}>
                    {smallTalkQuestions.items
                      .slice((currentPage - 2) * 2, (currentPage - 2) * 2 + 2)
                      .map((item, idx) => (
                        <View key={idx} style={styles.interviewItem}>
                          <View style={styles.interviewSpeaker}>
                            <Text style={styles.interviewAvatar}>{item.avatar}</Text>
                            <View>
                              <Text style={styles.interviewName}>{item.name}</Text>
                              <Text style={styles.interviewRoleBadge}>{item.role}</Text>
                            </View>
                          </View>
                          <View style={styles.interviewBubble}>
                            <Text style={styles.interviewQuote}>“{item.answer}”</Text>
                          </View>
                        </View>
                      ))}

                    {smallTalkQuestions.items.length === 0 && (
                      <View style={styles.emptyPromptBox}>
                        <Text style={styles.emptyPromptText}>
                          아직 기록된 스몰톡 답변이 없습니다.{'\n'}스몰톡 탭에서 오늘의 질문에 답변을 남겨보세요!
                        </Text>
                      </View>
                    )}
                  </View>
                </View>
              )}

              {/* PAGE 4 & 5: CHAPTER 2 - PHOTO GALLERY MEMORIES */}
              {(currentPage === 4 || currentPage === 5) && (
                <View style={styles.pageContent}>
                  <Text style={styles.chapterHeader}>CHAPTER 02</Text>
                  <Text style={styles.pageTitle}>함께한 순간들 ({currentPage === 4 ? '1' : '2'})</Text>

                  <View style={styles.photoPageGrid}>
                    {photoList
                      .slice((currentPage - 4) * 2, (currentPage - 4) * 2 + 2)
                      .map((photo, idx) => (
                        <View key={photo.id || idx} style={styles.photoFrameCard}>
                          <Image
                            source={{ uri: photo.uri }}
                            style={styles.photoFrameImage}
                            resizeMode="cover"
                          />
                          <View style={styles.photoFrameCaption}>
                            <Text style={styles.photoDateText}>
                              <Calendar size={12} color="#8E8E93" /> {photo.time}
                            </Text>
                            <Text style={styles.photoSenderText}>촬영/공유: {photo.sender}</Text>
                          </View>
                        </View>
                      ))}

                    {photoList.length === 0 && (
                      <View style={styles.emptyPromptBox}>
                        <Text style={styles.emptyPromptText}>
                          공유된 사진이 없습니다.{'\n'}가족 채팅방에서 사진을 공유하면 추억책에 실립니다!
                        </Text>
                      </View>
                    )}
                  </View>
                </View>
              )}

              {/* PAGE 6: CHAPTER 3 - GEMINI AI ESSAY */}
              {currentPage === 6 && (
                <View style={styles.pageContent}>
                  <View style={styles.aiHeaderRow}>
                    <View>
                      <Text style={styles.chapterHeader}>CHAPTER 03</Text>
                      <Text style={styles.pageTitle}>AI가 엮은 가족 연대기</Text>
                    </View>
                    <TouchableOpacity
                      style={styles.aiGenBtn}
                      onPress={handleGenerateAiStory}
                      disabled={aiGenerating}
                    >
                      <Sparkles size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
                      <Text style={styles.aiGenBtnText}>
                        {aiGenerating ? '편찬 중...' : aiStory ? '다시 편찬' : 'AI 수필 편찬'}
                      </Text>
                    </TouchableOpacity>
                  </View>

                  <View style={styles.aiArticleBox}>
                    <Text style={styles.aiArticleTitle}>
                      “마음이 머무는 자리, 우리라는 이름의 집”
                    </Text>
                    <Text style={styles.aiArticleMeta}>
                      편찬: Gemini 2.5 Flash 문예 에디터 • FamLink AI
                    </Text>

                    <Text style={styles.aiArticleBody}>
                      {aiStory ||
                        `아직 AI 수필이 작성되지 않았습니다.\n상단의 [AI 수필 편찬] 버튼을 누르면, 가족들이 나눈 스몰톡 문답과 소중한 기억을 엮어 감동적인 한 편의 가족 에세이를 즉시 완성해 드립니다.`}
                    </Text>
                  </View>
                </View>
              )}

              {/* PAGE 7: EPILOGUE & COLOPHON (판권지) */}
              {currentPage === 7 && (
                <View style={styles.pageContent}>
                  <Text style={styles.chapterHeader}>EPILOGUE</Text>
                  <Text style={styles.pageTitle}>사랑을 담아 펴내며</Text>

                  <Text style={styles.epilogueBody}>
                    가장 평범한 하루가 모여 가장 특별한 우리가 됩니다.{'\n\n'}
                    오늘 나눈 따뜻한 말 한마디와 환한 웃음이, 훗날 이 책을 다시 펼쳤을 때 우리 가족을
                    포근하게 안아주는 추억이 되기를 바랍니다.
                  </Text>

                  {/* Physical Print Specifications & Colophon */}
                  <View style={styles.colophonBox}>
                    <Text style={styles.colophonTitle}>[도서 출판 정보 (Colophon & Print Specs)]</Text>
                    <View style={styles.colophonRow}>
                      <Text style={styles.colophonLabel}>도서명:</Text>
                      <Text style={styles.colophonVal}>{bookTitle}</Text>
                    </View>
                    <View style={styles.colophonRow}>
                      <Text style={styles.colophonLabel}>판형 규격:</Text>
                      <Text style={styles.colophonVal}>A5 판형 (148 × 210mm) / 300 DPI</Text>
                    </View>
                    <View style={styles.colophonRow}>
                      <Text style={styles.colophonLabel}>표지 사양:</Text>
                      <Text style={styles.colophonVal}>랑데뷰 240g 하드커버 무광 코팅</Text>
                    </View>
                    <View style={styles.colophonRow}>
                      <Text style={styles.colophonLabel}>내지 사양:</Text>
                      <Text style={styles.colophonVal}>친환경 무광 아트지 150g (8 Pages)</Text>
                    </View>
                    <View style={styles.colophonRow}>
                      <Text style={styles.colophonLabel}>발행일:</Text>
                      <Text style={styles.colophonVal}>2026년 09월 14일 초판 1쇄</Text>
                    </View>
                    <View style={styles.colophonRow}>
                      <Text style={styles.colophonLabel}>발행처:</Text>
                      <Text style={styles.colophonVal}>FamLink Books & Printing Studio</Text>
                    </View>
                    <View style={styles.colophonRow}>
                      <Text style={styles.colophonLabel}>표준 도서번호:</Text>
                      <Text style={styles.colophonVal}>ISBN 979-11-9824-001-8 (예비)</Text>
                    </View>
                  </View>
                </View>
              )}
            </ScrollView>

            {/* Right Page Turn Button */}
            {currentPage < TOTAL_PAGES && (
              <TouchableOpacity
                style={[styles.turnButton, styles.turnButtonRight]}
                onPress={() => setCurrentPage((p) => Math.min(TOTAL_PAGES, p + 1))}
              >
                <ChevronRight size={28} color="#4A4A4A" />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Bottom Page Navigation Buttons */}
        <View style={styles.bottomNav}>
          <TouchableOpacity
            style={[styles.navBtn, currentPage === 0 && styles.navBtnDisabled]}
            disabled={currentPage === 0}
            onPress={() => setCurrentPage((p) => Math.max(0, p - 1))}
          >
            <ChevronLeft size={18} color={currentPage === 0 ? '#C7C7CC' : '#1C1C1E'} />
            <Text style={[styles.navBtnText, currentPage === 0 && styles.navBtnTextDisabled]}>
              이전 페이지
            </Text>
          </TouchableOpacity>

          <View style={styles.pageDots}>
            {Array.from({ length: TOTAL_PAGES + 1 }).map((_, i) => (
              <TouchableOpacity
                key={i}
                onPress={() => setCurrentPage(i)}
                style={[styles.dot, currentPage === i && styles.dotActive]}
              />
            ))}
          </View>

          <TouchableOpacity
            style={[styles.navBtn, currentPage === TOTAL_PAGES && styles.navBtnDisabled]}
            disabled={currentPage === TOTAL_PAGES}
            onPress={() => setCurrentPage((p) => Math.min(TOTAL_PAGES, p + 1))}
          >
            <Text style={[styles.navBtnText, currentPage === TOTAL_PAGES && styles.navBtnTextDisabled]}>
              다음 페이지
            </Text>
            <ChevronRight size={18} color={currentPage === TOTAL_PAGES ? '#C7C7CC' : '#1C1C1E'} />
          </TouchableOpacity>
        </View>

        {/* POD Physical Book Order Modal */}
        <Modal visible={orderModalVisible} animationType="fade" transparent>
          <View style={styles.modalOverlay}>
            <View style={styles.orderModalBox}>
              <View style={styles.orderModalHeader}>
                <Package size={22} color="#FF7E82" style={{ marginRight: 8 }} />
                <Text style={styles.orderModalTitle}>실물 책 인쇄 발주 (POD 주문)</Text>
                <TouchableOpacity
                  onPress={() => setOrderModalVisible(false)}
                  style={styles.modalCloseBtn}
                >
                  <X size={20} color="#8E8E93" />
                </TouchableOpacity>
              </View>

              {orderSuccess ? (
                <View style={styles.orderSuccessBox}>
                  <View style={styles.successIconCircle}>
                    <Check size={36} color="#FFFFFF" />
                  </View>
                  <Text style={styles.successTitle}>인쇄 발주가 접수되었습니다!</Text>
                  <Text style={styles.successDesc}>
                    가족들의 이야기가 담긴 소중한 추억책을 정성껏 인쇄하여 입력하신 주소로 안전하게
                    배송해 드리겠습니다.
                  </Text>
                  <View style={styles.orderSummaryCard}>
                    <Text style={styles.summaryLine}>• 도서명: {bookTitle}</Text>
                    <Text style={styles.summaryLine}>
                      • 커버 종류: {coverType === 'hardcover' ? '고급 양장 하드커버' : '소프트커버'}
                    </Text>
                    <Text style={styles.summaryLine}>• 수령인: {recipientName} 님</Text>
                    <Text style={styles.summaryLine}>• 배송지: {shippingAddress}</Text>
                  </View>

                  <TouchableOpacity
                    style={styles.successConfirmBtn}
                    onPress={() => setOrderModalVisible(false)}
                  >
                    <Text style={styles.successConfirmBtnText}>확인</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <ScrollView style={styles.orderFormScroll}>
                  <Text style={styles.orderNoticeText}>
                    * 비즈니스 모델(BM) 연계: 포인트를 모두 모은 가족은 실물 포토북/에세이북을 제작하여
                    집으로 배송받을 수 있습니다.
                  </Text>

                  {/* Cover Selection */}
                  <Text style={styles.formSectionTitle}>커버 종류 선택</Text>
                  <View style={styles.coverSelectRow}>
                    <TouchableOpacity
                      style={[
                        styles.coverOptionCard,
                        coverType === 'hardcover' && styles.coverOptionSelected,
                      ]}
                      onPress={() => setCoverType('hardcover')}
                    >
                      <Text style={styles.coverOptionName}>📚 고급 양장 하드커버</Text>
                      <Text style={styles.coverOptionDesc}>랑데뷰 240g • 장기 보관용 추천</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[
                        styles.coverOptionCard,
                        coverType === 'softcover' && styles.coverOptionSelected,
                      ]}
                      onPress={() => setCoverType('softcover')}
                    >
                      <Text style={styles.coverOptionName}>📖 슬림 소프트커버</Text>
                      <Text style={styles.coverOptionDesc}>가볍고 산뜻한 매거진 스타일</Text>
                    </TouchableOpacity>
                  </View>

                  {/* Recipient */}
                  <Text style={styles.formLabel}>받는 분 이름</Text>
                  <TextInput
                    style={styles.formInput}
                    value={recipientName}
                    onChangeText={setRecipientName}
                    placeholder="수령인 성함"
                  />

                  {/* Address */}
                  <Text style={styles.formLabel}>배송지 주소</Text>
                  <TextInput
                    style={styles.formInput}
                    value={shippingAddress}
                    onChangeText={setShippingAddress}
                    placeholder="도로명 주소 및 상세 주소"
                  />

                  {/* Notes */}
                  <Text style={styles.formLabel}>배송 요청 사항</Text>
                  <TextInput
                    style={styles.formInput}
                    value={deliveryNote}
                    onChangeText={setDeliveryNote}
                    placeholder="요청 사항을 입력하세요"
                  />

                  {/* Point Cost & Balance Info */}
                  <View style={styles.orderPointSummaryBox}>
                    <View style={styles.orderPointRow}>
                      <Text style={styles.orderPointLabel}>실물 이야기책 제작 비용 (6개월 분량)</Text>
                      <Text style={styles.orderPointCost}>2,500 P</Text>
                    </View>
                    <View style={styles.orderPointRow}>
                      <Text style={styles.orderPointLabel}>우리 가족 보유 포인트</Text>
                      <Text style={[styles.orderPointBalance, (points || 0) < 2500 && { color: '#DC2626' }]}>
                        {(points || 0).toLocaleString()} P
                      </Text>
                    </View>
                    {(points || 0) < 2500 ? (
                      <Text style={styles.orderPointWarn}>
                        * 2,500 P 달성 시 발주가 가능합니다. (부족: {(2500 - (points || 0)).toLocaleString()} P)
                      </Text>
                    ) : (
                      <Text style={styles.orderPointSuccess}>
                        * 발주 시 2,500 P가 자동으로 차감됩니다.
                      </Text>
                    )}
                  </View>

                  <TouchableOpacity
                    style={[styles.submitOrderBtn, (points || 0) < 2500 && styles.submitOrderBtnDisabled]}
                    onPress={handlePlaceOrder}
                  >
                    <Text style={styles.submitOrderBtnText}>
                      {(points || 0) >= 2500
                        ? '2,500 P로 실물책 주문 신청하기'
                        : `포인트 모으고 발주하기 (${(2500 - (points || 0)).toLocaleString()} P 부족)`}
                    </Text>
                  </TouchableOpacity>
                </ScrollView>
              )}
            </View>
          </View>
        </Modal>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: commonStyles.screenContainer,
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: colors.card,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  iconButton: {
    padding: 6,
  },
  titleBox: {
    flex: 1,
    marginLeft: 12,
  },
  topBarTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1C1C1E',
  },
  topBarSubtitle: {
    fontSize: 11,
    color: '#8E8E93',
    marginTop: 2,
  },
  actionGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  orderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FF7E82',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 8,
  },
  orderBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  toolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F2',
  },
  themeScroll: {
    flexGrow: 0,
  },
  themeLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
    marginRight: 8,
    alignSelf: 'center',
  },
  themeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
    borderWidth: 1,
    marginRight: 8,
  },
  themeChipActive: {
    borderWidth: 2,
    borderColor: '#FF7E82',
  },
  themeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  themeChipText: {
    fontSize: 11,
    fontWeight: '600',
  },
  pageIndicatorBox: {
    backgroundColor: '#F2F2F7',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  pageIndicatorText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#3A3A3C',
  },
  viewport: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  bookFrame: {
    width: '100%',
    maxWidth: 580,
    height: '100%',
    maxHeight: 760,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 8,
    overflow: 'hidden',
    position: 'relative',
  },
  turnButton: {
    position: 'absolute',
    top: '50%',
    marginTop: -22,
    zIndex: 10,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.85)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  turnButtonLeft: {
    left: 8,
  },
  turnButtonRight: {
    right: 8,
  },
  bookInnerScroll: {
    padding: 28,
    flexGrow: 1,
  },
  // COVER PAGE STYLES
  coverPage: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  coverEmbossBorder: {
    width: '100%',
    borderWidth: 2,
    borderColor: 'rgba(0,0,0,0.08)',
    borderRadius: 10,
    padding: 24,
    alignItems: 'center',
  },
  coverTag: {
    fontSize: 11,
    letterSpacing: 2,
    fontWeight: '700',
    marginBottom: 12,
  },
  coverTitle: {
    fontSize: 26,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 6,
  },
  coverSubtitle: {
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 20,
  },
  coverCenterIllustration: {
    width: 220,
    height: 220,
    borderRadius: 110,
    overflow: 'hidden',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
  },
  coverHeroImage: {
    width: '100%',
    height: '100%',
  },
  coverHeroFallback: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  coverFallbackText: {
    fontSize: 12,
    marginTop: 8,
    fontWeight: '600',
    textAlign: 'center',
  },
  coverFooter: {
    marginTop: 20,
    alignItems: 'center',
  },
  coverYear: {
    fontSize: 12,
    opacity: 0.8,
  },
  coverFamilyName: {
    fontSize: 13,
    fontWeight: '700',
    marginTop: 4,
  },
  // INNER PAGES STYLES
  pageContent: {
    flex: 1,
  },
  chapterHeader: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 2,
    color: '#FF7E82',
    marginBottom: 4,
  },
  pageTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#1C1C1E',
    marginBottom: 16,
  },
  prologueQuote: {
    fontSize: 15,
    fontStyle: 'italic',
    color: '#555',
    lineHeight: 22,
    paddingLeft: 12,
    borderLeftWidth: 3,
    borderLeftColor: '#FF7E82',
    marginBottom: 24,
  },
  memberGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 24,
  },
  memberCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: '#F9FAFC',
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ECEFF1',
  },
  memberAvatarBig: {
    fontSize: 36,
    marginBottom: 6,
  },
  memberCardName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1C1C1E',
  },
  memberCardRole: {
    fontSize: 12,
    color: '#8E8E93',
    marginTop: 2,
  },
  pageNotesBox: {
    backgroundColor: '#F8F9FA',
    padding: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E9ECEF',
  },
  pageNotesText: {
    fontSize: 12,
    color: '#6C757D',
    lineHeight: 18,
  },
  // CHAPTER 1 INTERVIEWS
  interviewTopicBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF5F5',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#FFE3E3',
    marginBottom: 18,
  },
  interviewTopicTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#D63031',
    flex: 1,
  },
  interviewList: {
    gap: 16,
  },
  interviewItem: {
    backgroundColor: '#FBFBFB',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#EEEEEE',
  },
  interviewSpeaker: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  interviewAvatar: {
    fontSize: 22,
    marginRight: 8,
  },
  interviewName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1C1C1E',
  },
  interviewRoleBadge: {
    fontSize: 11,
    color: '#8E8E93',
  },
  interviewBubble: {
    backgroundColor: '#FFFFFF',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#EFEFEF',
  },
  interviewQuote: {
    fontSize: 14,
    color: '#2C3E50',
    lineHeight: 22,
    fontStyle: 'italic',
  },
  emptyPromptBox: {
    padding: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyPromptText: {
    fontSize: 13,
    color: '#9E9E9E',
    textAlign: 'center',
    lineHeight: 20,
  },
  // CHAPTER 2 PHOTOS
  photoPageGrid: {
    gap: 16,
  },
  photoFrameCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
  },
  photoFrameImage: {
    width: '100%',
    height: 190,
  },
  photoFrameCaption: {
    padding: 10,
    backgroundColor: '#FAFAFA',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  photoDateText: {
    fontSize: 11,
    color: '#8E8E93',
  },
  photoSenderText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#4A4A4A',
  },
  // CHAPTER 3 AI ESSAY
  aiHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  aiGenBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#8E44AD',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
  },
  aiGenBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  aiArticleBox: {
    backgroundColor: '#FDFCF7',
    borderRadius: 12,
    padding: 20,
    borderWidth: 1,
    borderColor: '#EFEBD9',
  },
  aiArticleTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#3E2723',
    marginBottom: 6,
    textAlign: 'center',
  },
  aiArticleMeta: {
    fontSize: 11,
    color: '#8D6E63',
    textAlign: 'center',
    marginBottom: 16,
  },
  aiArticleBody: {
    fontSize: 14,
    lineHeight: 24,
    color: '#4E342E',
    letterSpacing: 0.3,
  },
  // EPILOGUE & COLOPHON
  epilogueBody: {
    fontSize: 14,
    lineHeight: 24,
    color: '#333333',
    marginBottom: 24,
  },
  colophonBox: {
    backgroundColor: '#F8F9FA',
    borderRadius: 10,
    padding: 16,
    borderWidth: 1,
    borderColor: '#DEE2E6',
  },
  colophonTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#212529',
    marginBottom: 12,
  },
  colophonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  colophonLabel: {
    fontSize: 12,
    color: '#6C757D',
    fontWeight: '600',
  },
  colophonVal: {
    fontSize: 12,
    color: '#212529',
    fontWeight: '500',
  },
  // BOTTOM NAVIGATION
  bottomNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E5EA',
  },
  navBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  navBtnDisabled: {
    opacity: 0.4,
  },
  navBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1C1C1E',
  },
  navBtnTextDisabled: {
    color: '#C7C7CC',
  },
  pageDots: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: '#D1D1D6',
  },
  dotActive: {
    width: 18,
    backgroundColor: '#FF7E82',
  },
  // ORDER MODAL STYLES
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  orderModalBox: {
    width: '100%',
    maxWidth: 480,
    maxHeight: '90%',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 10,
  },
  orderModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  orderModalTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#1C1C1E',
    flex: 1,
  },
  modalCloseBtn: {
    padding: 4,
  },
  orderNoticeText: {
    fontSize: 12,
    color: '#FF7E82',
    backgroundColor: '#FFF5F5',
    padding: 10,
    borderRadius: 8,
    lineHeight: 18,
    marginBottom: 14,
  },
  formSectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1C1C1E',
    marginBottom: 8,
  },
  coverSelectRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  coverOptionCard: {
    flex: 1,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#E5E5EA',
    backgroundColor: '#FAFAFA',
  },
  coverOptionSelected: {
    borderColor: '#FF7E82',
    backgroundColor: '#FFF5F5',
  },
  coverOptionName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1C1C1E',
    marginBottom: 4,
  },
  coverOptionDesc: {
    fontSize: 11,
    color: '#8E8E93',
  },
  formLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#3A3A3C',
    marginBottom: 6,
  },
  formInput: {
    backgroundColor: '#F2F2F7',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#1C1C1E',
    marginBottom: 14,
  },
  orderPointSummaryBox: {
    backgroundColor: '#FEF3C7',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FDE68A',
    marginBottom: 16,
    marginTop: 4,
  },
  orderPointRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  orderPointLabel: {
    fontSize: 13,
    color: '#78350F',
    fontWeight: '600',
  },
  orderPointCost: {
    fontSize: 15,
    fontWeight: '800',
    color: '#92400E',
  },
  orderPointBalance: {
    fontSize: 15,
    fontWeight: '800',
    color: '#059669',
  },
  orderPointWarn: {
    fontSize: 11,
    color: '#DC2626',
    fontWeight: '600',
    marginTop: 4,
  },
  orderPointSuccess: {
    fontSize: 11,
    color: '#059669',
    fontWeight: '600',
    marginTop: 4,
  },
  submitOrderBtn: {
    backgroundColor: '#FF7E82',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 6,
    marginBottom: 16,
  },
  submitOrderBtnDisabled: {
    backgroundColor: '#9CA3AF',
  },
  submitOrderBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  orderSuccessBox: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  successIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#2ECC71',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  successTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1C1C1E',
    marginBottom: 8,
  },
  successDesc: {
    fontSize: 13,
    color: '#666',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
  },
  orderSummaryCard: {
    width: '100%',
    backgroundColor: '#F8F9FA',
    borderRadius: 10,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E9ECEF',
    marginBottom: 20,
    gap: 6,
  },
  summaryLine: {
    fontSize: 13,
    color: '#495057',
  },
  successConfirmBtn: {
    width: '100%',
    backgroundColor: '#1C1C1E',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  successConfirmBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
