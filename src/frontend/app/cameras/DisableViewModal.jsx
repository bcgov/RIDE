import { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faVideoSlash } from '@fortawesome/pro-regular-svg-icons';

// Components
import Button from '../components/shared/Button.jsx';
import { orientationLabel } from './helpers.js';
import Dialog, { DialogCancel } from '../components/shared/Dialog.jsx';

export default function DisableViewModal({ view, onClose, onConfirm }) {
  const [reason, setReason] = useState('');
  const [shortDescription, setShortDescription] = useState('');
  const [longDescription, setLongDescription] = useState('');
  const [loadingDefaults, setLoadingDefaults] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const fetchDefaults = async () => {
      try {
        const res = await fetch('/api/camera-default-messaging/');
        if (!res.ok) throw new Error(`Failed to load defaults: ${res.status}`);
        const data = await res.json();

        if (!cancelled) {
          setReason(data.disabled_reason_default ?? '');
          setShortDescription(data.disabled_short_description ?? '');
          setLongDescription(data.disabled_long_description ?? '');
        }
      } catch (err) {
        console.error('Could not load default messaging:', err);
      } finally {
        if (!cancelled) setLoadingDefaults(false);
      }
    };

    fetchDefaults();
    return () => {
      cancelled = true;
    };
  }, []);

  const canSubmit =
    reason.trim().length > 0 &&
    shortDescription.trim().length > 0 &&
    longDescription.trim().length > 0 &&
    !submitting;

  const handleDisable = async () => {
    if (!canSubmit) return;

    setSubmitting(true);
    try {
      await onConfirm({
        reason: reason.trim(),
        shortDescription: shortDescription.trim(),
        longDescription: longDescription.trim(),
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog
      icon={faVideoSlash}
      title="Disable view visibility"
      onClose={onClose}
      actions={
        <>
          <Button size="dialog" onClick={handleDisable} disabled={!canSubmit}>
            {submitting ? 'Disabling…' : 'Disable view'}
            <FontAwesomeIcon icon={faVideoSlash} />
          </Button>
          <DialogCancel onClick={onClose} />
        </>
      }
    >
      <div className="ride-dialog__field">
        <p className="ride-dialog__section-title">
          Disabled view is blacked-out on DriveBC:
        </p>
        <p className="ride-dialog__value">{orientationLabel(view?.orientation) || 'Camera'} view</p>
      </div>

      <label className="ride-dialog__field">
        <span className="ride-dialog__label">Reason for disabling</span>
        <input
          type="text"
          className="ride-dialog__input"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Traffic accident"
          disabled={loadingDefaults}
        />
      </label>

      <label className="ride-dialog__field">
        <span className="ride-dialog__label">Short description for disabled view displayed on DriveBC</span>
        <input
          type="text"
          className="ride-dialog__input"
          value={shortDescription}
          onChange={(e) => setShortDescription(e.target.value)}
          disabled={loadingDefaults}
        />
      </label>

      <label className="ride-dialog__field">
        <span className="ride-dialog__label">Long description for the disabled view on DriveBC</span>
        <textarea
          rows={4}
          className="ride-dialog__input"
          value={longDescription}
          onChange={(e) => setLongDescription(e.target.value)}
          disabled={loadingDefaults}
        />
      </label>
    </Dialog>
  );
}

