// React
import { forwardRef, useImperativeHandle, useState } from 'react';

// Internal imports
import RIDECheckBoxes from '../../components/shared/checkboxes.jsx';
import RIDEDropdown from '../../components/shared/dropdown.jsx';
import {
  CREATOR_OPTIONS,
  EVENT_TYPE_OPTIONS,
  SEVERITY_EVENT_TYPES,
  SEVERITY_OPTIONS,
  STATUS_OPTIONS,
} from '../constants';

// DBC22-7324: notification filters, following DBC's NotificationEventType form
// (validate and getPayload through a ref) on RIDE's checkbox and dropdown components
const NotificationSettingsForm = forwardRef((props, ref) => {
  /* Setup */
  // Props
  const { settings, areaOptions, disabled } = props;  // disabled while saving

  // States
  const [ areas, setAreas ] = useState(settings.notification_areas || []);
  const [ types, setTypes ] = useState(settings.notification_types || []);
  const [ severities, setSeverities ] = useState(settings.notification_severities || []);
  const [ statuses, setStatuses ] = useState(settings.notification_statuses || []);
  const [ creator, setCreator ] = useState(settings.notification_creator || 'all');
  const [ errors, setErrors ] = useState({});

  const needsSeverity = types.some((type) => SEVERITY_EVENT_TYPES.includes(type));

  // A change clears its field's error (and severities', which depend on types)
  const clearingErrors = (setter, ...keys) => (value) => {
    setter(value);
    setErrors((prior) => Object.fromEntries(Object.entries(prior).filter(([key]) => !keys.includes(key))));
  };

  /* Helpers */
  useImperativeHandle(ref, () => ({
    validateNotificationSettings() {
      const newErrors = {};
      if (!areas.length) {
        newErrors.areas = 'At least one service area must be selected.';
      }
      if (!types.length) {
        newErrors.types = 'At least one event type must be selected.';
      }
      if (needsSeverity && !severities.length) {
        newErrors.severities = 'At least one event severity must be selected.';
      }
      if (!statuses.length) {
        newErrors.statuses = 'At least one event status must be selected.';
      }

      setErrors(newErrors);
      return Object.keys(newErrors).length === 0;
    },

    getPayload() {
      return {
        notification_areas: areas,
        notification_types: types,
        notification_severities: severities,
        notification_statuses: statuses,
        notification_creator: creator,
      };
    }
  }));

  /* Rendering */
  // Sub components
  const error = (key) => errors[key] && <div className='notification-settings-error'>{errors[key]}</div>;

  // Main component
  return (
    <>
      <RIDECheckBoxes
        label='Service areas:'
        extraClasses='notification-settings-checklist'
        itemsList={areaOptions}
        itemsState={areas}
        disabled={disabled}
        setItemsState={clearingErrors(setAreas, 'areas')} />
      {error('areas')}

      <RIDECheckBoxes
        label='Event types:'
        extraClasses='notification-settings-checklist'
        itemsList={EVENT_TYPE_OPTIONS}
        itemsState={types}
        disabled={disabled}
        setItemsState={clearingErrors(setTypes, 'types', 'severities')} />
      {error('types')}

      <RIDECheckBoxes
        label='Event severities:'
        extraClasses='notification-settings-checklist'
        itemsList={SEVERITY_OPTIONS}
        itemsState={severities}
        disabled={disabled}
        setItemsState={clearingErrors(setSeverities, 'severities')} />
      {error('severities')}

      <RIDECheckBoxes
        label='Event statuses:'
        extraClasses='notification-settings-checklist'
        itemsList={STATUS_OPTIONS}
        itemsState={statuses}
        disabled={disabled}
        setItemsState={clearingErrors(setStatuses, 'statuses')} />
      {error('statuses')}

      <RIDEDropdown
        label={<>Event creator:<span className='notification-settings-hint'>(Follows rules above)</span></>}
        extraClasses='notification-settings-field notification-settings-creator'
        items={CREATOR_OPTIONS}
        value={CREATOR_OPTIONS.find((option) => option.id === creator)}
        disabled={disabled}
        handler={(option) => setCreator(option.id)} />
    </>
  );
});

NotificationSettingsForm.displayName = 'NotificationSettingsForm';

export default NotificationSettingsForm;
