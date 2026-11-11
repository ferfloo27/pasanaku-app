import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import Results from './Results';
const room = { name: 'Familia', code: 'ABC123', frequency: 'monthly', contribution_bs: 200, start_date: '2027-01-01' };
const participants = [{ id: 'a', name: 'Ana', user_id: 'other' }, { id: 'b', name: 'Ana', user_id: 'me' }];
const turns = [{ id: 't2', participant_id: 'b', position: 2, turn_date: '2027-02-01', payout_bs: 400 }, { id: 't1', participant_id: 'a', position: 1, turn_date: '2027-01-01', payout_bs: 400 }];
const show = () => render(<Results room={room} participants={participants} turns={turns} userId="me" onHome={() => {}} />);
afterEach(() => vi.unstubAllGlobals());
it('destaca el turno por identidad, usa datos persistidos y ordena la lista', () => {
  show();
  const own = screen.getByRole('region', { name: 'Tu turno' });
  expect(own).toHaveTextContent('2'); expect(own).toHaveTextContent('Febrero 2027'); expect(own).toHaveTextContent('Recibes Bs 400');
  expect(screen.getByText('Por turno')).toBeVisible(); expect(screen.getByText('Sorteada')).toBeVisible();
  const rows = within(screen.getByRole('list', { name: 'Orden de cobro' })).getAllByRole('listitem');
  expect(rows[0]).toHaveTextContent('Enero 2027'); expect(rows[0]).not.toHaveTextContent('Tú');
  expect(rows[1]).toHaveTextContent('Ana · Tú'); expect(rows[1]).toHaveClass('draw-results__row--own');
});
it('copiar conserva el resumen y compartir copia solo el enlace, incluso con menú nativo disponible', async () => {
  const writeText = vi.fn().mockResolvedValue(); const share = vi.fn().mockResolvedValue();
  vi.stubGlobal('navigator', { clipboard: { writeText }, share }); show();
  fireEvent.click(screen.getByRole('button', { name: 'Copiar resultados' }));
  expect(await screen.findByRole('status')).toHaveTextContent('Resultados copiados');
  const text = writeText.mock.calls[0][0];
  expect(text).toContain('Familia'); expect(text).toContain('Código: ABC123'); expect(text).toContain('Cuota: Bs 200 · Mensual');
  expect(text).toContain('1. Ana · Enero 2027 · Bs 400\n2. Ana · Febrero 2027 · Bs 400');
  fireEvent.click(screen.getByRole('button', { name: 'Compartir', exact: true }));
  await act(async () => {});
  expect(share).not.toHaveBeenCalled();
  expect(writeText).toHaveBeenLastCalledWith(`${window.location.origin}/room/ABC123`);
  expect(screen.getByRole('status')).toHaveTextContent('Link copiado para compartir');
});
it('compartir copia el enlace y bloquea dobles pulsaciones mientras espera', async () => {
  let finish; const writeText = vi.fn(() => new Promise(resolve => { finish = resolve; }));
  vi.stubGlobal('navigator', { clipboard: { writeText } }); show();
  const button = screen.getByRole('button', { name: 'Compartir', exact: true }); fireEvent.click(button); fireEvent.click(button);
  expect(writeText).toHaveBeenCalledOnce(); expect(screen.getByRole('button', { name: 'Copiar resultados' })).toBeDisabled();
  expect(writeText).toHaveBeenCalledWith(`${window.location.origin}/room/ABC123`);
  await act(async () => finish()); expect(screen.getByRole('status')).toHaveTextContent('Link copiado para compartir');
});
it('un fallo al copiar el enlace permite reintentar la misma acción', async () => {
  const writeText = vi.fn().mockRejectedValueOnce(new Error('denied')).mockResolvedValue();
  vi.stubGlobal('navigator', { clipboard: { writeText }, share: vi.fn().mockRejectedValue(new DOMException('cancelled', 'AbortError')) }); show();
  fireEvent.click(screen.getByRole('button', { name: 'Compartir', exact: true })); await act(async () => {});
  expect(await screen.findByRole('alert')).toHaveTextContent('No pudimos copiar el link');
  fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }));
  expect(await screen.findByRole('status')).toHaveTextContent('Link copiado para compartir');
  expect(writeText).toHaveBeenLastCalledWith(`${window.location.origin}/room/ABC123`);
});
