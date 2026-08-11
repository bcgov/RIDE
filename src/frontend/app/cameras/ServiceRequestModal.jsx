import React, { useEffect, useState, useRef } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faEnvelope,
  faXmark,
  faPaperPlane,
} from '@fortawesome/pro-regular-svg-icons';
import './ServiceRequestModal.scss';
import { API_HOST } from '../env.js';
import { getCookie } from "../shared/helpers.js";

const TO_RECIPIENTS = [
  {
    id: 'moti-jira',
    label: 'MOTI JIRA',
    email: 'jira@example.com',
    enabled: true,
  },
  {
    id: 'camera-program',
    label: 'Camera Program',
    email: 'cameraprogram@gov.bc.ca',
    enabled: true,
  },
  {
    id: 'drivebc-support',
    label: 'DriveBC Support',
    email: 'DriveBC.Support@gov.bc.ca',
    enabled: true,
  },
];

const CC_RECIPIENTS = [
  {
    id: 'its-operations',
    label: 'ITS Operations Team',
    email: 'ELECITS@Victoria1.gov.bc.ca',
    enabled: false,
  },
];

export default function ServiceRequestModal({
  camera,
  onClose,
  onSuccess,
}) {
  const [toRecipients, setToRecipients] =
    useState(TO_RECIPIENTS);

  const [ccRecipients, setCcRecipients] =
    useState(CC_RECIPIENTS);

  const cameraName =
    camera?.title || camera?.road?.name || 'Camera';

  const [subject, setSubject] = useState(
    `[Cameras] Maintenance Alert for ${cameraName}`
  );

  const [body, setBody] = useState(
    `The following camera is experiencing technical problems and may require maintenance.

    Cam(s) affected: ${cameraName}
    Time of outage:
    Symptoms of outage:


    More information about this camera:

    • Camera Control Panel
    • DriveBC`
      );

  const dialogRef = useRef(null);

  useEffect(() => {
    const dialog = dialogRef.current;

    if (dialog && !dialog.open) {
      dialog.showModal();
    }

    return () => {
      if (dialog?.open) {
        dialog.close();
      }
    };
  }, []);

  useEffect(() => {
    setSubject(
      `[Cameras] Maintenance Alert for ${cameraName}`
    );
  }, [cameraName]);

  const toggleRecipient = (id, type) => {
    if (type === 'to') {
      setToRecipients((current) =>
        current.map((recipient) =>
          recipient.id === id
            ? {
                ...recipient,
                enabled: !recipient.enabled,
              }
            : recipient
        )
      );
    }

    if (type === 'cc') {
      setCcRecipients((current) =>
        current.map((recipient) =>
          recipient.id === id
            ? {
                ...recipient,
                enabled: !recipient.enabled,
              }
            : recipient
        )
      );
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    const selectedTo = toRecipients.filter(
      (recipient) => recipient.enabled
    );

    if (selectedTo.length === 0) {
      alert('Please select at least one recipient.');
      return;
    }

    if (!subject.trim()) {
      alert('Please enter a subject.');
      return;
    }

    if (!body.trim()) {
      alert('Please enter a message.');
      return;
    }

    try {
      const response = await fetch(
        `${API_HOST}/api/cameras/${camera.id}/service-request/`,
        {
          method: 'POST',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
            'X-CSRFToken': getCookie('csrftoken'),
          },
          body: JSON.stringify({
            to: selectedTo.map((r) => r.email),
            cc: ccRecipients.filter((r) => r.enabled).map((r) => r.email),
            subject,
            body,
          }),
        }
      );

      if (!response.ok) {
        const errorBody = await response.json().catch(() => null);
        throw new Error(errorBody?.detail || `Failed to send: ${response.status}`);
      }

      onSuccess?.();
      onClose();
    } catch (error) {
      console.error(
        'Failed to send service request:',
        error
      );
    }
  };

  const handleClose = () => {
    const dialog = dialogRef.current;

    if (dialog?.open) {
      dialog.close();
    }

    onClose();
  };

  return (
    <dialog
      ref={dialogRef}
      className="service-request-modal"
      aria-labelledby="service-request-title"
      onCancel={onClose}
    >
        <div className="service-request-modal-header">
          <div className="service-request-modal-title">
            <FontAwesomeIcon icon={faEnvelope} />

            <h2 id="service-request-title">
              Camera service request
            </h2>
          </div>

          <button
            type="button"
            className="service-request-close"
            onClick={handleClose}
            aria-label="Close service request"
          >
            <FontAwesomeIcon icon={faXmark} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="service-request-content">

            <RecipientRow
              label="To"
              recipients={toRecipients}
              type="to"
              onToggle={toggleRecipient}
            />

            <RecipientRow
              label="CC"
              recipients={ccRecipients}
              type="cc"
              onToggle={toggleRecipient}
            />

            <input
              type="text"
              className="service-request-subject"
              value={subject}
              onChange={(event) =>
                setSubject(event.target.value)
              }
            />

            <textarea
              className="service-request-body"
              value={body}
              onChange={(event) =>
                setBody(event.target.value)
              }
            />
          </div>

          <div className="service-request-modal-footer">
            <button
              type="submit"
              className="send-request-button"
            >
              Send request

              <FontAwesomeIcon icon={faPaperPlane} />
            </button>

            <button
              type="button"
              className="cancel-request-button"
              onClick={onClose}
            >
              Cancel

              <FontAwesomeIcon icon={faXmark} />
            </button>
          </div>
        </form>
      
    </dialog>
  );
}


function RecipientRow({
  label,
  recipients,
  type,
  onToggle,
}) {
  return (
    <div className="recipient-row">
      <span className="recipient-label">
        {label}
      </span>

      <div className="recipient-list">
        {recipients.map((recipient) => (
          <button
            key={recipient.id}
            type="button"
            className={`recipient-chip ${
              recipient.enabled
                ? 'recipient-chip--selected'
                : ''
            }`}
            onClick={() =>
              onToggle(recipient.id, type)
            }
          >
            {recipient.label}
          </button>
        ))}
      </div>
    </div>
  );
}