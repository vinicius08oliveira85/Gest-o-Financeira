import { createContext, useContext, useMemo, type ReactNode } from 'react';

export type PeriodContextValue = {
  currentMonth: number;
  currentYear: number;
  goToPreviousMonth: () => void;
  goToNextMonth: () => void;
  goToCurrentMonth: () => void;
  monthLabel: string;
  isCurrentMonth: boolean;
};

const PeriodContext = createContext<PeriodContextValue | null>(null);

export type PeriodProviderProps = {
  currentMonth: number;
  currentYear: number;
  goToPreviousMonth: () => void;
  goToNextMonth: () => void;
  goToCurrentMonth: () => void;
  children: ReactNode;
};

export function PeriodProvider({
  currentMonth,
  currentYear,
  goToPreviousMonth,
  goToNextMonth,
  goToCurrentMonth,
  children,
}: PeriodProviderProps) {
  const monthLabel = useMemo(
    () =>
      new Date(currentYear, currentMonth).toLocaleDateString('pt-BR', {
        month: 'long',
        year: 'numeric',
      }),
    [currentMonth, currentYear]
  );

  const isCurrentMonth = useMemo(() => {
    const now = new Date();
    return currentMonth === now.getMonth() && currentYear === now.getFullYear();
  }, [currentMonth, currentYear]);

  const value = useMemo<PeriodContextValue>(
    () => ({
      currentMonth,
      currentYear,
      goToPreviousMonth,
      goToNextMonth,
      goToCurrentMonth,
      monthLabel,
      isCurrentMonth,
    }),
    [
      currentMonth,
      currentYear,
      goToPreviousMonth,
      goToNextMonth,
      goToCurrentMonth,
      monthLabel,
      isCurrentMonth,
    ]
  );

  return <PeriodContext.Provider value={value}>{children}</PeriodContext.Provider>;
}

export function usePeriod(): PeriodContextValue {
  const ctx = useContext(PeriodContext);
  if (!ctx) {
    throw new Error('usePeriod must be used within PeriodProvider');
  }
  return ctx;
}
