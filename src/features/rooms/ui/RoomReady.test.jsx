import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import RoomReady from './RoomReady';

const room = { name: 'Familia', code: 'ABC123', contribution_bs: 200, frequency: 'monthly', start_date: '2026-11-01', max_participants: 30 };
afterEach(() => vi.unstubAllGlobals());

it('muestra sala y resumen, copia el código y abre la sala', async () => {
  const writeText = vi.fn().mockResolvedValue(undefined), onEnter = vi.fn();
  vi.stubGlobal('navigator', { clipboard: { writeText } });
  render(<RoomReady room={room} onEnter={onEnter} />);
  expect(screen.getByRole('heading', { name: 'Sala lista' })).toBeInTheDocument();
  expect(screen.getByText('Noviembre 2026')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Copiar código' }));
  await waitFor(() => expect(writeText).toHaveBeenCalledWith('ABC123'));
  expect(await screen.findByRole('status')).toHaveTextContent('Código copiado');
  fireEvent.click(screen.getByRole('button', { name: 'Ir a la sala' }));
  expect(onEnter).toHaveBeenCalledWith('ABC123');
});

it('compartir siempre copia el enlace sin abrir el menú nativo', async () => {
  const writeText = vi.fn().mockResolvedValue(), share = vi.fn();
  vi.stubGlobal('navigator', { share, clipboard: { writeText } });
  render(<RoomReady room={room} onEnter={vi.fn()} />);
  fireEvent.click(screen.getByRole('button', { name: 'Compartir link' }));
  expect(await screen.findByRole('status')).toHaveTextContent('Link copiado para compartir');
  expect(writeText).toHaveBeenCalledWith(`${window.location.origin}/room/ABC123`);
  expect(share).not.toHaveBeenCalled();
  expect(screen.queryByRole('alert')).not.toBeInTheDocument();
});

it('copia el link si no hay compartir nativo e informa errores del portapapeles', async () => {
  const writeText = vi.fn().mockResolvedValueOnce(undefined).mockRejectedValueOnce(new Error());
  vi.stubGlobal('navigator', { clipboard: { writeText } });
  render(<RoomReady room={room} onEnter={vi.fn()} />);
  fireEvent.click(screen.getByRole('button', { name: 'Compartir link' }));
  expect(await screen.findByRole('status')).toHaveTextContent('Link copiado para compartir');
  expect(writeText).toHaveBeenCalledWith(`${window.location.origin}/room/ABC123`);
  fireEvent.click(screen.getByRole('button', { name: 'Copiar código' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('No pudimos copiar');
});
