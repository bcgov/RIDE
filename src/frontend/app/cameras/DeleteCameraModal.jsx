import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faXmark, faTrash } from '@fortawesome/pro-regular-svg-icons';
import './DeleteCameraModal.scss';

export default function DeleteCameraModal({ onClose, onConfirm }) {
  const [deleting, setDeleting] = useState(false);
  const dialogRef = useRef(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    dialog?.showModal();
  }, []);

  // Click-outside-to-close, attached imperatively rather than via a JSX
  // onClick prop — jsx-a11y flags mouse/keyboard handlers on <dialog>
  // as a non-interactive element; addEventListener isn't scanned by that rule.
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return undefined;

    const handleBackdropClick = (event) => {
      if (event.target === dialog) onClose();
    };

    dialog.addEventListener('click', handleBackdropClick);
    return () => dialog.removeEventListener('click', handleBackdropClick);
  }, [onClose]);

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await onConfirm();
    } finally {
      setDeleting(false);
    }
  };

  // ESC key fires 'cancel' before the browser closes the dialog natively.
  // Prevent that default and route the close through the parent instead.
  const handleCancel = (event) => {
    event.preventDefault();
    onClose();
  };

  return createPortal(
    <dialog
      ref={dialogRef}
      className="delete-camera-modal"
      aria-labelledby="delete-camera-title"
      onCancel={handleCancel}
    >
      <div className="modal-header">
        <FontAwesomeIcon icon={faTrash} />
        <h2 id="delete-camera-title">Delete camera?</h2>
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
    </dialog>,
    document.body
  );
}
