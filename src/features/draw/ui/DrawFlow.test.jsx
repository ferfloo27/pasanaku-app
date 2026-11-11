import { act, fireEvent, render, screen, within, waitFor } from '@testing-library/react';
import { expect, it, vi, beforeEach } from 'vitest';
import DrawFlow from './DrawFlow';
import { AppError } from '../../../shared/errors/appError';
const { confirmDraw } = vi.hoisted(() => ({ confirmDraw: vi.fn() }));
vi.mock('../api/drawApi', () => ({ confirmDraw }));
const room = { id: 'r', name: 'Familia', start_date: '2099-01-01', frequency: 'monthly', contribution_bs: 200 };
const participants = [{ id: 'a', name: 'Ana' }, { id: 'b', name: 'Bea' }];
beforeEach(() => vi.resetAllMocks());
function show(props = {}) { return render(<DrawFlow room={room} participants={participants} random={() => .999} onBack={vi.fn()} onConfirmed={vi.fn()} onResync={vi.fn()} {...props} />); }
it('pide confirmación, muestra el resumen y serializa una escritura con el orden editado', async () => {
  let finish; confirmDraw.mockImplementation(() => new Promise(resolve => { finish = resolve; }));
  const onConfirmed = vi.fn(); show({ onConfirmed });
  fireEvent.click(screen.getByRole('button', { name: 'Subir a Bea' }));
  fireEvent.click(screen.getByRole('button', { name: 'Confirmar y anunciar' }));
  const dialog = screen.getByRole('dialog');
  expect(dialog).toHaveTextContent('2 participantes'); expect(dialog).toHaveTextContent('Bs 400 por turno');
  expect(dialog).toHaveTextContent('Primer turno: Bea'); expect(dialog).toHaveTextContent('Enero 2099');
  expect(dialog).toHaveTextContent('Todos verán el resultado. No se puede deshacer.');
  expect(confirmDraw).not.toHaveBeenCalled();
  const announce = within(dialog).getByRole('button', { name: 'Anunciar a todos' });
  fireEvent.click(announce); fireEvent.click(announce);
  expect(confirmDraw).toHaveBeenCalledExactlyOnceWith('r', ['b', 'a']);
  expect(within(dialog).getByRole('button', { name: 'Seguir revisando' })).toBeDisabled();
  await act(async () => finish({ data: null }));
  expect(onConfirmed).toHaveBeenCalledOnce();
});
it('conserva el orden tras fallo genérico y permite reintentar con nueva confirmación', async () => {
  confirmDraw.mockRejectedValueOnce(new AppError('DRAW_FAILED')).mockResolvedValue({ data: null });
  show(); fireEvent.click(screen.getByRole('button', { name: 'Subir a Bea' }));
  fireEvent.click(screen.getByRole('button', { name: 'Confirmar y anunciar' }));
  fireEvent.click(screen.getByRole('button', { name: 'Anunciar a todos' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('Tu borrador sigue aquí');
  expect(within(screen.getAllByRole('listitem')[0]).getByText('Bea')).toBeVisible();
  fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }));
  expect(screen.getByRole('dialog')).toBeVisible();
  expect(confirmDraw).toHaveBeenCalledOnce();
});
it('PARTICIPANTS_CHANGED exige re-sortear y toma la lista actual tras resincronizar', async () => {
  confirmDraw.mockRejectedValue(new AppError('PARTICIPANTS_CHANGED'));
  const onResync = vi.fn(); const view = show({ onResync });
  fireEvent.click(screen.getByRole('button', { name: 'Confirmar y anunciar' }));
  fireEvent.click(screen.getByRole('button', { name: 'Anunciar a todos' }));
  await screen.findByRole('alert'); expect(onResync).toHaveBeenCalledOnce();
  expect(screen.getByRole('button', { name: 'Confirmar y anunciar' })).toBeDisabled();
  view.rerender(<DrawFlow room={room} participants={[...participants, { id: 'c', name: 'Carmen' }]} random={() => .999} onResync={onResync} />);
  fireEvent.click(screen.getByRole('button', { name: 'Volver a sortear' }));
  expect(screen.getAllByRole('listitem')).toHaveLength(3);
  expect(screen.getByRole('button', { name: 'Confirmar y anunciar' })).toBeEnabled();
});
it('ROOM_NOT_WAITING resincroniza y bloquea una segunda confirmación', async () => {
  confirmDraw.mockRejectedValue(new AppError('ROOM_NOT_WAITING'));
  const onResync = vi.fn(); show({ onResync });
  fireEvent.click(screen.getByRole('button', { name: 'Confirmar y anunciar' }));
  fireEvent.click(screen.getByRole('button', { name: 'Anunciar a todos' }));
  await waitFor(() => expect(onResync).toHaveBeenCalledOnce());
  expect(screen.getByRole('button', { name: 'Confirmar y anunciar' })).toBeDisabled();
});
it('una alta mientras se revisa la confirmación cierra la hoja e impide anunciar el orden viejo', () => {
  const view = show(); fireEvent.click(screen.getByRole('button', { name: 'Confirmar y anunciar' }));
  view.rerender(<DrawFlow room={room} participants={[...participants, { id: 'c', name: 'Carmen' }]} random={() => .999} />);
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Confirmar y anunciar' })).toBeDisabled();
  expect(confirmDraw).not.toHaveBeenCalled();
});
