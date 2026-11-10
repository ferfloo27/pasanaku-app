import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
import { RequireSession, RequireProfile } from './guards';
import { AuthContext } from './authContext';
import { AppError } from '../shared/errors/appError';
import ProfileNameSheet from '../features/profile/ui/ProfileNameSheet';
import { StrictMode } from 'react';

const session = { user: { id: 'one', is_anonymous: true }, status: 'ready', error: null, retry: vi.fn() };
const profile = { profile: null, status: 'ready', error: null, isSaving: false, save: vi.fn(), retry: vi.fn() };
function renderGuard(auth, profileState) {
  return render(<AuthContext.Provider value={{ ...auth, profileState }}><RequireSession><RequireProfile><button>Crear sala</button></RequireProfile></RequireSession></AuthContext.Provider>);
}
it('no monta acciones sin sesión y ofrece reintentar cuando falla', () => {
  const retry = vi.fn(); renderGuard({ ...session, user: null, status: 'error', error: new AppError('AUTH_FAILED'), retry }, profile);
  expect(screen.queryByRole('button', { name: 'Crear sala' })).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Reintentar' })); expect(retry).toHaveBeenCalledOnce();
});
it('mantiene el guard cerrado durante la carga o fallo del perfil', () => {
  const retry = vi.fn(); renderGuard(session, { ...profile, status: 'error', error: new AppError('PROFILE_LOAD_FAILED'), retry });
  expect(screen.queryByRole('button', { name: 'Crear sala' })).not.toBeInTheDocument();
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Reintentar' })); expect(retry).toHaveBeenCalledOnce();
});
it('exige un nombre válido, no permite cerrar el primer uso y conserva el texto si falla guardar', async () => {
  const save = vi.fn().mockRejectedValue(new AppError('PROFILE_SAVE_FAILED'));
  renderGuard(session, { ...profile, save });
  const dialog = screen.getByRole('dialog', { name: '¿Cómo te llamas?' });
  const input = screen.getByRole('textbox', { name: 'Tu nombre' });
  expect(input).toHaveFocus();
  expect(screen.getByRole('button', { name: 'Continuar' })).toBeDisabled();
  fireEvent.keyDown(dialog, { key: 'Escape' }); expect(dialog).toBeInTheDocument();
  fireEvent.change(input, { target: { value: '  Lucía Mamani  ' } });
  fireEvent.click(screen.getByRole('button', { name: 'Continuar' }));
  await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('No pudimos guardar'));
  expect(input).toHaveValue('  Lucía Mamani  ');
  expect(save).toHaveBeenCalledWith('Lucía Mamani');
});
it('muestra las acciones solo con perfil cargado y válido', () => {
  renderGuard(session, { ...profile, profile: { user_id: 'one', display_name: 'Rosa' } });
  expect(screen.getByRole('button', { name: 'Crear sala' })).toBeEnabled();
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
});
it('la edición permite cancelar y bloquea cerrar durante el guardado', () => {
  const close = vi.fn();
  render(<AuthContext.Provider value={{ ...session, profileState: { ...profile, isSaving: true } }}>
    <ProfileNameSheet open initialName="Lucía" onClose={close} />
  </AuthContext.Provider>);
  expect(screen.getByRole('textbox', { name: 'Tu nombre' })).toHaveValue('Lucía');
  expect(screen.getByRole('button', { name: 'Guardando…' })).toBeDisabled();
  fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' }); expect(close).not.toHaveBeenCalled();
});
it('no muestra un error por mover el foco antes de escribir en el primer uso', () => {
  render(<StrictMode><AuthContext.Provider value={{ ...session, profileState: profile }}><ProfileNameSheet open required /></AuthContext.Provider></StrictMode>);
  fireEvent.blur(screen.getByRole('textbox', { name: 'Tu nombre' }));
  expect(screen.queryByText('Escribe un nombre de 1 a 50 caracteres.')).not.toBeInTheDocument();
});
