import { act, fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, expect, it, vi } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { AuthContext } from '../../../app/authContext';
import { AppError } from '../../../shared/errors/appError';
import RoomEntry from './RoomEntry';
import JoinPage from '../../../pages/JoinPage';
const { getRoomPreview, joinRoom, fetchMemberRoom } = vi.hoisted(() => ({ getRoomPreview: vi.fn(), joinRoom: vi.fn(), fetchMemberRoom: vi.fn() }));
vi.mock('../api/previewApi', () => ({ getRoomPreview, joinRoom, fetchMemberRoom }));
const room = { code: 'ABC123', name: 'Familia', host_name: 'Rosa', participant_count: 2, max_participants: 3, contribution_bs: 150, frequency: 'monthly', start_date: '2027-01-01', status: 'waiting', is_member: false };
const auth = { user: { id: 'u' }, profileState: { profile: { display_name: 'Lucía' } } };
function show(path = '/room/ABC123', context = auth) {
  const tree = value => <AuthContext.Provider value={value}><MemoryRouter initialEntries={[path]}><Routes>
    <Route path="/join" element={<JoinPage />} />
    <Route path="/room/:code" element={<RoomEntry />} />
    <Route path="/" element={<p>Inicio</p>} />
  </Routes></MemoryRouter></AuthContext.Provider>;
  const result = render(tree(context));
  return { ...result, changeAuth: value => result.rerender(tree(value)) };
}
beforeEach(() => {
  vi.resetAllMocks();
  getRoomPreview.mockResolvedValue({ data: room });
  joinRoom.mockResolvedValue({ data: { ...room, id: 'r' } });
  fetchMemberRoom.mockResolvedValue({ data: { room: { ...room, id: 'r', host_user_id: 'host' }, participants: [{ id: 'p', user_id: 'u', name: 'Lucía' }] } });
});

it('muestra el resumen antes de unirse y después carga la sala del miembro', async () => {
  show();
  expect(await screen.findByRole('heading', { name: 'Familia' })).toBeInTheDocument();
  expect(screen.getByText('2 de 3')).toBeInTheDocument();
  expect(screen.getByText('Lucía')).toBeInTheDocument();
  expect(screen.getByText('Rosa')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Unirme' }));
  expect(await screen.findByRole('heading', { name: 'Participantes (1/3)' })).toBeInTheDocument();
  expect(joinRoom).toHaveBeenCalledExactlyOnceWith('ABC123');
  expect(screen.queryByRole('button', { name: 'Sortear orden' })).not.toBeInTheDocument();
});

it.each([
  [{ status: 'drawn' }, /Esta sala ya hizo su sorteo/],
  [{ status: 'cancelled' }, /Rosa canceló esta sala/],
  [{ participant_count: 3 }, /máximo de 3 personas/],
])('bloquea una sala que no admite personas: %j', async (patch, message) => {
  getRoomPreview.mockResolvedValue({ data: { ...room, ...patch } });
  show();
  expect(await screen.findByRole('alert')).toHaveTextContent(message);
  expect(screen.queryByRole('button', { name: 'Unirme' })).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Volver al inicio' }));
  expect(await screen.findByText('Inicio')).toBeInTheDocument();
});

it('bloquea tras una carrera por cupo y conserva el resumen', async () => {
  joinRoom.mockRejectedValue(new AppError('ROOM_FULL'));
  show();
  fireEvent.click(await screen.findByRole('button', { name: 'Unirme' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('máximo de 3 personas');
  expect(screen.getByRole('heading', { name: 'Familia' })).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Unirme' })).not.toBeInTheDocument();
});

it('permite reintentar una unión fallida por red sin perder el nombre ni duplicar envíos', async () => {
  let fail;
  joinRoom.mockImplementationOnce(() => new Promise((_, reject) => { fail = reject; }));
  show();
  fireEvent.click(await screen.findByRole('button', { name: 'Unirme' }));
  expect(screen.getByRole('button', { name: 'Uniéndote…' })).toBeDisabled();
  await act(async () => fail(new AppError('NETWORK')));
  expect(await screen.findByRole('alert')).toHaveTextContent('Sin conexión');
  fireEvent.click(screen.getByRole('button', { name: 'Unirme' }));
  expect(await screen.findByRole('heading', { name: 'Participantes (1/3)' })).toBeInTheDocument();
});

it('un miembro existente pasa directamente a su sala aunque ya se sorteó', async () => {
  getRoomPreview.mockResolvedValue({ data: { ...room, status: 'drawn', is_member: true } });
  show();
  expect(await screen.findByRole('heading', { name: 'Participantes (1/3)' })).toBeInTheDocument();
  expect(joinRoom).not.toHaveBeenCalled();
});

it('muestra sala inexistente al abrir un link y permite volver al inicio', async () => {
  getRoomPreview.mockRejectedValue(new AppError('ROOM_NOT_FOUND'));
  show();
  expect(await screen.findByRole('heading', { name: 'No encontramos esta sala' })).toBeInTheDocument();
});

it('buscar espera la pre-unión y deja el código inexistente bajo el campo', async () => {
  getRoomPreview.mockRejectedValue(new AppError('ROOM_NOT_FOUND'));
  show('/join');
  fireEvent.paste(screen.getAllByRole('textbox')[0], { clipboardData: { getData: () => 'ABC123' } });
  fireEvent.click(screen.getByRole('button', { name: 'Buscar sala' }));
  expect(await screen.findByText('Ese código no existe. Revísalo e intenta de nuevo.')).toHaveClass('ui-field__error');
  expect(screen.getByRole('heading', { name: 'Unirme a una sala' })).toBeInTheDocument();
});

it('ignora una carga vieja después de desmontar la sala', async () => {
  let finish;
  getRoomPreview.mockImplementationOnce(() => new Promise(resolve => { finish = resolve; }));
  const view = show();
  view.unmount();
  await act(async () => finish({ data: { ...room, is_member: true } }));
  expect(fetchMemberRoom).not.toHaveBeenCalled();
});

it('descarta la pre-unión de una identidad anterior aunque responda al final', async () => {
  let finish;
  getRoomPreview.mockImplementationOnce(() => new Promise(resolve => { finish = resolve; }));
  const view = show();
  view.changeAuth({ ...auth, user: { id: 'other-user' } });
  expect(await screen.findByRole('button', { name: 'Unirme' })).toBeInTheDocument();
  await act(async () => finish({ data: { ...room, name: 'Sala privada anterior', is_member: true } }));
  expect(screen.queryByText('Sala privada anterior')).not.toBeInTheDocument();
  expect(fetchMemberRoom).not.toHaveBeenCalled();
});

it('abre Cambiar y guarda el nombre mediante la hoja de perfil existente', async () => {
  const save = vi.fn().mockResolvedValue({ data: { display_name: 'Ana' } });
  show('/room/ABC123', { ...auth, profileState: { ...auth.profileState, save } });
  fireEvent.click(await screen.findByRole('button', { name: 'Cambiar' }));
  fireEvent.change(screen.getByLabelText('Tu nombre'), { target: { value: 'Ana' } });
  fireEvent.click(screen.getByRole('button', { name: 'Guardar nombre' }));
  await act(async () => {});
  expect(save).toHaveBeenCalledWith('Ana');
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
});
