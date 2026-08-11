import { Outlet } from 'react-router';

import './layout.scss';

export default function Layout() {
  return (
    <div className="cameras-page">
      <section>
        <Outlet />
      </section>
    </div>
  );
}