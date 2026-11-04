import { useState, useRef, useCallback } from 'react';
import { Platform, Alert } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import * as Location from 'expo-location';
import { uploadChatAttachmentToStorage } from '../../services/familyDataService';

export interface UseChatAttachmentsParams {
  selectedRoomId: string | null;
  currentUser?: any;
  currentUserProfile?: any;
  myActorName: string;
  onSendMessage?: (msg: any) => Promise<void> | void;
  onAddEvent?: (event: any) => void;
  setSelectedPhoto: (uri: string | null) => void;
}

export function useChatAttachments({
  selectedRoomId,
  currentUser,
  currentUserProfile,
  myActorName,
  onSendMessage,
  onAddEvent,
  setSelectedPhoto,
}: UseChatAttachmentsParams) {
  const [attachMenuVisible, setAttachMenuVisible] = useState(false);
  const [pollModalVisible, setPollModalVisible] = useState(false);
  const [pollTitle, setPollTitle] = useState('');
  const [pollOptions, setPollOptions] = useState(['', '']);
  const [eventModalVisible, setEventModalVisible] = useState(false);
  const [eventTitle, setEventTitle] = useState('');
  const [eventDate, setEventDate] = useState(
    new Date().toISOString().split('T')[0]
  );
  const [eventTime, setEventTime] = useState('18:00');
  const [choreModalVisible, setChoreModalVisible] = useState(false);
  const [choreTitle, setChoreTitle] = useState('');
  const [choreAssignee, setChoreAssignee] = useState('가족 전체');
  const [locationModalVisible, setLocationModalVisible] = useState(false);
  const [locationTitle, setLocationTitle] = useState('');
  const [voiceModalVisible, setVoiceModalVisible] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [isRecording, setIsRecording] = useState(false);
  const recordingTimerRef = useRef<any>(null);
  const mediaRecorderRef = useRef<any>(null);
  const recordedChunksRef = useRef<any[]>([]);
  const [audioPlayingId, setAudioPlayingId] = useState<string | number | null>(
    null
  );
  const [locationLoading, setLocationLoading] = useState(false);

  const compressImageForChat = useCallback(async (uri: string): Promise<string> => {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      return new Promise((resolve) => {
        const img = new (window as any).Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
          const maxDim = 1280;
          let { width, height } = img;
          if (width > maxDim || height > maxDim) {
            if (width > height) {
              height = Math.round((height * maxDim) / width);
              width = maxDim;
            } else {
              width = Math.round((width * maxDim) / height);
              height = maxDim;
            }
          }
          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(img, 0, 0, width, height);
            resolve(canvas.toDataURL('image/jpeg', 0.75));
          } else {
            resolve(uri);
          }
        };
        img.onerror = () => resolve(uri);
        img.src = uri;
      });
    }
    return uri;
  }, []);

  // 갤러리에서 사진 선택
  const pickImage = useCallback(async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('권한 필요', '사진첩 접근 권한이 필요합니다.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: false,
      quality: 0.7,
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      const originalUri = result.assets[0].uri;
      const optimizedUri = await compressImageForChat(originalUri);
      setSelectedPhoto(optimizedUri);
    }
  }, [compressImageForChat, setSelectedPhoto]);

  // 카메라로 즉시 사진 촬영 (📷)
  const takePhotoWithCamera = useCallback(async () => {
    try {
      setAttachMenuVisible(false);
      if (Platform.OS !== 'web') {
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('권한 필요', '카메라 촬영을 위해 카메라 접근 권한이 필요합니다.');
          return;
        }
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ['images'],
        allowsEditing: false,
        quality: 0.75,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const originalUri = result.assets[0].uri;
        const optimizedUri = await compressImageForChat(originalUri);
        setSelectedPhoto(optimizedUri);
      }
    } catch (_) {
      // 웹 또는 시뮬레이터에서 카메라 미지원 시 갤러리 피커로 폴백
      await pickImage();
    }
  }, [compressImageForChat, pickImage, setSelectedPhoto]);

  // 1. 문서 및 일반 파일 공유 핸들러
  const handlePickDocument = useCallback(async () => {
    try {
      setAttachMenuVisible(false);
      const res = await DocumentPicker.getDocumentAsync({
        type: '*/*',
        copyToCacheDirectory: true,
      });

      if (!res.canceled && res.assets && res.assets.length > 0) {
        const file = res.assets[0];
        const fileSizeMb = file.size
          ? (file.size / (1024 * 1024)).toFixed(1) + 'MB'
          : '파일';
        const uploadedUri = await uploadChatAttachmentToStorage(
          currentUserProfile?.family_id,
          file.uri,
          file.name || 'document.bin',
          file.mimeType || 'application/octet-stream'
        );
        const filePayload = {
          name: file.name || '첨부파일',
          size: fileSizeMb,
          mimeType: file.mimeType || 'application/octet-stream',
          uri: uploadedUri,
        };

        if (onSendMessage) {
          onSendMessage({
            text: `[파일] ${JSON.stringify(filePayload)}`,
            roomId: selectedRoomId || 'family-group',
          });
        }
      }
    } catch (err) {
      console.warn('Document pick error:', err);
      Alert.alert('파일 선택 오류', '파일을 불러오는데 실패했습니다.');
    }
  }, [currentUserProfile?.family_id, onSendMessage, selectedRoomId]);

  // 2. 동영상 공유 핸들러
  const handlePickVideo = useCallback(async () => {
    try {
      setAttachMenuVisible(false);
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('권한 필요', '동영상 첨부를 위해 갤러리 권한이 필요합니다.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['videos'],
        allowsEditing: false,
        quality: 0.7,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const videoAsset = result.assets[0];
        const uploadedUri = await uploadChatAttachmentToStorage(
          currentUserProfile?.family_id,
          videoAsset.uri,
          videoAsset.fileName || 'video.mp4',
          'video/mp4'
        );
        const videoPayload = {
          uri: uploadedUri,
          duration: videoAsset.duration
            ? Math.round(videoAsset.duration / 1000)
            : 0,
          name: videoAsset.fileName || '가족 동영상',
        };

        if (onSendMessage) {
          onSendMessage({
            text: `[동영상] ${JSON.stringify(videoPayload)}`,
            roomId: selectedRoomId || 'family-group',
          });
        }
      }
    } catch (err) {
      console.warn('Video pick error:', err);
      Alert.alert('동영상 선택 오류', '동영상을 불러오는데 실패했습니다.');
    }
  }, [currentUserProfile?.family_id, onSendMessage, selectedRoomId]);

  // 3. 음성 메시지 핸들러
  const handleOpenVoiceModal = useCallback(() => {
    setAttachMenuVisible(false);
    setRecordingSeconds(0);
    setIsRecording(false);
    setVoiceModalVisible(true);
  }, []);

  const handleStartRecording = useCallback(async () => {
    setIsRecording(true);
    setRecordingSeconds(0);
    recordedChunksRef.current = [];

    if (
      Platform.OS === 'web' &&
      typeof navigator !== 'undefined' &&
      navigator.mediaDevices?.getUserMedia &&
      typeof (window as any).MediaRecorder !== 'undefined'
    ) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const recorder = new (window as any).MediaRecorder(stream);
        recorder.ondataavailable = (e: any) => {
          if (e.data && e.data.size > 0) {
            recordedChunksRef.current.push(e.data);
          }
        };
        recorder.start();
        mediaRecorderRef.current = recorder;
      } catch (_) {
        mediaRecorderRef.current = null;
      }
    }

    if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
    recordingTimerRef.current = setInterval(() => {
      setRecordingSeconds((prev) => prev + 1);
    }, 1000);
  }, []);

  const handleStopAndSendVoice = useCallback(async () => {
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }
    const finalSeconds = Math.max(1, recordingSeconds);
    setIsRecording(false);
    setVoiceModalVisible(false);

    let uploadedVoiceUri = '';
    if (mediaRecorderRef.current) {
      try {
        const recorder = mediaRecorderRef.current;
        mediaRecorderRef.current = null;
        await new Promise<void>((resolve) => {
          recorder.onstop = () => resolve();
          if (recorder.state !== 'inactive') {
            recorder.stop();
          } else {
            resolve();
          }
          if (recorder.stream) {
            recorder.stream.getTracks().forEach((t: any) => t.stop());
          }
        });
        if (recordedChunksRef.current.length > 0 && typeof Blob !== 'undefined') {
          const audioBlob = new Blob(recordedChunksRef.current, {
            type: 'audio/webm',
          });
          const localBlobUrl = URL.createObjectURL(audioBlob);
          uploadedVoiceUri = await uploadChatAttachmentToStorage(
            currentUserProfile?.family_id,
            localBlobUrl,
            'voice.webm',
            'audio/webm'
          );
        }
      } catch (_) {}
    }

    const voicePayload: any = {
      duration: finalSeconds,
      timestamp: new Date().toLocaleTimeString('ko-KR', {
        hour: '2-digit',
        minute: '2-digit',
      }),
    };
    if (uploadedVoiceUri) {
      voicePayload.uri = uploadedVoiceUri;
    }

    if (onSendMessage) {
      onSendMessage({
        text: `[음성메모] ${JSON.stringify(voicePayload)}`,
        roomId: selectedRoomId || 'family-group',
      });
    }
  }, [recordingSeconds, currentUserProfile?.family_id, onSendMessage, selectedRoomId]);

  const handleCancelVoice = useCallback(() => {
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }
    if (mediaRecorderRef.current) {
      try {
        if (mediaRecorderRef.current.state !== 'inactive') {
          mediaRecorderRef.current.stop();
        }
        if (mediaRecorderRef.current.stream) {
          mediaRecorderRef.current.stream.getTracks().forEach((t: any) => t.stop());
        }
      } catch (_) {}
      mediaRecorderRef.current = null;
    }
    setIsRecording(false);
    setRecordingSeconds(0);
    setVoiceModalVisible(false);
  }, []);

  // 4. 가족 투표 핸들러
  const handleOpenPollModal = useCallback(() => {
    setAttachMenuVisible(false);
    setPollTitle('');
    setPollOptions(['', '']);
    setPollModalVisible(true);
  }, []);

  const handleCreatePoll = useCallback(() => {
    const validOptions = pollOptions.map((o) => o.trim()).filter(Boolean);
    if (!pollTitle.trim()) {
      Alert.alert('입력 안내', '투표 제목을 입력해주세요.');
      return;
    }
    if (validOptions.length < 2) {
      Alert.alert('입력 안내', '최소 2개 이상의 선택지를 입력해주세요.');
      return;
    }

    const pollPayload = {
      id: `poll-${Date.now()}`,
      title: pollTitle.trim(),
      options: validOptions.map((opt) => ({ text: opt, votes: [] })),
      authorId: currentUserProfile?.id || currentUser,
      createdAt: new Date().toISOString(),
    };

    if (onSendMessage) {
      onSendMessage({
        text: `[가족투표] ${JSON.stringify(pollPayload)}`,
        roomId: selectedRoomId || 'family-group',
      });
    }

    setPollModalVisible(false);
    setPollTitle('');
    setPollOptions(['', '']);
  }, [pollOptions, pollTitle, currentUserProfile?.id, currentUser, onSendMessage, selectedRoomId]);

  // 5. 일정 공유 핸들러
  const handleOpenEventModal = useCallback(() => {
    setAttachMenuVisible(false);
    setEventTitle('');
    setEventDate(new Date().toISOString().split('T')[0]);
    setEventTime('18:00');
    setEventModalVisible(true);
  }, []);

  const handleEventDateChange = useCallback((text: string) => {
    const digits = text.replace(/[^0-9]/g, '').slice(0, 8);
    let formatted = digits;
    if (digits.length > 4 && digits.length <= 6) {
      formatted = `${digits.slice(0, 4)}-${digits.slice(4)}`;
    } else if (digits.length > 6) {
      formatted = `${digits.slice(0, 4)}-${digits.slice(4, 6)}-${digits.slice(6, 8)}`;
    }
    setEventDate(formatted);
  }, []);

  const handleEventTimeChange = useCallback((text: string) => {
    const digits = text.replace(/[^0-9]/g, '').slice(0, 4);
    let formatted = digits;
    if (digits.length > 2) {
      formatted = `${digits.slice(0, 2)}:${digits.slice(2, 4)}`;
    }
    setEventTime(formatted);
  }, []);

  const handleCreateEventCard = useCallback(() => {
    if (!eventTitle.trim()) {
      Alert.alert('입력 안내', '일정 제목을 입력해주세요.');
      return;
    }
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(eventDate.trim())) {
      Alert.alert(
        '날짜 확인',
        '날짜는 YYYY-MM-DD 형식의 숫자 8자리로 입력해주세요.\n(예: 2026-10-10)'
      );
      return;
    }
    const timeRegex = /^([01]?\d|2[0-3]):([0-5]\d)$/;
    if (eventTime.trim() && !timeRegex.test(eventTime.trim())) {
      Alert.alert(
        '시간 확인',
        '시간은 00:00 ~ 23:59 형식의 숫자로 입력해주세요.\n(예: 18:30)'
      );
      return;
    }

    const eventPayload = {
      title: eventTitle.trim(),
      date: eventDate.trim(),
      time: eventTime.trim() || '18:00',
      category: '가족',
    };

    if (onSendMessage) {
      onSendMessage({
        text: `[일정공유] ${JSON.stringify(eventPayload)}`,
        roomId: selectedRoomId || 'family-group',
      });
    }

    if (onAddEvent) {
      onAddEvent({
        title: eventPayload.title,
        date: eventPayload.date,
        endDate: eventPayload.date,
        time: eventPayload.time,
        category: '가족',
      });
    }

    setEventModalVisible(false);
    setEventTitle('');
  }, [eventTitle, eventDate, eventTime, onSendMessage, selectedRoomId, onAddEvent]);

  // 6. 집안일 추가 핸들러
  const handleOpenChoreModal = useCallback(() => {
    setAttachMenuVisible(false);
    setChoreTitle('');
    setChoreAssignee(myActorName || '가족 전체');
    setChoreModalVisible(true);
  }, [myActorName]);

  const handleCreateChoreCard = useCallback(() => {
    if (!choreTitle.trim()) {
      Alert.alert('입력 안내', '집안일 또는 할 일 내용을 입력해주세요.');
      return;
    }

    const chorePayload = {
      title: choreTitle.trim(),
      assignee: choreAssignee || '가족 전체',
      author: myActorName,
    };

    if (onSendMessage) {
      onSendMessage({
        text: `[집안일카드] ${JSON.stringify(chorePayload)}`,
        roomId: selectedRoomId || 'family-group',
      });
    }

    setChoreModalVisible(false);
    setChoreTitle('');
  }, [choreTitle, choreAssignee, myActorName, onSendMessage, selectedRoomId]);

  // 7. 위치 공유 핸들러
  const handleOpenLocationModal = useCallback(() => {
    setAttachMenuVisible(false);
    setLocationTitle('');
    setLocationModalVisible(true);
  }, []);

  const handleSendCurrentLocation = useCallback(async () => {
    try {
      setLocationLoading(true);
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          '위치 권한 필요',
          '현재 위치를 가져오기 위해 위치 권한이 필요합니다.'
        );
        setLocationLoading(false);
        return;
      }

      const loc = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      const lat = loc.coords.latitude;
      const lng = loc.coords.longitude;

      const locationPayload = {
        title: locationTitle.trim() || '현재 내 위치 📍',
        lat,
        lng,
        senderName: myActorName,
      };

      if (onSendMessage) {
        onSendMessage({
          text: `[위치공유] ${JSON.stringify(locationPayload)}`,
          roomId: selectedRoomId || 'family-group',
        });
      }

      setLocationLoading(false);
      setLocationModalVisible(false);
      setLocationTitle('');
    } catch (err) {
      setLocationLoading(false);
      console.warn('Location error:', err);
      const fallbackPayload = {
        title: locationTitle.trim() || '우리 가족 모임 장소 📍',
        lat: 37.5665,
        lng: 126.978,
        senderName: myActorName,
      };
      if (onSendMessage) {
        onSendMessage({
          text: `[위치공유] ${JSON.stringify(fallbackPayload)}`,
          roomId: selectedRoomId || 'family-group',
        });
      }
      setLocationModalVisible(false);
      setLocationTitle('');
    }
  }, [locationTitle, myActorName, onSendMessage, selectedRoomId]);

  return {
    attachMenuVisible,
    setAttachMenuVisible,
    pickImage,
    takePhotoWithCamera,
    handlePickDocument,
    handlePickVideo,
    handleOpenVoiceModal,
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
    handleOpenPollModal,
    handleCreatePoll,
    eventModalVisible,
    setEventModalVisible,
    eventTitle,
    setEventTitle,
    eventDate,
    handleEventDateChange,
    eventTime,
    handleEventTimeChange,
    handleOpenEventModal,
    handleCreateEventCard,
    choreModalVisible,
    setChoreModalVisible,
    choreTitle,
    setChoreTitle,
    choreAssignee,
    setChoreAssignee,
    handleOpenChoreModal,
    handleCreateChoreCard,
    locationModalVisible,
    setLocationModalVisible,
    locationTitle,
    setLocationTitle,
    locationLoading,
    handleOpenLocationModal,
    handleSendCurrentLocation,
    audioPlayingId,
    setAudioPlayingId,
  };
}
