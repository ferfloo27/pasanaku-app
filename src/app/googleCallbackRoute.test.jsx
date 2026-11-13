import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { expect, it, vi } from 'vitest';
import AppRoutes from './routes';
import { AppError } from '../shared/errors/appError';

vi.mock('./IdentityBoundary', () => ({ default: () => { throw new Error('El callback no debe crear ni cargar otra identidad'); } }));
vi.mock('../features/auth/api/googleSignInApi', () => ({
  finishGoogleSignIn: async () => { throw new AppError('AUTH_SIGN_IN_FAILED'); }, cancelGoogleSignIn: vi.fn(),
}));
it('el retorno Google muestra errores fuera del proveedor y guards de la sesión primaria', async () => {
  render(<MemoryRouter initialEntries={['/auth/google']}><AppRoutes /></MemoryRouter>);
  expect(await screen.findByRole('alert')).toHaveTextContent('Tu sesión anterior sigue aquí');
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
});
