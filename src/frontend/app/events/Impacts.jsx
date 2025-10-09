import { useCallback, useState, useContext } from 'react';

import Select from 'react-select';

import { TrafficImpacts } from './references';
import { DraggableRows } from './shared';
import { selectStyle } from '../components/Map/helpers';

import { DataContext } from '../contexts';

function Impact({ id, item, change, update, current, }) {
  return (
    <Select
      name={`impact`}
      value={[{ value: id, label: item.label, closed: item.closed }]}
      options={ TrafficImpacts.filter((item) => (
          item.id !== id && !current.includes(item.id)
        )).map((item, ii) => ({ value: item.id, label: item.label, closed: item.closed }))
      }
      styles={selectStyle}
      onChange={(changed) => { change(id, { id: changed.value, label: changed.label, closed: changed.closed }) }}
    />
  );
}

export default function Impacts({ errors, event, dispatch }) {
  const { impacts } = useContext(DataContext);

  return (
    <DraggableRows
      label="Traffic Impacts"
      limit={10}
      itemsSource={impacts}
      Child={Impact}
      items={event.impacts || []}
      errors={errors}
      dispatch={dispatch}
      section={'impacts'}
    />
  );
}
