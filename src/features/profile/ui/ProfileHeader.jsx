import { useState } from 'react';
import { useProfile } from '../hooks/useProfile';
import IconButton from '../../../shared/ui/IconButton';
import Icon from '../../../shared/ui/Icon';
import ProfileNameSheet from './ProfileNameSheet';
import './profile.css';

export default function ProfileHeader() {
  const { profile } = useProfile();
  const [editing, setEditing] = useState(false);
  return <>
    <header className="profile-header"><div><span>Pasanaku</span><h1>Hola, {profile.display_name}</h1></div>
      <IconButton label="Editar tu nombre" onClick={() => setEditing(true)}><Icon name="edit" /></IconButton>
    </header>
    <ProfileNameSheet open={editing} initialName={profile.display_name} onClose={() => setEditing(false)} />
  </>;
}
