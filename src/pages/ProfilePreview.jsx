import { useState } from 'react';
import { AuthContext } from '../app/authContext';
import ProfileNameSheet from '../features/profile/ui/ProfileNameSheet';
import Button from '../shared/ui/Button';

export default function ProfilePreview() {
  const [mode, setMode] = useState(null);
  const [name, setName] = useState('Lucía Mamani');
  const profileState = { isSaving: false, save: async displayName => {
    setName(displayName); setMode(null); return { data: { display_name: displayName } };
  } };
  return <AuthContext.Provider value={{ profileState }}>
    <p className="ui-kit-muted">Nombre de muestra: {name}. Esta prueba se queda en la galería.</p>
    <div className="ui-kit-inline">
      <Button variant="secondary" compact onClick={() => setMode('required')}>Abrir perfil obligatorio</Button>
      <Button variant="text" compact onClick={() => setMode('edit')}>Editar nombre de muestra</Button>
    </div>
    <ProfileNameSheet open={mode !== null} required={mode === 'required'} initialName={mode === 'edit' ? name : ''} onClose={() => setMode(null)} />
  </AuthContext.Provider>;
}
