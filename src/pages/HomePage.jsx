import { useState } from 'react';
import CreateRoomForm from '../components/CreateRoomForm';
import JoinRoomForm from '../components/JoinRoomForm';
import ProfileHeader from '../features/profile/ui/ProfileHeader';
import GoogleAccount from '../features/auth/ui/GoogleAccount';
import AguayoStripe from '../shared/ui/AguayoStripe';
import Button from '../shared/ui/Button';

export default function HomePage() {
  const [view, setView] = useState(null);
  return (
    <div className="identity-home"><AguayoStripe /><main className="identity-home__body">
      <ProfileHeader />
      {view === null && (
        <div className="identity-home__actions">
          <Button fullWidth onClick={() => setView('create')}>Crear sala</Button>
          <Button variant="secondary" fullWidth onClick={() => setView('join')}>Unirme con código</Button>
        </div>
      )}
      {view === 'create' && <CreateRoomForm onBack={() => setView(null)} />}
      {view === 'join' && <JoinRoomForm onBack={() => setView(null)} />}
      <footer className="identity-home__footer"><GoogleAccount /></footer>
    </main></div>
  );
}
