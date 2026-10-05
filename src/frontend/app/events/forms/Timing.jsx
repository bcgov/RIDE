import { useState, useEffect } from 'react';

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faEraser } from '@fortawesome/pro-solid-svg-icons';

import Tooltip from '../Tooltip';

import { getTz, tzAware, tzUnaware } from './shared';

export default function EventTiming({ errors, event, dispatch, isRoadCondition }) {

  const timeZone = event.location.start.timezone;
  const [ nextUpdate, setNextUpdate ] = useState(tzUnaware(event.timing.nextUpdate, timeZone))
  const [ endTime, setEndTime ] = useState(tzUnaware(event.timing.endTime))

  const hasErrors = errors['nextUpdate'] || errors.endTime || errors['Manage Timing By']
  const timingError = isRoadCondition ? errors['nextUpdate'] : errors['Manage Timing By'];

  useEffect(() => {
    setNextUpdate(tzUnaware(event.timing.nextUpdate, timeZone));
    setEndTime(tzUnaware(event.timing.endTime, timeZone));
  }, [event])

  return <div>
    <div className={`title ${hasErrors ? 'error' : ''}`}>
      <p>
        <strong>{isRoadCondition ? 'Next update' : 'Event Timing'}</strong>
        <span className="error-message">{timingError}</span>
      </p>
    </div>

    <div className={`input ${errors.nextUpdate ? 'error' : ''}`}>
      {!isRoadCondition && (
        <label htmlFor='nextUpdateTime'>
          Next Update Time
          <span className="error-message">{errors['nextUpdate']}</span>
        </label>
      )}

      <div className="row">
        <input
          id='nextUpdateTime'
          type="datetime-local"
          value={nextUpdate}
          onChange={(e) => setNextUpdate(e.target.value)}
          onBlur={(e) => dispatch({
            type: 'set',
            section: 'timing',
            value: [
              { nextUpdate: tzAware(e.target.value, timeZone), section: 'timing' },
              { nextUpdateIsDefault: false, section: 'timing' }
            ]})
          }
        />

        <span className="timezone">{getTz(event.timing.nextUpdate, timeZone)}</span>

        <Tooltip text="Clear datetime">
          <FontAwesomeIcon
            icon={faEraser}
            onClick={() => {
              dispatch({
                type: 'set',
                section: 'timing',
                value: [
                  { nextUpdate: null, section: 'timing' },
                  { nextUpdateIsDefault: true, section: 'timing' }
                ]
              });
            }}
          />
        </Tooltip>
      </div>
    </div>

    {!isRoadCondition &&
      <div className={`input ${errors.endTime ? 'error' : ''}`}>
        <label htmlFor="endTime">
          End Time
          <span className="error-message">{errors['endTime']}</span>
        </label>

        <div className="row">
          <input
            id="endTime"
            type="datetime-local"
            value={endTime}
            onChange={(e) => setEndTime(e.target.value)}
            onBlur={(e) => dispatch({
              type: 'set',
              section: 'timing',
              value: [{ endTime: tzAware(e.target.value, timeZone), section: 'timing' }]
            })}
          />

          <span className="timezone">{getTz(event.timing.endTime, timeZone)}</span>

          <Tooltip text="Clear datetime">
            <FontAwesomeIcon
              icon={faEraser}
              onClick={() => {
                dispatch({
                  type: 'set',
                  section: 'timing',
                  value: [{ endTime: null, section: 'timing' }]});
              }}
            />
          </Tooltip>
        </div>
      </div>
    }
  </div>;
}
