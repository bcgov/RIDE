  import { useState } from 'react';

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faChevronUp, faChevronDown } from '@fortawesome/pro-regular-svg-icons';

import { format } from 'date-fns';

import funcs from './preprocessors';

const formatDateTime = (date) => date ? format(new Date(date), 'EEE, MMM d, y h:mm aaa') : '';

function getTz(datetime) {
  if (!datetime) { return undefined; }
  datetime = new Date(datetime);
  if (isNaN(datetime.valueOf())) { return undefined; }
  return datetime.toLocaleString(['en-CA'], { timeZoneName: 'short' }).slice(-3);
}

const GROUPING = {
  start: 'location',
  end: 'location',
  direction: 'details',
  severity: 'details',
  category: 'details',
  situation: 'details',
  delay_amount: 'delays',
  delay_unit: 'delays',
  next_update: 'timing',
  start_time: 'timing',
  end_time: 'timing',
  ongoing: 'timing',
  schedules: 'timing',
  link: 'external'
}

const GROUP_ORDER = ['location', 'details', 'impacts', 'delays', 'restrictions', 'conditions', 'timing', 'schedule', 'additional', 'external'];

const GROUPS = {
  start: {
    label: 'Start Location',
    preprocessor: funcs.location,
  },
  end: {
    label: 'End Location',
    preprocessor: funcs.location,
  },
  details: {
    label: 'Details',
    preprocessor: funcs.details,
  },
  impacts: {
    label: 'Traffic Impacts',
    preprocessor: funcs.impacts,
  },
  delays: {
    label: 'Estimated Delay',
    preprocessor: funcs.delays,
  },
  restrictions: {
    label: 'Restrictions',
    preprocessor: funcs.restrictions,
  },
  timing: {
    label: 'Event timing',
    preprocessor: funcs.timing,
  },
  schedule: {
    label: 'Schedule',
    preprocessor: funcs.schedule,
  },
  conditions: {
    label: 'Road conditions',
    preprocessor: funcs.conditions,
  },
  additional: {
    label: 'Additional Messaging',
    preprocessor: funcs.additional,
  },
  external: {
    label: 'Additional details external site',
    preprocessor: funcs.external,
  },
};

function group(data) {
  Object.keys(data).forEach((key) => {
    if (!GROUPING[key]) { return; }
    if (!data[GROUPING[key]]) { data[GROUPING[key]] = {}; }
    data[GROUPING[key]][key] = data[key];
    delete data[key];
  });
  return data;
}


export default function Version({ event, later, isSelected, onClick }) {

  const [detailsOpen, setDetailsOpen] = useState(false);

  let banner;

  if (event.version === 0) {
    banner = event.approved ? "Event created" : "Event creation requested";
  } else if (event.status === 'Active' && event.diff.status === 'Inactive') {
    banner = event.approved ? "Event reactivated" : "Event reactivation requested";
  } else if (event.status === 'Inactive' && event.diff.status === 'Active' ) {
    banner = event.approved ? "Event cleared" : "Event clearing requested";
  } else if (event.approved && event.diff.approved === false) {
    banner = event.status === 'Inactive' ? "Event clearing approved" : "Event approved and published";
  }

  // make list of items with changes, in GROUP_ORDER
  const diff = group(event.diff);
  const items = GROUP_ORDER.reduce((acc, key) => {
    // location gets special handling because it has start and end sublocations
    if (key === 'location' && diff[key] !== undefined) {
      const hasEnd = event.location.end?.name || diff.end;
      Object.keys((diff[key])).forEach((subkey) => {
        const label = hasEnd ? GROUPS[subkey].label : 'Location';
        acc.push({ key: subkey, diff: diff[key][subkey], label, func: GROUPS[subkey].preprocessor });
      })
    } else if (diff[key] !== undefined) {
      acc.push({ key, diff: diff[key], func: GROUPS[key].preprocessor, label: GROUPS[key].label });
    }
    return acc;
  }, []);

  return (
    <div
      className={`version ${detailsOpen ? 'detailed' : ''} ${isSelected ? 'selected' : ''}`}
      onClick={onClick}
    >
      <header>
        <div className='version-number' onClick={() => console.log(event) }>
          v{ event.version }
        </div>
        <div className="timestamp">
          {formatDateTime(new Date(event.last_updated))}&nbsp;{getTz(event.last_updated)}<br/>
          {event.user.first_name}&nbsp;{event.user.last_name}
        </div>
        { items.length > 0 &&
          <button
            type="button"
            className="toggle"
            onClick={(e) => { e.stopPropagation(); setDetailsOpen(!detailsOpen); }}
          >
            <FontAwesomeIcon icon={detailsOpen ? faChevronUp : faChevronDown} />&nbsp;
            { detailsOpen ? 'hide' : 'show'}&nbsp;details
          </button>
        }
      </header>

      { banner && <div className="banner">{banner}</div> }

      { items.map((item) => {
        const key = item.key;
        return (
          <div key={key} className="history-section">
            <h5 onClick={() => console.log(item.diff)}>{item.label}</h5>

            {(item.func(event, item.diff) || []).map((sub, ii) => {
              return (
                <div key={`sub-${item.label}-${ii}`} className="sub-item">
                  <div className='icon'><FontAwesomeIcon icon={sub.icon} /></div>
                  <div className='changed'>
                    <div>{sub.label}</div>
                    <div className={`detail ${detailsOpen ? 'show' : 'hide'}`}>
                      { sub.verb === 'Added' &&
                        <div className='updated'>
                          <div className='value'>{sub.current}</div>
                        </div>
                      }
                      { sub.verb === 'Removed' &&
                        <div className='updated'>
                          <div className='value'>{sub.previous}</div>
                        </div>
                      }
                      { sub.verb === 'Updated' && (sub.grid || <>
                        <div className='updated'>
                          <div className='label'>Updated to</div>
                          <div className='value'>{sub.current}</div>
                        </div>
                        <div className='updated'>
                          <div className='label'>Updated from</div>
                          <div className='value'>{sub.previous}</div>
                        </div>
                        </>)
                      }
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )
      })}
    </div>
  );
}
