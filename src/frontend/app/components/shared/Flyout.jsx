import { Link } from 'react-router';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowUpRightFromSquare } from '@fortawesome/pro-regular-svg-icons';

// Styling
import './Flyout.scss';

// Figma: "flyout". Opens below its trigger, aligned to the right edge; the
// trigger's wrapper needs `position: relative`.
export default function Flyout({ children }) {
  return <div className="ride-flyout">{children}</div>;
}

// A group of items with an optional title (Figma: "Actions", "External links", "More")
export function FlyoutSection({ title, children }) {
  return (
    <div className="ride-flyout__section">
      {title && <span className="ride-flyout__title">{title}</span>}
      <ul className="ride-flyout__list">{children}</ul>
    </div>
  );
}

// Figma: "Navigation / Item with icon". The element follows what the item does:
//   to     navigates within the app  -> router link
//   href   goes to another address   -> anchor (external: also opens a new tab and shows the icon)
//   neither runs an action (onClick) -> button
export function FlyoutItem(props) {
  /* Setup */
  // Props
  const { to, href, external, icon, children, ...rest } = props;

  // Misc
  let Tag = 'button';
  let elementProps = { type: 'button' };

  if (to) {
    Tag = Link;
    elementProps = { to };
  } else if (href) {
    Tag = 'a';
    elementProps = { href, ...(external && { target: '_blank', rel: 'noopener noreferrer' }) };
  }

  /* Rendering */
  // Main Component
  return (
    <li>
      <Tag className="ride-flyout__item" {...elementProps} {...rest}>
        {icon && <span className="ride-flyout__icon">{icon}</span>}
        {children}
        {external && <FontAwesomeIcon icon={faArrowUpRightFromSquare} className="ride-flyout__external" />}
      </Tag>
    </li>
  );
}
