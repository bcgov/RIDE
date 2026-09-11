// React
import { useEffect, useRef, useState } from 'react';

// Navigation
import { NavLink, Outlet, useSearchParams } from 'react-router';

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faBug } from '@fortawesome/pro-solid-svg-icons';

// Internal imports
import { AlertContext, AuthContext, DebuggingContext } from './contexts';
import { API_HOST, SHOW_DEBUG_CONTROL } from './env.js';
import Alert from "./components/shared/Alert";
import UserNavigation from "./components/shared/UserNavigation";

// Styling
import './layout.scss';

function getInitialDebuggingContext() {
  if (!SHOW_DEBUG_CONTROL) return false;

  return JSON.parse(localStorage.getItem('debugging')) || false;
}

let callingSession = false;
let sessionStateKnown = false;

export default function Layout() {
  /* Setup */
  // Routing
  const [searchParams, setSearchParams] = useSearchParams();

  // Refs
  const isInitialAlertMount = useRef(true);
  const timeout = useRef();

  // States
  const [alertContext, setAlertContext] = useState();
  const [authContext, setAuthContext] = useState(getInitialAuthContext());
  const [debuggingIsOn, setDebuggingIsOn] = useState(getInitialDebuggingContext());

  globalThis.enableDebuging = () => setDebuggingIsOn(true);
  globalThis.disableDebuging = () => setDebuggingIsOn(false);

  // Effects
  useEffect(() => {
    if (isInitialAlertMount.current) {
      isInitialAlertMount.current = false;
      return;
    }

    if (alertContext) {
      // Clear existing close alert timers
      if (timeout.current) {
        clearTimeout(timeout.current);
      }

      // Set new close alert timer to reference
      timeout.current = setTimeout(() => {
        setAlertContext(null);
      }, 5000);
    }

  }, [alertContext]);

  useEffect(() => {
    searchParams.get('inactive') && setAlertContext({
      message: 'Your account has been disabled. Please contact a RIDE administrator for access.'
    });
    setSearchParams({}, { replace: true });
  }, []);

  /* Helpers */
  function getInitialAuthContext() {
    if (!sessionStateKnown && !callingSession) {
      callingSession = true;

      fetch(`${API_HOST}/session`, {
        headers: { 'Accept': 'application/json' },
        credentials: "include",
      }).then((response) => response.json())
        .then((data) => {
          const ret = {
            loginStateKnown: true,
          };
          sessionStateKnown = true;
          if (data.username) {
            ret.username = data.username;
            ret.email = data.email;
            ret.is_superuser = data.is_superuser;
            ret.is_approver = data.is_approver;
            ret.service_areas = Array.isArray(data.service_areas) ? data.service_areas : [];
          }
          setAuthContext((prior) => {
            if (ret.loginStateKnown != prior.loginStateKnown) { return ret; }
            if (ret.username != prior.username) { return ret; }
            if (ret.email != prior.email) { return ret; }
            if (ret.is_superuser != prior.is_superuser) { return ret; }
            if (ret.is_approver != prior.is_approver) { return ret; }
            if ((ret.service_areas || []).join(',') != (prior.service_areas || []).join(',')) { return ret; }
            return prior;
          });
        })
        .finally(() => {
          callingSession = false;
        });
    }

    return { loginStateKnown: false };
  }

  /* Rendering */
  // Main component
  return (
    <>
      <header>
        <NavLink to="/"><img src='/ride-logo.svg'  alt="Government of British Columbia Route Information and Data Entry"/></NavLink>

        {authContext.username &&
          <>
            <NavLink to="/events/">Events</NavLink>

            {authContext.is_superuser &&
              <NavLink to="/users/">Users</NavLink>
            }

            <NavLink to="/segments/">Road Conditions</NavLink>

            {authContext.is_approver &&
              <NavLink to="/chainups/">Chain-Ups</NavLink>
            }
          </>
        }

        {(SHOW_DEBUG_CONTROL || debuggingIsOn) &&
          <div className='right debug-toggle'>
            <button
              className={debuggingIsOn ? 'debugging' : ''}
              aria-label={debuggingIsOn ? 'debug mode on' : 'debug mode off'}
              onClick={() => { localStorage.setItem('debugging', !debuggingIsOn); setDebuggingIsOn(!debuggingIsOn)}}
            ><FontAwesomeIcon icon={faBug} /></button>
          </div>
        }

        <UserNavigation authContext={authContext} />
      </header>

      <main>
        <DebuggingContext value={debuggingIsOn}>
          <AuthContext.Provider value={{authContext, setAuthContext}}>
            <AlertContext value={{alertContext, setAlertContext}}>
              <Outlet />

              <Alert />
            </AlertContext>
          </AuthContext.Provider>
        </DebuggingContext>
      </main>
    </>
  );
}