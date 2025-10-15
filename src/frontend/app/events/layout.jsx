import { NavLink, Outlet } from 'react-router';

import './events.scss';

export default function Layout() {
  return (
    <div className="events-page">
      <header>
        <input type="text" name="geo-search" />
      </header>
      <section>
        <Outlet/>
      </section>
    </div>
  );
}
