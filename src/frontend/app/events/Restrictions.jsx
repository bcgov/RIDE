import { useCallback, useState } from 'react';

import Select from 'react-select';

import { RestrictionsList } from './references';
import { DraggableRows } from './shared';

function Restriction({ id, source, item, change, update, current, }) {
  return (
    <>
      <Select
        name={`restriction ${id}`}
        value={[{ value: id, label: source.label }]}
        options={ RestrictionsList.filter((item) => (
            item.id !== id && !current.includes(item.id)
          )).map((item, ii) => ({ value: item.id, label: item.label }))
        }
        key={`restriction ${id}`}
        styles={{
          control: (css) => ({ ...css, width: '100%', }),
          container: (css) => ({ ...css, flex: 1, }),
        }}
        onChange={(changed) => { change(id, changed.value); }}
      />
      <input
        name={`${source.label} text ${id}`}
        key={`${source.label} text ${id}`}
        type="text"
        defaultValue={item.text}
        disabled={id === 0}
        onChange={(e) => update(id, {text: e.target.value}) }
        autoComplete="off"
      />
    </>
  );
}

export default function Restrictions() {
  return (
    <DraggableRows
      label="Restrictions"
      limit={10}
      itemsSource={RestrictionsList}
      Child={Restriction}
      initial={[]}
    />
  );
}
