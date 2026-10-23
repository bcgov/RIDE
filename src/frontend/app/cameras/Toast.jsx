// Toast.jsx
import { useEffect, useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faXmark, faVideo, faVideoSlash, faCircleCheck } from '@fortawesome/pro-regular-svg-icons';
import './Toast.scss';

const VARIANT_ICONS = {
  disabled: faVideoSlash,
  success: faCircleCheck,
};

// The pages dismiss a toast 4 seconds after it appears. The exit animation starts a little
// earlier, so it has finished by then.
const EXIT_LEAD_MS = 200;
const VISIBLE_MS = 4000;

// onClose is called once the toast has animated out, for the close button and the timeout alike.
export default function Toast({ message, variant = 'info', onClose }) {
  const icon = VARIANT_ICONS[variant] ?? faVideo;
  const [isClosing, setIsClosing] = useState(false);

  // A new message restarts the toast
  useEffect(() => {
    setIsClosing(false);
    const timer = window.setTimeout(() => setIsClosing(true), VISIBLE_MS - EXIT_LEAD_MS);
    return () => window.clearTimeout(timer);
  }, [message, variant]);

  const handleAnimationEnd = (event) => {
    if (isClosing && event.target === event.currentTarget) onClose();
  };

  return (
    <div
      className={`ride-toast ride-toast--${variant}${isClosing ? ' is-closing' : ''}`}
      onAnimationEnd={handleAnimationEnd}
    >
      <FontAwesomeIcon icon={icon} />
      <span>{message}</span>
      <button type="button" onClick={() => setIsClosing(true)} aria-label="Close notification">
        <FontAwesomeIcon icon={faXmark} />
      </button>
    </div>
  );
}