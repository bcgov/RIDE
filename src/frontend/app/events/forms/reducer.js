import { LOCATION_BLANK, SCHEDULE_BLANK, getInitialEvent, getLater, days_of_the_week } from './index';
import { FORM_PHRASE_CATEGORY } from '../references';
import { getNextUpdate } from '../../shared/helpers';
import {
  convertToDateTimeLocalString as convert,
} from "../../components/Map/helpers";

function ensurePendingSet(point) {
  if (!(point.pending instanceof Set)) {
    point.pending = new Set();
  }
}

// SonarQube exemption from javascript:S2245 (weak encryption) because random()
// not used for security purposes (id is used for React keys)
const id = () => Math.random().toString(36).substr(2, 9); // NOSONAR

function addId(obj) {
  obj.id = id();
  return obj;
}

const numDaysOn = (schedule) => (
  days_of_the_week.reduce((numOn, day) => numOn + (schedule[day] ? 1 : 0), 0)
)

export default function eventReducer(event, action) {
  switch (action.type) {
    case 'update event': {
      if (event.id !== action.value.id) { return event; }
      return {...event, ...action.value};
    }

    case 'set': {
      if (!Array.isArray(action.value)) { action.value = [action.value]; }
      action.value.forEach((value) => {
        if (value.section) {
          event[value.section] = { ...event[value.section], ...value,}
          delete event[value.section].section;
        } else {
          event = { ...event, ...value, }
        }
      });
      return {...event};
    }

    case 'set type': {
      if (action.event_type === 'Road condition') {
        event.type = 'ROAD_CONDITION';
        event.timing.nextUpdate = getNextUpdate();
      } else {
        event.type = action.event_type;
        event.timing.nextUpdate = getLater(event.details.severity);
      }
      event.timing.nextUpdateIsDefault = true;
      return {...event};
    }

    case 'set start': {
      event.location.start = { ...event.location.start, ...action.value };
      return {...event};
    }
    case 'set end': {
      event.location.end = { ...LOCATION_BLANK, ...event.location.end, ...action.value };
      return {...event};
    }
    case 'set alias': {
      event.location[action.key].alias = action.value;
      return {...event};
    }
    case 'toggle alias': {
      event.location[action.key].useAlias = action.value;
      return {...event};
    }
    case 'set other': {
      event.location[action.key].other = action.value;
      return {...event};
    }

    case 'toggle checked': {
      const nearby = event.location[action.key].nearby[action.value];
      nearby.include = !action.checked;
      return {...event};
    }
    case 'toggle other': {
      event.location[action.key].useOther = !action.checked;
      return {...event};
    }

    case 'add nearby': {
      if (event.location[action.key].nearby.filter((nearby) => nearby.id === action.candidate.id).length === 0) {
        event.location[action.key].nearby.push(structuredClone(action.candidate));
      }
      return {...event};
    }

    case 'remove nearby': {
      event.location[action.key].nearby = event.location[action.key].nearby.filter((nearby) => nearby.id !== action.id);
      return {...event};
    }

    case 'add to pending': {
      const point = event.location[action.subkey];
      ensurePendingSet(point);
      point.pending.add(action.value);
      return {...event}
    }

    case 'add candidates': {
      const point = event.location[action.subkey];

      let candidates = (point.candidates || []).filter((c) => c.source !== action.source);
      candidates.push(...action.value)
      candidates.sort((a, b) => a.distance - b.distance);
      point.candidates = candidates;

      if (action.value.length === 0) {
        point.nearby = point.nearby.filter((nearby) => nearby.source !== action.source);
      } else {
        // update existing nearbies
        if (action.source === 'municipalities') {
          if (action.value[0].id === 'municipality-error') {
            if (point.nearby[0]?.source === 'municipalities') {
              point.nearby.shift(); // municipality wasn't returned, so remove it.
            }
          } else if (point.nearby[0]?.id !== action.value[0]?.id) {
            if (point.nearby[0]?.source === 'municipalities') {
              // municipality in nearby is outdated, so update it.
              Object.assign(point.nearby[0], action.value[0]);
            } else if (action.value[0].id !== 'municipality-error') {
              point.nearby.unshift(action.value[0]);
            }
          }
        } else {
          for (const candidate of action.value) {
            point.nearby.forEach((nearby) => {
              if (nearby.id === candidate.id) {
                Object.assign(nearby, candidate);
              }
            })
          }
        }
      }

      // remove pending flag
      ensurePendingSet(point);
      point.pending.delete(action.source);

      return {...event};
    }

    case 'add searched': {
      const point = event.location[action.subkey];

      let searched = (point.searched || []).filter((c) => c.source !== action.source);
      searched.push(...action.value)
      searched.sort((a, b) => a.distance - b.distance);
      point.searched = searched;

      // update existing nearbies
      for (const candidate of action.value) {
        point.nearby.forEach((nearby) => {
          if (nearby.id === candidate.id) {
            Object.assign(nearby, candidate);
          }
        })
      }

      // remove pending flag
      ensurePendingSet(point);
      point.pending.delete(action.source);

      return {...event};
    }

    case 'reset searched': {
      const point = event.location[action.subkey];
      point.search = '';
      point.searched = [];
      return {...event};
    }

    case 'set search': {
      const point = event.location[action.subkey];
      point.search = action.search;
      point.searched = [];
      return {...event};
    }

    case 'toggle days': {
      const schedule = structuredClone(event.timing.schedules[action.index]);
      delete schedule.error;
      const days = Array.isArray(action.days) ? action.days : [action.days];
      for (const day of days) {
        schedule[day] = action.value;
      }
      if (numDaysOn(schedule) === 0) {
        schedule.error = 'Must have at least one day selected';
      }
      event.timing.schedules[action.index] = schedule;
      return {...event};
    }

    case 'set days': {
      const schedule = event.timing.schedules[action.index];
      delete schedule.error;
      for (const day of days_of_the_week) { schedule[day] = false; }
      const days = Array.isArray(action.days) ? action.days : [action.days];
      for (const day of days) { schedule[day] = true; }
      return {...event};
    }

    case 'set schedule': {
      const schedule = event.timing.schedules[action.index];
      event.timing.schedules[action.index] = { ...schedule, ...action.value };
      return {...event};
    }

    case 'remove schedule': {
      event.timing.schedules = event.timing.schedules.filter((s) => s.id !== action.id);
      return {...event};
    }

    case 'add schedule': {
      if (event.timing.schedules.length === action.currentLength) {
        event.timing.schedules.push(addId(structuredClone(SCHEDULE_BLANK)));
      }
      return {...event};
    }

    case 'set severity': {
      event.details.severity = action.value;
      if (event.timing.nextUpdateIsDefault) {
        event.timing.nextUpdate = convert(getLater(action.value));
      }
      return {...event};
    }

    case 'set category': {
      if (action.value === action.previous) { return event; }
      event.details.category = action.value;
      event.details.situation = null;
      return {...event};
    }

    case 'set situation': {
      event.details.situation = action.value;
      if (!event.details.category) {
        event.details.category = FORM_PHRASE_CATEGORY[event.type][action.value];
      }
      return {...event};
    }

    case 'update list': {
      let found = false;
      const items = event[action.section].map((item) => {
        if (item.id === action.id) {
          found = true;
          return action.value;
        }
        return item;
      })
      if (!found) {
        items.push(action.value);
      }
      if (action.section === 'impacts') {
        event.is_closure = items.filter((item) => item.closed).length > 0;
      }
      return {...event, [action.section]: items};
    }

    case 'remove from list': {
      const items = event[action.section].filter((item) => item.id !== action.id);
      if (action.section === 'impacts') {
        event.is_closure = items.filter((item) => item.closed).length > 0;
      }
      return {
        ...event,
        [action.section]: items,
      };
    }
    case 'update item': {
      // event[action.section] = event[action.section].filter((item) => item.id !== action.id)
      const items = event[action.section].map((item) => {
        if (item.id === action.id) {
          return { ...item, ...action.value };
        }
        return item;
      })
      return {...event, [action.section]: items};
    }

    case 'change order': {
      let obj = event;
      let segments = action.section.split('.');
      const final = segments.pop();
      for (const segment of segments) { obj = obj[segment]; }
      obj[final] = action.value;
      return {...event};
    }

    case 'change nearby order': {
      event.location[action.subkey].nearby = action.value;
      return {...event};
    }

    case 'set additional': {
      return { ...event, additional: action.value };
    }

    case 'set preview': {
      return { ...event, preview: action.value };
    }

    case 'set note': {
      return { ...event, notes: [{ text: action.value }] };
    }

    case 'remove location': {
      event.location[action.key] = structuredClone(LOCATION_BLANK);
      return { ...event };
    }

    case 'swap location': {
      event.location[action.target] = action.value;
      event.location[action.source] = structuredClone(LOCATION_BLANK);
      return { ...event };
    }

    case 'swap locations': {
      event.location.start = action.start;
      event.location.end = action.end;
      return { ...event };
    }

    case 'reset form': {
      if (event.showForm && !action.cancel) {
        return event; // disallow resetting if form is open
      }
      if (action.value) {
        const event = structuredClone(typeof(action.value) === 'function' ? action.value() : action.value);
        event.showPreview = !!action.showPreview;
        event.showForm = !!action.showForm;
        event.showHistory = !!action.showHistory;
        return event;
      } else if (action.showForm) {
        return { ...event, showPreview: false };
      } else {
        return getInitialEvent();
      }
    }

    case 'show history': {
      if (action.show) {
        return { ...event, showForm: false, showHistory: true };
      } else {
        return { ...event, showForm: true, showHistory: false, preview: null };
      }
    }

    case 'add note': {
      const notes = [action.value, ... event.notes];
      return { ...event, notes }
    }

    case 'update note': {
      const notes = event.notes.map((note) => (
        note.id === action.value.id ? action.value : note
      ));
      return { ...event, notes }
    }

    case 'remove note': {
      const notes = event.notes.filter((note) => note.id !== action.value.id );
      return { ...event, notes }
    }

    default: {
      throw new Error('Unrecognized action: ' + action?.type);
    }
  }
}
