import { NavLink, Outlet } from 'react-router';

export default function Layout() {
  return (
    <>
      <header>
        <NavLink to="/"><img src='/ride-logo.svg' /></NavLink>
        <NavLink to="/events/">Events</NavLink>
        <NavLink to="/cameras/">Cameras</NavLink>
      </header>
      <main>
        <Outlet/>
      </main>
    </>
  );
}