// React
import { useContext, useEffect } from 'react';

// Navigation
import { useNavigate } from 'react-router';

// Internal imports
import { ALLOW_LOCAL_ACCOUNTS, API_HOST, DEBUG } from '../env.js';
import { AuthContext } from '../contexts';
import { getCookie } from "../shared/helpers";
import { handleFormSubmit } from "../shared/handlers";

// Styling
import './home.scss';

export function meta() {
  return [
    { title: "RIDE - Route Information and Data Entry" },
  ];
}

export default function Home() {
  /* Setup */
  // Navigation
  const navigate = useNavigate();

  /* Hooks */
  // Context
  const { authContext } = useContext(AuthContext);

  // Effects
  useEffect(() => {
    if (!authContext) { return; }

    if (authContext.loginStateKnown && authContext.username) {
      // Redirect to events page if logged in
      navigate('/events/');
    }
  }, [authContext]);

  /* Rendering */
  // Main component
  return authContext.loginStateKnown && !authContext.username && (
    <div className={'homepage'}>
      <h1>Welcome to the Route Information and Data Entry (RIDE) site</h1>

      <div className={'login-container'}>
        <div className={'login-options'}>
          <p><b>Existing RIDE users</b></p>
          <p>Existing RIDE users can login using their IDIR or BCeID:</p>

          <form
            className={'sign-in-button'}
            method='post'
            action={`${API_HOST}/accounts/oidc/idir/login/`}
            onSubmit={handleFormSubmit}>

            <input type='hidden' name='csrfmiddlewaretoken' value={getCookie('csrftoken')} />
            <input type='hidden' name='next' value={globalThis.location.href} />
            <button type='submit' autoFocus={true}>Sign-in with IDIR</button>
          </form>

          <form
            className={'sign-in-button'}
            method='post'
            action={`${API_HOST}/accounts/oidc/bceid/login/`}
            onSubmit={handleFormSubmit}>

            <input type='hidden' name='csrfmiddlewaretoken' value={getCookie('csrftoken')} />
            <input type='hidden' name='next' value={globalThis.location.href} />
            <button type='submit' autoFocus={true}>Sign-in with BCeID</button>
          </form>

          {DEBUG && ALLOW_LOCAL_ACCOUNTS &&
            <form
              className={'sign-in-button'}
              method='post'
              action={`${API_HOST}/accounts/login/`}
              onSubmit={handleFormSubmit}>

              <input type='hidden' name='csrfmiddlewaretoken' value={getCookie('csrftoken')} />
              <input type='hidden' name='next' value={globalThis.location.href} />
              <button type='submit' autoFocus={true}>Dev Sign-in with Django</button>
            </form>
          }
        </div>

        <div className={'login-access'}>
          <p><b>Don’t have access to RIDE?</b></p>
          <p>To get access to RIDE you must have a BC Government IDIR or a <a href='https://www.bceid.ca/'>BCeID</a>.</p>
          <p>Once you have an IDIR or BCeID you’ll need to request access to RIDE by contacting <a href={'mailto:ride.support@gov.bc.ca'}>ride.support@gov.bc.ca</a>.</p>
        </div>
      </div>

      <div className={'help-container'}>
        <div className={'help-idir'}>
          <p><b>Need help with IDIR?</b></p>
          <p>
            IDIR users who have registered for MFA may reset their password via <a href={'https://aka.ms/sspr/'}>Self Service
            Password Reset</a>.
            If you are not MFA registered, or require additional assistance, please contact your IDIR security
            administrator or the OCIO IT Service Desk at:

            <br/>Phone: <a href={'tel:+12503877000'}>250-387-7000</a>
            <br/>Email: <a href={'mailto:77000@gov.bc.ca'}>77000@gov.bc.ca</a>
          </p>
        </div>

        <div className={'help-bceid'}>
          <p><b>Need help with BCeID?</b></p>
          <a href={'https://www.bceid.ca/aboutbceid/contact_us.aspx'}>Contact the BCeID Help Desk</a>
        </div>
      </div>
    </div>
  );
}
