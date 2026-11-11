import { useState } from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import ErrorBanner from './ErrorBanner';
import Toast from './Toast';
import Skeleton from './Skeleton';
import Spinner from './Spinner';
import ReconnectingChip from './ReconnectingChip';

afterEach(() => vi.useRealTimers());

describe('Feedback compartido', () => {
  it('anuncia un error y permite reintentar', () => {
    const onRetry = vi.fn();
    render(<ErrorBanner message="No pudimos conectarte. Revisa tu internet e intenta de nuevo." onRetry={onRetry} />);
    expect(screen.getByRole('alert')).toHaveTextContent('No pudimos conectarte.');
    fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('el toast se cierra por tiempo y pausa mientras se lee con el puntero', () => {
    vi.useFakeTimers();
    function Example() { const [message, setMessage] = useState('Link copiado'); return <Toast message={message} duration={4000} onDismiss={() => setMessage('')} />; }
    render(<Example />);
    act(() => vi.advanceTimersByTime(2000));
    fireEvent.mouseEnter(screen.getByRole('status'));
    act(() => vi.advanceTimersByTime(5000));
    expect(screen.getByRole('status')).toHaveTextContent('Link copiado');
    fireEvent.mouseLeave(screen.getByRole('status'));
    act(() => vi.advanceTimersByTime(1999));
    expect(screen.getByRole('status')).toBeInTheDocument();
    act(() => vi.advanceTimersByTime(1));
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('muestra la barra decorativa, la pausa con el foco y reinicia al cambiar el aviso', () => {
    vi.useFakeTimers();
    const onDismiss = vi.fn();
    const { rerender } = render(<Toast message="Código copiado" onDismiss={onDismiss} duration={4000} />);
    const bar = screen.getByRole('status').querySelector('.ui-toast__progress');
    expect(bar).toHaveAttribute('aria-hidden', 'true');
    expect(bar).toHaveStyle({ animationDuration: '4000ms', animationPlayState: 'running' });
    act(() => vi.advanceTimersByTime(2000));
    fireEvent.focus(screen.getByRole('button', { name: 'Cerrar aviso' }));
    expect(bar).toHaveStyle({ animationPlayState: 'paused' });
    act(() => vi.advanceTimersByTime(5000));
    expect(onDismiss).not.toHaveBeenCalled();
    rerender(<Toast message="Link copiado" onDismiss={onDismiss} duration={4000} />);
    act(() => vi.advanceTimersByTime(3999));
    expect(onDismiss).not.toHaveBeenCalled();
    act(() => vi.advanceTimersByTime(1));
    expect(onDismiss).toHaveBeenCalledOnce();
  });

  it('el toast puede cerrarse sin esperar al tiempo', () => {
    const onDismiss = vi.fn();
    render(<Toast message="Código copiado" onDismiss={onDismiss} />);
    fireEvent.click(screen.getByRole('button', { name: 'Cerrar aviso' }));
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it('la carga y reconexión tienen nombre accesible sin anunciar figuras decorativas', () => {
    const { rerender } = render(<Skeleton variant="participant" label="Cargando participantes…" />);
    expect(screen.getByRole('status')).toHaveTextContent('Cargando participantes…');
    rerender(<Spinner label="Cargando sala…" />);
    expect(screen.getByRole('status')).toHaveTextContent('Cargando sala…');
    rerender(<ReconnectingChip />);
    expect(screen.getAllByRole('status')).toHaveLength(1);
    expect(screen.getByRole('status')).toHaveTextContent('Reconectando…');
  });
});
