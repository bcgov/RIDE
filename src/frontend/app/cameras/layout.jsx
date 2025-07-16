import { NavLink, Outlet } from 'react-router';

export default function Layout() {
  return (
    <>
      <header>
        <NavLink to="/cameras/list">List Cameras</NavLink>
        <NavLink to="/cameras/test">Test</NavLink>
      </header>
      <section>
        <Outlet/>
      </section>
    </>
  );
}
