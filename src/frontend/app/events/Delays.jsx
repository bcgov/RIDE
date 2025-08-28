import { useCallback, useState } from 'react';

import Select from 'react-select';

import { TrafficImpacts } from './references';
import { DraggableRows } from './shared';
import { selectStyle } from '../components/Map/helpers';

export default function Delays({ event, dispatch }) {
  return (
    <>
      <div className="title">
        <p><strong>Estimated Delay</strong> (optional)</p>
      </div>
      <div className="input">
        <div style={{ display: 'block' }}>
          <input
            type="text"
            style={{width: '4rem'}}
            defaultValue={event.delays.amount}
            onBlur={(e) => dispatch({ type: 'set', value: { amount: e.target.value, section: 'delays' }})}
          />
          <select
            defaultValue={event.delays.unit}
            style={{...selectStyle, width: 'fit-content' }}
            onChange={(e) => dispatch({ type: 'set', value: { unit: e.target.value, section: 'delays' }})}
          >
            <option value="minutes">minutes</option>
            <option value="hours">hours</option>
            <option value="days">days</option>
          </select>
        </div>
      </div>
    </>
  );
}
