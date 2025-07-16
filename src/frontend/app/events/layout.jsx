import { NavLink, Outlet } from 'react-router';

export default function Layout() {
  return (
    <div className="events-page">
      <header>
        <NavLink to="/events/create">Create Event</NavLink>
        <NavLink to="/events/list">List Events</NavLink>
        <NavLink to="/events/test">Test</NavLink>
      </header>
      <section>
        <Outlet/>
      </section>
    </div>
  );
}
