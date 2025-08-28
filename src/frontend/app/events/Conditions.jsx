import { useCallback, useState } from 'react';

import Select from 'react-select';

import { RoadConditions } from './references';
import { DraggableRows } from './shared';
import { selectStyle } from '../components/Map/helpers';

function Condition({ id, item, change, update, current, }) {
  return (
    <Select
      name={`impact ${id}`}
      value={[{ value: id, label: item.label }]}
      options={ RoadConditions.filter((item) => (
          item.id !== id && !current.includes(item.id)
        )).map((item, ii) => ({ value: item.id, label: item.label }))
      }
      styles={selectStyle}
      onChange={(changed) => { change(id, { id: changed.value, label: changed.label }) }}
    ></Select>
  );
}

export default function Conditions({ errors, event, dispatch }) {
  return (
    <DraggableRows
      label="Conditions"
      limit={10}
      itemsSource={RoadConditions}
      Child={Condition}
      items={event.conditions || []}
      dispatch={dispatch}
      errors={errors}
      section={'conditions'}
    />
  );
}