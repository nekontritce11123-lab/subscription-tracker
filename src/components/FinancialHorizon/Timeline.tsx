import { useRef, useEffect, forwardRef, useImperativeHandle } from 'react';
import { TimelineEvent } from '../../types/subscription';
import { TimelineCard } from './TimelineCard';
import styles from './Timeline.module.css';

interface TimelineProps {
  events: TimelineEvent[];
  today: number;
  selectedId: string | null;
  onSubscriptionTap: (id: string | null) => void;
}

export interface TimelineRef {
  scrollToToday: () => void;
}

export const Timeline = forwardRef<TimelineRef, TimelineProps>(
  ({ events, today, selectedId, onSubscriptionTap }, ref) => {
    const containerRef = useRef<HTMLDivElement>(null);

    const scrollToToday = () => {
      if (!containerRef.current) return;

      const todayElement = containerRef.current.querySelector(`[data-day="${today}"]`);
      if (todayElement) {
        const container = containerRef.current;
        const containerRect = container.getBoundingClientRect();
        const todayRect = todayElement.getBoundingClientRect();

        const scrollLeft =
          container.scrollLeft +
          todayRect.left -
          containerRect.left -
          containerRect.width / 2 +
          todayRect.width / 2;

        container.scrollLeft = scrollLeft;
      }
    };

    useImperativeHandle(ref, () => ({
      scrollToToday,
    }));

    // Auto-center on today on mount
    useEffect(() => {
      // Small delay to ensure DOM is ready
      const timer = setTimeout(scrollToToday, 50);
      return () => clearTimeout(timer);
    }, [today]);

    // Check if any subscription in event matches selectedId
    const isEventSelected = (event: TimelineEvent) => {
      return event.subscriptions.some(s => s.id === selectedId);
    };

    return (
      <div className={styles.timeline} ref={containerRef}>
        <div className={styles.timelineTrack}>
          {events.map((event) => (
            <TimelineCard
              key={event.day}
              event={event}
              isSelected={isEventSelected(event)}
              onTap={onSubscriptionTap}
            />
          ))}
        </div>
      </div>
    );
  }
);

Timeline.displayName = 'Timeline';
