import { fireEvent, render, screen } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
import CreateRoomFlow from './CreateRoomFlow';
import { createRoom } from '../api/createRoomApi';
vi.mock('../api/createRoomApi', () => ({ createRoom: vi.fn() }));

it('pasa del formulario a Sala lista tras crear, y navega solo al pulsar Ir a la sala', async () => {
  const onEnter = vi.fn();
  createRoom.mockResolvedValue({ data: { name: 'Familia', code: 'ABC123', contribution_bs: 200, frequency: 'monthly', start_date: '2099-01-01', max_participants: 30 } });
  render(<CreateRoomFlow onEnter={onEnter} onBack={vi.fn()} />);
  fireEvent.change(screen.getByLabelText('Nombre de la sala'), { target: { value: 'Familia' } });
  fireEvent.change(screen.getByLabelText('Cuota por persona'), { target: { value: '200' } });
  fireEvent.change(screen.getByLabelText('Fecha de inicio'), { target: { value: '2099-01' } });
  fireEvent.click(screen.getByRole('button', { name: 'Crear sala' }));
  expect(await screen.findByRole('heading', { name: 'Sala lista' })).toBeInTheDocument();
  expect(screen.getByText('ABC123')).toBeInTheDocument();
  expect(onEnter).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button', { name: 'Ir a la sala' }));
  expect(onEnter).toHaveBeenCalledWith('ABC123');
});
