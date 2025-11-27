import { format } from 'date-fns';

import Tooltip from './Tooltip';
import { DraggableRows } from './shared';

let idc = 0;

function getTz(datetime) {
  if (!datetime) { return undefined; }
  datetime = new Date(datetime);
  if (isNaN(datetime.valueOf())) { return undefined; }
  return datetime.toLocaleString(['en-CA'], { timeZoneName: 'short' }).slice(-3);
}

function normalized(datestring) {
  if (!datestring) { return ''; }
  const a = new Date(datestring)
  if (Number(a) === 0) { return ''; }
  const b = new Date(a - a.getTimezoneOffset() * 60000);
  return b.toISOString().replace('Z', '');
}

const days_of_the_week = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
const DAY_NAMES = {
  mon: 'Monday',
  tue: 'Tuesday',
  wed: 'Wednesday',
  thu: 'Thursday',
  fri: 'Friday',
  sat: 'Saturday',
  sun: 'Sunday',
};
const SHORT_DAY_NAMES = {
  mon: 'Mon',
  tue: 'Tue',
  wed: 'Wed',
  thu: 'Thu',
  fri: 'Fri',
  sat: 'Sat',
  sun: 'Sun',
};

function getDate(time) {
  if (!time) { return null; }
  time = time.split(':');
  const date = new Date();
  date.setHours(parseInt(time[0]));
  date.setMinutes(parseInt(time[1]));
  return date;
}

/* The date input widget returns a date like "2025-11-24", which creates a JS
 * date in UTC; the local date is then "2025-11-23 16:00:00 GMT-800", and the
 * value in the widget is 2025-11-23, a day earlier.
 *
 * To cure this we append a time to the date string, which creates the date in
 * the local timezone, which then yields the expected UTC
 * ("2025-22-24T08:00:00Z"), localized back to 0 hour on the correct date in the
 * event's timezone.
 */
function getStartDate(value) {
  if (value) {
    const date = new Date(`${value}T00:00:00`);
    if (!isNaN(date)) { return date.toISOString(); }
  }
  return null;
}

/* The date input widget returns a date like "2025-11-24", which creates a JS
 * date in UTC; the local date is then "2025-11-23 16:00:00 GMT-800", and the
 * value in the widget is 2025-11-23, a day earlier.
 *
 * To cure this we append a time to the date string, which creates the date in
 * the local timezone, which then yields the expected UTC
 * ("2025-22-25T07:59:59Z"), localized back to 11:59:59 PM on the correct date
 * in the event's timezone.
 */
function getEndDate(value) {
  if (value) {
    const date = new Date(`${value}T23:59:59`);
    if (!isNaN(date)) { return date.toISOString(); }
  }
  return null;
}

function printTime(time) {
  if (!time) { return; }
  return format(time, 'h:mm b');
  // return time.toLocaleTimeString('en-CA', { timeStyle: 'short'});
}

function printDate(date) {
  if (!date) { return; }
  date = new Date(date);
  return format(date, 'y-MM-dd');
}

export function desc(schedule, short=false) {
  const all = [];
  let curr = [];
  all.push(curr);

  for (const day of days_of_the_week) {
    if (schedule[day]) {
      if (short) {
        curr.push(SHORT_DAY_NAMES[day]);
      } else {
        curr.push(DAY_NAMES[day]);
      }
    } else {
      curr = [];
      all.push(curr);
    }
  }

  const names = all.reduce((acc, curr) => {
    if (curr.length > 0) {
      if (curr.length === 7) {
        acc.push(schedule.allDay ? 'every day' : 'Every day');
      } else if (curr.length > 2) {
        acc.push(`${curr[0]} to ${curr.pop()}`);
      } else {
        for (const item of curr) { acc.push(item); }
      }
    }
    return acc;
  }, [])

  let final = names.join(', ');

  if (schedule.allDay) {
    final = `All day, ${final}`;
  } else {
    const start = getDate(schedule.startTime);
    const end = getDate(schedule.endTime);
    if (start) {
      if (end) {
        final = `${final}, ${printTime(start)} to ${printTime(end)}`;
        if (end < start) { final += ' next day'}
      } else {
        final = `${final}, from ${printTime(start)}`;
      }
    } else if (end) {
      final = `${final}, until ${printTime(end)}`;
    }
  }
  return (final.length > 40 && !short) ? desc(schedule, true) : final ;
}

