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
    fireEvent.mouseEnter(screen.getByRole('status'));
    act(() => vi.advanceTimersByTime(5000));
    expect(screen.getByRole('status')).toHaveTextContent('Link copiado');
    fireEvent.mouseLeave(screen.getByRole('status'));
    act(() => vi.advanceTimersByTime(4000));
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
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
