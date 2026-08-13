import Select from 'react-select';
import { useSelector } from 'react-redux';

import { DraggableRows } from '../shared';
import { selectStyle } from '../../components/Map/helpers';
import { selectAllConditions } from '../../slices/conditions';

function Condition({ id, item, change, current, itemsSource=[]}) {
  return (
    <Select
      name={`impact ${id}`}
      value={[{ value: id, label: item.label }]}
      options={ itemsSource.filter((item) => (
          item.id !== id && !current.includes(item.id)
        )).map((item) => ({ value: item.id, label: item.label }))
      }
      styles={selectStyle}
      onChange={(changed) => { change(id, { id: changed.value, label: changed.label }) }}
    ></Select>
  );
}

export default function Conditions({ errors, event, dispatch, caption }) {
  const conditions = useSelector(selectAllConditions);
  const displayErrors = event.conditions.length === 0 && errors['Conditions'] ? errors : {};

  return (
    <DraggableRows
      label="Conditions"
      limit={10}
      itemsSource={conditions}
      Child={Condition}
      items={event.conditions || []}
      dispatch={dispatch}
      errors={displayErrors}
      section={'conditions'}
      caption={caption}
    />
  );
}