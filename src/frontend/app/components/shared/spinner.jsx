// External imports
import { Transition } from '@headlessui/react';

// Styling
import './spinner.scss';

export default function Spinner({ show = true, size = 'md', label = 'Loading...' }) {
  return (
    <Transition
      show={show}
      enter="spinner-enter"
      enterFrom="spinner-enter-from"
      enterTo="spinner-enter-to"
      leave="spinner-leave"
      leaveFrom="spinner-leave-from"
      leaveTo="spinner-leave-to"
    >
      <div className={`spinner-container spinner-${size}`} role="status">
        <svg className="spinner-icon" viewBox="0 0 24 24" fill="none">
          <circle
            className="spinner-track"
            cx="12" cy="12" r="10"
            stroke="currentColor"
            strokeWidth="3"
          />
          <path
            className="spinner-arc"
            d="M12 2a10 10 0 0 1 10 10"
            stroke="currentColor"
            strokeWidth="3"
            strokeLinecap="round"
          />
        </svg>
        {label && <span className="spinner-label">{label}</span>}
      </div>
    </Transition>
  );
}
