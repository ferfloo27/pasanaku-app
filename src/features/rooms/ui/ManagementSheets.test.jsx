import { act, fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, expect, it, vi } from 'vitest';
import { AppError } from '../../../shared/errors/appError';
import RemoveView from './RemoveParticipantSheet';
import CancelView from './CancelRoomSheet';
import { useRoomManagement } from '../hooks/useRoomManagement';
const { removeParticipant, cancelRoom } = vi.hoisted(() => ({ removeParticipant: vi.fn(), cancelRoom: vi.fn() }));
vi.mock('../api/roomManagementApi', () => ({ removeParticipant, cancelRoom }));
beforeEach(() => vi.resetAllMocks());
const participant = { id: 'p', name: 'Juan Quispe' };
const room = { id: 'r', name: 'Familia' };

function RemoveParticipantSheet({ participant, onClose, onSuccess }) {
  const management = useRoomManagement({ onRemoved: onSuccess });
  return <><button onClick={() => management.selectParticipant(participant)}>Elegir</button><RemoveView open={Boolean(management.selection)} participant={management.selection?.participant}
    loading={management.loading} error={management.error} onConfirm={management.confirm} onClose={() => { management.close(); onClose?.(); }} /></>;
}
function CancelRoomSheet({ room, onSuccess }) {
  const management = useRoomManagement({ onCancelled: onSuccess });
  return <><button onClick={() => management.selectCancellation(room)}>Elegir</button><CancelView open={Boolean(management.selection)} room={management.selection?.room}
    loading={management.loading} error={management.error} onConfirm={management.confirm} onClose={management.close} /></>;
}
function openSheet(element) { const view = render(element); fireEvent.click(screen.getByRole('button', { name: 'Elegir' })); return view; }

it('no elimina antes de confirmar y Volver conserva la participación', () => {
  const onClose = vi.fn();
  openSheet(<RemoveParticipantSheet open participant={participant} onClose={onClose} />);
  expect(screen.getByRole('dialog', { name: '¿Eliminar a Juan Quispe?' })).toHaveTextContent('Puede volver a unirse con el código');
  fireEvent.click(screen.getByRole('button', { name: 'Volver' }));
  expect(onClose).toHaveBeenCalledOnce();
  expect(removeParticipant).not.toHaveBeenCalled();
});
it('bloquea cierre y doble envío mientras elimina, y comunica éxito una vez', async () => {
  let resolve;
  removeParticipant.mockImplementation(() => new Promise(done => { resolve = done; }));
  const onClose = vi.fn(); const onSuccess = vi.fn();
  openSheet(<RemoveParticipantSheet open participant={participant} onClose={onClose} onSuccess={onSuccess} />);
  fireEvent.click(screen.getByRole('button', { name: 'Eliminar de la sala' }));
  expect(screen.getByRole('button', { name: 'Eliminando…' })).toBeDisabled();
  expect(screen.getByRole('button', { name: 'Volver' })).toBeDisabled();
  fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' });
  fireEvent.click(screen.getByRole('button', { name: 'Eliminando…' }));
  expect(onClose).not.toHaveBeenCalled();
  expect(removeParticipant).toHaveBeenCalledExactlyOnceWith('p');
  await act(async () => resolve({ data: null }));
  expect(onSuccess).toHaveBeenCalledOnce();
});
it('conserva la elección y permite reintentar tras un error sin volver a abrir confirmación', async () => {
  removeParticipant.mockRejectedValueOnce(new AppError('NETWORK')).mockResolvedValueOnce({ data: null });
  const onSuccess = vi.fn();
  openSheet(<RemoveParticipantSheet open participant={participant} onSuccess={onSuccess} />);
  fireEvent.click(screen.getByRole('button', { name: 'Eliminar de la sala' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('Sin conexión');
  expect(screen.getByRole('dialog')).toHaveAccessibleName('¿Eliminar a Juan Quispe?');
  fireEvent.click(screen.getByRole('button', { name: 'Eliminar de la sala' }));
  await act(async () => {});
  expect(removeParticipant).toHaveBeenNthCalledWith(2, 'p');
  expect(onSuccess).toHaveBeenCalledOnce();
});
it('cancelar exige confirmación con nombre de sala y conserva el error de permisos', async () => {
  cancelRoom.mockRejectedValue(new AppError('NOT_HOST'));
  openSheet(<CancelRoomSheet open room={room} />);
  expect(screen.getByRole('dialog', { name: '¿Cancelar la sala?' })).toHaveTextContent('Familia');
  expect(cancelRoom).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button', { name: 'Cancelar sala' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('Solo el anfitrión');
  expect(cancelRoom).toHaveBeenCalledExactlyOnceWith('r');
});
it('descarta el resultado de una operación cuando la confirmación ya se desmontó', async () => {
  let resolve;
  cancelRoom.mockImplementation(() => new Promise(done => { resolve = done; }));
  const onSuccess = vi.fn();
  const view = openSheet(<CancelRoomSheet open room={room} onSuccess={onSuccess} />);
  fireEvent.click(screen.getByRole('button', { name: 'Cancelar sala' }));
  view.unmount();
  await act(async () => resolve({ data: null }));
  expect(onSuccess).not.toHaveBeenCalled();
});
