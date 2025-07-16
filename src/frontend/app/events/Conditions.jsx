import { useCallback, useState } from 'react';

import Select from 'react-select';

import { RoadConditions } from './references';
import { DraggableRows } from './shared';

function Condition({ id, source, item, change, update, current, }) {
  return (
    <>
      <Select
        name={`impact ${id}`}
        value={[{ value: id, label: source.label }]}
        options={ RoadConditions.filter((item) => (
            item.id !== id && !current.includes(item.id)
          )).map((item, ii) => ({ value: item.id, label: item.label }))
        }
        styles={{ control: (css) => ({ ...css, width: '100%', }) }}
        onChange={(changed) => { change(id, changed.value) }}
      ></Select>
    </>
  );
}

export default function Conditions() {
  return (
    <DraggableRows
      label="Conditions"
      limit={10}
      itemsSource={RoadConditions}
      Child={Condition}
      initial={[]}
    />
  );
}