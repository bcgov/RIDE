import { useState } from 'react';
import { useSelector, useDispatch, useStore } from 'react-redux';
import { useNavigate } from 'react-router';

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPencil } from '@fortawesome/pro-solid-svg-icons';
import { faStopwatch, faXmark, faMagnifyingGlass } from '@fortawesome/pro-regular-svg-icons';
import { formatDistanceToNowStrict } from 'date-fns';

import { selectAllEvents } from '../slices/events.js';
import { selectServiceAreasIdLabel } from '../slices/serviceAreas.js';
import { selectFeature } from '../components/Map/helpers.js';

import { getConditionIcon, getPlainIcon } from './icons';

import { PHRASES_LOOKUP } from './references';

import './Events.scss';

/* Searches various event fields to find a match with term.
 *
 * Incrementally builds search fields so it can immediately return true on a
 * match, avoiding subsequent checking.
 */
function matchEvent(event, term) {
  term = term.toLowerCase();

  if (event.id.toLowerCase().includes(term)) { return true; }

  let roads = event?.location?.start?.name || '';
  roads += event?.location?.end?.name || '';
  if (event?.location?.start?.alias && event?.location?.start?.useAlias) {
    roads += `;${event.location.start.alias}`;
  }
  if (event?.location?.end?.alias && event?.location?.end?.useAlias) {
    roads += `;${event.location.end.alias}`;
  }
  if (roads.toLowerCase().includes(term)) { return true; }

  let user = event?.user?.first_name || '';
  user += `;${event?.user?.last_name || ''}`;
  user += `;${event?.user?.username || ''}`;
  user += `;${event?.user?.email || ''}`;
  if (user.toLowerCase().includes(term)) { return true; }

  let nearby = event?.location?.start?.nearby.filter((nearby) => nearby.include).map((nearby) => nearby.name).join(';') || '';
  nearby += (event?.location?.end?.nearby.filter((nearby) => nearby.include).map((nearby) => nearby.name).join(';') || '');
  if (event?.location?.start?.other && event?.location?.start?.useOther) {
    nearby += `;${event.location.start.other}`;
  }
  if (event?.location?.end?.other && event?.location?.end?.useOther) {
    nearby += `;${event.location.end.other}`;
  }
  if (nearby.toLowerCase().includes(term)) { return true; }

  let phrases = PHRASES_LOOKUP[event?.details?.situation] || '';
  phrases += event?.details?.category || '';
  phrases += event?.impacts?.map((impact) => `;${impact.label}`) || '';
  phrases += event?.conditions?.map((condition) => `;${condition.label}`) || '';
  phrases += event?.restrictions?.map((restriction) => `;${restriction.label};${restriction.text}`) || '';
  return phrases.toLowerCase().includes(term);
}

