import { useSelector, useDispatch, useStore } from 'react-redux';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPencil } from '@fortawesome/pro-solid-svg-icons';
import { faStopwatch } from '@fortawesome/pro-regular-svg-icons';
import { formatDistanceToNowStrict } from 'date-fns';

import { selectFeature } from '../components/Map/helpers.js';

import { getConditionIcon, getPlainIcon } from './icons';

import { PHRASES_LOOKUP } from './references';

import './Events.scss';

function Event({ event, goToFunc, dispatch, map, selected }) {

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
                dispatch({ type: 'reset form', value: event, showPreview: true, showForm: true });
                goToFunc(event.location.start.coords)
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

        <div className='service-area'>Skeena ({event.service_area})</div>
      </div>
    </div>
  )
}

const ONE_HOUR = 1000 * 60 * 60;

export default function Events({ goToFunc, dispatch, map, current }) {
  const events = useSelector(state => state.events.all);

  const now = new Date();
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

    return {
      ...event,
      delta,
      ending,
    };
  }).filter((event) => event.delta < ONE_HOUR);
  displayed.sort((a, b) => a.delta < b.delta ? -1 : 1);

  return (
    <div className='events-list'>
      {displayed.map((event) => {
        return <Event
          key={event.id}
          event={event}
          goToFunc={goToFunc}
          dispatch={dispatch}
          map={map}
          selected={event.id === current.id}
        />;
      })}
    </div>
  )
}
