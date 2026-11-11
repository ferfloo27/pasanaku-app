import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import CreateRoomForm from './CreateRoomForm';

afterEach(() => vi.useRealTimers());

function fill() {
  fireEvent.change(screen.getByLabelText('Nombre de la sala'), { target: { value: 'Familia' } });
  fireEvent.change(screen.getByLabelText('Cuota por persona'), { target: { value: '200' } });
  fireEvent.change(screen.getByLabelText('Fecha de inicio'), { target: { value: '2026-11' } });
}

it('valida antes de enviar y calcula un ejemplo con el cupo elegido', async () => {
  const onSubmit = vi.fn().mockResolvedValue(undefined);
  render(<CreateRoomForm today="2026-11-10" onSubmit={onSubmit} />);
  expect(screen.getByRole('radio', { name: 'Mensual' })).toBeChecked();
  expect(screen.getByLabelText('Máx. participantes')).toHaveValue('30');
  fireEvent.submit(screen.getByRole('button', { name: 'Crear sala' }).closest('form'));
  expect(onSubmit).not.toHaveBeenCalled();
  expect(screen.getByLabelText('Nombre de la sala')).toHaveAttribute('aria-invalid', 'true');
  fill();
  fireEvent.change(screen.getByLabelText('Máx. participantes'), { target: { value: '4' } });
  expect(screen.getByText(/Con 4 personas: Bs 800/)).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Crear sala' }));
  await waitFor(() => expect(onSubmit).toHaveBeenCalledWith({ name: 'Familia', contributionBs: '200', frequency: 'monthly', startDate: '2026-11', maxParticipants: '4' }));
});

it('bloquea durante el envío y conserva los datos si falla', async () => {
  let reject;
  const onSubmit = vi.fn(() => new Promise((_, fail) => { reject = fail; }));
  render(<CreateRoomForm today="2026-11-10" onSubmit={onSubmit} />);
  fill();
  fireEvent.click(screen.getByRole('button', { name: 'Crear sala' }));
  expect(screen.getByRole('button', { name: 'Creando…' })).toBeDisabled();
  expect(screen.getByLabelText('Nombre de la sala')).toBeDisabled();
  reject({ code: 'NETWORK' });
  expect(await screen.findByRole('alert')).toHaveTextContent('Sin conexión');
  expect(screen.getByLabelText('Nombre de la sala')).toHaveValue('Familia');
  expect(screen.getByLabelText('Cuota por persona')).toHaveValue('200');
});

it('cambia a día con mínimo boliviano, invalida la fecha y permite elegir hoy', () => {
  render(<CreateRoomForm today="2026-11-10" onSubmit={vi.fn()} />);
  fill();
  fireEvent.click(screen.getByRole('radio', { name: 'Semanal' }));
  expect(screen.getByLabelText('Fecha de inicio')).toHaveAttribute('type', 'date');
  expect(screen.getByLabelText('Fecha de inicio')).toHaveAttribute('min', '2026-11-10');
  expect(screen.getByLabelText('Fecha de inicio')).toHaveValue('');
});

it('determina el día y mes actuales en Bolivia aunque UTC ya esté en el siguiente mes', () => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-12-01T02:00:00Z'));
  render(<CreateRoomForm onSubmit={vi.fn()} />);
  expect(screen.getByLabelText('Fecha de inicio')).toHaveAttribute('min', '2026-11');
  fireEvent.click(screen.getByRole('radio', { name: 'Quincenal' }));
  expect(screen.getByLabelText('Fecha de inicio')).toHaveAttribute('min', '2026-11-30');
});