function Schedule({ id, item, change, update, current, dispatch, index, errors }) {
  const hasErrors = !!(errors || item.error);
  return <>
    <div className="row">
      <span className={`row-title ${hasErrors && 'errors'}`}><strong>{desc(item)}</strong></span>
      <button
        type='button'
        onClick={(e) => {
          dispatch({ 'type': 'remove schedule', id });
        }}
      >
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640" width="20" height="20" fill="currentColor"><path d="M262.2 48C248.9 48 236.9 56.3 232.2 68.8L216 112L120 112C106.7 112 96 122.7 96 136C96 149.3 106.7 160 120 160L520 160C533.3 160 544 149.3 544 136C544 122.7 533.3 112 520 112L424 112L407.8 68.8C403.1 56.3 391.2 48 377.8 48L262.2 48zM128 208L128 512C128 547.3 156.7 576 192 576L448 576C483.3 576 512 547.3 512 512L512 208L464 208L464 512C464 520.8 456.8 528 448 528L192 528C183.2 528 176 520.8 176 512L176 208L128 208zM288 280C288 266.7 277.3 256 264 256C250.7 256 240 266.7 240 280L240 456C240 469.3 250.7 480 264 480C277.3 480 288 469.3 288 456L288 280zM400 280C400 266.7 389.3 256 376 256C362.7 256 352 266.7 352 280L352 456C352 469.3 362.7 480 376 480C389.3 480 400 469.3 400 456L400 280z"/></svg>
      </button>
    </div>
    <div className="input">
      <label className={item.error ? 'error' : undefined}>
        Days affected
        { item.error && <span className="error-message">{item.error}</span>}

      </label>
      <div className="row">
        { days_of_the_week.map((day) => (
          <button
            className={`day ${item[day] && 'checked'}`}
            key={day}
            onClick={(e) => { e.preventDefault();
              dispatch({ type: 'toggle days', index: index, days: day, value: !item[day] });
            }}
          >{day[0].toUpperCase() + day.slice(1)}</button>
        ))}
      </div>

      <div>
        <button
          className="shortcut"
          onClick={(e) => {
            e.preventDefault();
            dispatch({ type: 'set days', index, days: ['mon', 'tue', 'wed', 'thu', 'fri'] });
          }}
        >Weekdays</button>

        <button
          className="shortcut"
          onClick={(e) => {
            e.preventDefault();
            dispatch({ type: 'set days', index, days: ['sat', 'sun'] });
          }}
        >Weekends</button>
      </div>
    </div>

    <div className="">
      <input
        type="checkbox"
        defaultChecked={item.allDay}
        onChange={(e) => dispatch({ type: 'set schedule', index, value: { allDay: e.target.checked } })}
      />&nbsp;<label>24 hours a day</label>
    </div>

    { !item.allDay &&
      <div className="row">
        <div className="input">
          <label className={errors?.startTime ? 'error' : undefined}>
            Start Time
            <span className="error-message">{errors?.startTime}</span>
          </label>
          <input
            type="time"
            defaultValue={item.startTime}
            onBlur={(e) => dispatch({ type: 'set schedule', index, value: { startTime: e.target.value }})}
          />
        </div>

        <div className="input">
          <label className={errors?.endTime ? 'error' : undefined}>
            End Time
            <span className="error-message">{errors?.endTime}</span>
          </label>
          <input
            type="time"
            defaultValue={item.endTime}
            onBlur={(e) => dispatch({ type: 'set schedule', index, value: { endTime: e.target.value }})}
          />
        </div>
      </div>
    }
  </>;
}

export default function Scheduled({ errors, event, dispatch }) {

  const id = ++idc;

  const hasErrors = errors.inEffect || errors.startTime || errors.endTime;

  return <div key={'a' + id}>
    <div className={`subtitle ${hasErrors && 'error'}`}>
      <p>
        <strong>In Effect</strong>
        <span className="error-message">{errors.inEffect}</span>
      </p>
    </div>

      <div className="">
        <input
          type="checkbox"
          defaultChecked={event.timing.ongoing}
          onChange={(e) => dispatch({ type: 'set', value: [{ section: 'timing', ongoing: e.target.checked }] })}
        /> Ongoing
      </div>

      <div className="row">
        <div className="input">
          <label className={errors?.startTime ? 'error' : undefined}>
            Start Date
            <span className="error-message">{errors.startTime}</span>
          </label>
          <input type="date"
            defaultValue={printDate(event.timing.startTime)}
            onBlur={(e) => dispatch({ type: 'set', value: [{ startTime: getStartDate(e.target.value), section: 'timing' }]})}
          />
        </div>

        <div className="input" style={{ visibility: event.timing.ongoing ? 'hidden' : 'visible' }}>
          <label className={errors?.endTime ? 'error' : undefined}>
            End Date
            <span className="error-message">{errors.endTime}</span>
          </label>
          <input type="date"
            defaultValue={printDate(event.timing.endTime)}
            onBlur={(e) => dispatch({ type: 'set', value: [{ endTime: getEndDate(e.target.value), section: 'timing' }]})}
          />
        </div>
      </div>

    <DraggableRows
      label="Schedules"
      itemsSource={[]}
      items={event.timing.schedules}
      Child={Schedule}
      errors={errors}
      childErrors={errors.schedules}
      dispatch={dispatch}
      section={'timing.schedules'}
      noX={true}
      noBlank={true}
    />
    { event.timing.schedules.length < 7 &&
      <button
        type="button"
        onClick={(e) => {
          dispatch({ type: 'add schedule', currentLength: event.timing.schedules.length });
        }}
      >
        <svg xmlns="http://www.w3.org/2000/svg" style={{ cursor: 'pointer', verticalAlign: 'middle', marginBottom: '3px' }}viewBox="0 0 640 640" width="16" height="16" fill="currentColor"><path d="M352 128C352 110.3 337.7 96 320 96C302.3 96 288 110.3 288 128L288 288L128 288C110.3 288 96 302.3 96 320C96 337.7 110.3 352 128 352L288 352L288 512C288 529.7 302.3 544 320 544C337.7 544 352 529.7 352 512L352 352L512 352C529.7 352 544 337.7 544 320C544 302.3 529.7 288 512 288L352 288L352 128z"/></svg>
        &nbsp;Add schedule
      </button>
    }
  </div>;
}
