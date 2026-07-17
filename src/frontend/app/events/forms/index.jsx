import { Component, createRef } from 'react';
import { connect } from 'react-redux';

import * as turf from '@turf/turf';

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faCheckDouble, faCircleCheck, faCircleX, faTrashCan, faXmark
} from '@fortawesome/pro-regular-svg-icons';

import { getVisibility } from '../../components/Map/layers/Events';

import { set } from '../../slices';

import Conditions from './Conditions';
import Details from './Details';
import Delays from './Delays';
import Scheduled from './Schedule';
import EventTiming from './Timing';
import Impacts from './Impacts';
import InternalNotes from './Internal';
import Location from './Location';
import Restrictions from './Restrictions';
import AdditionalMessaging from './Additional';
import External from './External';
import {
  CONDITIONS_FORMS, DELAYS_FORMS, DETAILS_FORMS, EXTERNAL_FORMS,
  IMPACTS_FORMS, INTERNAL_FORMS, RESTRICTIONS_FORMS, TIMING_FORMS,
} from '../references';

import {
  convertToDateTimeLocalString as convert, g2ll,
} from "../../components/Map/helpers";
import { addEvent } from '../../components/Map/layers/Events';
import { getCookie } from '../shared';
import { API_HOST, CLEARING_TIMEOUT } from '../../env';
import { AuthContext } from '../../contexts';
import { patch, getPendingNextUpdate } from '../../shared/helpers';
import Tabs from '../../shared/Tabs';
import History from '../History/History';

import './forms.scss';

