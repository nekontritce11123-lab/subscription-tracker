import { useTranslation } from 'react-i18next';
import { TimelineEvent, TimelineSubscription } from '../../types/subscription';
import styles from './TimelineCard.module.css';

interface TimelineCardProps {
  event: TimelineEvent;
  isSelected: boolean;
  onTap: (subscriptionId: string | null) => void;
}

export function TimelineCard({ event, isSelected, onTap }: TimelineCardProps) {
  const { t } = useTranslation();
  const { day, subscriptions, isPast, isToday } = event;

  const hasSubscriptions = subscriptions.length > 0;
  const firstSub = subscriptions[0] as TimelineSubscription | undefined;

  // Determine card state (only for non-past days)
  const hasTrial = !isPast && subscriptions.some(s => s.isTrial);
  const hasUrgent = !isPast && !hasTrial && subscriptions.some(s => s.daysUntil <= 1);
  const hasSoon = !isPast && !hasTrial && !hasUrgent && subscriptions.some(s => s.daysUntil >= 2 && s.daysUntil <= 3);

  const handleClick = () => {
    if (hasSubscriptions && firstSub) {
      onTap(firstSub.id);
    }
  };

  const cardClasses = [
    styles.card,
    isPast && styles.past,
    isToday && styles.today,
    isSelected && styles.selected,
  ].filter(Boolean).join(' ');

  // Render badge based on priority: trial > urgent > soon
  const renderBadge = () => {
    if (isPast || !hasSubscriptions) return null;

    if (hasTrial) {
      return <span className={styles.freeBadge}>FREE</span>;
    }
    if (hasUrgent) {
      return <span className={styles.urgentBadge} />;
    }
    if (hasSoon) {
      return <span className={styles.soonBadge}>⚠</span>;
    }
    return null;
  };

  return (
    <div
      className={cardClasses}
      data-day={day}
      onClick={handleClick}
    >
      <div className={styles.content}>
        {hasSubscriptions && firstSub && (
          <span className={styles.icon}>{firstSub.icon}</span>
        )}
        {renderBadge()}
        {subscriptions.length > 1 && (
          <span className={styles.countBadge}>+{subscriptions.length - 1}</span>
        )}
      </div>
      <span className={styles.dayNumber}>{day}</span>
      {isToday && <span className={styles.todayLabel}>{t('timeline.today')}</span>}
    </div>
  );
}
