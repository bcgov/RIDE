import { useCallback, useState } from 'react';

import Select from 'react-select';

import { TrafficImpacts } from './references';
import { DraggableRows } from './shared';
import { selectStyle } from '../components/Map/helpers';

export default function Delays() {
  return (
    <>
      <div className="title">
        <p><strong>Estimated Delay</strong></p>
      </div>
      <div className="input">
        <div style={{ display: 'block' }}>
          <input
            type="text"
            name="delay time"
            style={{width: '4rem'}}
            defaultValue="0"
          />
          <select
            name="delay unit"
            style={{...selectStyle, width: 'fit-content' }}
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
