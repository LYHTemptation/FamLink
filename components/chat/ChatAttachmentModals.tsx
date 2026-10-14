import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  ScrollView,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import {
  Image as ImageIcon,
  FileText,
  Video,
  Mic,
  Vote,
  Calendar,
  CheckSquare,
  MapPin,
  Check,
  X,
  Plus,
  Copy,
  CornerUpLeft,
  Pin,
  Trash2,
} from 'lucide-react-native';
import { colors } from '../../theme';
import type { FamilyMember } from '../../types/domain';
import styles from './ChatStyles';

export interface ChatAttachmentModalsProps {
  insetsBottom: number;
  attachMenuVisible: boolean;
  setAttachMenuVisible: (visible: boolean) => void;
  pickImage: () => void;
  handlePickDocument: () => void;
  handlePickVideo: () => void;
  handleOpenVoiceModal: () => void;
  handleOpenPollModal: () => void;
  handleOpenEventModal: () => void;
  handleOpenChoreModal: () => void;
  handleOpenLocationModal: () => void;
  voiceModalVisible: boolean;
  handleCancelVoice: () => void;
  isRecording: boolean;
  recordingSeconds: number;
  handleStartRecording: () => void;
  handleStopAndSendVoice: () => void;
  pollModalVisible: boolean;
  setPollModalVisible: (visible: boolean) => void;
  pollTitle: string;
  setPollTitle: (val: string) => void;
  pollOptions: string[];
  setPollOptions: (opts: string[]) => void;
  handleCreatePoll: () => void;
  eventModalVisible: boolean;
  setEventModalVisible: (visible: boolean) => void;
  eventTitle: string;
  setEventTitle: (val: string) => void;
  eventDate: string;
  handleEventDateChange: (val: string) => void;
  eventTime: string;
  handleEventTimeChange: (val: string) => void;
  handleCreateEventCard: () => void;
  choreModalVisible: boolean;
  setChoreModalVisible: (visible: boolean) => void;
  choreTitle: string;
  setChoreTitle: (val: string) => void;
  choreAssignee: string;
  setChoreAssignee: (val: string) => void;
  familyMembers?: FamilyMember[];
  handleCreateChoreCard: () => void;
  locationModalVisible: boolean;
  setLocationModalVisible: (visible: boolean) => void;
  locationTitle: string;
  setLocationTitle: (val: string) => void;
  locationLoading: boolean;
  handleSendCurrentLocation: () => void;
  contextMenuVisible: boolean;
  setContextMenuVisible: (visible: boolean) => void;
  selectedMsgForMenu: any;
  handleCopyMessageText: () => void;
  handleTriggerReply: () => void;
  handlePinNotice: () => void;
  handleTriggerDelete: () => void;
}

