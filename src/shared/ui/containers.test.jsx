import { useState } from 'react';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import Sheet from './Sheet';
import Menu from './Menu';
import AguayoStripe from './AguayoStripe';

describe('Contenedores accesibles', () => {
  it('una hoja toma el foco, lo retiene y lo devuelve al cerrar con Escape', () => {
    function Example() { const [open, setOpen] = useState(false); return <>
      <button onClick={() => setOpen(true)}>Abrir</button>
      <Sheet open={open} onClose={() => setOpen(false)} title="Editar nombre"><input aria-label="Nombre" /><button>Guardar</button></Sheet>
    </>; }
    render(<Example />);
    const trigger = screen.getByRole('button', { name: 'Abrir' });
    trigger.focus(); fireEvent.click(trigger);
    const dialog = screen.getByRole('dialog', { name: 'Editar nombre' });
    const buttons = within(dialog).getAllByRole('button');
    expect(dialog.contains(document.activeElement)).toBe(true);
    buttons.at(-1).focus();
    fireEvent.keyDown(dialog, { key: 'Tab' });
    expect(buttons[0]).toHaveFocus();
    fireEvent.keyDown(dialog, { key: 'Escape' });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });

  it('una hoja obligatoria no se descarta con Escape', () => {
    const onClose = vi.fn();
    render(<Sheet open title="Tu nombre" dismissible={false} onClose={onClose}><input aria-label="Nombre" /></Sheet>);
    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' });
    expect(onClose).not.toHaveBeenCalled();
    expect(screen.queryByRole('button', { name: 'Cerrar' })).not.toBeInTheDocument();
  });

  it('el menú se opera con flechas y restaura el foco al seleccionar', () => {
    const onSelect = vi.fn();
    render(<Menu items={[{ label: 'Compartir link', onSelect }, { label: 'Cancelar sala', onSelect, danger: true }]} />);
    const trigger = screen.getByRole('button', { name: 'Más acciones' });
    fireEvent.click(trigger);
    expect(trigger).toHaveAttribute('aria-expanded', 'true');
    const items = screen.getAllByRole('menuitem');
    expect(items[0]).toHaveFocus();
    fireEvent.keyDown(screen.getByRole('menu'), { key: 'ArrowDown' });
    expect(items[1]).toHaveFocus();
    fireEvent.click(items[1]);
    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });

  it('cada franja tiene su propio patrón SVG, sin referencias cruzadas', () => {
    const { container } = render(<><AguayoStripe /><AguayoStripe variant="stripes" /></>);
    const ids = [...container.querySelectorAll('pattern')].map(node => node.id);
    expect(new Set(ids).size).toBe(2);
    container.querySelectorAll('svg').forEach((svg, index) => expect(svg.querySelector('rect[width="100%"]')).toHaveAttribute('fill', `url(#${ids[index]})`));
  });
});
