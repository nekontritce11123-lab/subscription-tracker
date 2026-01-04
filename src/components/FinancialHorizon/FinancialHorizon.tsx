import { useState, useCallback, useMemo, useRef } from 'react';
import { Subscription, TimelineSubscription } from '../../types/subscription';
import { useTimelineData, useTelegram } from '../../hooks';
import { TopBar } from './TopBar';
import { Timeline, TimelineRef } from './Timeline';
import { DynamicCaption } from './DynamicCaption';
import styles from './FinancialHorizon.module.css';

interface FinancialHorizonProps {
  subscriptions: Subscription[];
}

export function FinancialHorizon({ subscriptions }: FinancialHorizonProps) {
  const { hapticFeedback } = useTelegram();
  const monthData = useTimelineData(subscriptions);
  const timelineRef = useRef<TimelineRef>(null);

  const [selectedId, setSelectedId] = useState<string | null>(null);

  // Find nearest upcoming subscription
  const nearestUpcoming = useMemo((): TimelineSubscription | null => {
    for (const event of monthData.events) {
      if (!event.isPast && event.subscriptions.length > 0) {
        return event.subscriptions[0];
      }
    }
    return null;
  }, [monthData.events]);

  // Find selected subscription from all events
  const selectedSubscription = useMemo((): TimelineSubscription | null => {
    if (!selectedId) return null;
    for (const event of monthData.events) {
      const found = event.subscriptions.find((s) => s.id === selectedId);
      if (found) return found;
    }
    return null;
  }, [selectedId, monthData.events]);

  // Active subscription for caption (selected or nearest)
  const activeSubscription = selectedSubscription || nearestUpcoming;

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

      <DynamicCaption subscription={activeSubscription} />
    </header>
  );
}
