import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { useReveal } from './useReveal';
beforeEach(() => vi.useFakeTimers());
afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); });
it('revela por posición y mantiene el último turno durante una pausa antes del resumen', () => {
  const { result } = renderHook(() => useReveal(3, { intervalMs: 1000 }));
  expect(result.current.visibleCount).toBe(1); expect(result.current.done).toBe(false);
  act(() => vi.advanceTimersByTime(1000)); expect(result.current.visibleCount).toBe(2);
  act(() => vi.advanceTimersByTime(1000)); expect(result.current.visibleCount).toBe(3);
  expect(result.current.done).toBe(false);
  act(() => vi.advanceTimersByTime(1000)); expect(result.current.done).toBe(true);
  expect(vi.getTimerCount()).toBe(0);
});
it('saltar y volver a ver reinician un único reloj y desmontar lo limpia', () => {
  const { result, unmount } = renderHook(() => useReveal(3));
  act(() => result.current.skip()); expect(result.current.done).toBe(true); expect(result.current.visibleCount).toBe(3);
  expect(vi.getTimerCount()).toBe(0);
  act(() => result.current.replay()); expect(result.current.done).toBe(false); expect(result.current.visibleCount).toBe(1);
  expect(vi.getTimerCount()).toBe(1);
  act(() => result.current.replay()); expect(vi.getTimerCount()).toBe(1);
  unmount(); expect(vi.getTimerCount()).toBe(0);
});
it('espera los turnos persistidos sin iniciar ni completar una revelación vacía', () => {
  const { result, rerender } = renderHook(({ count }) => useReveal(count), { initialProps: { count: 0 } });
  expect(result.current.visibleCount).toBe(0); expect(result.current.done).toBe(false); expect(vi.getTimerCount()).toBe(0);
  rerender({ count: 2 }); expect(result.current.visibleCount).toBe(1); expect(vi.getTimerCount()).toBe(1);
});
it('volver a ver reinicia también una pausa que estaba a medio transcurrir', () => {
  const { result } = renderHook(() => useReveal(3, { intervalMs: 1000 }));
  act(() => vi.advanceTimersByTime(800));
  act(() => result.current.replay());
  act(() => vi.advanceTimersByTime(200));
  expect(result.current.visibleCount).toBe(1);
  act(() => vi.advanceTimersByTime(800)); expect(result.current.visibleCount).toBe(2);
});
it('respeta los cambios de reducción de movimiento y retira el listener', () => {
  const listeners = new Set();
  const query = { matches: true, addEventListener: (_, fn) => listeners.add(fn), removeEventListener: (_, fn) => listeners.delete(fn) };
  vi.stubGlobal('matchMedia', () => query);
  const { result, unmount } = renderHook(() => useReveal(2));
  expect(result.current.reducedMotion).toBe(true);
  act(() => { query.matches = false; listeners.forEach(fn => fn()); });
  expect(result.current.reducedMotion).toBe(false);
  unmount(); expect(listeners.size).toBe(0);
});
