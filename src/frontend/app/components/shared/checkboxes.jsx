// React
import React from 'react';

// External imports
import { Checkbox } from '@headlessui/react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCheck } from '@fortawesome/pro-solid-svg-icons';

// Styling
import './checkboxes.scss'
import './checkbox.scss'

// https://headlessui.com/react/checkbox
export default function RIDECheckBoxes(props) {
  /* Setup */
  // Props
  const { label, itemsList, extraClasses, itemsState, setItemsState } = props;

  /* Rendering */
  // Main Component
  return (
    <div className={`ride-checkboxes ${extraClasses || ''}`}>
      {label &&
        <span className={'ride-checkboxes-label'}>{label}</span>
      }

      <div className={'ride-checkboxes-items'}>
        {itemsList.map((item, index) => {
          const isChecked = itemsState.includes(item.id);
          return (
          <div key={item.id} className={`ride-checkboxes-items-row ${isChecked ? 'checked' : ''}`}>
            <Checkbox
              className="checkbox-container"
              checked={isChecked}
              onChange={(checked) => setItemsState(() => {
                if (checked) {
                  return [...itemsState, item.id];

                } else {
                  return itemsState.filter((id) => id !== item.id);
                }
              })}>
              <div className={'checkbox'}>
                {isChecked && (
                  <FontAwesomeIcon icon={faCheck} aria-hidden="true" />
                )}
              </div>
              <div className={'checkbox-label'}>{item.name}</div>
            </Checkbox>
          </div>
          );
        })}
      </div>
    </div>
  );
}
