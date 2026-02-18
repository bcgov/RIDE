import { faArrowsRotate, faPlus, faMinus } from '@fortawesome/pro-regular-svg-icons';
import { format } from 'date-fns';

import { PHRASES_LOOKUP, RestrictionsLookup } from '../references';

function getVerb(changeType) {
  switch(changeType) {
    case 'remove':
      return ['Removed', faMinus];
    case 'add':
      return ['Added', faPlus];
    default:
      return ['Updated', faArrowsRotate];
  }
}

function formatCoords(coords) {
  if (!Array.isArray(coords)) { return coords; }
  return `[${Math.floor(coords[0] * 1000000) / 1000000}, ${Math.floor(coords[1] * 1000000) / 1000000}]`;
}

export function location(event, diff) {
  return Object.keys(diff).flatMap((key) => {
    if (key === 'nearby') {
      return ['add', 'remove'].map((subkey) => {
        if (!diff[key][subkey]) { return; }
        const [verb, icon] = getVerb(subkey);
        const items = diff[key][subkey];
        let current = (
          <ul>{items.map((line) => <li key={line}>{line}</li>)}</ul>
        )
        let previous;
        if (verb === 'Removed') { previous = current; current = undefined; }
        return {
          label: `${verb} reference location${ items.length > 1 ? 's': ''}`,
          icon, verb, current, previous,
        };
      }).filter((item) => item);
    }
    return Object.keys(diff[key]).map((subkey) => {
      let previous = diff[key][subkey];
      let current = formatCoords(event.location.start[key]);
      const [verb, icon] = getVerb(subkey);
      if (verb === 'Removed') { current = ''; }
      else if (verb === 'Added') { previous = ''; }
      return { label: `${verb} ${key}`, icon, verb, current, previous };
    })
  });
}

export function details(event, diff) {
  return Object.keys(diff).map((key) => {
    const previous = PHRASES_LOOKUP[diff[key]] || diff[key];
    const current = PHRASES_LOOKUP[event.details[key]] || event.details[key];
    const [verb, icon] = getTypeOfChange(current, previous);
    return { label: `${verb} ${key}`, icon, verb, current, previous };
  })
}

export function impacts(event, diff) {
  const items = [];
  diff.add?.forEach((add) => {
    items.push({ label: `Added traffic impact`, icon: faPlus, verb: 'Added', current: add.label });
  });
  diff.remove?.forEach((remove) => {
    items.push({ label: `Removed traffic impact`, icon: faMinus, verb: 'Removed', previous: remove.label });
  });
  return items;
}

export function delays(event, diff) {
  let verb = 'Updated', icon = faArrowsRotate;
  let previous, current;

  if (event.delays.amount > 0 && diff.delay_amount === 0) {
    verb = 'Added';
    icon = faPlus;
    current = `${event.delays.amount} ${event.delays.unit}`;
  } else if (event.delays.amount === 0 && diff.delay_amount > 0) {
    verb = 'Removed';
    icon = faMinus;
    previous = `${diff.delay_amount} ${diff.delay_unit || event.delays.unit}`;
  } else {
    previous = `${diff.delay_amount || event.delays.amount} ${diff.delay_unit || event.delays.unit}`;
    current = `${event.delays.amount} ${event.delays.unit}`;
  }
  return [{ label: `${verb} estimated delay`, icon, verb, previous, current }];
}

export function restrictions(event, diff) {
  const items = [];
  diff.add?.forEach((add) => {
    items.push({ label: `Added restriction`, icon: faPlus, verb: 'Added', current: `${add.label} ${add.text}` });
  });
  diff.remove?.forEach((remove) => {
    items.push({ label: `Removed restriction`, icon: faMinus, verb: 'Removed', previous: `${remove.label} ${remove.text}` });
  });
  diff.change?.forEach((change) => {
    items.push({
      label: `Updated restriction`,
      icon: faArrowsRotate,
      verb: 'Updated',
      previous: `${RestrictionsLookup[change.id]} ${change.diff[0][2][0]}`,
      current: `${RestrictionsLookup[change.id]} ${change.diff[0][2][1]}`,
    });
  });
  return items;
}

const nu = (date) => date ? format(new Date(date), 'M/d/yyyy h:mm a') : '';

export function timing(event, diff) {
  if (event.type === 'Planned event') {
    return schedule(event, diff);
  }
  const items = [];
  if (diff.next_update !== undefined) {
    const [verb, icon] = getTypeOfChange(event.timing.nextUpdate, diff.next_update);
    items.push({ label: `${verb} next update`, icon, verb, previous: nu(diff.next_update), current: nu(event.timing.nextUpdate) });
  }
  if (diff.end_time !== undefined) {
    const [verb, icon] = getTypeOfChange(event.timing.endTime, diff.end_time);
    items.push({ label: `${verb} end time`, icon, verb, previous: nu(diff.end_time), current: nu(event.timing.endTime) });
  }
  return items;
}

export function schedule(event, diff) {
  const items = [];
  if (diff.start_time !== undefined) {
    const [verb, icon] = getTypeOfChange(event.timing.startTime, diff.start_time);
    items.push({ label: `${verb} start time`, icon, verb, previous: nu(diff.start_time), current: nu(event.timing.startTime) });
  }
  if (diff.end_time !== undefined) {
    const [verb, icon] = getTypeOfChange(event.timing.endTime, diff.end_time);
    items.push({ label: `${verb} end time`, icon, verb, previous: nu(diff.end_time), current: nu(event.timing.endTime) });
  }
  if (diff.schedules !== undefined) {
    ['add', 'remove', 'change'].forEach((kind) => {
      const [verb, icon] = getVerb(kind);
      if (diff.schedules[kind] === undefined) { return; }
      let previous, current, grid;
      if (kind === 'change') {
        grid = <div className='updated-grid'>
          <div className='label'>Updated to</div>
          <div className='label'>Updated from</div>
          { diff.schedules[kind].map((change) =>
            <>
              <div key={change[0]} className='value'><ul><li>{change[1]}</li></ul></div>
              <div key={change[1]} className='value'><ul><li>{change[0]}</li></ul></div>
            </>
          )}
        </div>
      } else if (kind === 'add') {
        current = diff.schedules[kind];
      } else {
        previous = diff.schedules[kind];
      }
      items.push({ label: `${verb} schedule`, icon, verb, previous, current, grid });
    });
  }
  return items;
}

export function conditions(event, diff) {
  const items = [];
  diff.add?.forEach((add) => {
    items.push({ label: `Added condition`, icon: faPlus, verb: 'Added', current: add.label });
  });
  diff.remove?.forEach((remove) => {
    items.push({ label: `Removed condition`, icon: faMinus, verb: 'Removed', previous: remove.label });
  });
  return items;
}

export function additional(event, diff) {
  const [verb, icon] = getTypeOfChange(event.additional, diff);
  return [{ label: `${verb} additional messaging`, icon, verb, previous: diff, current: event.additional }]
}

export function external(event, diff) {
  const current = event.external.url;
  const previous = diff.link;
  const [verb, icon] = getTypeOfChange(current, previous);
  return [{ label: `${verb} more information link`, icon, verb, previous, current }];
}

export default {
  location, details, impacts, delays, restrictions, timing, schedule, conditions, additional, external
};

function getTypeOfChange(current, previous) {
  if (current && !previous) {
    return ['Added', faPlus];
  } else if (!current && previous) {
    return ['Removed', faMinus];
  }
  return ['Updated', faArrowsRotate];
}
