import { useState } from 'react';
import { useSelector, useDispatch, useStore } from 'react-redux';
import { useNavigate } from 'react-router';
import Select from 'react-select';

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPencil, } from '@fortawesome/pro-solid-svg-icons';
import {
  faArrowUpArrowDown, faMagnifyingGlass, faRoad, faShapes, faStopwatch, faXmark
} from '@fortawesome/pro-regular-svg-icons';
import { formatDistanceToNowStrict } from 'date-fns';

import { selectAllEvents } from '../slices/events';
import { selectServiceAreaById, selectAllServiceAreas } from '../slices/serviceAreas';
import { selectAllRoutes } from '../slices/routes';
import { selectFeature } from '../components/Map/helpers.js';
import { ONE_MINUTE_MS, ONE_HOUR_MS } from '../shared';

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

  let nearby = event?.location?.start?.nearby?.filter((nearby) => nearby.include).map((nearby) => nearby.name).join(';') || '';
  nearby += (event?.location?.end?.nearby?.filter((nearby) => nearby.include).map((nearby) => nearby.name).join(';') || '');
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

function matchRoad(event, road) {
  const start = event?.location?.start;
  const end = event?.location?.end;

  if (road.label.startsWith('Highway ')) {
    const route = road.label.split(' ').pop();
    if (route) {
      if (start?.HIGHWAY_ROUTE_NUMBER === route) { return true; }
      if (end?.HIGHWAY_ROUTE_NUMBER === route) { return true; }
    }
  } else {
    const route = road.label.toLowerCase().replaceAll(/[^a-z ]*/g, '');
    if (route === start?.name.toLowerCase() ||
        (start?.useAlias && route === start?.alias.toLowerCase())) {
      return true;
    }
    if (route === end?.name.toLowerCase() ||
        (end?.useAlias && route === end?.alias.toLowerCase())) {
      return true;
    }
  }

  return false;
}

function Event({ event, goToFunc, dispatch, map, selected, serviceArea }) {

  const area = useSelector((state) => selectServiceAreaById(state, serviceArea))
  const navigate = useNavigate();

  const isOverdue = event.delta < 0;
  const isClose = event.delta > 0 && event.delta < (ONE_MINUTE_MS * 10);
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

        { area &&
          <div className='service-area'>{area.name} ({area.sortingOrder})</div>
        }
      </div>
    </div>
  )
}

const typeOptions = [
  { value: 'all', label: 'All types' },
  { value: 'Incident', label: 'Incidents' },
  { value: 'Planned event', label: 'Planned events' },
  { value: 'ROAD_CONDITION', label: 'Road conditions' },
  { value: 'CHAIN_UP', label: 'Chain ups' },
];
const typeOptionsLookup = typeOptions.reduce((acc, item) => {
  acc[item.value] = item.value === 'all' ? null : item;
  return acc;
}, {});

const sortOptions = [
  { value: 'delta', label: 'Priority' },
  { value: 'start', label: 'Start time' },
  { value: 'author', label: 'Author' },
  { value: 'road', label: 'Road' },
  { value: 'id', label: 'Event ID' },
];

const selectStyle = {
  control: (css) => ({
    ...css,
    backgroundColor: 'transparent',
    minHeight: 'auto',
    border: 'none',
    fontSize: '14px',
    boxShadow: 'none',
  }),
  container: (css) => ({ ...css, display: 'inline-block' }),
  indicatorSeparator: (css) => ({ ...css, display: 'none', }),
  dropdownIndicator: (css) => ({ ...css, padding: 0, color: 'black' }),
  placeholder: (css) => ({ ...css, padding: 0, color: 'black' }),
  menu: (css) => ({ ...css, width: 'max-content', marginTop: 0 }),
  valueContainer: (css) => ({ ...css, padding: '2px 2px 2px 4px', }),
};
const sortSelectStyle = {
  ...selectStyle,
  menu: (css) => ({ ...css, width: 'max-content', marginTop: 0, right: 0 }),
}

const getStartTime = (event) => {
  if (event.type === 'Planned event') {
    return new Date(event.timing.startTime);
  }
  return new Date(event.created);
}

const getSortableRoadName = (name) => {
  name = (name || '').toLowerCase();
  const matches = name.match(/^hwy (\d+)(\w*)$/);
  if (matches) {
    let hwyNum = `000${matches[1]}`;
    hwyNum = hwyNum.slice(hwyNum.length - 3);
    return `0hwy ${hwyNum}${matches[2] || ''}`;
  }
  return `1${name}`;
}

