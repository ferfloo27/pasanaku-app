import { useState } from 'react';
import { AuthContext } from '../app/authContext';
import ProfileNameSheet from '../features/profile/ui/ProfileNameSheet';
import Button from '../shared/ui/Button';
import ProfileHeader from '../features/profile/ui/ProfileHeader';
import AccountLinkCard from '../features/auth/ui/AccountLinkCard';
import { AppError } from '../shared/errors/appError';
import AccountDetails from '../features/auth/ui/AccountDetails';

export default function ProfilePreview() {
  const [mode, setMode] = useState(null);
  const [name, setName] = useState('Lucía Mamani');
  const [linkNotice, setLinkNotice] = useState(false);
  const profileState = { profile: { display_name: name }, isSaving: false, save: async displayName => {
    setName(displayName); setMode(null); return { data: { display_name: displayName } };
  } };
  return <AuthContext.Provider value={{ profileState }}>
    <ProfileHeader />
    <AccountDetails name={name} email="lucia.mamani@example.test" isAnonymous={false} onEdit={() => setMode('edit')} />
    <p className="ui-kit-muted">Nombre de muestra: {name}. Esta prueba se queda en la galería.</p>
    <div className="ui-kit-inline">
      <Button variant="secondary" compact onClick={() => setMode('required')}>Abrir perfil obligatorio</Button>
      <Button variant="text" compact onClick={() => setMode('edit')}>Editar nombre de muestra</Button>
    </div>
    <ProfileNameSheet open={mode !== null} required={mode === 'required'} initialName={mode === 'edit' ? name : ''} onClose={() => setMode(null)} />
    <AccountLinkCard isAnonymous onLink={() => setLinkNotice(true)} />
    <AccountLinkCard isAnonymous linking />
    <AccountLinkCard isAnonymous error={new AppError('AUTH_LINK_FAILED')} onLink={() => setLinkNotice(true)} />
    <AccountLinkCard isAnonymous={false} email="lucia.mamani@example.test" />
    {linkNotice && <p role="status">Demostración: no se abre Google desde la galería.</p>}
  </AuthContext.Provider>;
}
