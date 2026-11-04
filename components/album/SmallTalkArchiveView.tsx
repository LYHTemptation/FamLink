import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  Modal,
  TextInput,
} from 'react-native';
import {
  X,
  Calendar,
  Check,
  Search,
  Layers,
  Bookmark,
  ChevronDown,
  ChevronUp,
} from 'lucide-react-native';
import { colors } from '../../theme';
import UserAvatar from '../UserAvatar';
import { styles } from './PhotoAlbumStyles';
import type { SmallTalkArchiveItem } from '../../types/domain';

export type ArchiveFilterType = 'all' | 'answered' | 'unanswered';

interface FamilyMonthItem {
  id: string;
  label: string;
  year: number;
  month: number;
}

interface AvailableMonthStat extends FamilyMonthItem {
  count: number;
  answeredCount: number;
}

interface YearMonthCell {
  id: string;
  year: number;
  month: number;
  count: number;
  isDisabled: boolean;
}

interface YearGroupItem {
  year: number;
  months: YearMonthCell[];
}

export interface SmallTalkArchiveViewProps {
  smallTalkArchiveList: SmallTalkArchiveItem[];
  familyCreatedAt: Date;
}

export const SmallTalkArchiveView = React.memo(function SmallTalkArchiveView({
  smallTalkArchiveList,
  familyCreatedAt,
}: SmallTalkArchiveViewProps): React.ReactElement {
  const [monthPickerModalVisible, setMonthPickerModalVisible] = useState<boolean>(false);
  const [selectedMonth, setSelectedMonth] = useState<string>(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  const [expandedTopicIds, setExpandedTopicIds] = useState<string[]>(['topic-0']);
  const [archiveFilter, setArchiveFilter] = useState<ArchiveFilterType>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // All valid calendar months since the family group was created
  const allFamilyMonths = useMemo<FamilyMonthItem[]>(() => {
    const list: FamilyMonthItem[] = [];
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();

    const startYear = familyCreatedAt.getFullYear();
    const startMonth = familyCreatedAt.getMonth();

    let y = currentYear;
    let m = currentMonth;

    while (y > startYear || (y === startYear && m >= startMonth)) {
      const monthStr = String(m + 1).padStart(2, '0');
      const id = `${y}-${monthStr}`;
      const label = `${y}년 ${m + 1}월`;
      list.push({ id, label, year: y, month: m + 1 });

      m--;
      if (m < 0) {
        m = 11;
        y--;
      }
    }

    return list;
  }, [familyCreatedAt]);

  const availableMonthsMap = useMemo<Record<string, AvailableMonthStat>>(() => {
    const monthStats: Record<string, { total: number; answered: number }> = {};
    smallTalkArchiveList.forEach((item) => {
      if (!monthStats[item.yearMonth]) {
        monthStats[item.yearMonth] = { total: 0, answered: 0 };
      }
      monthStats[item.yearMonth].total += 1;
      if (item.isAnswered) {
        monthStats[item.yearMonth].answered += 1;
      }
    });

    const map: Record<string, AvailableMonthStat> = {};
    allFamilyMonths.forEach((fm) => {
      map[fm.id] = {
        id: fm.id,
        label: fm.label,
        year: fm.year,
        month: fm.month,
        count: monthStats[fm.id]?.total || 0,
        answeredCount: monthStats[fm.id]?.answered || 0,
      };
    });
    return map;
  }, [allFamilyMonths, smallTalkArchiveList]);

  const currentMonthInfo = useMemo<AvailableMonthStat>(() => {
    const now = new Date();
    const curYear = now.getFullYear();
    const curMonth = now.getMonth();
    const curMonthId = `${curYear}-${String(curMonth + 1).padStart(2, '0')}`;
    const curMatch = availableMonthsMap[curMonthId];
    return {
      id: curMonthId,
      label: `현재달 (${curMonth + 1}월)`,
      year: curYear,
      month: curMonth + 1,
      count: curMatch ? curMatch.count : 0,
      answeredCount: curMatch ? curMatch.answeredCount : 0,
    };
  }, [availableMonthsMap]);

  const selectedMonthLabel = useMemo<string>(() => {
    if (selectedMonth === 'all') return '전체';
    const match = availableMonthsMap[selectedMonth];
    return match ? match.label : selectedMonth;
  }, [selectedMonth, availableMonthsMap]);

  const groupedYears = useMemo<YearGroupItem[]>(() => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();
    const startYear = familyCreatedAt.getFullYear();
    const startMonth = familyCreatedAt.getMonth();

    const years: YearGroupItem[] = [];
    for (let y = currentYear; y >= startYear; y--) {
      const monthsForYear: YearMonthCell[] = [];
      for (let m = 11; m >= 0; m--) {
        const monthNum = m + 1;
        const monthStr = String(monthNum).padStart(2, '0');
        const id = `${y}-${monthStr}`;
        const isFuture = y === currentYear && m > currentMonth;
        const isBeforeFamily = y === startYear && m < startMonth;
        const isDisabled = isFuture || isBeforeFamily;

        const match = availableMonthsMap[id];
        const count = match ? match.count : 0;

        if (!isFuture) {
          monthsForYear.push({
            id,
            year: y,
            month: monthNum,
            count,
            isDisabled,
          });
        }
      }

      monthsForYear.sort((a, b) => b.month - a.month);
      years.push({ year: y, months: monthsForYear });
    }

    return years;
  }, [familyCreatedAt, availableMonthsMap]);

  const monthScopedList = useMemo<SmallTalkArchiveItem[]>(() => {
    if (selectedMonth === 'all') return smallTalkArchiveList;
    return smallTalkArchiveList.filter((item) => item.yearMonth === selectedMonth);
  }, [smallTalkArchiveList, selectedMonth]);

  const trimmedSearchQuery = useMemo<string>(
    () => (searchQuery || '').trim().toLowerCase(),
    [searchQuery]
  );
  const isSearchActive = trimmedSearchQuery.length > 0;

  const baseArchiveList = useMemo<SmallTalkArchiveItem[]>(() => {
    if (isSearchActive) return smallTalkArchiveList;
    return monthScopedList;
  }, [isSearchActive, smallTalkArchiveList, monthScopedList]);

  const checkItemMatchesSearch = useCallback(
    (item: SmallTalkArchiveItem, query: string): boolean => {
      if (!query) return true;
      const topicStr = (item.topic || '').toLowerCase();
      if (topicStr.includes(query)) return true;

      if (Array.isArray(item.answers)) {
        return item.answers.some((a) => {
          const text = (a?.text || '').toLowerCase();
          const name = (a?.name || '').toLowerCase();
          const role = (a?.role || '').toLowerCase();
          return (
            text.includes(query) ||
            name.includes(query) ||
            role.includes(query)
          );
        });
      }
      return false;
    },
    []
  );

  const filteredArchiveList = useMemo<SmallTalkArchiveItem[]>(() => {
    return baseArchiveList.filter((item) => {
      if (archiveFilter === 'answered' && !item.isAnswered) return false;
      if (archiveFilter === 'unanswered' && item.isAnswered) return false;
      if (isSearchActive) {
        return checkItemMatchesSearch(item, trimmedSearchQuery);
      }
      return true;
    });
  }, [
    baseArchiveList,
    archiveFilter,
    isSearchActive,
    trimmedSearchQuery,
    checkItemMatchesSearch,
  ]);

  const getFilterTabCount = useCallback(
    (filterType: ArchiveFilterType): number => {
      const list = isSearchActive
        ? smallTalkArchiveList.filter((item) =>
            checkItemMatchesSearch(item, trimmedSearchQuery)
          )
        : monthScopedList;

      if (filterType === 'answered') return list.filter((i) => i.isAnswered).length;
      if (filterType === 'unanswered')
        return list.filter((i) => !i.isAnswered).length;
      return list.length;
    },
    [
      isSearchActive,
      smallTalkArchiveList,
      monthScopedList,
      trimmedSearchQuery,
      checkItemMatchesSearch,
    ]
  );

  useEffect(() => {
    if (isSearchActive && filteredArchiveList.length > 0) {
      setExpandedTopicIds(filteredArchiveList.map((item) => item.id));
    }
  }, [isSearchActive, trimmedSearchQuery]);

  const handleToggleExpand = useCallback((topicId: string): void => {
    setExpandedTopicIds((prev) =>
      prev.includes(topicId)
        ? prev.filter((id) => id !== topicId)
        : [...prev, topicId]
    );
  }, []);

  const handleExpandAll = useCallback((): void => {
    setExpandedTopicIds((prev) =>
      prev.length === filteredArchiveList.length
        ? []
        : filteredArchiveList.map((item) => item.id)
    );
  }, [filteredArchiveList]);

  const monthAnsweredCount = useMemo(
    () => monthScopedList.filter((i) => i.isAnswered).length,
    [monthScopedList]
  );

  return (
    <>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.archiveSection}>
          {/* Archive Explainer Banner */}
          <View style={styles.archiveBanner}>
            <View style={styles.archiveBannerIconBox}>
              <Bookmark size={20} color={colors.primary} />
            </View>
            <View style={styles.archiveBannerContent}>
              <Text style={styles.archiveBannerTitle}>
                우리 가족 스몰톡 기록 보관소
              </Text>
              <Text style={styles.archiveBannerDesc}>
                매일 나눈 질문과 가족들의 솔직한 답변들입니다. 답변이 완료된 소중한 문답은 우리 가족 포토북에 자동으로 수록됩니다 📖
              </Text>
            </View>
          </View>

          {/* 1. Month Picker & Current Month Quick Jump */}
          <View style={styles.monthChipsRow}>
            <TouchableOpacity
              style={[
                styles.monthChipBtn,
                styles.monthChipHalfBtn,
                selectedMonth !== currentMonthInfo.id
                  ? styles.monthChipBtnActive
                  : styles.moreMonthPickerBtn,
              ]}
              onPress={() => setMonthPickerModalVisible(true)}
              activeOpacity={0.8}
            >
              <Calendar
                size={13}
                color={
                  selectedMonth !== currentMonthInfo.id
                    ? colors.text.inverse
                    : colors.primary
                }
                style={{ marginRight: 5 }}
              />
              <Text
                numberOfLines={1}
                style={[
                  styles.monthChipBtnText,
                  styles.moreMonthPickerBtnText,
                  selectedMonth !== currentMonthInfo.id &&
                    styles.monthChipBtnTextActive,
                ]}
              >
                {selectedMonth !== currentMonthInfo.id
                  ? selectedMonthLabel
                  : '연·월 선택'}
              </Text>
              <ChevronDown
                size={13}
                color={
                  selectedMonth !== currentMonthInfo.id
                    ? colors.text.inverse
                    : colors.primary
                }
                style={{ marginLeft: 2 }}
              />
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.monthChipBtn,
                styles.monthChipHalfBtn,
                selectedMonth === currentMonthInfo.id &&
                  styles.monthChipBtnActive,
              ]}
              onPress={() => setSelectedMonth(currentMonthInfo.id)}
              activeOpacity={0.8}
            >
              <Calendar
                size={13}
                color={
                  selectedMonth === currentMonthInfo.id
                    ? colors.text.inverse
                    : colors.text.secondary
                }
                style={{ marginRight: 5 }}
              />
              <Text
                numberOfLines={1}
                style={[
                  styles.monthChipBtnText,
                  selectedMonth === currentMonthInfo.id &&
                    styles.monthChipBtnTextActive,
                ]}
              >
                {currentMonthInfo.label} ({currentMonthInfo.answeredCount}/{currentMonthInfo.count})
              </Text>
            </TouchableOpacity>
          </View>

          {/* 2. Monthly Summary & Batch Action Bar */}
          <View style={styles.monthSummaryRow}>
            <View style={styles.monthSummaryLeft}>
              {isSearchActive ? (
                <>
                  <Text style={styles.monthSummaryTitle}>
                    🔍 '{searchQuery}' 검색 결과 ({filteredArchiveList.length}건)
                  </Text>
                  <Text style={styles.monthSummarySub}>
                    전체 기간의 질문 및 가족 답변에서 일치하는 기록입니다.
                  </Text>
                </>
              ) : (
                <>
                  <Text style={styles.monthSummaryTitle}>
                    📅 {selectedMonthLabel} 스몰톡
                  </Text>
                  <Text style={styles.monthSummarySub}>
                    총 {monthScopedList.length}개 질문 중 {monthAnsweredCount}개 답변 완료 (
                    {monthScopedList.length > 0
                      ? Math.round((monthAnsweredCount / monthScopedList.length) * 100)
                      : 0}
                    %)
                  </Text>
                </>
              )}
            </View>

            <View style={styles.monthSummaryRightActions}>
              <TouchableOpacity
                style={styles.expandAllToggleBtn}
                onPress={handleExpandAll}
                activeOpacity={0.7}
              >
                <Text style={styles.expandAllToggleBtnText}>
                  {expandedTopicIds.length === filteredArchiveList.length
                    ? '모두 접기'
                    : '모두 펼치기'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* 3. Search & Filter Controls */}
          <View style={styles.archiveControlsRow}>
            <View
              style={[
                styles.searchBarBox,
                isSearchActive && styles.searchBarBoxActive,
              ]}
            >
              <Search
                size={16}
                color={isSearchActive ? colors.primary : colors.text.muted}
                style={{ marginRight: 8 }}
              />
              <TextInput
                style={styles.searchBarInput}
                placeholder="질문이나 가족의 답변, 작성자 검색..."
                placeholderTextColor={colors.text.muted}
                value={searchQuery}
                onChangeText={setSearchQuery}
                returnKeyType="search"
                clearButtonMode="while-editing"
                autoCorrect={false}
                autoCapitalize="none"
              />
              {searchQuery !== '' && (
                <TouchableOpacity
                  onPress={() => setSearchQuery('')}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  style={{ padding: 4 }}
                >
                  <X size={15} color={colors.text.secondary} />
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* Filter Tabs */}
          <View style={styles.archiveFilterChipsRow}>
            <TouchableOpacity
              style={[
                styles.archiveFilterChip,
                archiveFilter === 'all' && styles.archiveFilterChipActive,
              ]}
              onPress={() => setArchiveFilter('all')}
            >
              <Text
                style={[
                  styles.archiveFilterChipText,
                  archiveFilter === 'all' && styles.archiveFilterChipTextActive,
                ]}
              >
                전체 ({getFilterTabCount('all')})
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.archiveFilterChip,
                archiveFilter === 'answered' && styles.archiveFilterChipActive,
              ]}
              onPress={() => setArchiveFilter('answered')}
            >
              <Text
                style={[
                  styles.archiveFilterChipText,
                  archiveFilter === 'answered' &&
                    styles.archiveFilterChipTextActive,
                ]}
              >
                답변 완료 ({getFilterTabCount('answered')})
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.archiveFilterChip,
                archiveFilter === 'unanswered' && styles.archiveFilterChipActive,
              ]}
              onPress={() => setArchiveFilter('unanswered')}
            >
              <Text
                style={[
                  styles.archiveFilterChipText,
                  archiveFilter === 'unanswered' &&
                    styles.archiveFilterChipTextActive,
                ]}
              >
                미답변 ({getFilterTabCount('unanswered')})
              </Text>
            </TouchableOpacity>
          </View>

          {/* 4. SmallTalk Q&A Cards with Accordion Expand / Collapse */}
          <View style={styles.archiveCardsList}>
            {filteredArchiveList.map((item) => {
              const isExpanded = expandedTopicIds.includes(item.id);
              const topicMatchesSearch =
                isSearchActive &&
                item.topic.toLowerCase().includes(trimmedSearchQuery);

              return (
                <View
                  key={item.id}
                  style={[
                    styles.archiveCard,
                    isExpanded && styles.archiveCardExpanded,
                  ]}
                >
                  <View style={styles.archiveCardHeader}>
                    <View style={styles.archiveHeaderLeft}>
                      <View
                        style={[
                          styles.archiveDateBadge,
                          item.isToday && styles.archiveDateBadgeToday,
                        ]}
                      >
                        <Text
                          style={[
                            styles.archiveDateBadgeText,
                            item.isToday && styles.archiveDateBadgeTextToday,
                          ]}
                        >
                          {item.dateLabel}
                        </Text>
                      </View>
                      <View style={styles.archiveIndexBadge}>
                        <Text style={styles.archiveIndexBadgeText}>
                          #{item.index}
                        </Text>
                      </View>
                    </View>

                    {item.isAnswered ? (
                      <View style={styles.autoBookBadge}>
                        <Check
                          size={11}
                          color="#059669"
                          strokeWidth={2.5}
                          style={{ marginRight: 3 }}
                        />
                        <Text style={styles.autoBookBadgeText}>포토북 수록</Text>
                      </View>
                    ) : (
                      <View style={styles.waitingAnswerBadge}>
                        <Text style={styles.waitingAnswerBadgeText}>
                          답변 대기 중
                        </Text>
                      </View>
                    )}
                  </View>

                  <TouchableOpacity
                    style={styles.archiveQuestionToggleRow}
                    onPress={() => handleToggleExpand(item.id)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.archiveQuestionTitleCol}>
                      <View
                        style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          flexWrap: 'wrap',
                          gap: 6,
                          marginBottom: 4,
                        }}
                      >
                        {isSearchActive && item.yearMonthLabel && (
                          <View style={styles.searchMonthBadge}>
                            <Text style={styles.searchMonthBadgeText}>
                              {item.yearMonthLabel}
                            </Text>
                          </View>
                        )}
                        {topicMatchesSearch && (
                          <View style={styles.searchMatchPill}>
                            <Text style={styles.searchMatchPillText}>
                              질문 일치
                            </Text>
                          </View>
                        )}
                      </View>
                      <Text
                        style={[
                          styles.archiveQuestionTitle,
                          !isExpanded && styles.archiveQuestionTitleCollapsed,
                          topicMatchesSearch &&
                            styles.archiveQuestionTitleMatched,
                        ]}
                        numberOfLines={isExpanded ? undefined : 2}
                      >
                        "{item.topic}"
                      </Text>

                      {!isExpanded && (
                        <View style={styles.collapsedMetaRow}>
                          {item.answers.length > 0 ? (
                            <View style={styles.collapsedAvatarsRow}>
                              <View style={styles.avatarMiniIcons}>
                                {item.answers.slice(0, 4).map((ans, aIdx) => (
                                  <UserAvatar
                                    key={aIdx}
                                    avatar={ans.avatar}
                                    size={20}
                                    style={{
                                      marginLeft: aIdx > 0 ? -6 : 0,
                                      borderWidth: 1.5,
                                      borderColor: colors.card,
                                    }}
                                  />
                                ))}
                              </View>
                              <Text style={styles.collapsedAnswerCountText}>
                                {item.answeredCount}명 답변 완료 · 탭하여 읽기
                              </Text>
                            </View>
                          ) : (
                            <Text style={styles.collapsedNoAnswerText}>
                              아직 등록된 답변 없음 🕊️
                            </Text>
                          )}
                        </View>
                      )}
                    </View>

                    <View style={styles.chevronToggleBtn}>
                      {isExpanded ? (
                        <ChevronUp
                          size={20}
                          color={colors.text.secondary}
                          strokeWidth={2.2}
                        />
                      ) : (
                        <ChevronDown
                          size={20}
                          color={colors.text.secondary}
                          strokeWidth={2.2}
                        />
                      )}
                    </View>
                  </TouchableOpacity>

                  {isExpanded && (
                    <View style={styles.answersContainer}>
                      {item.answers.map((ans, aIdx) => {
                        const ansTextLower = (ans.text || '').toLowerCase();
                        const ansNameLower = (ans.name || '').toLowerCase();
                        const ansMatched =
                          isSearchActive &&
                          (ansTextLower.includes(trimmedSearchQuery) ||
                            ansNameLower.includes(trimmedSearchQuery));

                        return (
                          <View key={ans.id || aIdx} style={styles.answerRow}>
                            <UserAvatar
                              avatar={ans.avatar}
                              size={32}
                              style={{ marginRight: 10, marginTop: 2 }}
                            />
                            <View style={styles.answerContentCol}>
                              <View
                                style={{
                                  flexDirection: 'row',
                                  alignItems: 'center',
                                  gap: 6,
                                }}
                              >
                                <Text
                                  style={[
                                    styles.answerAuthorName,
                                    ansMatched &&
                                      ansNameLower.includes(
                                        trimmedSearchQuery
                                      ) &&
                                      styles.answerAuthorNameMatched,
                                  ]}
                                >
                                  {ans.name}
                                </Text>
                                {ansMatched && (
                                  <View style={styles.searchMatchPill}>
                                    <Text style={styles.searchMatchPillText}>
                                      답변 일치
                                    </Text>
                                  </View>
                                )}
                              </View>
                              <View
                                style={[
                                  styles.answerBubble,
                                  ansMatched && styles.answerBubbleMatched,
                                ]}
                              >
                                <Text
                                  style={[
                                    styles.answerText,
                                    ansMatched && styles.answerTextMatched,
                                  ]}
                                >
                                  “{ans.text}”
                                </Text>
                              </View>
                            </View>
                          </View>
                        );
                      })}

                      {item.answers.length === 0 && (
                        <View style={styles.emptyAnswersBox}>
                          <Text style={styles.emptyAnswersText}>
                            아직 가족들의 답변이 등록되지 않았습니다.{'\n'}함께 탭에서 오늘의 질문에 답변을 남겨보세요! 🕊️
                          </Text>
                        </View>
                      )}

                      <TouchableOpacity
                        style={styles.collapseFooterBtn}
                        onPress={() => handleToggleExpand(item.id)}
                        activeOpacity={0.7}
                      >
                        <Text style={styles.collapseFooterBtnText}>
                          답변 접기 ▲
                        </Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              );
            })}

            {filteredArchiveList.length === 0 && (
              <View style={styles.emptySearchBox}>
                <Search
                  size={32}
                  color={colors.text.muted}
                  style={{ marginBottom: 10 }}
                />
                <Text style={styles.emptySearchTitle}>
                  {isSearchActive
                    ? `'${searchQuery}'에 대한 검색 결과가 없습니다`
                    : '선택하신 기간에 스몰톡 질문이 없습니다'}
                </Text>
                <Text style={styles.emptySearchSub}>
                  {isSearchActive
                    ? '다른 질문 키워드나 가족 이름, 답변 내용으로 검색해보세요.'
                    : '다른 월을 선택하시거나 검색어를 확인해보세요.'}
                </Text>
                {isSearchActive && (
                  <TouchableOpacity
                    style={styles.clearSearchBtn}
                    onPress={() => setSearchQuery('')}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.clearSearchBtnText}>검색어 지우기</Text>
                  </TouchableOpacity>
                )}
              </View>
            )}
          </View>
        </View>
      </ScrollView>

      {/* Month & Year Fast-Jump Picker Modal */}
      <Modal
        visible={monthPickerModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setMonthPickerModalVisible(false)}
      >
        <View style={styles.monthPickerContainer}>
          <View style={styles.photoModalHeader}>
            <View style={{ flex: 1 }}>
              <Text style={styles.photoModalTitle}>스몰톡 기간 선택</Text>
              <Text style={styles.photoModalSubtitle}>
                우리 가족이 생성된 달({familyCreatedAt.getFullYear()}년 {familyCreatedAt.getMonth() + 1}월)부터의 모든 문답 아카이브입니다.
              </Text>
            </View>
            <TouchableOpacity
              style={styles.photoModalCloseBtn}
              onPress={() => setMonthPickerModalVisible(false)}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <X size={22} color={colors.text.primary} />
            </TouchableOpacity>
          </View>

          <View style={styles.monthPickerQuickRow}>
            <TouchableOpacity
              style={[
                styles.monthPickerAllBtn,
                selectedMonth === 'all' && styles.monthPickerAllBtnActive,
              ]}
              onPress={() => {
                setSelectedMonth('all');
                setMonthPickerModalVisible(false);
              }}
              activeOpacity={0.8}
            >
              <Layers
                size={16}
                color={
                  selectedMonth === 'all' ? colors.text.inverse : colors.primary
                }
                style={{ marginRight: 6 }}
              />
              <Text
                style={[
                  styles.monthPickerAllBtnText,
                  selectedMonth === 'all' &&
                    styles.monthPickerAllBtnTextActive,
                ]}
              >
                모든 기간 전체 보기 ({smallTalkArchiveList.length}개 질문)
              </Text>
            </TouchableOpacity>
          </View>

          <ScrollView
            contentContainerStyle={styles.monthPickerScrollContent}
            showsVerticalScrollIndicator={false}
          >
            {groupedYears.map((group) => (
              <View key={group.year} style={styles.yearGroupSection}>
                <View style={styles.yearGroupHeader}>
                  <Text style={styles.yearGroupTitle}>{group.year}년</Text>
                  <Text style={styles.yearGroupCountText}>
                    총 {group.months.reduce((acc, m) => acc + m.count, 0)}개 질문
                  </Text>
                </View>

                <View style={styles.yearMonthsGrid}>
                  {group.months.map((item) => {
                    const isSelected = selectedMonth === item.id;
                    const isDisabled = item.isDisabled;

                    return (
                      <TouchableOpacity
                        key={item.id}
                        style={[
                          styles.monthGridCell,
                          isSelected && styles.monthGridCellActive,
                          isDisabled && styles.monthGridCellDisabled,
                        ]}
                        disabled={isDisabled}
                        onPress={() => {
                          setSelectedMonth(item.id);
                          setMonthPickerModalVisible(false);
                        }}
                        activeOpacity={0.7}
                      >
                        <Text
                          style={[
                            styles.monthGridCellText,
                            isSelected && styles.monthGridCellTextActive,
                            isDisabled && styles.monthGridCellTextDisabled,
                          ]}
                        >
                          {item.month}월
                        </Text>
                        <Text
                          style={[
                            styles.monthGridCellCount,
                            isSelected && styles.monthGridCellCountActive,
                            isDisabled && styles.monthGridCellCountDisabled,
                          ]}
                        >
                          {isDisabled ? '생성 전' : `${item.count}개`}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            ))}
          </ScrollView>
        </View>
      </Modal>
    </>
  );
});
