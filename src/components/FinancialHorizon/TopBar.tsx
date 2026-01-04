import { useTranslation } from 'react-i18next';
import { MonthData } from '../../types/subscription';
import styles from './TopBar.module.css';

interface TopBarProps {
  data: MonthData;
}

export function TopBar({ data }: TopBarProps) {
  const { t } = useTranslation();

  return (
    <div className={styles.container}>
      <div className={styles.brand}>
        <span className={styles.company}>FactChain</span>
        <span className={styles.divider}>/</span>
        <span className={styles.productName}>Tracker</span>
      </div>
      <span className={styles.total}>
        {Math.round(data.totalAmount).toLocaleString('ru-RU')} {t('currency')}
      </span>
    </div>
  );
}
