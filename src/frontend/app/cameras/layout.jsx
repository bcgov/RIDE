import { useContext } from 'react';
import { Navigate, Outlet } from 'react-router';
import { AuthContext } from '../contexts';
import { PageSkeleton } from './CamerasSkeleton.jsx';
import './layout.scss';

export default function Layout() {
  const { authContext } = useContext(AuthContext);

  if (!authContext.loginStateKnown) {
    return <PageSkeleton />;
  }

  if (!authContext.username || !authContext.is_camera_role) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="cameras-page">
      <section>
        <Outlet />
      </section>
    </div>
  );
}