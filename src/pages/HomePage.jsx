import { Link } from 'react-router-dom';
import ProfileHeader from '../features/profile/ui/ProfileHeader';
import GoogleAccount from '../features/auth/ui/GoogleAccount';
import AguayoStripe from '../shared/ui/AguayoStripe';
import HomeRooms from '../features/rooms/ui/HomeRooms';

export default function HomePage() {
  return (
    <div className="identity-home"><AguayoStripe /><main className="identity-home__body">
      <ProfileHeader /><p className="identity-home__intro">Organiza el sorteo de tu tanda con tu familia, amigos o trabajo.</p>
        <div className="identity-home__actions">
          <Link className="ui-button ui-button--primary ui-button--full" to="/new">Crear sala</Link>
          <Link className="ui-button ui-button--secondary ui-button--full" to="/join">Unirme con código</Link>
        </div>
      <HomeRooms />
      <footer className="identity-home__footer"><GoogleAccount /></footer>
    </main></div>
  );
}
