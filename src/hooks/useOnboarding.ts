import { useEffect, useState } from 'react';
import { ONBOARDING_STORAGE_KEY } from '../constants';

type OnboardingState = {
  completed: boolean;
  stepNewEntry: boolean;
  stepMonthNav: boolean;
  stepReports: boolean;
};

const defaultState: OnboardingState = {
  completed: false,
  stepNewEntry: false,
  stepMonthNav: false,
  stepReports: false,
};

export function useOnboarding() {
  const [state, setState] = useState<OnboardingState>(defaultState);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(ONBOARDING_STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as OnboardingState;
      if (parsed && typeof parsed === 'object') {
        setState(parsed);
      }
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(ONBOARDING_STORAGE_KEY, JSON.stringify(state));
  }, [state]);

  function completeStep(step: keyof Omit<OnboardingState, 'completed'>) {
    setState((prev) => {
      const next = { ...prev, [step]: true };
      if (next.stepNewEntry && next.stepMonthNav && next.stepReports) {
        next.completed = true;
      }
      return next;
    });
  }

  function skip() {
    setState({ ...defaultState, completed: true });
  }

  return {
    showNewEntryHint: !state.completed && !state.stepNewEntry,
    showMonthNavHint: !state.completed && state.stepNewEntry && !state.stepMonthNav,
    showReportsHint:
      !state.completed && state.stepNewEntry && state.stepMonthNav && !state.stepReports,
    completeStep,
    skip,
  };
}
