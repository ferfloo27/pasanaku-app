import { useState } from 'react';
import CreateRoomForm from '../features/rooms/ui/CreateRoomForm';
import RoomReady from '../features/rooms/ui/RoomReady';
import JoinCodeForm from '../features/rooms/ui/JoinCodeForm';
import RoomCard from '../features/rooms/ui/RoomCard';
import RoomPreview from '../features/rooms/ui/RoomPreview';
import EmptyState from '../shared/ui/EmptyState';
import Button from '../shared/ui/Button';
import { AppError } from '../shared/errors/appError';
import { AuthContext } from '../app/authContext';
import ProfileNameSheet from '../features/profile/ui/ProfileNameSheet';
import '../features/auth/ui/identity.css';

const sample = { id: 'sample', name: 'Pasanaku Familia Mamani', code: 'K7QM3P', contribution_bs: 200, frequency: 'monthly', start_date: '2027-01-01', max_participants: 30, participant_count: 8, host_name: 'Rosa Mamani', status: 'waiting', is_host: true };

// Se importa exclusivamente desde la ruta de desarrollo. No accede a APIs.
export default function RoomsPreview() {
  const [view, setView] = useState('home');
  const [room, setRoom] = useState(sample);
  const [name, setName] = useState('Lucía Mamani');
  const [editing, setEditing] = useState(false);
  return <AuthContext.Provider value={{ profileState: { isSaving: false, save: async value => { setName(value); return { data: { display_name: value } }; } } }}><div className="identity-home"><main className={view === 'preview' ? 'room-entry' : 'identity-home__body'}>
    <p>Vista de muestra · sin conexión a Supabase</p>
    <nav className="ui-kit-inline" aria-label="Pantallas de muestra">
      <Button compact variant="text" onClick={() => setView('home')}>Inicio</Button>
      <Button compact variant="text" onClick={() => setView('create')}>Crear</Button>
      <Button compact variant="text" onClick={() => setView('join')}>Unirse</Button>
      <Button compact variant="text" onClick={() => { setRoom(sample); setView('ready'); }}>Sala lista</Button>
      <Button compact variant="text" onClick={() => { setRoom(sample); setView('preview'); }}>Vista previa</Button>
    </nav>
    {view === 'home' && <><h1>Hola, Lucía</h1><h2>Tus salas</h2><RoomCard room={sample} /><RoomCard room={{ ...sample, id: 'drawn', name: 'Amigas del cole', status: 'drawn', is_host: false }} /><EmptyState /></>}
    {view === 'create' && <CreateRoomForm onBack={() => setView('home')} onSubmit={async values => {
      setRoom({ ...sample, name: values.name.trim(), contribution_bs: Number(values.contributionBs), frequency: values.frequency, start_date: values.frequency === 'monthly' ? `${values.startDate}-01` : values.startDate, max_participants: Number(values.maxParticipants) });
      setView('ready');
    }} />}
    {view === 'ready' && <RoomReady room={room} onEnter={() => setView('home')} />}
    {view === 'join' && <JoinCodeForm onSearch={async code => { if (code !== sample.code) throw new AppError('ROOM_NOT_FOUND'); setRoom(sample); setView('preview'); }} />}
    {view === 'preview' && <><RoomPreview room={room} displayName={name} onChangeName={() => setEditing(true)} onCancel={() => setView('home')} onJoin={() => setView('home')} />
      <div><Button variant="text" onClick={() => setRoom({ ...sample, status: 'drawn' })}>Ver sorteada</Button><Button variant="text" onClick={() => setRoom({ ...sample, status: 'cancelled' })}>Ver cancelada</Button><Button variant="text" onClick={() => setRoom({ ...sample, participant_count: 30 })}>Ver llena</Button></div></>}
    <ProfileNameSheet open={editing} initialName={name} onClose={() => setEditing(false)} />
  </main></div></AuthContext.Provider>;
}
