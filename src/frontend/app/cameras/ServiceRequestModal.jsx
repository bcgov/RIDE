import { useEffect, useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faEnvelope,
  faPaperPlane,
} from '@fortawesome/pro-regular-svg-icons';
import './ServiceRequestModal.scss';
import Button from '../components/shared/Button.jsx';
import Dialog, { DialogCancel } from '../components/shared/Dialog.jsx';
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

  return (
    <Dialog
      icon={faEnvelope}
      title="Camera service request"
      onClose={onClose}
      onSubmit={handleSubmit}
      message
      actions={
        <>
          <Button type="submit">
            Send request
            <FontAwesomeIcon icon={faPaperPlane} />
          </Button>
          <DialogCancel onClick={onClose} />
        </>
      }
    >
      <div className="service-request-fields">
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
          className="ride-dialog__input service-request-subject"
          aria-label="Subject"
          value={subject}
          onChange={(event) => setSubject(event.target.value)}
        />

        <textarea
          className="ride-dialog__input service-request-body"
          aria-label="Message"
          value={body}
          onChange={(event) => setBody(event.target.value)}
        />
      </div>
    </Dialog>
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
            aria-pressed={recipient.enabled}
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