export default function ChatAttachmentModals({
  insetsBottom,
  attachMenuVisible,
  setAttachMenuVisible,
  pickImage,
  handlePickDocument,
  handlePickVideo,
  handleOpenVoiceModal,
  handleOpenPollModal,
  handleOpenEventModal,
  handleOpenChoreModal,
  handleOpenLocationModal,
  voiceModalVisible,
  handleCancelVoice,
  isRecording,
  recordingSeconds,
  handleStartRecording,
  handleStopAndSendVoice,
  pollModalVisible,
  setPollModalVisible,
  pollTitle,
  setPollTitle,
  pollOptions,
  setPollOptions,
  handleCreatePoll,
  eventModalVisible,
  setEventModalVisible,
  eventTitle,
  setEventTitle,
  eventDate,
  handleEventDateChange,
  eventTime,
  handleEventTimeChange,
  handleCreateEventCard,
  choreModalVisible,
  setChoreModalVisible,
  choreTitle,
  setChoreTitle,
  choreAssignee,
  setChoreAssignee,
  familyMembers,
  handleCreateChoreCard,
  locationModalVisible,
  setLocationModalVisible,
  locationTitle,
  setLocationTitle,
  locationLoading,
  handleSendCurrentLocation,
  contextMenuVisible,
  setContextMenuVisible,
  selectedMsgForMenu,
  handleCopyMessageText,
  handleTriggerReply,
  handlePinNotice,
  handleTriggerDelete,
}: ChatAttachmentModalsProps): React.ReactElement {
  const sheetBottomPadding = Math.max(24, insetsBottom + 12);

  return (
    <>
      {/* 1. 첨부 메뉴 바텀시트 / 모달 (7가지 공유 기능 진입점) */}
      <Modal
        visible={attachMenuVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setAttachMenuVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setAttachMenuVisible(false)}
        >
          <View style={[styles.sheetContainer, { paddingBottom: sheetBottomPadding }]}>
            <View style={styles.sheetHandleBar} />
            <Text style={styles.sheetTitle}>가족 공유 및 첨부</Text>
            <Text style={styles.sheetSubtitle}>대화방에 공유할 콘텐츠를 선택하세요</Text>

            <View style={styles.attachGrid}>
              <TouchableOpacity
                style={styles.attachGridItem}
                onPress={() => {
                  setAttachMenuVisible(false);
                  pickImage();
                }}
              >
                <View style={[styles.attachIconCircle, { backgroundColor: colors.primaryLight }]}>
                  <ImageIcon size={22} color={colors.primary} />
                </View>
                <Text style={styles.attachGridLabel}>사진 전송</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.attachGridItem} onPress={handlePickDocument}>
                <View style={[styles.attachIconCircle, { backgroundColor: '#EFF6FF' }]}>
                  <FileText size={22} color="#3B82F6" />
                </View>
                <Text style={styles.attachGridLabel}>문서 / 파일</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.attachGridItem} onPress={handlePickVideo}>
                <View style={[styles.attachIconCircle, { backgroundColor: '#FAF5FF' }]}>
                  <Video size={22} color="#8B5CF6" />
                </View>
                <Text style={styles.attachGridLabel}>동영상</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.attachGridItem} onPress={handleOpenVoiceModal}>
                <View style={[styles.attachIconCircle, { backgroundColor: '#FFFBEB' }]}>
                  <Mic size={22} color="#F59E0B" />
                </View>
                <Text style={styles.attachGridLabel}>음성 메시지</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.attachGridItem} onPress={handleOpenPollModal}>
                <View style={[styles.attachIconCircle, { backgroundColor: '#FEF2F2' }]}>
                  <Vote size={22} color="#EF4444" />
                </View>
                <Text style={styles.attachGridLabel}>가족 투표</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.attachGridItem} onPress={handleOpenEventModal}>
                <View style={[styles.attachIconCircle, { backgroundColor: '#ECFDF5' }]}>
                  <Calendar size={22} color="#10B981" />
                </View>
                <Text style={styles.attachGridLabel}>일정 공유</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.attachGridItem} onPress={handleOpenChoreModal}>
                <View style={[styles.attachIconCircle, { backgroundColor: colors.primaryLight }]}>
                  <CheckSquare size={22} color={colors.primary} strokeWidth={2.2} />
                </View>
                <Text style={styles.attachGridLabel}>집안일 추가</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.attachGridItem} onPress={handleOpenLocationModal}>
                <View style={[styles.attachIconCircle, { backgroundColor: '#FFF7ED' }]}>
                  <MapPin size={22} color="#EA580C" />
                </View>
                <Text style={styles.attachGridLabel}>위치 공유</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={styles.sheetCloseBtn}
              onPress={() => setAttachMenuVisible(false)}
            >
              <Text style={styles.sheetCloseBtnText}>닫기</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* 2. 음성 메시지 녹음 모달 */}
      <Modal
        visible={voiceModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={handleCancelVoice}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalOverlay}
        >
          <TouchableOpacity
            style={styles.overlayBackdrop}
            activeOpacity={1}
            onPress={handleCancelVoice}
          />
          <View style={[styles.sheetContainer, { paddingBottom: sheetBottomPadding }]}>
            <View style={styles.sheetHandleBar} />
            <Text style={styles.sheetTitle}>🎙️ 음성 메시지 보내기</Text>
            <Text style={styles.sheetSubtitle}>
              {isRecording
                ? '가족에게 목소리를 들려주는 중...'
                : '버튼을 눌러 음성 녹음을 시작하세요.'}
            </Text>

            <View style={styles.voiceRecordingStatusBox}>
              <Text style={styles.recordingTimeDisplay}>
                00:{recordingSeconds < 10 ? `0${recordingSeconds}` : recordingSeconds}
              </Text>
              {isRecording && <View style={styles.recordingPulseDot} />}
            </View>

            <View style={styles.voiceActionRow}>
              {!isRecording ? (
                <TouchableOpacity
                  style={styles.voiceRecStartBtn}
                  onPress={handleStartRecording}
                >
                  <Mic size={24} color="#FFFFFF" />
                  <Text style={styles.voiceRecStartBtnText}>녹음 시작</Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  style={styles.voiceRecStopBtn}
                  onPress={handleStopAndSendVoice}
                >
                  <Check size={24} color="#FFFFFF" />
                  <Text style={styles.voiceRecStartBtnText}>녹음 완료 및 전송</Text>
                </TouchableOpacity>
              )}
            </View>

            <TouchableOpacity style={styles.sheetCloseBtn} onPress={handleCancelVoice}>
              <Text style={styles.sheetCloseBtnText}>취소</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* 3. 가족 투표 생성 모달 */}
      <Modal
        visible={pollModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setPollModalVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalOverlay}
        >
          <TouchableOpacity
            style={styles.overlayBackdrop}
            activeOpacity={1}
            onPress={() => setPollModalVisible(false)}
          />
          <View style={[styles.sheetContainer, { paddingBottom: sheetBottomPadding }]}>
            <View style={styles.sheetHandleBar} />
            <Text style={styles.sheetTitle}>📊 가족 투표 만들기</Text>
            <Text style={styles.sheetSubtitle}>
              가족들과 함께 결정할 질문과 선택지를 입력하세요.
            </Text>

            <ScrollView
              style={{ maxHeight: 360 }}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              <Text style={styles.modalFieldLabel}>투표 질문</Text>
              <TextInput
                style={styles.modalInputBox}
                placeholder="예: 오늘 저녁 뭐 먹을까요?"
                placeholderTextColor={colors.text.muted}
                value={pollTitle}
                onChangeText={setPollTitle}
              />

              <Text style={styles.modalFieldLabel}>선택지</Text>
              {pollOptions.map((opt, idx) => (
                <View key={idx} style={styles.pollOptionInputRow}>
                  <TextInput
                    style={[styles.modalInputBox, { flex: 1, marginBottom: 8 }]}
                    placeholder={`선택지 ${idx + 1}`}
                    placeholderTextColor={colors.text.muted}
                    value={opt}
                    onChangeText={(val) => {
                      const next = [...pollOptions];
                      next[idx] = val;
                      setPollOptions(next);
                    }}
                  />
                  {pollOptions.length > 2 && (
                    <TouchableOpacity
                      style={styles.removeOptionBtn}
                      onPress={() =>
                        setPollOptions(pollOptions.filter((_, i) => i !== idx))
                      }
                    >
                      <X size={16} color={colors.danger} />
                    </TouchableOpacity>
                  )}
                </View>
              ))}

              {pollOptions.length < 5 && (
                <TouchableOpacity
                  style={styles.addOptionBtn}
                  onPress={() => setPollOptions([...pollOptions, ''])}
                >
                  <Plus size={16} color={colors.primary} style={{ marginRight: 4 }} />
                  <Text style={styles.addOptionBtnText}>선택지 추가</Text>
                </TouchableOpacity>
              )}
            </ScrollView>

            <TouchableOpacity style={styles.featureConfirmBtn} onPress={handleCreatePoll}>
              <Text style={styles.featureConfirmBtnText}>투표 등록하기</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.sheetCloseBtn}
              onPress={() => setPollModalVisible(false)}
            >
              <Text style={styles.sheetCloseBtnText}>닫기</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* 4. 일정 공유 모달 */}
      <Modal
        visible={eventModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setEventModalVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalOverlay}
        >
          <TouchableOpacity
            style={styles.overlayBackdrop}
            activeOpacity={1}
            onPress={() => setEventModalVisible(false)}
          />
          <View style={[styles.sheetContainer, { paddingBottom: sheetBottomPadding }]}>
            <View style={styles.sheetHandleBar} />
            <Text style={styles.sheetTitle}>📅 가족 일정 공유</Text>
            <Text style={styles.sheetSubtitle}>
              가족들과 함께할 일정을 공유하고 캘린더에 바로 등록하세요.
            </Text>

            <ScrollView
              style={{ maxHeight: 360 }}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              <Text style={styles.modalFieldLabel}>일정 제목</Text>
              <TextInput
                style={styles.modalInputBox}
                placeholder="예: 주말 가족 외식, 할머니 생신"
                placeholderTextColor={colors.text.muted}
                value={eventTitle}
                onChangeText={setEventTitle}
              />

              <Text style={styles.modalFieldLabel}>날짜 (YYYY-MM-DD)</Text>
              <TextInput
                style={styles.modalInputBox}
                placeholder="2026-10-10 (숫자만 입력)"
                placeholderTextColor={colors.text.muted}
                value={eventDate}
                onChangeText={handleEventDateChange}
                keyboardType="number-pad"
                maxLength={10}
              />

              <Text style={styles.modalFieldLabel}>시간 (HH:MM)</Text>
              <TextInput
                style={styles.modalInputBox}
                placeholder="18:30 (숫자만 입력)"
                placeholderTextColor={colors.text.muted}
                value={eventTime}
                onChangeText={handleEventTimeChange}
                keyboardType="number-pad"
                maxLength={5}
              />
            </ScrollView>

            <TouchableOpacity
              style={styles.featureConfirmBtn}
              onPress={handleCreateEventCard}
            >
              <Text style={styles.featureConfirmBtnText}>일정 공유하기</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.sheetCloseBtn}
              onPress={() => setEventModalVisible(false)}
            >
              <Text style={styles.sheetCloseBtnText}>닫기</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* 5. 집안일 추가 모달 */}
      <Modal
        visible={choreModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setChoreModalVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalOverlay}
        >
          <TouchableOpacity
            style={styles.overlayBackdrop}
            activeOpacity={1}
            onPress={() => setChoreModalVisible(false)}
          />
          <View style={[styles.sheetContainer, { paddingBottom: sheetBottomPadding }]}>
            <View style={styles.sheetHandleBar} />
            <Text style={styles.sheetTitle}>🧹 집안일 / 할 일 추가 요청</Text>
            <Text style={styles.sheetSubtitle}>
              가족 함께/집안일 목록에 등록할 할 일을 공유하세요.
            </Text>

            <Text style={styles.modalFieldLabel}>할 일 내용</Text>
            <TextInput
              style={styles.modalInputBox}
              placeholder="예: 분리수거하기, 청소기 돌리기, 설거지"
              placeholderTextColor={colors.text.muted}
              value={choreTitle}
              onChangeText={setChoreTitle}
            />

            <Text style={styles.modalFieldLabel}>담당 가족 선택</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={{ flexDirection: 'row', marginVertical: 6 }}
            >
              {[
                '가족 전체',
                ...(familyMembers && Array.isArray(familyMembers)
                  ? familyMembers.map((m) => m.name)
                  : ['엄마', '아빠', '아들', '딸']),
              ].map((memberOpt) => {
                const isSelected = choreAssignee === memberOpt;
                return (
                  <TouchableOpacity
                    key={memberOpt}
                    style={[
                      styles.choreAssigneeChip,
                      isSelected && styles.choreAssigneeChipSelected,
                    ]}
                    onPress={() => setChoreAssignee(memberOpt)}
                    activeOpacity={0.75}
                  >
                    <Text
                      style={[
                        styles.choreAssigneeChipText,
                        isSelected && styles.choreAssigneeChipTextSelected,
                      ]}
                    >
                      {memberOpt}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            <TouchableOpacity
              style={styles.featureConfirmBtn}
              onPress={handleCreateChoreCard}
            >
              <Text style={styles.featureConfirmBtnText}>집안일 카드 전송</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.sheetCloseBtn}
              onPress={() => setChoreModalVisible(false)}
            >
              <Text style={styles.sheetCloseBtnText}>닫기</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* 6. 위치 / 모임 장소 공유 모달 */}
      <Modal
        visible={locationModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setLocationModalVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalOverlay}
        >
          <TouchableOpacity
            style={styles.overlayBackdrop}
            activeOpacity={1}
            onPress={() => setLocationModalVisible(false)}
          />
          <View style={[styles.sheetContainer, { paddingBottom: sheetBottomPadding }]}>
            <View style={styles.sheetHandleBar} />
            <Text style={styles.sheetTitle}>📍 위치 및 모임 장소 공유</Text>
            <Text style={styles.sheetSubtitle}>
              현재 위치나 모임 약속 장소를 가족들에게 전송하세요.
            </Text>

            <Text style={styles.modalFieldLabel}>장소 이름 / 메모 (선택)</Text>
            <TextInput
              style={styles.modalInputBox}
              placeholder="예: 강남역 11번 출구 앞, 우리집"
              placeholderTextColor={colors.text.muted}
              value={locationTitle}
              onChangeText={setLocationTitle}
            />

            <TouchableOpacity
              style={styles.featureConfirmBtn}
              onPress={handleSendCurrentLocation}
              disabled={locationLoading}
            >
              {locationLoading ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text style={styles.featureConfirmBtnText}>
                  현재 위치 / 장소 공유하기
                </Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.sheetCloseBtn}
              onPress={() => setLocationModalVisible(false)}
            >
              <Text style={styles.sheetCloseBtnText}>닫기</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* 7. 메시지 롱프레스 퀵 액션 컨텍스트 메뉴 모달 */}
      <Modal
        visible={contextMenuVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setContextMenuVisible(false)}
      >
        <TouchableOpacity
          style={styles.contextModalOverlay}
          activeOpacity={1}
          onPress={() => setContextMenuVisible(false)}
        >
          <View
            style={[
              styles.contextMenuCard,
              { paddingBottom: Math.max(20, insetsBottom + 8) },
            ]}
          >
            {selectedMsgForMenu && (
              <View style={styles.contextPreviewHeader}>
                <Text style={styles.contextPreviewAuthor}>
                  {selectedMsgForMenu.senderInfo?.name || '가족'}님의 메시지
                </Text>
                <Text style={styles.contextPreviewText} numberOfLines={2}>
                  {selectedMsgForMenu.bubbleText ||
                    (selectedMsgForMenu.item?.image ? '사진' : '메시지')}
                </Text>
              </View>
            )}

            <View style={styles.contextActionsList}>
              {Boolean(selectedMsgForMenu?.bubbleText) && (
                <TouchableOpacity
                  style={styles.contextActionBtn}
                  activeOpacity={0.7}
                  onPress={handleCopyMessageText}
                >
                  <View style={[styles.contextActionIconBox, { backgroundColor: '#EFF6FF' }]}>
                    <Copy size={18} color="#3B82F6" strokeWidth={2.2} />
                  </View>
                  <Text style={styles.contextActionLabel}>텍스트 복사</Text>
                </TouchableOpacity>
              )}

              <TouchableOpacity
                style={styles.contextActionBtn}
                activeOpacity={0.7}
                onPress={handleTriggerReply}
              >
                <View style={[styles.contextActionIconBox, { backgroundColor: colors.primaryLight }]}>
                  <CornerUpLeft size={18} color={colors.primary} strokeWidth={2.2} />
                </View>
                <Text style={styles.contextActionLabel}>답장하기</Text>
              </TouchableOpacity>

              {Boolean(selectedMsgForMenu?.bubbleText) && (
                <TouchableOpacity
                  style={styles.contextActionBtn}
                  activeOpacity={0.7}
                  onPress={handlePinNotice}
                >
                  <View style={[styles.contextActionIconBox, { backgroundColor: '#FEF3C7' }]}>
                    <Pin size={18} color="#D97706" strokeWidth={2.2} />
                  </View>
                  <Text style={styles.contextActionLabel}>공지로 등록</Text>
                </TouchableOpacity>
              )}

              <TouchableOpacity
                style={[styles.contextActionBtn, styles.contextActionBtnDanger]}
                activeOpacity={0.7}
                onPress={handleTriggerDelete}
              >
                <View style={[styles.contextActionIconBox, { backgroundColor: '#FEE2E2' }]}>
                  <Trash2 size={18} color={colors.danger} strokeWidth={2.2} />
                </View>
                <Text style={[styles.contextActionLabel, { color: colors.danger }]}>
                  삭제하기
                </Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={styles.sheetCloseBtn}
              onPress={() => setContextMenuVisible(false)}
            >
              <Text style={styles.sheetCloseBtnText}>취소</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </>
  );
}
