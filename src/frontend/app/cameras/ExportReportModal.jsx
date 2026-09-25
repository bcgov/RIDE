import { useState, useEffect, useRef } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faXmark, faFileLines } from '@fortawesome/pro-regular-svg-icons';
import { Link } from 'react-router';
import './ExportReportModal.scss';

export default function ExportReportModal({ onClose, onConfirm }) {
  const [submitting, setSubmitting] = useState(false);
  const dialogRef = useRef(null);

  useEffect(() => {
    dialogRef.current?.showModal();
  }, []);

  const handleExport = async () => {
    setSubmitting(true);
    try {
      await onConfirm();
    } finally {
      setSubmitting(false);
    }
  };

  // ESC key fires 'cancel' before the browser closes the dialog natively.
  // Prevent that default and route the close through the parent instead.
  const handleCancel = (event) => {
    event.preventDefault();
    onClose();
  };

  // A click landing on the <dialog> element itself (not a descendant)
  // means it hit the backdrop area — treat that as "close".
  const handleBackdropClick = (event) => {
    if (event.target === dialogRef.current) onClose();
  };

  return (
    <dialog
      ref={dialogRef}
      className="export-report-modal"
      aria-labelledby="export-report-modal-title"
      onCancel={handleCancel}
      onClick={handleBackdropClick}
    >
      <div className="modal-header">
        <FontAwesomeIcon icon={faFileLines} />
        <h2 id="export-report-modal-title">Export camera report</h2>
        <button type="button" onClick={onClose} aria-label="Close">
          <FontAwesomeIcon icon={faXmark} />
        </button>
      </div>

      <p className="modal-body-text">
        Camera reports are created based on the fields specified on the{' '}
        <Link to="/cameras/settings?setting=report-fields" onClick={onClose}>
          Camera settings - Report fields
        </Link>{' '}
        page.
      </p>

      <div className="modal-actions">
        <button
          type="button"
          className="btn-primary"
          onClick={handleExport}
          disabled={submitting}
        >
          <FontAwesomeIcon icon={faFileLines} />
          {submitting ? 'Exporting…' : 'Export report'}
        </button>
        <button type="button" className="btn-text" onClick={onClose}>
          Cancel <FontAwesomeIcon icon={faXmark} />
        </button>
      </div>
    </dialog>
  );
}
