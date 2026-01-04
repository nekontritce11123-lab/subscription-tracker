import { useRef } from 'react';
import { Subscription } from '../../types/subscription';
import { useTimelineData } from '../../hooks';
import { TopBar } from './TopBar';
import { Timeline, TimelineRef } from './Timeline';
import styles from './FinancialHorizon.module.css';

interface FinancialHorizonProps {
  subscriptions: Subscription[];
  selectedDay: number | null;
  onDaySelect: (ids: string[], day: number) => void;
}

export function FinancialHorizon({ subscriptions, selectedDay, onDaySelect }: FinancialHorizonProps) {
  const monthData = useTimelineData(subscriptions);
  const timelineRef = useRef<TimelineRef>(null);

  return (
    <header className={styles.header}>
      <TopBar data={monthData} subscriptions={subscriptions} />

      <Timeline
        ref={timelineRef}
        events={monthData.events}
        today={monthData.today}
        selectedDay={selectedDay}
        onSubscriptionTap={onDaySelect}
      />
    </header>
  );
}
