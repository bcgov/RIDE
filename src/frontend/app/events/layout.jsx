import { NavLink, Outlet } from 'react-router';

import './layout.scss';

export default function Layout() {
  return (
    <div className="events-page">
      <section>
        <Outlet/>
      </section>
    </div>
  );
}
