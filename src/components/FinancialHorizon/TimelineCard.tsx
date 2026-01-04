import { useTranslation } from 'react-i18next';
import { TimelineEvent } from '../../types/subscription';
import styles from './TimelineCard.module.css';

interface TimelineCardProps {
  event: TimelineEvent;
  isSelected: boolean;
  onTap: (subscriptionIds: string[], day: number) => void;
}

// Calculate width based on subscription count
function getContentWidth(count: number): number {
  if (count <= 1) return 44;
  if (count === 2) return 64;
  if (count === 3) return 84;
  return 100; // 4+ subscriptions
}

export function TimelineCard({ event, isSelected, onTap }: TimelineCardProps) {
  const { t } = useTranslation();
  const { day, subscriptions, isPast, isToday } = event;

  const count = subscriptions.length;

  const handleClick = () => {
    onTap(subscriptions.map(s => s.id), day);
  };

  const cardClasses = [
    styles.card,
    isPast && styles.past,
    isToday && styles.today,
    isSelected && styles.selected,
    count > 1 && styles.wide,
  ].filter(Boolean).join(' ');

  const contentStyle = count > 1 ? { width: `${getContentWidth(count)}px` } : undefined;

  return (
    <div
      className={cardClasses}
      data-day={day}
      onClick={handleClick}
    >
      <div className={styles.content} style={contentStyle}>
        {count > 0 && (
          <>
            {subscriptions.slice(0, 4).map((sub, i) => (
              <span key={sub.id || i} className={styles.emoji}>
                {sub.icon}
              </span>
            ))}
            {count > 4 && <span className={styles.more}>+{count - 4}</span>}
          </>
        )}
      </div>
      <span className={styles.dayNumber}>{day}</span>
      {isToday && <span className={styles.todayLabel}>{t('timeline.today')}</span>}
    </div>
  );
}