const sortFunctions = {
  delta: (a, b) => a.delta < b.delta ? -1 : 1,
  start: (a, b) => getStartTime(a) < getStartTime(b) ? -1 : 1,
  author: (a, b) => a.user.username < b.user.username ? -1 : 1,
  road: (a, b) => getSortableRoadName(a.location?.start?.name) < getSortableRoadName(b.location?.start?.name) ? -1 : 1,
  id: (a, b) => a.id < b.id ? -1 : 1,
}

export default function Events({ goToFunc, dispatch, map, current }) {
  const [ type, setType ] = useState();
  const [ area, setArea ] = useState();
  const [ road, setRoad ] = useState();
  const [ sort, setSort ] = useState(sortOptions[0]);
  const [ search, setSearch ] = useState('');

  const events = useSelector(selectAllEvents);
  const serviceAreas = useSelector(selectAllServiceAreas);
  const serviceAreasByRoad = serviceAreas.reduce((acc, area) => {
    area.routes.forEach((road) => {
      if (!acc[road]) { acc[road] = new Set(); }
      acc[road].add(area.id);
    });
    return acc;
  }, {})
  const roads = useSelector(selectAllRoutes);

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
    (event) => event.delta < ONE_HOUR_MS
  ).filter((event) => { // apply filters
    if (type) { return event?.type === type.value; }
    if (area) { return event?.service_area === area.value; }
    if (road) { return matchRoad(event, road) }
    return true;
  }).filter((event) => { // apply search
    if (search && search.length > 2) {
      return matchEvent(event, search);
    }
    return true;
  });

  displayed.sort(sortFunctions[sort.value]);

  return (
    <div className='events-list'>
      <div className='filters'>
        <div className='filter'>
          <FontAwesomeIcon icon={faShapes} />
          <Select
            value={type}
            options={typeOptions}
            onChange={(e) => setType(typeOptionsLookup[e.value])}
            styles={selectStyle}
            placeholder='All types'
            isSearchable={false}
          />
        </div>

        <div className='filter'>
          <svg className="area-filter-btn__icon" width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M10.9933 7.00752C10.9933 8.37761 9.16667 10.817 8.36667 11.8195C8.17333 12.0602 7.82 12.0602 7.62667 11.8195C6.82667 10.817 5 8.37761 5 7.00752C5 5.35004 6.34667 4 8 4C9.65333 4 11 5.35004 11 7.00752H10.9933ZM10.2467 7.00752C10.2467 5.76441 9.24 4.74854 7.99333 4.74854C6.74667 4.74854 5.74 5.75773 5.74 7.00752C5.74 7.20134 5.81333 7.50209 5.98 7.90309C6.14667 8.29073 6.38 8.71846 6.64667 9.15288C7.09333 9.87469 7.60667 10.5764 7.99333 11.071C8.38 10.5698 8.89333 9.87469 9.34 9.15288C9.60667 8.71846 9.84 8.29073 10.0067 7.90309C10.1733 7.50209 10.2467 7.20134 10.2467 7.00752ZM6.74667 7.00752C6.74667 6.55973 6.98667 6.14536 7.37333 5.92481C7.76 5.70426 8.23333 5.70426 8.62667 5.92481C9.02 6.14536 9.25333 6.55973 9.25333 7.00752C9.25333 7.45531 9.01333 7.86967 8.62667 8.09023C8.24 8.31078 7.76667 8.31078 7.37333 8.09023C6.98 7.86967 6.74667 7.45531 6.74667 7.00752ZM8.49333 7.00752C8.49333 6.7335 8.26667 6.50627 7.99333 6.50627C7.72 6.50627 7.49333 6.7335 7.49333 7.00752C7.49333 7.28154 7.72 7.50877 7.99333 7.50877C8.26667 7.50877 8.49333 7.28154 8.49333 7.00752Z" fill="currentColor"/>
            <path d="M3.14031 0H3.99491C4.30691 0 4.56465 0.257736 4.56465 0.569733C4.56465 0.881729 4.30691 1.13947 3.99491 1.13947H3.14031C2.03476 1.13947 1.13947 2.03476 1.13947 3.14031V3.99491C1.13947 4.30691 0.881729 4.56465 0.569733 4.56465C0.257736 4.56465 0 4.30691 0 3.99491V3.14031C0 1.40398 1.41077 0 3.14031 0ZM0.569733 5.71089C0.881729 5.71089 1.13947 5.96863 1.13947 6.28063V9.70581C1.13947 10.0178 0.881729 10.2755 0.569733 10.2755C0.257736 10.2755 0 10.0178 0 9.70581V6.28063C0 5.96863 0.257736 5.71089 0.569733 5.71089ZM1.14625 11.9983V12.8529C1.14625 13.9585 2.04154 14.8538 3.1471 14.8538H4.0017C4.31369 14.8538 4.57143 15.1115 4.57143 15.4235C4.57143 15.7355 4.31369 15.9932 4.0017 15.9932H3.1471C1.41077 15.9932 0.00678253 14.5892 0.00678253 12.8529V11.9983C0.00678253 11.6863 0.264519 11.4286 0.576515 11.4286C0.888512 11.4286 1.14625 11.6863 1.14625 11.9983ZM5.71768 0.569733C5.71768 0.257736 5.97541 0 6.28741 0H9.71937C10.0314 0 10.2891 0.257736 10.2891 0.569733C10.2891 0.881729 10.0314 1.13947 9.71937 1.13947H6.28741C5.97541 1.13947 5.71768 0.881729 5.71768 0.569733ZM6.28741 16C5.97541 16 5.71768 15.7423 5.71768 15.4303C5.71768 15.1183 5.97541 14.8605 6.28741 14.8605H9.71937C10.0314 14.8605 10.2891 15.1183 10.2891 15.4303C10.2891 15.7423 10.0314 16 9.71937 16H6.28741ZM15.4303 4.57143C15.1183 4.57143 14.8605 4.31369 14.8605 4.0017V3.1471C14.8605 2.04154 13.9652 1.14625 12.8597 1.14625H12.0051C11.6931 1.14625 11.4354 0.888512 11.4354 0.576515C11.4354 0.264519 11.6931 0.00678253 12.0051 0.00678253H12.8597C14.596 0.00678253 16 1.41077 16 3.1471V4.0017C16 4.31369 15.7423 4.57143 15.4303 4.57143ZM16 11.9983V12.8529C16 14.5892 14.5892 15.9932 12.8597 15.9932H12.0051C11.6931 15.9932 11.4354 15.7355 11.4354 15.4235C11.4354 15.1115 11.6931 14.8538 12.0051 14.8538H12.8597C13.9652 14.8538 14.8605 13.9585 14.8605 12.8529V11.9983C14.8605 11.6863 15.1183 11.4286 15.4303 11.4286C15.7423 11.4286 16 11.6863 16 11.9983ZM15.4303 5.71089C15.7423 5.71089 16 5.96863 16 6.28063V9.70581C16 10.0178 15.7423 10.2755 15.4303 10.2755C15.1183 10.2755 14.8605 10.0178 14.8605 9.70581V6.28063C14.8605 5.96863 15.1183 5.71089 15.4303 5.71089Z" fill="currentColor"/>
          </svg>
          <Select
            value={area}
            options={[
              { value: null, label: 'All service areas'},
              ...serviceAreas.filter((area) => !road || area.routes.includes(road.value)),
            ]}
            onChange={(selected) => { setArea(selected.value ? selected : null); }}
            styles={selectStyle}
            placeholder='All service areas'
            isSearchable={false}
          />
        </div>

        <div className='filter'>
          <FontAwesomeIcon icon={faRoad} />
          <Select
            value={road}
            options={[
              { value: null, label: 'All roads'},
              ...roads.filter((road) => !area || serviceAreasByRoad[road.value].has(area.value)),
            ]}
            onChange={(road) => setRoad(road.value ? road : null)}
            styles={sortSelectStyle}
            placeholder='All roads'
            isSearchable={false}
          />
        </div>
      </div>

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

      <div className='sort'>
        <div>{displayed.length}&nbsp;item{ displayed.length === 1 ? '' : 's'}</div>

        <div className='filter'>
          <FontAwesomeIcon icon={faArrowUpArrowDown} />
          <Select
            value={sort}
            options={sortOptions}
            onChange={(sort) => setSort(sort)}
            styles={sortSelectStyle}
            isSearchable={false}
          />
        </div>
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
          serviceArea={event.service_area}
        />;
      })}

      { events.length > 0 && displayed.length === 0 && (
        <div className='no-results'>
          No events match the search and filtering criteria selected.
        </div>
      )}
    </div>
  )
}
