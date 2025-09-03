import { useCallback, useState, useRef } from 'react';

import { getTransform } from 'ol/proj';

import Conditions from './Conditions.jsx';
import Details from './Details.jsx';
import Delays from './Delays.jsx';
import EventTiming from './Timing.jsx';
import Impacts from './Impacts.jsx';
import InternalNotes from './Internal.jsx';
import Location from './Location.jsx';
import Restrictions from './Restrictions.jsx';
import AdditionalMessaging from './Additional.jsx';
import External from './External.jsx';
import {
  CONDITIONS_FORMS, DELAYS_FORMS, DETAILS_FORMS, FORM_PHRASE_CATEGORY,
  FORMS, IMPACTS_FORMS, RESTRICTIONS_FORMS,
} from './references.js';
import { convertToDateTimeLocalString as convert } from "../components/Map/helpers";

import './forms.css';

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

export function eventReducer(event, action) {
  switch (action.type) {
    case 'set': {
      if (!Array.isArray(action.value)) { action.value = [action.value]; }
      action.value.forEach((value) => {
        event[value.section] = {
          ...event[value.section],
          ...value,
        }
        delete event[value.section].section;
      });
      return Object.assign({}, event);
    }
    case 'set start': {
      event.location.start = { ...event.location.start, ...action.value };
      return Object.assign({}, event);
    }
    case 'set end': {
      event.location.end = { ...event.location.end, ...action.value };
      return Object.assign({}, event);
    }
    case 'set alias': {
      event.location[action.key].alias = action.value;
      return Object.assign({}, event);
    }
    case 'toggle alias': {
      event.location[action.key].useAlias = action.value;
      return Object.assign({}, event);
    }
    case 'set other': {
      event.location[action.key].other = action.value;
      return Object.assign({}, event);
    }

    case 'toggle checked': {
      const nearby = event.location[action.key].nearby[action.value];
      nearby.include = !action.checked;
      return Object.assign({}, event);
    }
    case 'toggle other': {
      event.location[action.key].useOther = !action.checked;
      return Object.assign({}, event);
    }

    case 'set severity': {
      event.details.severity = action.value;
      if (event.timing.nextUpdateIsDefault) {
        event.timing.nextUpdate = convert(getLater(action.value));
      }
      return Object.assign({}, event);
    }
    case 'set category': {
      if (action.value === action.previous) { return event; }
      event.details.category = action.value;
      event.details.situation = null;
      return Object.assign({}, event);
    }
    case 'set situation': {
      event.details.situation = action.value;
      if (!event.details.category) {
        event.details.category = FORM_PHRASE_CATEGORY[event.type][action.value];
      }
      return Object.assign({}, event);
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
      return Object.assign({}, event, {[action.section]: items});
    }
    case 'remove from list': {
      return {
        ...event,
        [action.section]: event[action.section].filter((item) => item.id !== action.id)
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
      return Object.assign({}, event, {[action.section]: items});
    }
    case 'change order': {
      event[action.section] = action.value;
      return Object.assign({}, event);
    }
    case 'set additional': {
      return { ...event, additional: action.value };
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
      return getInitialEvent();
    }

    default: {
      throw Error('Unrecognized action: ' + action?.type);
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
  nearby: [],
};

export function getInitialEvent() {
  return {
    id: null,
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
      situation: null,
    },
    impacts: [],
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
    },
    additional: '',
    external: { url: '' },
  }
}


export default function EventForm({ map, preview, cancel, event, dispatch, goToFunc }) {

  const [errors, setErrors] = useState({});
  const [severity, setSeverity] = useState('Minor');
  const [category, setCategory] = useState();
  const [formType, setFormType] = useState('Incident');

  const transform = getTransform(map.getView().getProjection().getCode(), 'EPSG:4326');

  const handleSubmit = (e) => {
    e.preventDefault();
    const err = {};

    if (formType !== 'condition') {
      if (!event.details.direction) { err.direction = true; }
      if (!event.details.severity) { err.severity = true; }
      if (!event.details.category) { err.category = true; }
      if (!event.details.situation) { err.situation = true; }

      if (event.impacts.length === 0) { err['Traffic Impacts'] = 'Must include at least one'; }
    }

    if (!event.timing.nextUpdate && !event.timing.endTime) {
      err['Manage Timing By'] = 'Must set one or both';
    }
    setErrors(err);
    console.log(event);

    if (Object.keys(err).length === 0) {
      // post form to backend
    }
  }

  const getLabel = () => severity.startsWith('Minor') ? 'Publish' : 'Submit';

  return (
    <div className="form">
      <form onSubmit={handleSubmit} id='event-form'>
        <div className="section form-header">
          <div className="title">

          <h4>
            Create&nbsp;
            <select name="formType" onChange={(e) => setFormType(e.target.value)} defaultValue={formType}>
              {FORMS.map((form) => (<option key={form}>{form}</option>))}
            </select>
          </h4>
          <button type="button" onClick={preview}>
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640" width="20" height="20" fill="currentColor"><path d="M320 144C254.8 144 201.2 173.6 160.1 211.7C121.6 247.5 95 290 81.4 320C95 350 121.6 392.5 160.1 428.3C201.2 466.4 254.8 496 320 496C385.2 496 438.8 466.4 479.9 428.3C518.4 392.5 545 350 558.6 320C545 290 518.4 247.5 479.9 211.7C438.8 173.6 385.2 144 320 144zM127.4 176.6C174.5 132.8 239.2 96 320 96C400.8 96 465.5 132.8 512.6 176.6C559.4 220.1 590.7 272 605.6 307.7C608.9 315.6 608.9 324.4 605.6 332.3C590.7 368 559.4 420 512.6 463.4C465.5 507.1 400.8 544 320 544C239.2 544 174.5 507.2 127.4 463.4C80.6 419.9 49.3 368 34.4 332.3C31.1 324.4 31.1 315.6 34.4 307.7C49.3 272 80.6 220 127.4 176.6zM320 400C364.2 400 400 364.2 400 320C400 290.4 383.9 264.5 360 250.7C358.6 310.4 310.4 358.6 250.7 360C264.5 383.9 290.4 400 320 400zM240.4 311.6C242.9 311.9 245.4 312 248 312C283.3 312 312 283.3 312 248C312 245.4 311.8 242.9 311.6 240.4C274.2 244.3 244.4 274.1 240.5 311.5zM286 196.6C296.8 193.6 308.2 192.1 319.9 192.1C328.7 192.1 337.4 193 345.7 194.7C346 194.8 346.2 194.8 346.5 194.9C404.4 207.1 447.9 258.6 447.9 320.1C447.9 390.8 390.6 448.1 319.9 448.1C258.3 448.1 206.9 404.6 194.7 346.7C192.9 338.1 191.9 329.2 191.9 320.1C191.9 309.1 193.3 298.3 195.9 288.1C196.1 287.4 196.2 286.8 196.4 286.2C208.3 242.8 242.5 208.6 285.9 196.7z"/></svg>
            Preview
          </button>
          </div>
        </div>

        <div className="form-body">

          { event.location.start.name && <>
            <div className="section location">
              <Location event={event} dispatch={dispatch} goToFunc={goToFunc} />
            </div>

            { DETAILS_FORMS.includes(formType) &&
              <div className="section details">
                <Details errors={errors} event={event} dispatch={dispatch} />
              </div>
            }

            { IMPACTS_FORMS.includes(formType) &&
              <div className="section impacts">
                <Impacts errors={errors} event={event} dispatch={dispatch} />
              </div>
            }

            { DELAYS_FORMS.includes(formType) &&
              <div className="section delays">
                <Delays errors={errors} event={event} dispatch={dispatch} />
              </div>
            }

            { RESTRICTIONS_FORMS.includes(formType) &&
              <div className="section restrictions">
                <Restrictions errors={errors} event={event} dispatch={dispatch} />
              </div>
            }

            { CONDITIONS_FORMS.includes(formType) &&
              <div className="section conditions">
                <Conditions errors={errors} event={event} dispatch={dispatch} />
              </div>
            }

            { formType &&
              <div className="section timing">
                <EventTiming
                  errors={errors}
                  severity={severity}
                  formType={formType}
                  event={event}
                  dispatch={dispatch}
                />
              </div>
            }

            { formType &&
              <div className="section additional">
                <AdditionalMessaging event={event} dispatch={dispatch} />
              </div>
            }

            { formType &&
              <div className="section external">
                <External event={event} dispatch={dispatch} />
              </div>
            }

            { formType &&
              <div className="section internal">
                <InternalNotes />
              </div>
            }
          </> }

          { event.location.start.name && (
            <div className="section buttons">
              <button type="submit">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640" width="20" height="20" fill="currentColor"><path d="M320 112C434.9 112 528 205.1 528 320C528 434.9 434.9 528 320 528C205.1 528 112 434.9 112 320C112 205.1 205.1 112 320 112zM320 576C461.4 576 576 461.4 576 320C576 178.6 461.4 64 320 64C178.6 64 64 178.6 64 320C64 461.4 178.6 576 320 576zM404.4 276.7C411.4 265.5 408 250.7 396.8 243.6C385.6 236.5 370.8 240 363.7 251.2L302.3 349.5L275.3 313.5C267.3 302.9 252.3 300.7 241.7 308.7C231.1 316.7 228.9 331.7 236.9 342.3L284.9 406.3C289.6 412.6 297.2 416.2 305.1 415.9C313 415.6 320.2 411.4 324.4 404.6L404.4 276.6z"/></svg>
                {getLabel()}
              </button>
              <button type="button" className="cancel" onClick={cancel}>
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640" width="20" height="20" fill="currentColor"><path d="M135.5 169C126.1 159.6 126.1 144.4 135.5 135.1C144.9 125.8 160.1 125.7 169.4 135.1L320.4 286.1L471.4 135.1C480.8 125.7 496 125.7 505.3 135.1C514.6 144.5 514.7 159.7 505.3 169L354.3 320L505.3 471C514.7 480.4 514.7 495.6 505.3 504.9C495.9 514.2 480.7 514.3 471.4 504.9L320.4 353.9L169.4 504.9C160 514.3 144.8 514.3 135.5 504.9C126.2 495.5 126.1 480.3 135.5 471L286.5 320L135.5 169z"/></svg>
                Cancel
              </button>
            </div>
          )}
        </div>
      </form>
    </div>
  );
}
