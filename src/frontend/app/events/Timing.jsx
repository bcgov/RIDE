import { useId, useState } from 'react';
import Tooltip from './Tooltip';

let idc = 0;

export default function EventTiming({ errors, event, dispatch }) {

  const id = ++idc;

  return <div key={'a' + id}>
    <div className="title">
      <h4>Event Timing</h4>
    </div>

    { event?.type !== 'Incident' &&
      <div className="subtitle">
        <p><strong>Scheduling</strong></p>
        <p>Always in Effect</p>
      </div>
    }

    <div className={`subtitle ${errors['Manage Timing By'] ? 'error' : ''}`}>
      <p>
        <strong>Manage Event Timing By</strong>
        <span className="error-message">{errors['Manage Timing By']}</span>
      </p>
    </div>

    <div className="input">
      <label>Next Update Time</label>
      <div className="row">
        <input
          type="datetime-local"
          defaultValue={event.timing.nextUpdate}
          onBlur={(e) => dispatch({ type: 'set', section: 'timing', value: [{ nextUpdate: e.target.value, section: 'timing' }, { nextUpdateIsDefault: false, section: 'timing' }]})}
        />

        <select
          name="next update timezone"
          onChange={(e) => dispatch({ type: 'set', value: { nextUpdateTZ: e.target.value, section: 'timing' }})}
          defaultValue={event.timing.nextUpdateTZ}
        >
          <option></option>
          <option>PST</option>
          <option>MST</option>
        </select>&nbsp;&nbsp;

        <Tooltip text="Clear datetime">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 640 640"
            width="20"
            height="20"
            color="currentColor"
            onClick={(e) => dispatch({ type: 'set', section: 'timing', value: [{ nextUpdate: null, section: 'timing' }, { nextUpdateIsDefault: true, section: 'timing' }]})}
          >
            <path d="M210.5 480L333.5 480L398.8 414.7L225.3 241.2L98.6 367.9L210.6 479.9zM256 544L210.5 544C193.5 544 177.2 537.3 165.2 525.3L49 409C38.1 398.1 32 383.4 32 368C32 352.6 38.1 337.9 49 327L295 81C305.9 70.1 320.6 64 336 64C351.4 64 366.1 70.1 377 81L559 263C569.9 273.9 576 288.6 576 304C576 319.4 569.9 334.1 559 345L424 480L544 480C561.7 480 576 494.3 576 512C576 529.7 561.7 544 544 544L256 544z"/>
          </svg>
        </Tooltip>
      </div>
    </div>

    <div className="input">
      <label>End Time</label>
      <div className="row">
        <input
          type="datetime-local"
          defaultValue={event.timing.endTime}
          onBlur={(e) => dispatch({ type: 'set', section: 'timing', value: [{ endTime: e.target.value, section: 'timing' }]})}
        />

        <select name="end timezone">
          <option>PST</option>
          <option>MST</option>
        </select>&nbsp;&nbsp;

        <Tooltip text="Clear datetime">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 640 640"
            width="20"
            height="20"
            color="currentColor"
            onClick={(e) => dispatch({ type: 'set', section: 'timing', value: [{ endTime: null, section: 'timing' }]})}
          >
            <path d="M210.5 480L333.5 480L398.8 414.7L225.3 241.2L98.6 367.9L210.6 479.9zM256 544L210.5 544C193.5 544 177.2 537.3 165.2 525.3L49 409C38.1 398.1 32 383.4 32 368C32 352.6 38.1 337.9 49 327L295 81C305.9 70.1 320.6 64 336 64C351.4 64 366.1 70.1 377 81L559 263C569.9 273.9 576 288.6 576 304C576 319.4 569.9 334.1 559 345L424 480L544 480C561.7 480 576 494.3 576 512C576 529.7 561.7 544 544 544L256 544z"/>
          </svg>
        </Tooltip>
      </div>
    </div>
  </div>;
}
