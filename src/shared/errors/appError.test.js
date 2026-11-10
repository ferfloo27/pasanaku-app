import { describe, it, expect } from 'vitest';
import { AppError, getErrorMessage, MESSAGES } from './appError';

describe('Errores de aplicación', () => {
  it('conserva el código y la causa para diagnóstico', () => {
    const cause = new Error('detalle interno');
    const error = new AppError('ROOM_FULL', cause);
    expect(error).toBeInstanceOf(Error);
    expect(error.code).toBe('ROOM_FULL');
    expect(error.cause).toBe(cause);
    expect(getErrorMessage(error)).toBe('La sala llegó a su máximo de participantes.');
  });
  it('los errores desconocidos nunca exponen mensajes técnicos', () => {
    expect(getErrorMessage(new Error('postgres: datos internos'))).toBe(MESSAGES.UNKNOWN);
    expect(getErrorMessage(new AppError('toString'))).toBe(MESSAGES.UNKNOWN);
    expect(getErrorMessage(null)).toBe(MESSAGES.UNKNOWN);
  });
});
