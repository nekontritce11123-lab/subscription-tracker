import { useTranslation } from 'react-i18next';
import { TimelineSubscription } from '../../types/subscription';
import styles from './DynamicCaption.module.css';

interface DynamicCaptionProps {
  subscription: TimelineSubscription | null;
}

export function DynamicCaption({ subscription }: DynamicCaptionProps) {
  const { t } = useTranslation();

  if (!subscription) {
    return (
      <div className={styles.caption}>
        <span className={styles.empty}>{t('timeline.noUpcoming')}</span>
      </div>
    );
  }

  const getTimeText = () => {
    if (subscription.isPaid) return t('timeline.paid');
    if (subscription.daysUntil === 0) return t('card.billingToday');
    if (subscription.daysUntil === 1) return t('timeline.tomorrow');
    return t('timeline.inDays', { count: subscription.daysUntil });
  };

  return (
    <div className={styles.caption}>
      <span className={styles.name}>{subscription.name}</span>
      <span className={styles.dot}>•</span>
      <span className={styles.time}>{getTimeText()}</span>
      <span className={styles.dot}>•</span>
      <span className={styles.amount}>
        {subscription.amount.toLocaleString('ru-RU')} {t('currency')}
      </span>
    </div>
  );
}
