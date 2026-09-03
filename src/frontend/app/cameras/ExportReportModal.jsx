import { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faXmark, faFileLines } from '@fortawesome/pro-regular-svg-icons';
import { Link } from 'react-router';
import './ExportReportModal.scss';

export default function ExportReportModal({ onClose, onConfirm }) {
  const [submitting, setSubmitting] = useState(false);

  const handleExport = async () => {
    setSubmitting(true);
    try {
      await onConfirm();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="export-report-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <FontAwesomeIcon icon={faFileLines} />
          <h2>Export camera report</h2>
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
      </div>
    </div>
  );
}