import styles from './IconBadge.module.css';

interface IconBadgeProps {
  icon: string;
  color: string;
  size?: 'sm' | 'md' | 'lg';
  onClick?: () => void;
  selected?: boolean;
}

export function IconBadge({ icon, color, size = 'md', onClick, selected }: IconBadgeProps) {
  const Component = onClick ? 'button' : 'div';

  return (
    <Component
      className={`${styles.iconBadge} ${styles[size]} ${selected ? styles.selected : ''}`}
      style={{ backgroundColor: color }}
      onClick={onClick}
      type={onClick ? 'button' : undefined}
    >
      <span className={styles.icon}>{icon}</span>
    </Component>
  );
}
