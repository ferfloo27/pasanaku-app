import { act, render, screen, waitFor } from '@testing-library/react';
import { createPortal } from 'react-dom';
import { expect, it } from 'vitest';
import PageFocus from './PageFocus';

function View({ title = 'Inicio', dialog = false, note = '' }) {
  return <div id="root"><PageFocus /><main><h1 key={title}>{title}</h1><input aria-label="Buscar" /><p>{note}</p></main>
    {dialog && createPortal(<div role="dialog" aria-label="Perfil"><input aria-label="Nombre" autoFocus /></div>, document.body)}</div>;
}
it('enfoca la nueva vista y conserva el foco al actualizar datos de la misma pantalla', async () => {
  const view = render(<View />);
  await waitFor(() => expect(screen.getByRole('heading', { name: 'Inicio' })).toHaveFocus());
  screen.getByLabelText('Buscar').focus(); view.rerender(<View note="Lista actualizada" />);
  await waitFor(() => expect(screen.getByLabelText('Buscar')).toHaveFocus());
  view.rerender(<View title="Sala" />);
  await waitFor(() => expect(screen.getByRole('heading', { name: 'Sala' })).toHaveFocus());
});
it('respeta el foco de un diálogo y presenta la nueva vista cuando se cierra', async () => {
  const view = render(<View />);
  await waitFor(() => expect(screen.getByRole('heading', { name: 'Inicio' })).toHaveFocus());
  view.rerender(<View title="Sala" dialog />);
  await act(async () => { await new Promise(resolve => setTimeout(resolve, 10)); });
  expect(screen.getByLabelText('Nombre')).toHaveFocus();
  view.rerender(<View title="Sala" />);
  await waitFor(() => expect(screen.getByRole('heading', { name: 'Sala' })).toHaveFocus());
});
