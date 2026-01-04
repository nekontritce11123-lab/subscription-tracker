import { useState, useCallback, useRef } from 'react';
import { Subscription } from '../../types/subscription';
import { useTimelineData, useTelegram } from '../../hooks';
import { TopBar } from './TopBar';
import { Timeline, TimelineRef } from './Timeline';
import styles from './FinancialHorizon.module.css';

interface FinancialHorizonProps {
  subscriptions: Subscription[];
}

export function FinancialHorizon({ subscriptions }: FinancialHorizonProps) {
  const { hapticFeedback } = useTelegram();
  const monthData = useTimelineData(subscriptions);
  const timelineRef = useRef<TimelineRef>(null);

  const [selectedId, setSelectedId] = useState<string | null>(null);

  const handleSubscriptionTap = useCallback(
    (id: string | null) => {
      if (id) {
        hapticFeedback.light();
        setSelectedId((prev) => (prev === id ? null : id));
      }
    },
    [hapticFeedback]
  );

  return (
    <header className={styles.header}>
      <TopBar data={monthData} />

      <Timeline
        ref={timelineRef}
        events={monthData.events}
        today={monthData.today}
        selectedId={selectedId}
        onSubscriptionTap={handleSubscriptionTap}
      />
    </header>
  );
}
