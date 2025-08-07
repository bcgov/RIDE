import { useState } from 'react';

import { convertToDateTimeLocalString as convert } from "../components/Map/helpers";

const ONE_HOUR = 1000 * 60 * 60;
const ONE_WEEK = ONE_HOUR * 24 * 7

function getLater(severity) {
  if (!severity) { return null; }
  if (severity.startsWith('Major')) {
    return new Date(new Date().getTime() + ONE_HOUR);
  } else if (severity.startsWith('Minor')) {
    return new Date(new Date().getTime() + ONE_WEEK);
  }
  return null;
}

export default function EventTiming({ errors, severity, formType }) {

  const [hasSet, setHasSet] = useState(false);

  return <>
    <div className="title">
      <h4>Event Timing</h4>
    </div>

    { formType !== 'incident' &&
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
          name="next update time"
          defaultValue={convert(getLater(severity))}
        />
        <select name="next update timezone">
          <option>PST</option>
          <option>MST</option>
        </select>
      </div>
    </div>

    <div className="input">
      <label>End Time</label>
      <div className="row">
        <input type="datetime-local" name="end time" />
        <select name="end timezone">
          <option>PST</option>
          <option>MST</option>
        </select>
      </div>
    </div>
  </>;
}
