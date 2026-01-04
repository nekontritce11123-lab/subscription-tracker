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
    const trackRef = useRef<HTMLDivElement>(null);
    const minScrollRef = useRef(0);
    const pullOffsetRef = useRef(0);
    const isTouchingRef = useRef(false);
    const startTouchXRef = useRef(0);
    const startScrollLeftRef = useRef(0);

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

    // Min scroll = 0 (allow the small left padding to be visible)
    useEffect(() => {
      minScrollRef.current = 0;
    }, []);

    // Auto-center on today on mount
    useEffect(() => {
      const timer = setTimeout(scrollToToday, 50);
      return () => clearTimeout(timer);
    }, [today]);

    // Rubber band effect when pulling past day 1
    useEffect(() => {
      const container = containerRef.current;
      const track = trackRef.current;
      if (!container || !track) return;

      const applyPullOffset = (offset: number) => {
        pullOffsetRef.current = offset;
        track.style.transform = offset > 0 ? `translateX(${offset}px)` : '';
      };

      const handleTouchStart = (e: TouchEvent) => {
        isTouchingRef.current = true;
        startTouchXRef.current = e.touches[0].clientX;
        startScrollLeftRef.current = container.scrollLeft;
        track.style.transition = 'none';
      };

      const handleTouchMove = (e: TouchEvent) => {
        if (!isTouchingRef.current) return;

        const currentX = e.touches[0].clientX;
        const deltaX = currentX - startTouchXRef.current;
        const minScroll = minScrollRef.current;

        // Calculate where scroll would be
        const targetScroll = startScrollLeftRef.current - deltaX;

        if (targetScroll < minScroll) {
          // We're trying to scroll past day 1
          e.preventDefault();

          // Keep scroll at minimum
          container.scrollLeft = minScroll;

          // Calculate overscroll amount with resistance
          const overscroll = minScroll - targetScroll;
          const dampedOffset = Math.sqrt(overscroll) * 3; // Square root for natural resistance
          applyPullOffset(dampedOffset);
        } else {
          // Normal scrolling, reset any pull offset
          if (pullOffsetRef.current > 0) {
            applyPullOffset(0);
          }
        }
      };

      const handleTouchEnd = () => {
        isTouchingRef.current = false;

        if (pullOffsetRef.current > 0) {
          // Animate back
          track.style.transition = 'transform 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94)';
          applyPullOffset(0);
        }
      };

      container.addEventListener('touchstart', handleTouchStart, { passive: true });
      container.addEventListener('touchmove', handleTouchMove, { passive: false });
      container.addEventListener('touchend', handleTouchEnd);

      return () => {
        container.removeEventListener('touchstart', handleTouchStart);
        container.removeEventListener('touchmove', handleTouchMove);
        container.removeEventListener('touchend', handleTouchEnd);
      };
    }, []);

    // Check if any subscription in event matches selectedId
    const isEventSelected = (event: TimelineEvent) => {
      return event.subscriptions.some(s => s.id === selectedId);
    };

    return (
      <div className={styles.timeline} ref={containerRef}>
        <div className={styles.timelineTrack} ref={trackRef}>
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
