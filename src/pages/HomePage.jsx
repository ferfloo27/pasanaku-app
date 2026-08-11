import { useState } from 'react';
import CreateRoomForm from '../components/CreateRoomForm';
import JoinRoomForm from '../components/JoinRoomForm';

export default function HomePage() {
  const [view, setView] = useState(null);
  return (
    <main>
      {view === null && (
        <>
          <button onClick={() => setView('create')}>Crear sala</button>
          <button onClick={() => setView('join')}>Unirse a sala</button>
        </>
      )}
      {view === 'create' && <CreateRoomForm onBack={() => setView(null)} />}
      {view === 'join' && <JoinRoomForm onBack={() => setView(null)} />}
    </main>
  );
}
