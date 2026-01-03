import { useTranslation } from 'react-i18next';
import { Button } from '../UI';
import styles from './EmptyState.module.css';

interface EmptyStateProps {
  onAdd: () => void;
}

export function EmptyState({ onAdd }: EmptyStateProps) {
  const { t } = useTranslation();

  return (
    <div className={styles.container}>
      <div className={styles.illustration}>
        <span className={styles.emoji}>📭</span>
      </div>
      <h2 className={styles.title}>{t('empty.title')}</h2>
      <p className={styles.subtitle}>{t('empty.subtitle')}</p>
      <Button onClick={onAdd} size="lg">
        {t('empty.cta')}
      </Button>
    </div>
  );
}
