import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import Button from './Button';
import IconButton from './IconButton';
import Avatar from './Avatar';
import Chip from './Chip';

describe('Acciones compartidas', () => {
  it('un botón no envía un formulario salvo que se pida y respeta disabled', () => {
    const onClick = vi.fn();
    const { rerender } = render(<Button onClick={onClick}>Crear sala</Button>);
    expect(screen.getByRole('button')).toHaveAttribute('type', 'button');
    fireEvent.click(screen.getByRole('button'));
    expect(onClick).toHaveBeenCalledTimes(1);
    rerender(<Button disabled onClick={onClick}>Crear sala</Button>);
    fireEvent.click(screen.getByRole('button'));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('cargando anuncia el estado y evita envíos repetidos', () => {
    const onClick = vi.fn();
    render(<Button loading loadingText="Creando…" onClick={onClick}>Crear sala</Button>);
    const button = screen.getByRole('button', { name: 'Creando…' });
    expect(button).toHaveAttribute('aria-busy', 'true');
    expect(button).toBeDisabled();
    fireEvent.click(button);
    expect(onClick).not.toHaveBeenCalled();
  });

  it('el botón de icono conserva un nombre accesible', () => {
    render(<IconButton label="Editar tu nombre"><svg /></IconButton>);
    expect(screen.getByRole('button', { name: 'Editar tu nombre' })).toHaveAttribute('type', 'button');
  });

  it('el estado siempre tiene texto y los nombres compuestos producen iniciales', () => {
    render(<><Chip variant="waiting">En espera</Chip><Avatar name="  Lucía María Mamani " label="Lucía Mamani" /></>);
    expect(screen.getByText('En espera')).toBeVisible();
    expect(screen.getByRole('img', { name: 'Lucía Mamani' })).toHaveTextContent('LM');
  });
});
