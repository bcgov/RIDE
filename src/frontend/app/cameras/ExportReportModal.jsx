import { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faFileLines } from '@fortawesome/pro-regular-svg-icons';
import { Link } from 'react-router';

// Components
import Button from '../components/shared/Button.jsx';
import Dialog, { DialogCancel } from '../components/shared/Dialog.jsx';

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
    <Dialog
      icon={faFileLines}
      title="Export camera report"
      onClose={onClose}
      message
      actions={
        <>
          <Button onClick={handleExport} disabled={submitting}>
            {submitting ? 'Exporting…' : 'Export report'}
            <FontAwesomeIcon icon={faFileLines} />
          </Button>
          <DialogCancel onClick={onClose} />
        </>
      }
    >
      <p className="ride-dialog__text">
        Camera reports are created based on the fields specified on the{' '}
        <Link to="/cameras/settings?setting=report-fields" onClick={onClose}>
          Camera settings - Report fields
        </Link>{' '}
        page.
      </p>
    </Dialog>
  );
}
