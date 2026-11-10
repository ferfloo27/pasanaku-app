import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Spinner from '../shared/ui/Spinner';

const HomePage = lazy(() => import('../pages/HomePage'));
const RoomPage = lazy(() => import('../pages/RoomPage'));
const IdentityBoundary = lazy(() => import('./IdentityBoundary'));
const UiKitPage = import.meta.env.DEV ? lazy(() => import('../pages/UiKitPage')) : null;

export default function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={<div className="ui-app-loading"><Spinner label="Cargando página…" /></div>}><Routes>
        <Route element={<IdentityBoundary />}>
          <Route path="/" element={<HomePage />} />
          <Route path="/room/:code" element={<RoomPage />} />
        </Route>
        {import.meta.env.DEV && <Route path="/dev/ui" element={<UiKitPage />} />}
      </Routes></Suspense>
    </BrowserRouter>
  );
}
