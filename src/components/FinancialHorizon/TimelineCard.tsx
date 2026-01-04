import { useTranslation } from 'react-i18next';
import { TimelineEvent } from '../../types/subscription';
import styles from './TimelineCard.module.css';

interface TimelineCardProps {
  event: TimelineEvent;
  isSelected: boolean;
  onTap: (subscriptionId: string | null) => void;
}

export function TimelineCard({ event, isSelected, onTap }: TimelineCardProps) {
  const { t } = useTranslation();
  const { day, subscriptions, isPast, isToday } = event;

  const count = subscriptions.length;

  const handleClick = () => {
    if (count > 0) {
      onTap(subscriptions[0].id);
    }
  };

  const cardClasses = [
    styles.card,
    isPast && styles.past,
    isToday && styles.today,
    isSelected && styles.selected,
  ].filter(Boolean).join(' ');

  return (
    <div
      className={cardClasses}
      data-day={day}
      onClick={handleClick}
    >
      <div className={styles.content}>
        {count > 0 && (
          <span className={styles.count}>{count}</span>
        )}
      </div>
      <span className={styles.dayNumber}>{day}</span>
      {isToday && <span className={styles.todayLabel}>{t('timeline.today')}</span>}
    </div>
  );
}
