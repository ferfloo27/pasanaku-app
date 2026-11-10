import { fireEvent, render, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, expect, it, vi } from 'vitest';
import { AuthContext } from '../app/authContext';
import CreateRoomForm from './CreateRoomForm';
import JoinRoomForm from './JoinRoomForm';

const { createRoom, joinRoom } = vi.hoisted(() => ({ createRoom: vi.fn(), joinRoom: vi.fn() }));
vi.mock('../services/roomService', () => ({ createRoom, joinRoom }));
beforeEach(() => {
  vi.clearAllMocks();
  createRoom.mockResolvedValue({ data: { code: 'ABC123' }, error: null });
  joinRoom.mockResolvedValue({ data: { code: 'ABC123' }, error: null });
});
it.each([['crear', CreateRoomForm, 'hostName'], ['unirse', JoinRoomForm, 'name']])('%s usa el nombre del perfil, incluido tras editarlo desde el inicio', async (action, Form, nameKey) => {
  const content = name => <MemoryRouter><AuthContext.Provider value={{ user: { id: 'auth-user' }, profileState: { profile: { display_name: name } } }}><Form /></AuthContext.Provider></MemoryRouter>;
  const view = render(content('Rosa'));
  const input = view.container.querySelector(action === 'crear' ? 'input[type=month]' : 'input[maxlength="6"]');
  fireEvent.change(input, { target: { value: action === 'crear' ? '2099-12' : 'ABC123' } });
  fireEvent.submit(view.container.querySelector('form'));
  const service = action === 'crear' ? createRoom : joinRoom;
  await waitFor(() => expect(service).toHaveBeenLastCalledWith(expect.objectContaining({ [nameKey]: 'Rosa', clientId: 'auth-user' })));
  view.rerender(content('Lucía'));
  fireEvent.submit(view.container.querySelector('form'));
  await waitFor(() => expect(service).toHaveBeenLastCalledWith(expect.objectContaining({ [nameKey]: 'Lucía' })));
});
