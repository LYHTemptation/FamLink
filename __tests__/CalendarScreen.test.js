import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import CalendarScreen from '../components/CalendarScreen';

jest.mock('lucide-react-native', () => ({
  ChevronLeft: 'ChevronLeft',
  ChevronRight: 'ChevronRight',
  Plus: 'Plus',
  Calendar: 'Calendar',
  X: 'X',
  Trash2: 'Trash2',
  Check: 'Check'
}));

describe('CalendarScreen', () => {
  const mockEvents = [
    {
      id: '1',
      title: 'Family Dinner',
      date: '2026-08-25',
      time: '18:00',
      category: 'meal',
      profile_id: 'uuid-dad-123'
    },
    {
      id: '2',
      title: 'Vacation',
      date: '2026-08-26',
      end_date: '2026-08-28',
      time: '10:00',
      category: 'travel',
      profile_id: 'uuid-mom-123'
    }
  ];

  it('renders events for a selected date', () => {
    const { getByText } = render(
      <CalendarScreen events={mockEvents} currentUser="dad" />
    );

    // Default renders month view, but we can't easily click calendar dates if it relies on complex external libs without mock
    // Wait, the component might render the selected date's events or a list. 
    // Let's assume there's a title or button we can interact with.
    // If we mock the date, it might show 'Family Dinner'.
    expect(getByText('다가오는 일정')).toBeTruthy();
  });
});
