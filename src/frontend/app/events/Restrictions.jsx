import { useCallback, useState } from 'react';

import Select from 'react-select';

import { RestrictionsList } from './references';
import { DraggableRows } from './shared';
import { selectStyle } from '../components/Map/helpers';


function Restriction({ id, item, change, update, current, }) {
  const placeholder = (RestrictionsList.filter(
    (restriction) => item.id > 0 && restriction.label === item.label
  )[0] || {}).placeholder;

  return (
    <>
      <Select
        name={`restriction ${id}`}
        value={[{ value: id, label: item.label }]}
        options={ RestrictionsList.filter((item) => (
            item.id !== id && !current.includes(item.id)
          )).map((item, ii) => ({ value: item.id, label: item.label }))
        }
        key={`restriction ${id}`}
        styles={selectStyle}
        onChange={(changed) => { change(id, { id: changed.value, label: changed.label }) }}
      />
      <input
        // name={`${item.label} text ${id}`}
        key={`${item.label} text ${id}`}
        type="text"
        defaultValue={item.text}
        disabled={id === 0}
        onBlur={(e) => update(id, {text: e.target.value}) }
        autoComplete="off"
        placeholder={placeholder}
      />
    </>
  );
}

export default function Restrictions({ errors, event, dispatch }) {
  return (
    <DraggableRows
      label="Restrictions"
      appended="(optional)"
      itemsSource={RestrictionsList}
      Child={Restriction}
      items={event.restrictions || []}
      section='restrictions'
      errors={errors}
      dispatch={dispatch}
    />
  );
}
