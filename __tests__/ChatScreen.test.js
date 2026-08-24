import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import ChatScreen from '../components/ChatScreen';

// Mock dependencies that might break in test environment
jest.mock('expo-image-picker', () => ({
  launchImageLibraryAsync: jest.fn(),
  requestMediaLibraryPermissionsAsync: jest.fn(() => Promise.resolve({ status: 'granted' })),
}));

// Mock lucide icons
jest.mock('lucide-react-native', () => ({
  ChevronLeft: 'ChevronLeft',
  Image: 'Image',
  Send: 'Send',
  MessageSquare: 'MessageSquare',
  Users: 'Users',
  Plus: 'Plus',
  Search: 'Search',
  Settings: 'Settings',
  Check: 'Check',
  Image as ImageIcon: 'ImageIcon'
}));

describe('ChatScreen', () => {
  const mockMessages = [
    {
      id: '1',
      sender: 'dad',
      profile_id: 'uuid-dad-123',
      text: 'Hello family',
      timestamp: '오전 10:00',
      room_id: 'family-group',
      readBy: []
    },
    {
      id: '2',
      sender: 'son',
      profile_id: 'uuid-son-456',
      text: 'Hi dad!',
      timestamp: '오전 10:05',
      room_id: 'family-group',
      readBy: []
    }
  ];

  const mockFamilyMembers = [
    { id: 'uuid-dad-123', role: 'dad', name: '아빠', avatar: '👨' },
    { id: 'uuid-son-456', role: 'son', name: '아들', avatar: '👦' },
  ];

  const mockCurrentUserProfile = {
    id: 'uuid-son-456',
    role: 'son',
    name: '아들'
  };

  it('renders correctly and displays messages in the family group room', () => {
    const { getByText, getAllByText } = render(
      <ChatScreen 
        messages={mockMessages}
        currentUser="son"
        currentUserProfile={mockCurrentUserProfile}
        familyMembers={mockFamilyMembers}
      />
    );

    // Should render the main room in the list
    expect(getByText('우리 가족 수다방 👨‍👩‍👧‍👦')).toBeTruthy();

    // Click on the family room
    fireEvent.press(getByText('우리 가족 수다방 👨‍👩‍👧‍👦'));

    // Should see both messages
    expect(getByText('Hello family')).toBeTruthy();
    expect(getByText('Hi dad!')).toBeTruthy();
  });

  it('filters messages correctly when entering a custom room', () => {
    const customRoomMessages = [
      ...mockMessages,
      {
        id: '3',
        sender: 'son',
        profile_id: 'uuid-son-456',
        text: 'Secret message',
        timestamp: '오전 10:10',
        room_id: 'custom-room-1',
        readBy: []
      }
    ];

    const mockCustomRooms = [
      {
        id: 'custom-room-1',
        title: '비밀방',
        subtitle: '비밀 대화방',
        lastMessage: '비밀방입니다',
        isGroup: true
      }
    ];

    const { getByText, queryByText } = render(
      <ChatScreen 
        messages={customRoomMessages}
        currentUser="son"
        currentUserProfile={mockCurrentUserProfile}
        familyMembers={mockFamilyMembers}
        customRooms={mockCustomRooms}
      />
    );

    // Enter custom room
    fireEvent.press(getByText('비밀방'));

    // Should only see custom room messages
    expect(getByText('Secret message')).toBeTruthy();
    expect(queryByText('Hello family')).toBeNull(); // Shouldn't be in this room
  });
});
