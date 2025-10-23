// React
import React, { useState } from 'react';

// External imports
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCheckCircle, faXmark } from '@fortawesome/pro-regular-svg-icons';

// Styling
import './modal.scss';

export default function RIDEModal(props) {
  /* Setup */
  // Props
  const { title, children, openButton } = props

  /* Hooks */
  // States
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  /* Handlers */
  const handleConfirm = () => {
    setSubmitting(true);
  };

  /* Rendering */
  // Main component
  return (
    <div className="modal-root">
      {openButton &&
        React.cloneElement(openButton, {
          onClick: () => setOpen(true),
          className: [
            openButton.props.className,
            'modal-open-btn'
          ].filter(Boolean).join(' ')
        })
      }

      {open && (
        <div className="modal-dialog">
          <div className="modal-backdrop" onClick={() => setOpen(false)} />
          <div className="modal-outer">
            <div className="modal-center">
              <div className="modal-panel" role="dialog" aria-modal="true">
                <div className="modal-content">
                  <div className="modal-header">
                    <div className="modal-title-container">
                      <p className="modal-title">{title}</p>
                    </div>
                  </div>
                  <div className="modal-body p-2">
                    <div className="modal-body p-2">
                      {React.Children.map(children, child =>
                        React.cloneElement(child, { submitting: submitting, setSubmitting: setSubmitting, setOpen: setOpen })
                      )}
                    </div>
                  </div>
                </div>

                <div className="modal-actions">
                  <button
                    type="button"
                    onClick={handleConfirm}
                    onKeyDown={(keyEvent) => {
                      if (['Enter', 'NumpadEnter'].includes(keyEvent.key)) {
                        handleConfirm();
                      }
                    }}
                    className="modal-deactivate-btn">
                    <FontAwesomeIcon icon={faCheckCircle} />
                    Confirm
                  </button>

                  <button
                    type="button"
                    onClick={() => setOpen(false)}
                    onKeyDown={(keyEvent) => {
                      if (['Enter', 'NumpadEnter'].includes(keyEvent.key)) {
                        setOpen(false);
                      }
                    }}
                    className="modal-cancel-btn">
                    <FontAwesomeIcon icon={faXmark} />
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
