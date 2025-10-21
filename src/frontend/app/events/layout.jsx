import { NavLink, Outlet } from 'react-router';

import './events.scss';

export default function Layout() {
  return (
    <div className="events-page">
      <section>
        <Outlet/>
      </section>
    </div>
  );
}
