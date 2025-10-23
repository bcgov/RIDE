import { format } from 'date-fns'

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

function printTime(time) {
  if (!time) { return; }
  return format(time, 'h:mm b');
  // return time.toLocaleTimeString('en-CA', { timeStyle: 'short'});
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

function Schedule({ id, item, change, update, current, dispatch, index }) {
  return <>
    <div className="row">
      <span>{desc(item)}</span>
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
      <label>Days affected</label>
      <div className="row">
        <button
          className={`day ${item.mon && 'checked'}`}
          onClick={(e) => { e.preventDefault();
            dispatch({ type: 'toggle days', index: index, days: 'mon', value: !item.mon });
          }}
        >Mon</button>
        <button
          className={`day ${item.tue && 'checked'}`}
          onClick={(e) => { e.preventDefault();
            dispatch({ type: 'toggle days', index, days: 'tue', value: !item.tue });
          }}
        >Tue</button>
        <button
          className={`day ${item.wed && 'checked'}`}
          onClick={(e) => { e.preventDefault();
            dispatch({ type: 'toggle days', index, days: 'wed', value: !item.wed });
          }}
        >Wed</button>
        <button
          className={`day ${item.thu && 'checked'}`}
          onClick={(e) => { e.preventDefault();
            dispatch({ type: 'toggle days', index, days: 'thu', value: !item.thu });
          }}
        >Thu</button>
        <button
          className={`day ${item.fri && 'checked'}`}
          onClick={(e) => { e.preventDefault();
            dispatch({ type: 'toggle days', index, days: 'fri', value: !item.fri });
          }}
        >Fri</button>
        <button
          className={`day ${item.sat && 'checked'}`}
          onClick={(e) => { e.preventDefault();
            dispatch({ type: 'toggle days', index, days: 'sat', value: !item.sat });
          }}
        >Sat</button>
        <button
          className={`day ${item.sun && 'checked'}`}
          onClick={(e) => { e.preventDefault();
            dispatch({ type: 'toggle days', index, days: 'sun', value: !item.sun });
          }}
        >Sun</button>

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
          <label>Start Time</label>
          <input
            type="time"
            defaultValue={item.startTime}
            onBlur={(e) => dispatch({ type: 'set schedule', index, value: { startTime: e.target.value }})}
          />
        </div>

        <div className="input">
          <label>End Time</label>
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

  return <div key={'a' + id}>
    <div className="title">
      <h4>Event Timing</h4>
    </div>

    <div className="subtitle">
      <p><strong>Duration</strong></p>
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
          <label>Start Date</label>
          <input type="date"
            defaultValue={event.timing.startTime}
            onBlur={(e) => dispatch({ type: 'set', value: [{ startTime: e.target.value, section: 'timing' }]})}
          />
        </div>

        <div className="input" style={{ visibility: event.timing.ongoing ? 'hidden' : 'visible' }}>
          <label>End Date</label>
          <input type="date"
            defaultValue={event.timing.endTime}
            onBlur={(e) => dispatch({ type: 'set', value: [{ endTime: e.target.value, section: 'timing' }]})}
          />
        </div>
      </div>

    <DraggableRows
      label="Schedules"
      limit={10}
      itemsSource={[]}
      items={event.timing.schedules}
      Child={Schedule}
      errors={errors}
      dispatch={dispatch}
      section={'timing.schedules'}
      noX={true}
      noBlank={true}
    />
    <button
      type="button"
      onClick={(e) => {
        dispatch({ type: 'add schedule', currentLength: event.timing.schedules.length });
      }}
    >
      <svg xmlns="http://www.w3.org/2000/svg" style={{ cursor: 'pointer', verticalAlign: 'middle', marginBottom: '3px' }}viewBox="0 0 640 640" width="16" height="16" fill="currentColor"><path d="M352 128C352 110.3 337.7 96 320 96C302.3 96 288 110.3 288 128L288 288L128 288C110.3 288 96 302.3 96 320C96 337.7 110.3 352 128 352L288 352L288 512C288 529.7 302.3 544 320 544C337.7 544 352 529.7 352 512L352 352L512 352C529.7 352 544 337.7 544 320C544 302.3 529.7 288 512 288L352 288L352 128z"/></svg>
      &nbsp;Add schedule
    </button>
  </div>;
}
