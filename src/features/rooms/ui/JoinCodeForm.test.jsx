import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { AppError } from '../../../shared/errors/appError';
import JoinCodeForm from './JoinCodeForm';

function show(props = {}) {
  return render(<MemoryRouter><Routes>
    <Route path="/" element={<JoinCodeForm {...props} />} />
    <Route path="/room/:code" element={<p>Sala encontrada</p>} />
  </Routes></MemoryRouter>);
}
function paste(code) {
  fireEvent.paste(screen.getAllByRole('textbox')[0], { clipboardData: { getData: () => code } });
}

afterEach(() => vi.unstubAllGlobals());

describe('JoinCodeForm', () => {
  it('muestra seis casillas y solo habilita buscar un código completo', () => {
    const onSearch = vi.fn();
    show({ onSearch });
    expect(screen.getAllByRole('textbox')).toHaveLength(6);
    expect(screen.getByRole('button', { name: 'Buscar sala' })).toBeDisabled();
    paste('abc!');
    expect(screen.getByText('Faltan 3 caracteres')).toBeInTheDocument();
    fireEvent.submit(screen.getByRole('button', { name: 'Buscar sala' }).closest('form'));
    expect(onSearch).not.toHaveBeenCalled();
    paste(' k7-qm3p ');
    expect(screen.getAllByRole('textbox').map(field => field.value).join('')).toBe('K7QM3P');
    expect(screen.getByRole('button', { name: 'Buscar sala' })).toBeEnabled();
  });

  it('espera la búsqueda y bloquea reenvíos mientras carga', async () => {
    let finish;
    const onSearch = vi.fn(() => new Promise(resolve => { finish = resolve; }));
    show({ onSearch });
    paste('abc123');
    const form = screen.getByRole('button', { name: 'Buscar sala' }).closest('form');
    fireEvent.submit(form);
    expect(screen.getByRole('button', { name: 'Buscando…' })).toBeDisabled();
    expect(screen.getAllByRole('textbox')[0]).toBeDisabled();
    fireEvent.submit(form);
    expect(onSearch).toHaveBeenCalledExactlyOnceWith('ABC123');
    await act(async () => finish());
    expect(screen.getByRole('button', { name: 'Buscar sala' })).toBeEnabled();
  });

  it('muestra el código inexistente bajo las casillas y lo limpia al corregirlo', async () => {
    show({ onSearch: async () => { throw new AppError('ROOM_NOT_FOUND'); } });
    paste('abc123');
    fireEvent.click(screen.getByRole('button', { name: 'Buscar sala' }));
    const message = await screen.findByText('Ese código no existe. Revísalo e intenta de nuevo.');
    expect(message).toHaveClass('ui-field__error');
    expect(screen.getAllByRole('textbox')[0]).toHaveAccessibleDescription(expect.stringContaining(message.textContent));
    expect(screen.getAllByRole('textbox')[0]).toHaveAttribute('aria-invalid', 'true');
    fireEvent.change(screen.getAllByRole('textbox')[0], { target: { value: 'z' } });
    expect(screen.queryByText(message.textContent)).not.toBeInTheDocument();
  });

  it('conserva el código y permite reintentar un error de búsqueda', async () => {
    show({ onSearch: async () => { throw new AppError('NETWORK'); } });
    paste('abc123');
    fireEvent.click(screen.getByRole('button', { name: 'Buscar sala' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Sin conexión');
    expect(screen.getAllByRole('textbox').map(field => field.value).join('')).toBe('ABC123');
    expect(screen.getByRole('button', { name: 'Buscar sala' })).toBeEnabled();
  });

  it('navega por defecto a la pre-unión del código normalizado', async () => {
    show();
    paste('abc123');
    fireEvent.click(screen.getByRole('button', { name: 'Buscar sala' }));
    expect(await screen.findByText('Sala encontrada')).toBeInTheDocument();
  });

  it('pega desde el botón del portapapeles y explica si no puede leerlo', async () => {
    const readText = vi.fn().mockResolvedValueOnce(' k7-qm3p ').mockRejectedValueOnce(new Error('denied'));
    vi.stubGlobal('navigator', { clipboard: { readText } });
    show();
    fireEvent.click(screen.getByRole('button', { name: 'Pegar código' }));
    await screen.findByDisplayValue('K');
    expect(screen.getAllByRole('textbox').map(field => field.value).join('')).toBe('K7QM3P');
    fireEvent.click(screen.getByRole('button', { name: 'Pegar código' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Mantén presionada una casilla');
  });

  it('descarta lecturas viejas del portapapeles al editar o iniciar otra lectura', async () => {
    const resolves = [];
    vi.stubGlobal('navigator', { clipboard: { readText: () => new Promise(resolve => resolves.push(resolve)) } });
    show();
    const button = screen.getByRole('button', { name: 'Pegar código' });
    fireEvent.click(button);
    paste('ABC123');
    await act(async () => resolves[0]('ZZZ999'));
    expect(screen.getAllByRole('textbox').map(field => field.value).join('')).toBe('ABC123');
    fireEvent.click(button);
    fireEvent.click(button);
    await act(async () => resolves[2]('NEW123'));
    await act(async () => resolves[1]('OLD123'));
    expect(screen.getAllByRole('textbox').map(field => field.value).join('')).toBe('NEW123');
  });
});
