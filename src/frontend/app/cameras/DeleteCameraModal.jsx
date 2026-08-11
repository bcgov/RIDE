import { useState } from 'react';
import { createPortal } from 'react-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faXmark, faTrash } from '@fortawesome/pro-regular-svg-icons';
import './DeleteCameraModal.scss';

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

  return createPortal(
    <div className="modal-overlay" onClick={onClose}>
      <div className="delete-camera-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <FontAwesomeIcon icon={faTrash} />
          <h2>Delete camera?</h2>
          <button type="button" onClick={onClose} aria-label="Close">
            <FontAwesomeIcon icon={faXmark} />
          </button>
        </div>

        <p className="modal-question">Are you sure you want to delete this camera?</p>
        <p className="modal-body-text">
          This can not be undone and includes all of the camera's history and
          logs within the Camera Control Panel.
        </p>

        <div className="modal-actions">
          <button
            type="button"
            className="btn-danger"
            onClick={handleDelete}
            disabled={deleting}
          >
            <FontAwesomeIcon icon={faTrash} />
            {deleting ? 'Deleting…' : 'Delete camera'}
          </button>
          <button type="button" className="btn-text" onClick={onClose}>
            Cancel <FontAwesomeIcon icon={faXmark} />
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}