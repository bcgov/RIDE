import { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faXmark, faVideoSlash } from '@fortawesome/pro-regular-svg-icons';
import './DisableViewModal.scss';

export default function DisableViewModal({ view, camera, onClose, onConfirm }) {
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
    <div className="modal-overlay" onClick={onClose}>
      <div className="disable-view-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <FontAwesomeIcon icon={faVideoSlash} />
          <h2>Disable view visibility</h2>
          <button type="button" onClick={onClose} aria-label="Close">
            <FontAwesomeIcon icon={faXmark} />
          </button>
        </div>

        <p className="modal-subtitle">
          Disabled view is blacked-out on DriveBC:
        </p>
        <h3>{orientationLabelSafe(view)} view</h3>

        <label className="modal-field">
          <span>Reason for disabling</span>
          <input
            type="text"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Traffic accident"
            disabled={loadingDefaults}
          />
        </label>

        <label className="modal-field">
          <span>Short description for disabled view displayed on DriveBC</span>
          <input
            type="text"
            value={shortDescription}
            onChange={(e) => setShortDescription(e.target.value)}
            disabled={loadingDefaults}
          />
        </label>

        <label className="modal-field">
          <span>Long description for the disabled view on DriveBC</span>
          <textarea
            rows={4}
            value={longDescription}
            onChange={(e) => setLongDescription(e.target.value)}
            disabled={loadingDefaults}
          />
        </label>

        <div className="modal-actions">
          <button
            type="button"
            className="btn-primary"
            onClick={handleDisable}
            disabled={!canSubmit}
          >
            <FontAwesomeIcon icon={faVideoSlash} />
            {submitting ? 'Disabling…' : 'Disable view'}
          </button>
          <button type="button" className="btn-text" onClick={onClose}>
            Cancel <FontAwesomeIcon icon={faXmark} />
          </button>
        </div>
      </div>
    </div>
  );
}

function orientationLabelSafe(view) {
  const o = view?.orientation;
  if (!o) return 'Camera';
  return o.charAt(0) + o.slice(1).toLowerCase();
}