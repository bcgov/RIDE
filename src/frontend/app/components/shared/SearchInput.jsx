import { useRef } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faMagnifyingGlass, faXmark } from '@fortawesome/pro-regular-svg-icons';

// Styling
import './SearchInput.scss';

// Figma: "Form / Field (Text and Dropdowns)" with a search icon. The list filters as you type,
// so once there is text the magnifier becomes the button that clears it.
// The height and the padding inside the field come from --search-height and
// --search-inset, which a parent can set.
export default function SearchInput(props) {
  /* Setup */
  // Props
  const { value, onChange, label, placeholder = 'Search', className } = props;

  // Refs
  const inputRef = useRef(null);

  /* Handlers */
  // Clearing hands focus back to the field, so you can carry on typing
  const handleClear = () => {
    onChange('');
    inputRef.current?.focus();
  };

  /* Rendering */
  // Main Component
  return (
    <div className={['ride-search', className].filter(Boolean).join(' ')}>
      <input
        ref={inputRef}
        type="text"
        className="ride-search__input"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-label={label || placeholder} />

      {value ? (
        <button
          type="button"
          className="ride-search__icon ride-search__clear"
          aria-label="Clear search"
          onClick={handleClear}>
          <FontAwesomeIcon icon={faXmark} />
        </button>
      ) : (
        <FontAwesomeIcon icon={faMagnifyingGlass} className="ride-search__icon" />
      )}
    </div>
  );
}
