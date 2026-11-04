import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  TextInput,
  Platform,
} from 'react-native';
import { Plus, X, Edit3, CornerUpLeft, Check, Send } from 'lucide-react-native';
import styles from './ChatStyles';

export interface ReplyingToState {
  id: any;
  senderName?: string;
  text?: string;
  image?: string | null;
}

export interface EditingMessageState {
  id: string | number;
  rawText: string;
  originalBody: string;
}

export interface ChatInputBarProps {
  selectedRoomId: string | null;
  selectedPhoto: string | null;
  onClearPhoto: () => void;
  editingMessage: EditingMessageState | null;
  onCancelEdit: () => void;
  replyingTo: ReplyingToState | null;
  onCancelReply: () => void;
  onOpenAttachMenu: () => void;
  onSubmitText: (text: string) => void;
}

function ChatInputBarComponent({
  selectedRoomId,
  selectedPhoto,
  onClearPhoto,
  editingMessage,
  onCancelEdit,
  replyingTo,
  onCancelReply,
  onOpenAttachMenu,
  onSubmitText,
}: ChatInputBarProps): React.ReactElement {
  // ⚡ 키보드 타이핑 상태를 ChatInputBar 내부로 격리하여 입력 시 ChatScreen 및 FlatList 리렌더링 0회 달성
  const [inputText, setInputText] = useState('');
  const inputRef = useRef<TextInput>(null);
  const isSendingRef = useRef(false);

  // 방이 바뀔 때 입력창 초기화
  useEffect(() => {
    setInputText('');
  }, [selectedRoomId]);

  // 메시지 수정 모드 진입 시 기존 본문 자동 세팅 및 포커스
  useEffect(() => {
    if (editingMessage) {
      setInputText(editingMessage.originalBody || '');
      const t = setTimeout(() => {
        inputRef.current?.focus();
      }, 150);
      return () => clearTimeout(t);
    }
    return undefined;
  }, [editingMessage]);

  // 인용 답장 모드 진입 시 입력창 자동 포커스
  useEffect(() => {
    if (replyingTo && !editingMessage) {
      const t = setTimeout(() => {
        inputRef.current?.focus();
      }, 150);
      return () => clearTimeout(t);
    }
    return undefined;
  }, [replyingTo, editingMessage]);

  const handlePressSend = () => {
    const trimmed = inputText.trim();
    if (!trimmed && !selectedPhoto) return;
    if (isSendingRef.current) return;
    isSendingRef.current = true;
    setTimeout(() => {
      isSendingRef.current = false;
    }, 250);

    onSubmitText(trimmed);
    setInputText('');
  };

  const canSend = Boolean(inputText.trim() || selectedPhoto);

  return (
    <>
      {/* Image Preview Container */}
      {selectedPhoto && (
        <View style={styles.previewContainer}>
          <Image source={{ uri: selectedPhoto }} style={styles.previewImage} />
          <View style={styles.previewInfoCol}>
            <Text style={styles.previewLabel}>사진이 첨부되었습니다</Text>
            <Text style={styles.previewSubLabel}>전송 버튼을 누르면 공유됩니다</Text>
          </View>
          <TouchableOpacity
            style={styles.removePreview}
            onPress={onClearPhoto}
          >
            <X size={16} color="#FFFFFF" strokeWidth={2.5} />
          </TouchableOpacity>
        </View>
      )}

      {/* Editing Message Preview Bar */}
      {editingMessage && (
        <View style={styles.editingBarContainer}>
          <View style={styles.replyBarLeft}>
            <View style={styles.editingBarIconBox}>
              <Edit3 size={14} color="#059669" strokeWidth={2.4} />
            </View>
            <View style={{ flex: 1, minWidth: 0, justifyContent: 'center' }}>
              <Text style={styles.editingBarTitle} numberOfLines={1}>
                메시지 수정 중
              </Text>
              <Text style={styles.replyBarPreviewText} numberOfLines={1}>
                {editingMessage.originalBody}
              </Text>
            </View>
          </View>
          <TouchableOpacity
            style={styles.replyBarCloseBtn}
            onPress={() => {
              setInputText('');
              onCancelEdit();
            }}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <X size={16} color="#78716C" />
          </TouchableOpacity>
        </View>
      )}

      {/* Replying-To Quote Preview Bar */}
      {replyingTo && !editingMessage && (
        <View style={styles.replyBarContainer}>
          <View style={styles.replyBarLeft}>
            <View style={styles.replyBarIconBox}>
              <CornerUpLeft size={14} color="#FF6B47" strokeWidth={2.4} />
            </View>
            <View style={{ flex: 1, minWidth: 0, justifyContent: 'center' }}>
              <Text style={styles.replyBarSenderName} numberOfLines={1}>
                {replyingTo.senderName}님에게 답장
              </Text>
              <Text style={styles.replyBarPreviewText} numberOfLines={1}>
                {replyingTo.text || (replyingTo.image ? '사진' : '메시지')}
              </Text>
            </View>
          </View>
          <TouchableOpacity
            style={styles.replyBarCloseBtn}
            onPress={onCancelReply}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <X size={16} color="#78716C" />
          </TouchableOpacity>
        </View>
      )}

      {/* Message Input Box */}
      <View style={styles.inputArea}>
        <TouchableOpacity
          style={styles.attachButton}
          onPress={onOpenAttachMenu}
          activeOpacity={0.7}
        >
          <Plus size={22} color="#FF6B47" strokeWidth={2.4} />
        </TouchableOpacity>

        <TextInput
          ref={inputRef}
          style={styles.input}
          placeholder={
            editingMessage
              ? '수정할 메시지 내용을 입력하세요...'
              : '가족에게 따뜻한 메시지 보내기...'
          }
          placeholderTextColor="#A8A29E"
          value={inputText}
          onChangeText={setInputText}
          multiline
          onKeyPress={(e: any) => {
            if (Platform.OS === 'web') {
              const nativeEvent = e?.nativeEvent || {};
              if (
                nativeEvent.isComposing ||
                e?.isComposing ||
                nativeEvent.keyCode === 229
              ) {
                return;
              }
              if (nativeEvent.key === 'Enter' && !nativeEvent.shiftKey) {
                e?.preventDefault?.();
                handlePressSend();
              }
            }
          }}
        />

        <TouchableOpacity
          style={[styles.sendButton, canSend ? styles.sendActive : null]}
          onPress={handlePressSend}
          disabled={!canSend}
          activeOpacity={0.8}
        >
          {editingMessage ? (
            <Check
              size={18}
              color={inputText.trim() ? '#FFFFFF' : '#A8A29E'}
              strokeWidth={2.5}
            />
          ) : (
            <Send
              size={18}
              color={canSend ? '#FFFFFF' : '#A8A29E'}
              strokeWidth={2.2}
            />
          )}
        </TouchableOpacity>
      </View>
    </>
  );
}

const ChatInputBar = React.memo(ChatInputBarComponent);
export default ChatInputBar;
