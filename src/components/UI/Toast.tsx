import { useEffect, useState } from 'react';
import styles from './Toast.module.css';

interface ToastProps {
  message: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  duration?: number;
  onClose: () => void;
}

export function Toast({ message, action, duration = 5000, onClose }: ToastProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Animate in
    requestAnimationFrame(() => {
      setIsVisible(true);
    });

    // Auto close
    const timer = setTimeout(() => {
      setIsVisible(false);
      setTimeout(onClose, 300);
    }, duration);

    return () => clearTimeout(timer);
  }, [duration, onClose]);

  const handleAction = () => {
    action?.onClick();
    setIsVisible(false);
    setTimeout(onClose, 300);
  };

  return (
    <div className={`${styles.toast} ${isVisible ? styles.visible : ''}`}>
      <span className={styles.message}>{message}</span>
      {action && (
        <button className={styles.action} onClick={handleAction}>
          {action.label}
        </button>
      )}
    </div>
  );
}
