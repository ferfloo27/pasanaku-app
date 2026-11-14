import { render, screen, fireEvent, within } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import UiKitPage from './UiKitPage';
import { MemoryRouter } from 'react-router-dom';

describe('Galería de desarrollo', () => {
  it('permite probar una hoja y devolver el foco al botón que la abrió', () => {
    render(<MemoryRouter><UiKitPage /></MemoryRouter>);
    const trigger = screen.getByRole('button', { name: 'Abrir hoja inferior' });
    trigger.focus(); fireEvent.click(trigger);
    const dialog = screen.getByRole('dialog', { name: '¿Eliminar a Juan Quispe?' });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Volver' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });
  it('el formulario de muestra usa los campos reales y cambia el selector de fecha', () => {
    render(<MemoryRouter><UiKitPage /></MemoryRouter>);
    expect(screen.getByRole('heading', { name: 'Componentes y estados' })).toBeVisible();
    expect(screen.getByLabelText('Fecha de inicio')).toHaveAttribute('type', 'month');
    fireEvent.click(within(screen.getByRole('group', { name: 'Frecuencia', exact: true })).getByRole('radio', { name: 'Semanal' }));
    expect(screen.getByLabelText('Fecha de inicio')).toHaveAttribute('type', 'date');
    expect(screen.getByText('Bs 1.600')).toBeVisible();
  });
});
