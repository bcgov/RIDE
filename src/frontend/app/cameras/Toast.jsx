// Toast.jsx
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faXmark, faVideo, faVideoSlash, faCircleCheck } from '@fortawesome/pro-regular-svg-icons';
import './Toast.scss';

export default function Toast({ message, variant = 'info', onClose }) {
  // const icon = variant === 'disabled' ? faVideoSlash : faVideo;
  const icon = variant === 'disabled' ? faVideoSlash
    : variant === 'success' ? faCircleCheck
    : faVideo;

  return (
    <div className={`service-request-toast toast--${variant}`}>
      <FontAwesomeIcon icon={icon} />
      <span>{message}</span>
      <button type="button" onClick={onClose} aria-label="Close notification">
        <FontAwesomeIcon icon={faXmark} />
      </button>
    </div>
  );
}