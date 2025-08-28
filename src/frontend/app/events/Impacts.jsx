import { useCallback, useState } from 'react';

import Select from 'react-select';

import { TrafficImpacts } from './references';
import { DraggableRows } from './shared';
import { selectStyle } from '../components/Map/helpers';

function Impact({ id, item, change, update, current, }) {
  return (
    <Select
      name={`impact`}
      value={[{ value: id, label: item.label }]}
      options={ TrafficImpacts.filter((item) => (
          item.id !== id && !current.includes(item.id)
        )).map((item, ii) => ({ value: item.id, label: item.label }))
      }
      styles={selectStyle}
      onChange={(changed) => { change(id, { id: changed.value, label: changed.label }) }}
    />
  );
}

export default function Impacts({ errors, event, dispatch }) {
  return (
    <DraggableRows
      label="Traffic Impacts"
      limit={10}
      itemsSource={TrafficImpacts}
      Child={Impact}
      items={event.impacts || []}
      errors={errors}
      dispatch={dispatch}
      section={'impacts'}
    />
  );
}
