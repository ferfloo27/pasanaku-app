import { Outlet } from 'react-router-dom';
import AuthProvider from './AuthProvider';
import { RequireSession, RequireProfile } from './guards';

export default function IdentityBoundary() {
  return <AuthProvider><RequireSession><RequireProfile><Outlet /></RequireProfile></RequireSession></AuthProvider>;
}
