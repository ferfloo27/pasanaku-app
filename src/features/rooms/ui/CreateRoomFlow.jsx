import { useState } from 'react';
import { createRoom } from '../api/createRoomApi';
import CreateRoomForm from './CreateRoomForm';
import RoomReady from './RoomReady';

export default function CreateRoomFlow({ onBack, onEnter }) {
  const [room, setRoom] = useState(null);
  async function submit(values) {
    const { data } = await createRoom(values);
    setRoom(data);
  }
  return room ? <RoomReady room={room} onEnter={onEnter} /> : <CreateRoomForm onSubmit={submit} onBack={onBack} />;
}
