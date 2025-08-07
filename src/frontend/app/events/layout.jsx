import { NavLink, Outlet } from 'react-router';

import './events.css';

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
