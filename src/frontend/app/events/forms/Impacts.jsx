import { useSelector } from 'react-redux';

import Select from 'react-select';

import { DraggableRows } from '../shared';
import { selectStyle } from '../../components/Map/helpers';
import { selectAllTrafficImpacts } from '../../slices/trafficImpacts';

function Impact({ id, item, change, current, itemsSource=[] }) {
  return (
    <Select
      name={`impact`}
      value={[{ value: id, label: item.label, closed: item.closed }]}
      options={ itemsSource.filter((item) => (
          item.id !== id && !current.includes(item.id)
        )).map((item) => ({ value: item.id, label: item.label, closed: item.closed }))
      }
      styles={selectStyle}
      onChange={(changed) => { change(id, { id: changed.value, label: changed.label, closed: changed.closed }) }}
    />
  );
}

export default function Impacts({ errors, event, dispatch }) {
  const impacts = useSelector(selectAllTrafficImpacts);

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
