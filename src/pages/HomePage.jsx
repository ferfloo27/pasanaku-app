import { Link } from 'react-router-dom';
import ProfileHeader from '../features/profile/ui/ProfileHeader';
import GoogleAccount from '../features/auth/ui/GoogleAccount';
import AguayoStripe from '../shared/ui/AguayoStripe';

export default function HomePage() {
  return (
    <div className="identity-home"><AguayoStripe /><main className="identity-home__body">
      <ProfileHeader />
        <div className="identity-home__actions">
          <Link className="ui-button ui-button--primary ui-button--full" to="/new">Crear sala</Link>
          <Link className="ui-button ui-button--secondary ui-button--full" to="/join">Unirme con código</Link>
        </div>
      <footer className="identity-home__footer"><GoogleAccount /></footer>
    </main></div>
  );
}
