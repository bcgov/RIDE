// External imports
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faChevronDown } from '@fortawesome/pro-regular-svg-icons';
import { Menu, MenuButton, MenuItem, MenuItems } from '@headlessui/react'

// Styling
import './dropdown.scss';
import {useEffect, useState} from "react";

// https://headlessui.com/react/menu
export default function RIDEDropdown(props) {
  /* Setup */
  // Props
  const { label, extraClasses, items, handler, initialValue } = props;

  /* Hooks */
  // States
  const [ selected, setSelected ] = useState(initialValue ? initialValue : null);

  // Effects
  useEffect(() => {
    //
  }, []);

  /* Rendering */
  // Main Component
  return (
    <Menu as="div" className={`ride-dropdown ${extraClasses ? extraClasses : ''}`}>
      <p className={'ride-dropdown-label'}>{label}</p>

      <MenuButton disabled={!items || !items.length} className="ride-dropdown-button">
        <span className={'selected-text'}>{selected != null ? selected.toString() : ''}</span>
        <FontAwesomeIcon icon={faChevronDown} aria-hidden="true" className="ride-dropdown-icon" />
      </MenuButton>

      {items &&
        <MenuItems transition className={`ride-dropdown-menu`}>
          <div className="ride-dropdown-items-wrapper">
            {items.map((item, index) => (
              <MenuItem key={index}>
                <a href="#" className="ride-dropdown-item" onClick={() => {
                  setSelected(item);
                  if (handler) {
                    handler(item);
                  }
                }}>
                  {item.toString()}
                </a>
              </MenuItem>
            ))}
          </div>
        </MenuItems>
      }
    </Menu>
  )
}
