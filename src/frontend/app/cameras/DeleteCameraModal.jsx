import { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTrashCan } from '@fortawesome/pro-regular-svg-icons';

// Components
import Button from '../components/shared/Button.jsx';
import Dialog, { DialogCancel } from '../components/shared/Dialog.jsx';

export default function DeleteCameraModal({ onClose, onConfirm }) {
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await onConfirm();
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Dialog
      icon={faTrashCan}
      title="Delete camera?"
      onClose={onClose}
      message
      actions={
        <>
          <Button variant="danger" filled onClick={handleDelete} disabled={deleting}>
            {deleting ? 'Deleting…' : 'Delete camera'}
            <FontAwesomeIcon icon={faTrashCan} />
          </Button>
          <DialogCancel onClick={onClose} />
        </>
      }
    >
      <div>
        <p className="ride-dialog__text">Are you sure you want to delete this camera?</p>
        <p className="ride-dialog__text">
          This can not be undone and includes all of the camera&apos;s history and
          logs within the Camera Control Panel.
        </p>
      </div>
    </Dialog>
  );
}
