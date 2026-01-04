import { useEffect, useRef, useState, ReactNode } from 'react';
import { createPortal } from 'react-dom';
import styles from './BottomSheet.module.css';

interface BottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  children: ReactNode;
  title?: string;
}

export function BottomSheet({ isOpen, onClose, children, title }: BottomSheetProps) {
  const sheetRef = useRef<HTMLDivElement>(null);
  const startY = useRef(0);
  const currentY = useRef(0);
  const isDragging = useRef(false);
  const [isVisible, setIsVisible] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);

  // Open animation
  useEffect(() => {
    if (isOpen && !isVisible) {
      setIsVisible(true);
      setIsAnimating(false);
      document.body.style.overflow = 'hidden';
    }
  }, [isOpen, isVisible]);

  // Close animation
  useEffect(() => {
    if (!isOpen && isVisible && !isAnimating) {
      setIsAnimating(true);
      const timer = setTimeout(() => {
        setIsVisible(false);
        setIsAnimating(false);
        document.body.style.overflow = '';
      }, 250);
      return () => clearTimeout(timer);
    }
  }, [isOpen, isVisible, isAnimating]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      document.body.style.overflow = '';
    };
  }, []);

  // Removed: closing by tap on overlay - only swipe down now

  const handleTouchStart = (e: React.TouchEvent) => {
    startY.current = e.touches[0].clientY;
    isDragging.current = true;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging.current || !sheetRef.current) return;

    currentY.current = e.touches[0].clientY;
    const deltaY = currentY.current - startY.current;

    if (deltaY > 0) {
      sheetRef.current.style.transform = `translateY(${deltaY}px)`;
    }
  };

  const handleTouchEnd = () => {
    if (!sheetRef.current) return;

    const deltaY = currentY.current - startY.current;
    isDragging.current = false;

    if (deltaY > 100) {
      onClose();
    } else {
      sheetRef.current.style.transform = '';
    }

    currentY.current = 0;
    startY.current = 0;
  };

  if (!isVisible) return null;

  const isClosing = !isOpen && isVisible;

  const overlayClasses = [
    styles.overlay,
    isClosing && styles.closing,
  ].filter(Boolean).join(' ');

  const sheetClasses = [
    styles.sheet,
    isClosing && styles.closing,
  ].filter(Boolean).join(' ');

  return createPortal(
    <div className={overlayClasses}>
      <div
        ref={sheetRef}
        className={sheetClasses}
        onClick={(e) => e.stopPropagation()}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={(e) => {
          e.stopPropagation();
          handleTouchEnd();
        }}
      >
        <div className={styles.handle} />
        {title && <h2 className={styles.title}>{title}</h2>}
        <div className={styles.content}>
          {children}
        </div>
      </div>
    </div>,
    document.body
  );
}
