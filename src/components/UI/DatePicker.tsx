import { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import styles from './DatePicker.module.css';

interface DatePickerProps {
  value: string;
  onChange: (date: string) => void;
  maxDate?: Date;
}

const MONTHS_RU = [
  'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
  'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'
];

const MONTHS_EN = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const WEEKDAYS_RU = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];
const WEEKDAYS_EN = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export function DatePicker({ value, onChange, maxDate }: DatePickerProps) {
  const { i18n } = useTranslation();
  const isRu = i18n.language === 'ru';

  const months = isRu ? MONTHS_RU : MONTHS_EN;
  const weekdays = isRu ? WEEKDAYS_RU : WEEKDAYS_EN;

  // Parse date string as local date (not UTC)
  const parseLocalDate = (dateStr: string): Date => {
    const [year, month, day] = dateStr.split('-').map(Number);
    return new Date(year, month - 1, day);
  };

  const initialDate = value ? parseLocalDate(value) : new Date();
  const [viewYear, setViewYear] = useState(initialDate.getFullYear());
  const [viewMonth, setViewMonth] = useState(initialDate.getMonth());

  const selectedDate = value ? parseLocalDate(value) : null;
  const today = new Date();
  const max = maxDate || today;

  const daysInMonth = useMemo(() => {
    const days: (number | null)[] = [];
    const firstDay = new Date(viewYear, viewMonth, 1);
    const lastDay = new Date(viewYear, viewMonth + 1, 0);

    // Get day of week (0 = Sunday, convert to Monday = 0)
    let startDay = firstDay.getDay() - 1;
    if (startDay < 0) startDay = 6;

    // Add empty slots for days before month starts
    for (let i = 0; i < startDay; i++) {
      days.push(null);
    }

    // Add days of month
    for (let i = 1; i <= lastDay.getDate(); i++) {
      days.push(i);
    }

    return days;
  }, [viewYear, viewMonth]);

  const handlePrevMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear(viewYear - 1);
    } else {
      setViewMonth(viewMonth - 1);
    }
  };

  const handleNextMonth = () => {
    const nextMonth = viewMonth === 11 ? 0 : viewMonth + 1;
    const nextYear = viewMonth === 11 ? viewYear + 1 : viewYear;

    // Don't go beyond max date
    if (new Date(nextYear, nextMonth, 1) <= max) {
      setViewMonth(nextMonth);
      setViewYear(nextYear);
    }
  };

  const handleDayClick = (day: number) => {
    const date = new Date(viewYear, viewMonth, day);
    if (date <= max) {
      // Format as YYYY-MM-DD without UTC conversion
      const yyyy = viewYear;
      const mm = String(viewMonth + 1).padStart(2, '0');
      const dd = String(day).padStart(2, '0');
      onChange(`${yyyy}-${mm}-${dd}`);
    }
  };

  const isSelected = (day: number) => {
    if (!selectedDate) return false;
    return (
      selectedDate.getDate() === day &&
      selectedDate.getMonth() === viewMonth &&
      selectedDate.getFullYear() === viewYear
    );
  };

  const isDisabled = (day: number) => {
    const date = new Date(viewYear, viewMonth, day);
    return date > max;
  };

  const isToday = (day: number) => {
    return (
      today.getDate() === day &&
      today.getMonth() === viewMonth &&
      today.getFullYear() === viewYear
    );
  };

  const canGoNext = () => {
    const nextMonth = viewMonth === 11 ? 0 : viewMonth + 1;
    const nextYear = viewMonth === 11 ? viewYear + 1 : viewYear;
    return new Date(nextYear, nextMonth, 1) <= max;
  };

  return (
    <div className={styles.calendar}>
      <div className={styles.header}>
        <button type="button" className={styles.navButton} onClick={handlePrevMonth}>
          ‹
        </button>
        <span className={styles.monthYear}>
          {months[viewMonth]} {viewYear}
        </span>
        <button
          type="button"
          className={styles.navButton}
          onClick={handleNextMonth}
          disabled={!canGoNext()}
        >
          ›
        </button>
      </div>

      <div className={styles.weekdays}>
        {weekdays.map((day) => (
          <span key={day} className={styles.weekday}>{day}</span>
        ))}
      </div>

      <div className={styles.days}>
        {daysInMonth.map((day, index) => (
          <div key={index} className={styles.dayCell}>
            {day && (
              <button
                type="button"
                className={[
                  styles.day,
                  isSelected(day) && styles.selected,
                  isDisabled(day) && styles.disabled,
                  isToday(day) && styles.today,
                ].filter(Boolean).join(' ')}
                onClick={() => handleDayClick(day)}
                disabled={isDisabled(day)}
              >
                {day}
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
