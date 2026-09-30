// Toast.jsx
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faXmark, faVideo, faVideoSlash, faCircleCheck } from '@fortawesome/pro-regular-svg-icons';
import './Toast.scss';

const VARIANT_ICONS = {
  disabled: faVideoSlash,
  success: faCircleCheck,
};

export default function Toast({ message, variant = 'info', onClose }) {
  const icon = VARIANT_ICONS[variant] ?? faVideo;

  return (
    <div className={`ride-toast ride-toast--${variant}`}>
      <FontAwesomeIcon icon={icon} />
      <span>{message}</span>
      <button type="button" onClick={onClose} aria-label="Close notification">
        <FontAwesomeIcon icon={faXmark} />
      </button>
    </div>
  );
}