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
      <button className={styles.monthSelector}>
        <span className={styles.month}>{data.name} {data.year}</span>
        <span className={styles.chevron}>&#8964;</span>
      </button>
      <span className={styles.total}>
        {data.totalAmount.toLocaleString('ru-RU')} {t('currency')}
      </span>
    </div>
  );
}
