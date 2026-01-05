import { Currency } from '../types/subscription';

export interface CurrencyInfo {
  symbol: string;
  name: string;
  code: Currency;
}

export const CURRENCIES: Record<Currency, CurrencyInfo> = {
  RUB: { symbol: '₽', name: 'Рубль', code: 'RUB' },
  USD: { symbol: '$', name: 'Доллар', code: 'USD' },
  EUR: { symbol: '€', name: 'Евро', code: 'EUR' },
  UAH: { symbol: '₴', name: 'Гривна', code: 'UAH' },
  BYN: { symbol: 'Br', name: 'Бел. рубль', code: 'BYN' },
};

export const CURRENCY_LIST: CurrencyInfo[] = Object.values(CURRENCIES);

export const DEFAULT_CURRENCY: Currency = 'RUB';

export const getCurrencySymbol = (currency: Currency): string => {
  return CURRENCIES[currency]?.symbol || '₽';
};
