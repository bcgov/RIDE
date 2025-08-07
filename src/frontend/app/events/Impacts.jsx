import { useCallback, useState } from 'react';

import Select from 'react-select';

import { TrafficImpacts } from './references';
import { DraggableRows } from './shared';
import { selectStyle } from '../components/Map/helpers';

function Impact({ id, source, item, change, update, current, }) {
  return (
    <>
      <Select
        name={`impact`}
        value={[{ value: id, label: source.label }]}
        options={ TrafficImpacts.filter((item) => (
            item.id !== id && !current.includes(item.id)
          )).map((item, ii) => ({ value: item.id, label: item.label }))
        }
        styles={selectStyle}
        onChange={(changed) => { change(id, changed.value) }}
      ></Select>

      { source.hasTime &&
        <div className={`supplemental input`}>
          <label>Estimated Delay</label>
          <div style={{ display: 'block' }}>
            <input
              type="text"
              name={`${source.label} time ${id}`}
              key={`${source.label} time ${id}`}
              style={{width: '4rem'}}
              defaultValue={item.time}
              onChange={(e) => update(id, {time: e.target.value}) }
              autoComplete="off"
            />
            <select
              name={`${source.label} unit ${id}`}
              style={{...selectStyle, width: 'fit-content' }}
              onChange={(e) => update(id, {unit: e.target.value}) }
              value={item.unit}
              key={`${source.label} unit ${id}`}
            >
              <option></option>
              <option value="minutes">minutes</option>
              <option value="hours">hours</option>
              <option value="days">days</option>
            </select>
          </div>
        </div>
      }
    </>
  );
}

export default function Impacts({ errors }) {
  return (
    <DraggableRows
      label="Traffic Impacts"
      limit={10}
      itemsSource={TrafficImpacts}
      Child={Impact}
      initial={[]}
      errors={errors}
    />
  );
}