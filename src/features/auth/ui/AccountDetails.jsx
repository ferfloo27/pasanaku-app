import Avatar from '../../../shared/ui/Avatar';
import Card from '../../../shared/ui/Card';
import Button from '../../../shared/ui/Button';
import './identity.css';

export default function AccountDetails({ name, email, isAnonymous, onEdit }) {
  return <Card className="account-details">
    <div className="account-details__identity"><Avatar name={name} variant="solid" /><div>
      <h2>{name}</h2><span>{isAnonymous ? 'Invitado' : 'Cuenta de Google'}</span>
    </div></div>
    <dl><div><dt>Nombre en Pasanaku</dt><dd>{name}</dd></div>
      {!isAnonymous && <div><dt>Correo de Google</dt><dd>{email}</dd></div>}
    </dl>
    <Button variant="secondary" fullWidth onClick={onEdit}>Editar tu nombre</Button>
    <p>El nombre se usará en las salas a las que entres desde ahora.</p>
  </Card>;
}
