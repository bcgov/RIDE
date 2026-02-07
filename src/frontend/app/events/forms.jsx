import { Component } from 'react';

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCheckDouble, faCircleCheck, faTrashCan, faXmark } from '@fortawesome/pro-regular-svg-icons';

import Conditions from './Conditions.jsx';
import Details from './Details.jsx';
import Delays from './Delays.jsx';
import Scheduled from './Schedule.jsx';
import EventTiming from './Timing.jsx';
import Impacts from './Impacts.jsx';
import InternalNotes from './Internal.jsx';
import Location from './Location.jsx';
import Restrictions from './Restrictions.jsx';
import AdditionalMessaging from './Additional.jsx';
import External from './External.jsx';
import {
  CONDITIONS_FORMS, DELAYS_FORMS, DETAILS_FORMS, EXTERNAL_FORMS,
  FORM_PHRASE_CATEGORY, FORMS, IMPACTS_FORMS, INTERNAL_FORMS,
  RESTRICTIONS_FORMS, TIMING_FORMS,
} from './references.js';
import {
  convertToDateTimeLocalString as convert,
  g2ll,
} from "../components/Map/helpers";
import { addEvent } from '../components/Map/Layer.jsx';
import { getCookie } from './shared.jsx';
import { API_HOST } from '../env';
import { AuthContext } from '../contexts';
import { patch, getNextUpdate, getPendingNextUpdate } from '../shared/helpers.js';

import './forms.css';

const ONE_HOUR = 1000 * 60 * 60;
const ONE_WEEK = ONE_HOUR * 24 * 7

function getLater(severity) {
  if (!severity) { return null; }
  if (severity.startsWith('Major')) {
    return new Date(Date.now() + ONE_HOUR);
  } else if (severity.startsWith('Minor')) {
    return new Date(Date.now() + ONE_WEEK);
  }
  return null;
}

// SonarQube exemption from javascript:S2245 (weak encryption) because random()
// not used for security purposes (id is used for React keys)
const id = () => Math.random().toString(36).substr(2, 9); // NOSONAR

const numDaysOn = (schedule) => (
  days_of_the_week.reduce((numOn, day) => numOn + (schedule[day] ? 1 : 0), 0)
)

const days_of_the_week = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];

