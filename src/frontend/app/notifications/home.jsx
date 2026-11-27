// React
import { useContext, useEffect, useRef, useState } from 'react';
import { useSelector } from 'react-redux';

// Navigation
import { useNavigate } from 'react-router';

// External imports
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCircleCheck, faXmark } from '@fortawesome/pro-regular-svg-icons';

// Internal imports
import { AlertContext, AuthContext } from '../contexts';
import RIDEDropdown from '../components/shared/dropdown.jsx';
import { NotFoundError, rememberReturnPath } from '../shared/helpers';
import {
  createEmailSubscription,
  getEmailSubscriptions,
  patchEmailSubscription,
} from '../shared/data/emailSubscriptions';
import { selectAllServiceAreas, selectServiceAreaStatus } from '../slices/serviceAreas';

import NotificationSettingsForm from './forms/NotificationSettingsForm';
import { getDefaultSettings } from './constants';

// Styling
import './home.scss';

export function meta() {
  return [
    { title: "RIDE Notification settings" },
  ];
}

// Field validation errors from the API say what to change; otherwise retry
function getSaveErrorReasons(error) {
  const reasons = Object.entries(error.data || {})
    .filter(([key]) => !['code', 'detail'].includes(key))
    .flatMap(([, reason]) => reason)
    .filter((reason) => typeof reason === 'string');
  return reasons.length ? reasons.join(' ') : 'Please try again.';
}

// DBC22-7324: a user's email notification settings
export default function NotificationSettings() {
  /* Setup */
  // Navigation
  const navigate = useNavigate();

  /* Hooks */
  // Context
  const { setAlertContext } = useContext(AlertContext);
  const { authContext } = useContext(AuthContext);

  // Refs
  const formRef = useRef();
  const loading = useRef(false);  // load once, though authContext changes

  // States
  const [ subscription, setSubscription ] = useState(null);  // as saved
  const [ enabled, setEnabled ] = useState(false);
  const [ settings, setSettings ] = useState(null);  // form's initial values; null until loaded
  const [ loadError, setLoadError ] = useState(false);
  const [ formKey, setFormKey ] = useState(0);  // resets the form
  const [ saving, setSaving ] = useState(false);

  // Selectors
  const serviceAreas = useSelector(selectAllServiceAreas);
  const serviceAreasStatus = useSelector(selectServiceAreaStatus);
  const hasServiceAreas = (authContext.service_areas || []).length > 0;  // as the menu link
  const areaOptions = serviceAreas
    .filter((area) => (authContext.service_areas || []).includes(area.id))
    .map((area) => ({ id: area.id, name: area.label }));
  // Only areas the user can see in the form, so none are saved unseen
  const userAreaIds = areaOptions.map((area) => area.id);

  // Effects
  useEffect(() => {
    if (!authContext?.loginStateKnown) { return; }

    if (!authContext.username) {
      rememberReturnPath();
      navigate('/');
    }
  }, [authContext]);

  useEffect(() => {
    // Wait for the service areas, which the default settings need
    if (!authContext.username || !areaOptions.length || loading.current) { return; }
    loading.current = true;

    fetchSubscription().then(reset).catch((error) => {
      console.error(error);
      setLoadError(true);
    });
  }, [authContext, areaOptions.length]);

  /* Helpers */
  const fetchSubscription = async () => (await getEmailSubscriptions())[0] || null;

  const reset = (saved) => {
    setSubscription(saved);
    setEnabled(!!saved?.notification);
    setSettings(saved?.notification ? saved : getDefaultSettings(userAreaIds));
    setFormKey((key) => key + 1);
  }

  /* Handlers */
  const toggle = (value) => {
    const on = value === 'Yes';
    if (on && !enabled) {
      // Everything on by default; earlier choices aren't remembered
      setSettings(getDefaultSettings(userAreaIds));
      setFormKey((key) => key + 1);
    }
    setEnabled(on);
  }

  // Created or deleted meanwhile, e.g. in another tab or by an admin: create
  // or update the right one on the next try
  const refreshSubscription = async () => {
    try {
      setSubscription(await fetchSubscription());
    } catch (error) {
      console.error(error);
    }
  }

  const saveFailed = async (error) => {
    console.error(error);
    setAlertContext({ message: `Notification settings could not be saved. ${getSaveErrorReasons(error)}` });

    // Deleted, or created meanwhile, e.g. in another tab
    if (error instanceof NotFoundError || error.data?.code === 'duplicate_subscription') {
      await refreshSubscription();
    }
  }

  const save = async () => {
    if (saving) { return; }
    if (enabled && !formRef.current.validateNotificationSettings()) { return; }
    if (enabled && !authContext.email) {
      setAlertContext({ message: 'An email address is required to receive notifications. Please contact a RIDE administrator.' });
      return;
    }

    const payload = {
      notification: enabled,
      ...(enabled ? formRef.current.getPayload() : {}),
    };

    setSaving(true);
    try {
      // Off with none saved is the default already, unless one was created
      // meanwhile (e.g. in another tab), so check before skipping the save
      const current = !enabled && !subscription ? await fetchSubscription() : subscription;
      if (!enabled && !current) {
        setAlertContext({ type: 'success', message: 'Notification settings successfully saved.' });
        return;
      }

      const saved = current
        ? await patchEmailSubscription(current, payload)
        : await createEmailSubscription(payload);
      reset(saved);
      setAlertContext({ type: 'success', message: 'Notification settings successfully saved.' });

    } catch (error) {
      await saveFailed(error);

    } finally {
      setSaving(false);
    }
  }

  /* Rendering */
  // Main component
  const message = (text) => (
    <div className='notification-settings'>
      <h3>Notification settings</h3>
      <div className='notification-settings-rows'>{text}</div>
    </div>
  );

  if (authContext.loginStateKnown && authContext.username) {
    // Also when none of the user's areas exist any more, e.g. changed since sign in
    const areasLoaded = serviceAreasStatus === 'idle' && serviceAreas.length > 0;
    if (!hasServiceAreas || (areasLoaded && !areaOptions.length)) {
      return message('Email notifications are available once you belong to an organization with service areas.');
    }

    if (loadError || serviceAreasStatus === 'failed') {
      return message('Notification settings could not be loaded. Please reload the page to try again.');
    }

    if (!settings) {
      return message('Loading...');
    }
  }

  return authContext.loginStateKnown && authContext.username && settings && (
    <div className='notification-settings'>
      <h3>Notification settings</h3>

      <div className='notification-settings-rows'>
        <div className='notification-settings-row'>
          <div className='notification-settings-label'>Your email:</div>
          <div className='notification-settings-email'>{authContext.email}</div>
          <div className='notification-settings-email-hint'>(tied to the IDIR or BCeID you used to login)</div>
        </div>

        <RIDEDropdown
          label='Email notifications:'
          extraClasses='notification-settings-field notification-settings-toggle'
          items={['No', 'Yes']}
          value={enabled ? 'Yes' : 'No'}
          disabled={saving}
          handler={toggle} />

        { enabled &&
          <NotificationSettingsForm
            key={formKey}
            ref={formRef}
            settings={settings}
            areaOptions={areaOptions}
            disabled={saving} />
        }
      </div>

      <div className='notification-settings-actions'>
        <button type='button' className='ride-primary-btn' onClick={save} disabled={saving}>
          <FontAwesomeIcon icon={faCircleCheck} />
          Save
        </button>

        <button type='button' className='ride-cancel-btn' onClick={() => reset(subscription)} disabled={saving}>
          <FontAwesomeIcon icon={faXmark} />
          Cancel
        </button>
      </div>
    </div>
  );
}
