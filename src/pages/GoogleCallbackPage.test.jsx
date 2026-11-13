import { StrictMode } from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, expect, it, vi } from 'vitest';
import GoogleCallbackPage from './GoogleCallbackPage';
import { AppError } from '../shared/errors/appError';
const { finishGoogleSignIn, cancelGoogleSignIn } = vi.hoisted(() => ({ finishGoogleSignIn: vi.fn(), cancelGoogleSignIn: vi.fn() }));
vi.mock('../features/auth/api/googleSignInApi', () => ({ finishGoogleSignIn, cancelGoogleSignIn }));
function show() { return render(<StrictMode><MemoryRouter initialEntries={['/auth/google']}><Routes>
  <Route path="/auth/google" element={<GoogleCallbackPage />} /><Route path="/" element={<h1>Inicio</h1>} />
</Routes></MemoryRouter></StrictMode>); }
beforeEach(() => { vi.resetAllMocks(); });
it('vuelve a Inicio al completar la validación sin montar guard de perfil', async () => {
  finishGoogleSignIn.mockResolvedValue(); show();
  expect(await screen.findByRole('heading', { name: 'Inicio' })).toBeVisible();
});
it('muestra error recuperable y volver cancela el intento', async () => {
  finishGoogleSignIn.mockRejectedValue(new AppError('AUTH_SIGN_IN_FAILED')); show();
  expect(await screen.findByRole('alert')).toHaveTextContent('Tu sesión anterior sigue aquí');
  await act(async () => fireEvent.click(screen.getByRole('button', { name: 'Volver al inicio' })));
  expect(screen.getByRole('heading', { name: 'Inicio' })).toBeVisible();
  expect(cancelGoogleSignIn).toHaveBeenCalled();
});
it('abandonar el callback durante la validación cancela sin que StrictMode cancele al montar', async () => {
  finishGoogleSignIn.mockImplementation(() => new Promise(() => {}));
  const view = show(); await act(async () => {});
  expect(cancelGoogleSignIn).not.toHaveBeenCalled();
  view.unmount(); await act(async () => {});
  expect(cancelGoogleSignIn).toHaveBeenCalledOnce();
});
