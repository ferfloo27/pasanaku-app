import { lazy, Suspense } from 'react';
import { Routes, Route } from 'react-router-dom';
import Spinner from '../shared/ui/Spinner';

const HomePage = lazy(() => import('../pages/HomePage'));
const NewRoomPage = lazy(() => import('../pages/NewRoomPage'));
const JoinPage = lazy(() => import('../pages/JoinPage'));
const RoomPage = lazy(() => import('../pages/RoomPage'));
const IdentityBoundary = lazy(() => import('./IdentityBoundary'));
const UiKitPage = import.meta.env.DEV ? lazy(() => import('../pages/UiKitPage')) : null;

export default function AppRoutes() {
  return <Suspense fallback={<div className="ui-app-loading"><Spinner label="Cargando página…" /></div>}>
    <Routes>
      <Route element={<IdentityBoundary />}>
        <Route path="/" element={<HomePage />} />
        <Route path="/new" element={<NewRoomPage />} />
        <Route path="/join" element={<JoinPage />} />
        <Route path="/room/:code" element={<RoomPage />} />
      </Route>
      {import.meta.env.DEV && <Route path="/dev/ui" element={<UiKitPage />} />}
    </Routes>
  </Suspense>;
}