export function eventReducer(event, action) {
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

    case 'toggle days': {
      const schedule = structuredClone(event.timing.schedules[action.index]);
      delete schedule.error;
      const days = Array.isArray(action.days) ? action.days : [action.days];
      for (const day of days) {
        schedule[day] = action.value;
      }
      if (numDaysOn(schedule) > 0) {
        event.timing.schedules[action.index] = schedule;
      } else {
        event.timing.schedules[action.index].error = 'Must have at least one day selected';
      }
      return {...event};
    }

    case 'set days': {
      const schedule = event.timing.schedules[action.index];
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

    case 'set additional': {
      return { ...event, additional: action.value };
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

    case 'reset form': {
      if (event.showForm && !action.cancel) {
        return event; // disallow resetting if form is open
      }
      if (action.value) {
        const event = structuredClone(action.value);
        event.showPreview = !!action.showPreview;
        event.showForm = !!action.showForm;
        return event;
      } else if (action.showForm) {
        return { ...event, showPreview: false };
      } else {
        return getInitialEvent();
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

const LOCATION_BLANK = {
  name: null,
  alias: null,
  aliases: [],
  useAlias: true,
  other: null,
  useOther: false,
  nearby: null,
};

const SCHEDULE_BLANK = {
  type: 'week',
  allDay: true,
  startTime: null,
  endTime: null,
  mon: false,
  tue: false,
  wed: false,
  thu: false,
  fri: false,
  sat: false,
  sun: false,
}

function addId(obj) {
  obj.id = id();
  return obj;
}

export function getInitialEvent() {
  return {
    showPreview: true,
    showForm: false,
    id: null,
    status: 'Active',
    type: 'Incident',
    waypoints: [],
    location: {
      start: structuredClone(LOCATION_BLANK),
      end: structuredClone(LOCATION_BLANK),
    },
    details: {
      direction: 'Both directions',
      severity: 'Minor',
      category: null,
      situation: 0,
    },
    impacts: [],
    is_closure: false,
    delays: {
      amount: 0,
      unit: 'minutes',
    },
    restrictions: [],
    conditions: [],
    timing: {
      nextUpdate: convert(getLater('Minor')),
      nextUpdateTZ: 'PST',
      nextUpdateIsDefault: true,
      endTime: null,
      endTimeTZ: null,
      ongoing: true,
      startTime: null,
      schedules: [
        addId(structuredClone(SCHEDULE_BLANK)),
      ],
    },
    additional: '',
    external: { url: '' },
    notes: [],
  }
}


export default class EventForm extends Component {
  static contextType = AuthContext;

  constructor(props) {
    super(props);
    this.state = {
      errors: {},
    };
  }

  handleSubmit = (e, submitLabel) => {
    e.preventDefault();
    const err = {};
    const { event, map, dispatch, cancel, setMessage } = this.props;

    const form = structuredClone(event);

    const geometries = [{
      type: "Point",
      coordinates: form.location.start.coords,
    }];

    if (form.location.end?.name) {
      geometries.push({
        type: "Point",
        coordinates: form.location.end.coords,
      });
      let route = map.route.getGeometry().getCoordinates();
      if (route.length === 0) {
        route = event?.geometry?.geometries[2]?.coordinates;
      } else {
        route = route.map((pair) => g2ll(pair));
      }

      geometries.push({
        type: "Linestring",
        coordinates: route,
      });
    } else if (form.type !== 'Road condition' && form.type === 'ROAD_CONDITION' && !form.segment) {
      err['End location'] = 'An end location is required';
    } else {
      form.location.end = null;
    }
    form.geometry = {
      type: "GeometryCollection",
      geometries,
    };

    if (form.type !== 'Road condition' && form.type !== 'ROAD_CONDITION') {
      if (!form.details.direction) { err.direction = 'You must set a direction'; }
      if (!form.details.severity) { err.severity = 'You must set a severity'; }
      if (!form.details.category) { err.category = 'You must set a category'; }
      if (!form.details.situation) { err.situation = 'You must set a situation'; }

      if (form.impacts.length === 0) { err['Traffic Impacts'] = 'Must include at least one'; }
    } else if (form.conditions.length === 0) {
      err['Conditions'] = 'Must include at least one';
    }

    if (form.type === 'Incident') {
      if (!form.timing.nextUpdate && !form.timing.endTime) {
        err['Manage Timing By'] = 'Must set one or both';
      } else {
        if (form.timing.nextUpdate) {
          form.timing.nextUpdate = new Date(form.timing.nextUpdate).toISOString();
        }
        if (form.timing.endTime) {
          form.timing.endTime = new Date(form.timing.endTime).toISOString();
        }
      }
      form.timing.startTime = null;
      form.timing.schedules = [];
    } else if (form.type === 'Planned event') {
      form.timing.nextUpdate = null;
      if (!form.timing.startTime) {
        err.startTime = 'Must set start date';
      }
      if (!form.timing.ongoing && !form.timing.endTime) {
        err.endTime = 'Must set end date';
      }
      if (form.timing.startTime && form.timing.endTime) {
        const start = new Date(form.timing.startTime);
        const end = new Date(form.timing.endTime);
        if (end < start) {
          err.inEffect = 'End date cannot be earlier than start date';
        }
      }

      if (form.timing.startTime) {
        form.timing.startTime = new Date(form.timing.startTime).toISOString();
      }
      if (form.timing.endTime) {
        form.timing.endTime = new Date(form.timing.endTime).toISOString();
      }

      const scheduleErrors = form.timing.schedules.map((schedule) => {
        const errors = {};
        if (!schedule.allDay) {
          if (!schedule.startTime) {
            errors.startTime = 'Must set start time';
          }
          if (!schedule.endTime) {
            errors.endTime = 'Must set end time';
          }
        }
        return Object.keys(errors).length ? errors : null;
      }).filter(Boolean);
      if (scheduleErrors.length > 0) { err.schedules = scheduleErrors; }
    } else if (form.type === 'Road Condition' || form.type === 'ROAD_CONDITION') {
      form.type = 'ROAD_CONDITION';
      if (form.timing.nextUpdate) {
        form.timing.nextUpdate = new Date(form.timing.nextUpdate).toISOString();
      } else {
        err['nextUpdate'] = 'Next update time is required';
      }
      form.timing.startTime = null;
      form.timing.schedules = [];
    }

    // submitting existing notes with form gets an error because notes are
    // saved independently of the form, except on event creation where an
    // initial note may be included.
    if (form.id) { form.notes = []; }

    // user is always taken from the request
    delete form.user;

    this.setState({ errors: err });

    let label;
    switch(submitLabel) {
      case 'Publish':
        label = 'published';
        break;
      case 'Update':
        label = 'updated';
        break;
      case 'Clear':
        label = 'cleared';
        break;
      default:
        label = 'submitted';
    }

    if (Object.keys(err).length === 0) {
      fetch(`${API_HOST}/api/events${ event.id ? `/${event.id}` : '' }`, {
        method: event.id ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRFToken': getCookie('csrftoken')
        },
        credentials: 'include',
        body: JSON.stringify(form),
      }).then(response => response.json())
        .then(data => {
          const event_type = event.type === 'ROAD_CONDITION' ? 'Road condition' : event.type;
          cancel();
          addEvent(data, map);
          dispatch({ type: 'reset form' });
          setMessage(`${event_type} successfully ${label}`);
          setTimeout(() => setMessage(''), 5000);
        });
    } else {
      console.log('Errors', err);
    }
  }

  getLabel = () => {
    const { event } = this.props;
    const { authContext } = this.context;

    if (authContext.is_approver) {
      if (!event.approved && event.status === 'Inactive') { return 'Clear'; }
      return 'Publish';
    } else if (event.details.severity.startsWith('Minor') && !event.is_closure) {
      return event.id ? 'Update' : 'Publish';
    }
    return 'Submit for Approval';
  }

  render() {
    const { event, dispatch, preview, cancel, goToFunc, bulkRc } = this.props;
    const { errors } = this.state;

    const pendingNextUpdate = getPendingNextUpdate(event);

    return (
    <div className="form">
      <form id='event-form'>
        <div className="section form-header">
          <div className="title">

          { event.id
            ? <h4>Edit { event.type.toLowerCase() } <span className="event-id">{event.id} v{event.version}</span></h4>
            : <h4>
                Create&nbsp;
                <select
                  onChange={(e) => dispatch({
                    type: 'set type',
                    event_type: e.target.value })
                  }
                  defaultValue={event.type}>
                  {FORMS.map((form) => (<option key={form}>{form}</option>))}
                </select>
              </h4>

          }
          <button type="button" onClick={() => dispatch({ type: 'set', value: { showPreview: !event.showPreview } })}>
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640" width="20" height="20" fill="currentColor"><path d="M320 144C254.8 144 201.2 173.6 160.1 211.7C121.6 247.5 95 290 81.4 320C95 350 121.6 392.5 160.1 428.3C201.2 466.4 254.8 496 320 496C385.2 496 438.8 466.4 479.9 428.3C518.4 392.5 545 350 558.6 320C545 290 518.4 247.5 479.9 211.7C438.8 173.6 385.2 144 320 144zM127.4 176.6C174.5 132.8 239.2 96 320 96C400.8 96 465.5 132.8 512.6 176.6C559.4 220.1 590.7 272 605.6 307.7C608.9 315.6 608.9 324.4 605.6 332.3C590.7 368 559.4 420 512.6 463.4C465.5 507.1 400.8 544 320 544C239.2 544 174.5 507.2 127.4 463.4C80.6 419.9 49.3 368 34.4 332.3C31.1 324.4 31.1 315.6 34.4 307.7C49.3 272 80.6 220 127.4 176.6zM320 400C364.2 400 400 364.2 400 320C400 290.4 383.9 264.5 360 250.7C358.6 310.4 310.4 358.6 250.7 360C264.5 383.9 290.4 400 320 400zM240.4 311.6C242.9 311.9 245.4 312 248 312C283.3 312 312 283.3 312 248C312 245.4 311.8 242.9 311.6 240.4C274.2 244.3 244.4 274.1 240.5 311.5zM286 196.6C296.8 193.6 308.2 192.1 319.9 192.1C328.7 192.1 337.4 193 345.7 194.7C346 194.8 346.2 194.8 346.5 194.9C404.4 207.1 447.9 258.6 447.9 320.1C447.9 390.8 390.6 448.1 319.9 448.1C258.3 448.1 206.9 404.6 194.7 346.7C192.9 338.1 191.9 329.2 191.9 320.1C191.9 309.1 193.3 298.3 195.9 288.1C196.1 287.4 196.2 286.8 196.4 286.2C208.3 242.8 242.5 208.6 285.9 196.7z"/></svg>
            Preview
          </button>
          </div>
        </div>

        <div className="form-body">
          { event.location.start.name && <>
            <div className="section location">
              <Location errors={errors} event={event} dispatch={dispatch} goToFunc={goToFunc} />
            </div>

            { DETAILS_FORMS.includes(event.type) &&
              <div className="section details">
                <Details errors={errors} event={event} dispatch={dispatch} />
              </div>
            }

            { IMPACTS_FORMS.includes(event.type) &&
              <div className="section impacts">
                <Impacts errors={errors} event={event} dispatch={dispatch} />
              </div>
            }

            { DELAYS_FORMS.includes(event.type) &&
              <div className="section delays">
                <Delays errors={errors} event={event} dispatch={dispatch} />
              </div>
            }

            { RESTRICTIONS_FORMS.includes(event.type) &&
              <div className="section restrictions">
                <Restrictions errors={errors} event={event} dispatch={dispatch} />
              </div>
            }

            { CONDITIONS_FORMS.includes(event.type) &&
              <div className="section conditions">
                <Conditions errors={errors} event={event} dispatch={dispatch} />
              </div>
            }

            { TIMING_FORMS.includes(event.type) &&
              <div className="section timing">
                <EventTiming
                  errors={errors}
                  event={event}
                  dispatch={dispatch}
                  isRoadCondition={CONDITIONS_FORMS.includes(event.type)}
                />
              </div>
            }

            { event?.type === 'Planned event' &&
              <div className="section scheduled">
                <Scheduled errors={errors} event={event} dispatch={dispatch} />
              </div>
            }

            { event.type &&
              <div className="section additional">
                <AdditionalMessaging event={event} dispatch={dispatch} />
              </div>
            }

            { EXTERNAL_FORMS.includes(event.type) &&
              <div className="section external">
                <External event={event} dispatch={dispatch} />
              </div>
            }

            { INTERNAL_FORMS.includes(event.type) &&
              <div className="section internal">
                <InternalNotes event={event} dispatch={dispatch} />
              </div>
            }

            <div className="section buttons">
              <button type="button" onClick={(e) => this.handleSubmit(e, this.getLabel())}>
                  <FontAwesomeIcon icon={faCircleCheck} />
                {this.getLabel()}
              </button>

              { event.id && event.type === 'ROAD_CONDITION' &&
                <button
                  type="button"
                  className={`secondary ${pendingNextUpdate ? '' : 'disabled'}`}
                  onClick={() => {
                    if (pendingNextUpdate) {
                      patch(
                        `${API_HOST}/api/events/${event.id}`,
                        { timing: { nextUpdate: pendingNextUpdate.toISOString() } },
                      ).then((event) => {
                        dispatch({ type: 'reset form', cancel: true, value: event, showPreview: true, showForm: false });
                      });
                    }
                  }}
                >
                  <FontAwesomeIcon icon={faCheckDouble} />
                  Reconfirm
                </button>
              }

              { event.id && event.type === 'ROAD_CONDITION' &&
                <button
                  type="button"
                  className="secondary"
                  onClick={() => {
                    patch(
                      `${API_HOST}/api/events/${event.id}`,
                      { status: 'Inactive' },
                    ).then((updatedEvent) => {
                      dispatch({ type: 'reset form', cancel: true, value: updatedEvent, showPreview: true, showForm: false });
                    });
                  }}
                >
                  <FontAwesomeIcon icon={faTrashCan} />
                  Clear
                </button>
              }

              <button type="button" className="cancel" onClick={cancel}>
                  <FontAwesomeIcon icon={faXmark} />
                Cancel
              </button>
            </div>
          </>}

        </div>
      </form>
    </div>
    );
  }
}