const ONE_HOUR = 1000 * 60 * 60;
export const INVALID_ADDITIONAL_CHARACTERS = /[<>[\]{}\\|~`!@#$%^&*()_+=]/;

export function getLater(severity) {
  if (!severity) { return null; }
  if (severity.startsWith('Major')) {
    return new Date(Date.now() + ONE_HOUR);
  } else if (severity.startsWith('Minor')) {
    return new Date(Date.now() + ONE_HOUR * 3); // DBC22-5438
  }
  return null;
}

export const days_of_the_week = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];

export const LOCATION_BLANK = {
  name: null,
  alias: null,
  aliases: [],
  useAlias: true,
  other: null,
  useOther: false,
  nearby: [],
  nearbyPending: false,
  nearbyError: '',
  candidates: [],
  search: '',
  searched: [],
  retrieved: [],
};

export const SCHEDULE_BLANK = {
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


export function getInitialEvent(eventType = 'Incident') {
  return {
    showPreview: true,
    showForm: false,
    id: null,
    status: 'Active',
    type: eventType,
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
      schedules: [],
    },
    additional: '',
    external: { url: '' },
    notes: [],
  }
}


function getLabel(eventType) {
  switch (eventType) {
    case 'Incident':
    case 'Planned event':
    case 'Road condition':
      return eventType.toLowerCase();
    case 'ROAD_CONDITION':
      return 'road condition';
  }
}


function getVisibilityLayer(event) {
  if (event.is_closure) {
    return 'closures';

  } else if (['Road condition', 'ROAD_CONDITION'].includes(event.type)) {
    return 'roadConditions';

  } else if (event.type === 'CHAIN_UP') {
    return 'chainups';

  } else if (event.timing?.startTime && new Date(event.timing.startTime) > new Date()) {
    return 'future';

  } else if (event.type === 'Incident' || event.type === 'Planned event') {
    return event.details.severity.toLowerCase();
  }
}

export class EventForm extends Component {
  static contextType = AuthContext;

  constructor(props) {
    super(props);
    this.state = {
      errors: {},
    };
    this.modalRef = createRef();
  }

  handleSubmit = (e, submitLabel, overrides={}) => {
    e.preventDefault();
    const err = {};
    const { event, map, dispatch, visibleLayers, cancel, setAlertContext, computed } = this.props;

    const form = {...structuredClone(event), ...overrides};

    // DBC22-6428: Default delays to 0 if null
    if (form.delays && (form.delays.amount == null || form.delays.amount === '')) form.delays.amount = 0;

    const now = new Date();
    now.setMinutes(now.getMinutes() + 2);
    now.setSeconds(0);
    now.setMilliseconds(0);

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

    if (form.location.start?.candidates) {
      delete form.location.start.candidates;
    }
    if (form.location.end?.candidates) {
      delete form.location.end.candidates;
    }

    if (form.type !== 'Road condition' && form.type !== 'ROAD_CONDITION') {
      if (!form.details.direction) { err.direction = 'You must set a direction'; }
      if (!form.details.severity) { err.severity = 'You must set a severity'; }
      if (!form.details.category) { err.category = 'You must set a category'; }
      if (!form.details.situation) { err.situation = 'You must set a situation'; }
    } else if (form.conditions.length === 0) {
      err['Conditions'] = 'Must include at least one';
    }

    if (form.additional && INVALID_ADDITIONAL_CHARACTERS.test(form.additional)) {
      err.additional = 'Contains unsupported special characters';
    }

    if (form.type === 'Incident') {
      if (!form.timing.nextUpdate && !form.timing.endTime) {
        err['Manage Timing By'] = 'Must set one or both';
      } else {
        if (form.timing.nextUpdate) {
          const nextUpdate = new Date(form.timing.nextUpdate);
          if (nextUpdate < now) {
            err['nextUpdate'] = 'Must be in the future';
          } else {
            form.timing.nextUpdate = nextUpdate.toISOString();
          }
        }
        if (form.timing.endTime) {
          const endTime = new Date(form.timing.endTime);
          if (endTime < now) {
            err['endTime'] = 'Must be in the future';
          } else {
            form.timing.endTime = endTime.toISOString();
          }
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
      if (!form.timing.ongoing && form.timing.endTime) {
        form.timing.endTime = new Date(form.timing.endTime).toISOString();
      } else {
        form.timing.endTime = null;
      }

      const scheduleErrors = form.timing.schedules.map((schedule) => {
        const errors = {};
        if (days_of_the_week.filter((day) => schedule[day]).length === 0) {
          errors.item = "Must have at least one day selected";
        }
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
        const nextUpdate = new Date(form.timing.nextUpdate);
        if (nextUpdate < now) {
          err['nextUpdate'] = 'Must be in the future';
        } else {
          form.timing.nextUpdate = nextUpdate.toISOString();
        }
      } else {
        err['nextUpdate'] = 'Next update time is required';
      }
      form.timing.startTime = null;
      form.timing.schedules = [];
    }

    const parts = form.external?.url?.split('//').filter(Boolean);
    if (parts.length === 1 ||
        (parts[0] && !['http:', 'https:'].includes(parts[0].toLowerCase()))) {
      err['external'] = 'Must be a valid link';
    }

    // DBC22-6688 ivr char limit, to be updated to 2000 as Open511 updates
    const ivr = computed?.ivr || '';
    if (ivr.length > 480) {
      err['ivr'] = `IVR message exceeds 480 characters (currently ${ivr.length}).`;
    }

    // submitting existing notes with form gets an error because notes are
    // saved independently of the form, except on event creation where an
    // initial note may be included.
    if (form.id) { form.notes = []; }

    // user is always taken from the request
    delete form.user;
    delete form.segment;

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
      case 'Reject Clear':
        label = 'clearing rejected'
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

      }).then(response => response.json().then(data => ({ ok: response.ok, data })))
        .then(({ ok, data }) => {
          if (!ok) {
            const prefix = data?.open511 ? 'Sync to Open511 failed: ' : '';
            const messages = data?.open511 || [data?.detail || 'Could not save event'];
            console.error(data);
            setAlertContext?.({ message: `${prefix}${messages.join('\n')}` });
            return;
          }

          const event_type = event.type === 'ROAD_CONDITION' ? 'Road condition' : event.type;
          cancel();
          const key = getVisibilityLayer(event);
          dispatch(set({[key]: true}));
          addEvent(data, map, this.props.eventDispatch, visibleLayers);
          this.props.eventDispatch({ type: 'reset form' });
          setAlertContext({
            type: 'success',
            message: `${event_type} successfully ${label}`,
          });
        });

    } else {
      if (err.ivr) { setAlertContext?.({ message: err.ivr }); }
      console.log('Errors', err);
    }
  }

  getLabel = () => {
    const { event } = this.props;
    const { authContext } = this.context;

    if (authContext.is_approver) {
      if (!event.approved && event.status === 'Inactive') { return 'Clear'; }
      return event.id ? 'Update' : 'Publish';

    } else if (event.details.severity.startsWith('Minor') && !event.is_closure && !event.was_closure) {
      return event.id ? 'Update' : 'Publish';
    }

    return 'Request approval';
  }

  componentDidUpdate() {
    document.querySelector('.error')?.parentNode?.scrollIntoView(true);
  }

  clearEvent = (id) => {
    this.modalRef.current?.close();
    patch(
      `${API_HOST}/api/events/${id}`,
      { status: 'Inactive' },

    ).then((updatedEvent) => {
      this.props.map.get('events').getSource().get(id).set('raw', updatedEvent);
      this.props.eventDispatch({ type: 'reset form', cancel: true, value: updatedEvent, showPreview: true, showForm: false });
      this.props.setAlertContext({
        type: 'success',
        message: updatedEvent.approved ? 'Event cleared' : 'Event clearing requested',
      });
      setTimeout(() => {
        const feature = this.props.map.get('events').getSource().get(id);
        feature.set('visible', getVisibility(updatedEvent, this.props.visibleLayers));
        feature.updateStyles();
        feature.changed();
      }, CLEARING_TIMEOUT + 1000);

    }).catch((error) => {
      this.props.setAlertContext?.({ message: error.message });
    });
  }

  render() {
    const { event, eventDispatch, cancel, goToFunc, serviceAreaBoundaries } = this.props;
    const { errors } = this.state;

    const { authContext } = this.context;

    const needsApproval = (event?.is_closure || event?.details?.severity === 'Major') && !authContext?.is_approver;

    // User can only edit events within the service area that contains the event start point.
    let canEditStartPoint = !!authContext?.is_approver;
    if (!canEditStartPoint && event?.location?.start?.coords && serviceAreaBoundaries) {
      const userAreaIds = new Set((authContext?.service_areas || []).map((id) => String(id)));
      const authorizedBoundaries = Object.values(serviceAreaBoundaries || {}).filter((boundary) => (
        boundary?.geometry && userAreaIds.has(String(boundary.id))
      ));

      let startCoords = event.location.start.coords;
      if (Array.isArray(startCoords?.[0])) { startCoords = startCoords[0]; }

      canEditStartPoint = authorizedBoundaries.length > 0 && authorizedBoundaries.some((boundary) =>
        turf.booleanPointInPolygon(startCoords, boundary.geometry)
      );
    }

    const pendingNextUpdate = getPendingNextUpdate(event);

    return (
    <div className="form">
      <form id='event-form'>
        <div className="section form-header">
          <div className="title">
            <h4>{event.id ? 'Edit' : 'Create'} { getLabel(event.type) }</h4>

            <button type="button" onClick={() => eventDispatch({ type: 'set', value: { showPreview: !event.showPreview } })}>
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640" width="20" height="20" fill="currentColor"><path d="M320 144C254.8 144 201.2 173.6 160.1 211.7C121.6 247.5 95 290 81.4 320C95 350 121.6 392.5 160.1 428.3C201.2 466.4 254.8 496 320 496C385.2 496 438.8 466.4 479.9 428.3C518.4 392.5 545 350 558.6 320C545 290 518.4 247.5 479.9 211.7C438.8 173.6 385.2 144 320 144zM127.4 176.6C174.5 132.8 239.2 96 320 96C400.8 96 465.5 132.8 512.6 176.6C559.4 220.1 590.7 272 605.6 307.7C608.9 315.6 608.9 324.4 605.6 332.3C590.7 368 559.4 420 512.6 463.4C465.5 507.1 400.8 544 320 544C239.2 544 174.5 507.2 127.4 463.4C80.6 419.9 49.3 368 34.4 332.3C31.1 324.4 31.1 315.6 34.4 307.7C49.3 272 80.6 220 127.4 176.6zM320 400C364.2 400 400 364.2 400 320C400 290.4 383.9 264.5 360 250.7C358.6 310.4 310.4 358.6 250.7 360C264.5 383.9 290.4 400 320 400zM240.4 311.6C242.9 311.9 245.4 312 248 312C283.3 312 312 283.3 312 248C312 245.4 311.8 242.9 311.6 240.4C274.2 244.3 244.4 274.1 240.5 311.5zM286 196.6C296.8 193.6 308.2 192.1 319.9 192.1C328.7 192.1 337.4 193 345.7 194.7C346 194.8 346.2 194.8 346.5 194.9C404.4 207.1 447.9 258.6 447.9 320.1C447.9 390.8 390.6 448.1 319.9 448.1C258.3 448.1 206.9 404.6 194.7 346.7C192.9 338.1 191.9 329.2 191.9 320.1C191.9 309.1 193.3 298.3 195.9 288.1C196.1 287.4 196.2 286.8 196.4 286.2C208.3 242.8 242.5 208.6 285.9 196.7z"/></svg>
              Preview
            </button>
          </div>
          { event.id && <div className="subtitle">{event.id} v{event.version}</div> }
        </div>

        <Tabs
          onChange={(tabName) => {
            eventDispatch({ type: 'show history', show: tabName === 'history' });
          }}>

          {canEditStartPoint &&
            <Tabs.Tab
              name='edit'
              label='Edit event'>

              <div className="form-container">
                <div className="form-body">
                  { event.location.start.name && <>
                    <div className="section location">
                      <Location errors={errors} event={event} dispatch={eventDispatch} goToFunc={goToFunc} map={this.props.map} />
                    </div>

                    { DETAILS_FORMS.includes(event.type) &&
                      <div className="section details">
                        <Details errors={errors} event={event} dispatch={eventDispatch} />
                      </div>
                    }

                    { IMPACTS_FORMS.includes(event.type) &&
                      <div className="section impacts">
                        <Impacts errors={errors} event={event} dispatch={eventDispatch} />
                      </div>
                    }

                    { DELAYS_FORMS.includes(event.type) &&
                      <div className="section delays">
                        <Delays errors={errors} event={event} dispatch={eventDispatch} />
                      </div>
                    }

                    { RESTRICTIONS_FORMS.includes(event.type) &&
                      <div className="section restrictions">
                        <Restrictions errors={errors} event={event} dispatch={eventDispatch} />
                      </div>
                    }

                    { CONDITIONS_FORMS.includes(event.type) &&
                      <div className="section conditions">
                        <Conditions errors={errors} event={event} dispatch={eventDispatch} />
                      </div>
                    }

                    { TIMING_FORMS.includes(event.type) &&
                      <div className="section timing">
                        <EventTiming
                          errors={errors}
                          event={event}
                          dispatch={eventDispatch}
                          isRoadCondition={CONDITIONS_FORMS.includes(event.type)}
                        />
                      </div>
                    }

                    { event?.type === 'Planned event' &&
                      <div className="section scheduled">
                        <Scheduled errors={errors} event={event} dispatch={eventDispatch} />
                      </div>
                    }

                    { event.type &&
                      <div className="section additional">
                        <AdditionalMessaging event={event} dispatch={eventDispatch} errors={errors} />
                      </div>
                    }

                    { EXTERNAL_FORMS.includes(event.type) &&
                      <div className="section external">
                        <External event={event} dispatch={eventDispatch} errors={errors} />
                      </div>
                    }

                    { INTERNAL_FORMS.includes(event.type) &&
                      <div className="section internal">
                        <InternalNotes event={event} dispatch={eventDispatch} />
                      </div>
                    }
                  </>}
                </div>

              </div>
            </Tabs.Tab>
          }

          { event.id &&
            <Tabs.Tab name='history' label='Event history' default={event.showHistory}>
              <History event={event} dispatch={eventDispatch} />
            </Tabs.Tab>
          }
        </Tabs>

        { event.location.start.name && !event.showHistory &&
          <div className="section buttons">
            <button type="button" onClick={(e) => this.handleSubmit(e, this.getLabel())}>
                <FontAwesomeIcon icon={faCircleCheck} />
              {this.getLabel()}
            </button>

            { this.context.authContext.is_approver && !event.approved && event.status === 'Inactive' && (
              <button type="button" onClick={(e) => this.handleSubmit(e, 'Reject Clear', { status: 'Active' })}>
                  <FontAwesomeIcon icon={faCircleX} />
                Reject Clear
              </button>
            )}

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
                      eventDispatch({ type: 'reset form', cancel: true, value: event, showPreview: true, showForm: false });
                      this.props.setAlertContext({
                        type: 'success',
                        message: 'Event reconfirmed',
                      });

                    }).catch((error) => {
                      this.props.setAlertContext?.({ message: error.message });
                    });
                  }
                }}
              >
                <FontAwesomeIcon icon={faCheckDouble} />
                Reconfirm
              </button>
            }

            { event.id &&
              <button
                type="button"
                className="secondary"
                onClick={() => {
                  this.modalRef.current.showModal();
                }}
              >
                <FontAwesomeIcon icon={faTrashCan} />
                Clear
              </button>
            }

            <div style={{flex: 1}}></div>

            <button type="button" className="cancel" onClick={cancel}>
              <FontAwesomeIcon icon={faXmark} />
              Cancel
            </button>
          </div>
        }

        {event.showHistory &&
          <div className="section buttons">
            <div style={{flex: 1}}></div>

            <button type="button" className="cancel" onClick={cancel}>
              <FontAwesomeIcon icon={faXmark} />
              Cancel
            </button>
          </div>
        }
      </form>
      <dialog id="clear-modal" ref={this.modalRef}>
        <div className="header">Clear {event?.id}</div>
        <div className="body">
          <p>Are you sure you want to { needsApproval ? 'submit this event to be cleared' : 'clear this event'}?</p>
        </div>
        <div className="buttons">
          <button
            type="button"
            className='primary'
            onClick={() => this.clearEvent(event?.id)}
          >
            <FontAwesomeIcon icon={faTrashCan} />
            { needsApproval ? 'Submit' : 'Clear event'}
          </button>
          <button
            type="button"
            onClick={() => this.modalRef.current?.close()}
          >
            <FontAwesomeIcon icon={faXmark} />
            Cancel
          </button>
        </div>
      </dialog>
    </div>
    );
  }
}

export default connect()(EventForm);
