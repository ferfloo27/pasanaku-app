import { Link } from 'react-router-dom';
import { useProfile } from '../hooks/useProfile';
import Avatar from '../../../shared/ui/Avatar';
import './profile.css';

export default function ProfileHeader() {
  const { profile } = useProfile();
  return <header className="profile-header"><div><span>Pasanaku</span><h1>Hola, {profile.display_name}</h1></div>
    <Link className="profile-avatar" to="/account" aria-label="Mi cuenta"><Avatar name={profile.display_name} /></Link>
  </header>;
}