function Event({ event, goToFunc, dispatch, map, selected, areaLabel }) {

  const navigate = useNavigate();

  const isOverdue = event.delta < 0;
  const isClose = event.delta > 0 && event.delta < (1000 * 60 * 10);
  let label = 'Next update';
  if (isOverdue) {
    label = 'Overdue';
  } else if (event.ending) {
    label = 'Ending soon';
  }

  let situation = PHRASES_LOOKUP[event.details.situation];
  const isRoadCondition = ['Road condition', 'ROAD_CONDITION'].includes(event.type);
  if (isRoadCondition) {
    situation = event.conditions[0].label;
  }
  const isChainUp = ['CHAIN_UP'].includes(event.type);

  const time = formatDistanceToNowStrict(new Date() - event.delta);
  return (
    <div
      className='event'
      onClick={() => {
        goToFunc(event.location.start.coords)
        dispatch({ type: 'reset form', value: event, showPreview: true, showForm: false });
        selectFeature(map, map.get('events').getSource().get(event.id));
      }}
    >
      <div
        className={`title
          ${isOverdue ? 'overdue' : ''}
          ${isClose ? 'close' : ''}
          ${selected ? 'selected' : ''}
        `}
      >
        <div className='card-name'>{label}</div>
        <div className='lozenge'>
          <FontAwesomeIcon icon={faStopwatch} />{time}
        </div>
      </div>

      <div className='body'>
        <div className='icon-row'>
          <div className='icon'><img src={getPlainIcon(event)} /></div>

          <div className='name'>
            <div className='situation'>
              { isRoadCondition && <>{situation}&nbsp;-&nbsp;Road condition</> }

              { isChainUp && 'Chain up' }

              { !(isRoadCondition || isChainUp) && <>
                  {situation}&nbsp;-&nbsp;
                  {event.details.severity} {event.type}
                </>
              }
            </div>
            <div className='event-id'>
              {event.id} v{event.version}
            </div>
          </div>

          <div className='edit'>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                if (isChainUp) {
                  navigate('/chainups/');
                } else {
                  dispatch({ type: 'reset form', value: event, showPreview: true, showForm: true });
                  goToFunc(event.location.start.coords)
                }
              }}
            >
              <FontAwesomeIcon icon={faPencil} />edit
            </button>
          </div>
        </div>

        <div className='location'>
          <div className='location-name'>
            {event.location.start?.name}
            {event.location.start?.useAlias && <>&nbsp;({event.location.start.alias})</>}
          </div>

          { event.location.start.name && (
            <div>starts {(event.location.start?.nearby || []).reduce((first, near) => {
              if (!first && near.include) { first = near.phrase; }
              return first;
            }, null)}</div>
          )}

          { event.location.end?.name && (
            <div>ends {event.location.end.nearby.reduce((first, near) => {
              if (!first && near.include) { first = near.phrase; }
              return first;
            }, null)}</div>
          )}
        </div>

        { areaLabel &&
          <div className='service-area'>{areaLabel.slice(4)} ({event.service_area})</div>
        }
      </div>
    </div>
  )
}

const ONE_HOUR = 1000 * 60 * 60;

export default function Events({ goToFunc, dispatch, map, current }) {
  const [ search, setSearch ] = useState('');

  const events = useSelector(selectAllEvents);
  const serviceAreas = useSelector(selectServiceAreasIdLabel);

  const now = new Date();
  // displayed events are active, have a next update or end time, and a delta
  // between that time and now of less than one hour.  They're annotated with
  // the delta and whether the event is ending at the time.
  const displayed = events.filter((event) => (
    event.status === 'Active' && (
      event.timing.nextUpdate || event.timing.endTime
    )
  )).map((event) => {
    let delta, ending = false;

    if (event.timing.nextUpdate) {
      delta = new Date(event.timing.nextUpdate) - now;
    } else if (event.timing.endTime) {
      delta = new Date(event.timing.endTime) - now;
      ending = true;
    }

    return { ...event, delta, ending, };
  }).filter(
    (event) => event.delta < ONE_HOUR
  ).filter((event) => {
    if (search && search.length > 2) {
      return matchEvent(event, search);
    }
    return true;
  });

  displayed.sort((a, b) => a.delta < b.delta ? -1 : 1);

  return (
    <div className='events-list'>
      <div className='search'>
        <div className='search-input'>
          <input
            type='text'
            name='search'
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />

          <span className='search-icon'><FontAwesomeIcon icon={faMagnifyingGlass} /></span>
        </div>

        { search &&
          <button type='button' onClick={() => setSearch('')}>
            <FontAwesomeIcon icon={faXmark} />&nbsp;clear
          </button>
        }
      </div>

      {displayed.map((event) => {
        return <Event
          key={event.id}
          event={event}
          goToFunc={goToFunc}
          dispatch={dispatch}
          map={map}
          selected={event.id === current.id}
          areaLabel={serviceAreas[event.service_area]?.name}
        />;
      })}

      { search && displayed.length === 0 && (
        <div className='no-results'>
          No events match the search and filtering criteria selected.
        </div>
      )}
    </div>
  )
}
