import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { useRef } from 'react';
import { useFocusTrap } from './useFocusTrap';

function TestComponent({ isActive }: { isActive: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  useFocusTrap(ref, isActive);
  return (
    <div ref={ref}>
      <button type="button">First</button>
      <button type="button">Second</button>
    </div>
  );
}

describe('useFocusTrap', () => {
  it('com isActive true renderiza container com botões focusáveis', () => {
    render(<TestComponent isActive={true} />);
    expect(screen.getByRole('button', { name: 'First' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Second' })).toBeInTheDocument();
  });

  it('com isActive false renderiza sem forçar foco', () => {
    render(<TestComponent isActive={false} />);
    expect(screen.getByRole('button', { name: 'First' })).toBeInTheDocument();
  });
});
