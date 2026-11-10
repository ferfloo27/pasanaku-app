import { useState } from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import TextField from './TextField';
import CodeInput from './CodeInput';
import MoneyField from './MoneyField';
import Segmented from './Segmented';
import DateField from './DateField';

describe('Campos compartidos', () => {
  it('asocia etiqueta, ayuda y error al campo sin perder descripciones externas', () => {
    render(<TextField label="Nombre" help="Hasta 60 caracteres" error="Escribe un nombre" aria-describedby="extra" />);
    const field = screen.getByLabelText('Nombre');
    expect(field).toHaveAttribute('aria-invalid', 'true');
    expect(field).toHaveAccessibleDescription('Hasta 60 caracteres Escribe un nombre');
    expect(field.getAttribute('aria-describedby')).toContain('extra');
  });

  it('pega un código completo, normaliza y mueve el foco a la última casilla', () => {
    function Example() { const [value, setValue] = useState(''); return <CodeInput value={value} onChange={setValue} />; }
    render(<Example />);
    const fields = screen.getAllByRole('textbox');
    fireEvent.paste(fields[0], { clipboardData: { getData: () => ' k7-qm3p ' } });
    expect(fields.map(field => field.value).join('')).toBe('K7QM3P');
    expect(fields[5]).toHaveFocus();
    fireEvent.keyDown(fields[5], { key: 'Backspace' });
    expect(fields[5]).toHaveValue('');
  });

  it('escribir y retroceder mantiene un código contiguo y permite flechas', () => {
    function Example() { const [value, setValue] = useState(''); return <CodeInput value={value} onChange={setValue} />; }
    render(<Example />);
    const fields = screen.getAllByRole('textbox');
    fireEvent.change(fields[0], { target: { value: 'a' } });
    expect(fields[0]).toHaveValue('A');
    expect(fields[1]).toHaveFocus();
    fireEvent.keyDown(fields[1], { key: 'Backspace' });
    expect(fields[0]).toHaveValue('');
    expect(fields[0]).toHaveFocus();
    fireEvent.keyDown(fields[0], { key: 'ArrowRight' });
    expect(fields[1]).toHaveFocus();
  });

  it('el monto admite enteros y vacío, sin convertir decimales en otra cantidad', () => {
    const onChange = vi.fn();
    render(<MoneyField label="Cuota" value="200" onChange={onChange} />);
    const field = screen.getByLabelText('Cuota');
    fireEvent.change(field, { target: { value: '25.50' } });
    expect(onChange).not.toHaveBeenCalled();
    fireEvent.change(field, { target: { value: '150' } });
    expect(onChange).toHaveBeenLastCalledWith('150');
    fireEvent.change(field, { target: { value: '' } });
    expect(onChange).toHaveBeenLastCalledWith('');
  });

  it('la frecuencia se elige con radios nativos y respeta el estado deshabilitado', () => {
    const onChange = vi.fn();
    render(<Segmented label="Frecuencia" value="monthly" onChange={onChange} options={[
      { value: 'weekly', label: 'Semanal' }, { value: 'monthly', label: 'Mensual' },
      { value: 'biweekly', label: 'Quincenal', disabled: true },
    ]} />);
    expect(screen.getByRole('radio', { name: 'Mensual' })).toBeChecked();
    fireEvent.click(screen.getByRole('radio', { name: 'Semanal' }));
    expect(onChange).toHaveBeenCalledWith('weekly');
    expect(screen.getByRole('radio', { name: 'Quincenal' })).toBeDisabled();
  });

  it('la fecha mensual exige mes y las otras frecuencias día, con mínimos de Bolivia', () => {
    const { rerender } = render(<DateField label="Inicio" frequency="monthly" today="2026-11-10" />);
    expect(screen.getByLabelText('Inicio')).toHaveAttribute('type', 'month');
    expect(screen.getByLabelText('Inicio')).toHaveAttribute('min', '2026-11');
    rerender(<DateField label="Inicio" frequency="biweekly" today="2026-11-10" />);
    expect(screen.getByLabelText('Inicio')).toHaveAttribute('type', 'date');
    expect(screen.getByLabelText('Inicio')).toHaveAttribute('min', '2026-11-10');
  });
});
