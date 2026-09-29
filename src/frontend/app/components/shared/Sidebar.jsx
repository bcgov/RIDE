import { Children, useState, useId } from 'react';
import { Link } from 'react-router';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faChevronLeft, faMagnifyingGlass, faXmark } from '@fortawesome/pro-regular-svg-icons';
import { faChevronDown, faChevronUp, faMinus, faPlus } from '@fortawesome/pro-solid-svg-icons';

import Button from './Button.jsx';

// Styling
import './Sidebar.scss';

// Page layout shared by every screen with a sidebar (Figma: sidebar frame + content frame).
// The sidebar is flush left and full height, the content card sits directly against it.
export function SidebarLayout({ sidebar, children }) {
  return (
    <div className="ride-sidebar-layout">
      {sidebar}
      <div className="ride-sidebar-layout__content">{children}</div>
    </div>
  );
}

// Figma: "Sidebar / Navigation and Filter". The header is either a title (with an
// optional clear button) or, when `backTo` is set, a back link.
export default function Sidebar(props) {
  /* Setup */
  // Props
  const { title, backTo, backLabel = 'Back to cameras', onClear, clearLabel = 'Clear all', extraClasses, children } = props;

  /* Rendering */
  // Main Component
  return (
    <aside className={`ride-sidebar ${extraClasses || ''}`}>
      <div className={`ride-sidebar__header${backTo ? ' ride-sidebar__header--back' : ''}`}>
        {backTo ? (
          <Button as={Link} variant="link" to={backTo}>
            <FontAwesomeIcon icon={faChevronLeft} />
            {backLabel}
          </Button>
        ) : (
          <h2 className="ride-sidebar__title">{title}</h2>
        )}

        {onClear &&
          <button type="button" className="ride-sidebar__clear" onClick={onClear}>
            <FontAwesomeIcon icon={faXmark} />
            <span>{clearLabel}</span>
          </button>
        }
      </div>

      {children}
    </aside>
  );
}

// Figma: "Form / Field (Text and Dropdowns)" inside the sidebar
export function SidebarSearch(props) {
  /* Setup */
  // Props
  const { value, onChange, label, placeholder = 'Search' } = props;

  /* Rendering */
  // Main Component
  return (
    <div className="ride-sidebar-search">
      <input
        type="text"
        className="ride-sidebar-search__input"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-label={label || placeholder} />

      <FontAwesomeIcon icon={faMagnifyingGlass} className="ride-sidebar-search__icon" />
    </div>
  );
}

// Groups the sidebar's accordions and links (Figma: "Navigation items")
export function SidebarNav({ children }) {
  return <nav className="ride-sidebar-nav">{children}</nav>;
}

// Figma: "Navigation / Multi-level accordion". A top-level row that opens a set of
// accordions. Uncontrolled unless `open` is passed.
export function SidebarGroup(props) {
  /* Setup */
  // Props
  const { title, open, defaultOpen = true, onToggle, children } = props;

  // States
  const [innerOpen, setInnerOpen] = useState(defaultOpen);

  // Misc
  const bodyId = useId();
  const isOpen = open ?? innerOpen;

  // Handlers
  const toggle = () => {
    setInnerOpen(!isOpen);
    onToggle?.(!isOpen);
  };

  /* Rendering */
  // Main Component
  return (
    <div className="ride-sidebar-group">
      <button
        type="button"
        className="ride-sidebar-group__header"
        aria-expanded={isOpen}
        aria-controls={bodyId}
        onClick={toggle}>
        <span>{title}</span>
        <FontAwesomeIcon icon={isOpen ? faMinus : faPlus} />
      </button>

      {isOpen && Children.count(children) > 0 &&
        <div id={bodyId} className="ride-sidebar-group__body">{children}</div>
      }
    </div>
  );
}

// Figma: "Navigation / Accordion". Uncontrolled unless `open` is passed.
export function SidebarAccordion(props) {
  /* Setup */
  // Props
  const { title, open, defaultOpen = true, onToggle, children } = props;

  // States
  const [innerOpen, setInnerOpen] = useState(defaultOpen);

  // Misc
  const listId = useId();
  const isOpen = open ?? innerOpen;

  // Handlers
  const toggle = () => {
    setInnerOpen(!isOpen);
    onToggle?.(!isOpen);
  };

  /* Rendering */
  // Main Component
  return (
    <div className="ride-sidebar-accordion">
      <button
        type="button"
        className="ride-sidebar-accordion__header"
        aria-expanded={isOpen}
        aria-controls={listId}
        onClick={toggle}>
        <span>{title}</span>
        <FontAwesomeIcon icon={isOpen ? faChevronUp : faChevronDown} />
      </button>

      {isOpen && Children.count(children) > 0 &&
        <div id={listId} className="ride-sidebar-accordion__list">{children}</div>
      }
    </div>
  );
}

// Figma: "Navigation / Item plain"
export function SidebarItem({ selected, onClick, children }) {
  return (
    <button
      type="button"
      className="ride-sidebar-item"
      aria-pressed={selected}
      onClick={onClick}>
      {children}
    </button>
  );
}

// Accordion header styled entry without children (Figma: "Report fields")
export function SidebarLink({ selected, onClick, children }) {
  return (
    <button
      type="button"
      className="ride-sidebar-accordion__header"
      aria-current={selected ? 'page' : undefined}
      onClick={onClick}>
      <span>{children}</span>
    </button>
  );
}

// Accordion of toggleable string options, used for filters
export function SidebarOptionsAccordion(props) {
  /* Setup */
  // Props
  const { title, options, value, onChange } = props;

  /* Rendering */
  // Main Component
  return (
    <SidebarAccordion title={title}>
      {options.map((option) => (
        <SidebarItem
          key={option}
          selected={value === option}
          onClick={() => onChange(value === option ? '' : option)}>
          {option}
        </SidebarItem>
      ))}
    </SidebarAccordion>
  );
}

// Empty, loading and error messages inside a sidebar
export function SidebarMessage({ error, children }) {
  return <p className={`ride-sidebar-message${error ? ' ride-sidebar-message--error' : ''}`}>{children}</p>;
}
