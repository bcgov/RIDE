import { createContext, useContext, useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faXmark } from '@fortawesome/pro-regular-svg-icons';
import { faXmark as faXmarkBold } from '@fortawesome/pro-solid-svg-icons';

// Components
import Button from './Button.jsx';

// Styling
import './Dialog.scss';

// Lets the buttons inside a dialog close it with the exit animation
const DialogContext = createContext(null);

// Figma: "Modal - *". A native <dialog> with the themed header (circled icon,
// title, close button) and a padded content area.
//   icon      Font Awesome icon shown in the header circle
//   title     heading text
//   onClose   called for the close button, Escape and a click on the backdrop, once the dialog
//             has animated out. A dialog the parent unmounts itself closes without the animation.
//   actions   footer buttons, e.g. a primary Button followed by a tertiary Cancel
//   onSubmit  renders the content as a <form>, so a submit button can send it
//   message   text-only dialog: wider gap before the actions
export default function Dialog(props) {
  /* Setup */
  // Props
  const { icon, title, onClose, actions, onSubmit, message, className, children } = props;

  // Refs
  const dialogRef = useRef(null);
  const titleId = useId();

  // States
  const [isClosing, setIsClosing] = useState(false);

  // The parent hears about the close when the exit animation ends
  const requestClose = () => setIsClosing(true);

  /* Hooks */
  // Effects
  useEffect(() => {
    const dialog = dialogRef.current;
    if (dialog && !dialog.open) {
      dialog.showModal();
      dialog.focus(); // start at the dialog, not on the close button's focus ring
    }
  }, []);

  // Click-outside-to-close, attached imperatively rather than via a JSX
  // onClick prop — jsx-a11y flags mouse/keyboard handlers on <dialog>
  // as a non-interactive element; addEventListener isn't scanned by that rule.
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return undefined;

    const handleBackdropClick = (event) => {
      if (event.target === dialog) setIsClosing(true);
    };

    dialog.addEventListener('click', handleBackdropClick);
    return () => dialog.removeEventListener('click', handleBackdropClick);
  }, []);

  /* Handlers */
  // ESC key fires 'cancel' before the browser closes the dialog natively.
  // Prevent that default and route the close through the parent instead.
  const handleCancel = (event) => {
    event.preventDefault();
    requestClose();
  };

  const handleAnimationEnd = (event) => {
    if (isClosing && event.target === event.currentTarget) onClose();
  };

  /* Rendering */
  // Main Component
  const Content = onSubmit ? 'form' : 'div';
  const classes = ['ride-dialog', message && 'ride-dialog--message', isClosing && 'is-closing', className]
    .filter(Boolean).join(' ');

  return createPortal(
    <DialogContext value={requestClose}>
    <dialog
      ref={dialogRef}
      className={classes}
      aria-labelledby={titleId}
      onCancel={handleCancel}
      onAnimationEnd={handleAnimationEnd}
      tabIndex={-1}
    >
      <header className="ride-dialog__header">
        <span className="ride-dialog__icon">
          <FontAwesomeIcon icon={icon} />
        </span>
        <h2 id={titleId} className="ride-dialog__title">{title}</h2>
        <button type="button" className="ride-dialog__close" onClick={requestClose} aria-label="Close">
          <FontAwesomeIcon icon={faXmarkBold} />
        </button>
      </header>

      <Content className="ride-dialog__content" {...(onSubmit && { onSubmit })}>
        {children}
        {actions && <div className="ride-dialog__actions">{actions}</div>}
      </Content>
    </dialog>
    </DialogContext>,
    document.body
  );
}

// Figma: the plain "Cancel" that follows a dialog's main action
export function DialogCancel({ onClick }) {
  const requestClose = useContext(DialogContext);

  return (
    <Button variant="tertiary" size="dialog" onClick={requestClose ?? onClick}>
      Cancel
      <FontAwesomeIcon icon={faXmark} />
    </Button>
  );
}
