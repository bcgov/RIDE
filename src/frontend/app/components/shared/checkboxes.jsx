// React
import React from 'react';

// External imports
import { Checkbox } from '@headlessui/react'

// Styling
import './checkboxes.scss'

// https://headlessui.com/react/checkbox
export default function RIDECheckBoxes(props) {
  /* Setup */
  // Props
  const { label, itemsList, extraClasses, itemsState, setItemsState } = props;

  /* Rendering */
  // Main Component
  return (
    <div className={`ride-checkboxes ${extraClasses || ''}`}>
      <span className={'ride-checkboxes-label'}>{label}</span>

      <div className={'ride-checkboxes-items'}>
        {itemsList.map((item, index) => (
          <div key={item.id} className={'ride-checkboxes-items-row'}>
            <Checkbox
              className="checkbox"
              checked={itemsState.includes(item.id)}
              onChange={(checked) => setItemsState(() => {
                if (checked) {
                  return [...itemsState, item.id];

                } else {
                  return itemsState.filter((id) => id !== item.id);
                }
              })} />

            <span>{item.name}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
