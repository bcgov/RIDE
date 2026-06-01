import { useCallback, useContext, useEffect, useRef, useState } from 'react';
import Skeleton from 'react-loading-skeleton';

import { Circle, Fill, Icon, Style, Stroke, Text } from 'ol/style';
import { Point as olPoint, LineString, Polygon } from 'ol/geom';

import {
  DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors,
} from '@dnd-kit/core';
import {
  arrayMove, SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { restrictToVerticalAxis, restrictToParentElement } from '@dnd-kit/modifiers';

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faApartment,
  faArrowRightArrowLeft,
  faArrowRotateRight,
  faBuilding,
  faBuildings,
  faCity,
  faHouseBuilding,
  faInputText,
  faMagnifyingGlass,
  faPlus,
  faXmark
} from '@fortawesome/pro-regular-svg-icons';
import {
  faArchway,
  faRoad,
  faMapLocation,
  faSignHanging,
  faTree
} from '@fortawesome/duotone-regular-svg-icons';

import AsyncSelect from 'react-select/async';

import pinStart from '../../icons/pin-start.svg';
import pinEnd from '../../icons/pin-end.svg';
import kmMarker from '../../icons/km-marker.svg';

// import { getCardinalDirection, getNonDirectionalRoute, titleCase } from '../../../shared';
import Tabs from '../../../shared/Tabs';

import {
  ll2g
} from '../../../components/Map/helpers';
import RideFeature from '../../../components/Map/feature';
import { iconStyles, intersectionStyles, markerStyles } from '../../../components/Map/styles';

import { TabContext } from '../../../shared/Tabs';

import { API_HOST } from '../../../env';

import Tooltip from '../../Tooltip';

import { getNearby } from './helpers';

const PINS = {
  start: pinStart,
  end: pinEnd,
}


const LANDMARK_CLASSES = ['D1', 'Y1', 'Y3', 'Y4'];

/* For the given point, reset all the candidate markers on the map with
 * updated text describing their distance from the pin
 */
function updateMap(map, point, subkey, visible=true) {
  const source = map.get('pins').getSource();
  source.remove(`${subkey} nearby intersections`);
  if (!point.candidates) { return; }
  const points = point.candidates.concat(point.searched || []).concat(point.nearby.filter((feature) => feature.search));

  for (const candidate of points) {
    if (!['intersections', 'landmarks'].includes(candidate.source) || candidate.isError) { continue; }

    // update feature styles's text
    let styles = intersectionStyles;
    if (candidate.class === 'S4') {
      styles = Object.assign({}, markerStyles);
      styles.static = styles.static.clone();
      styles.hover = styles.hover.map((style) => style.clone());
      let km = String(candidate.km_post);
      // some km values have three digits, so shrink the font so they're visible
      if (km.length > 2) {
        styles.static.getText().setFont('8px/1 BC Sans')
        styles.hover[0].getText().setFont('8px/1 BC Sans');
      }
      // display the digits vertically.
      km = km.split('').join('\n').replace(/\n\.\n/, '\n.');
      styles.static.getText().setText(km);
      styles.hover[0].getText().setText(km);
      styles.hover[1].getText().setText(candidate.phrase);
    } else if (LANDMARK_CLASSES.includes(candidate.class)) {
      styles = Object.assign({}, markerStyles);
      styles.static = styles.static.clone();
      styles.hover = styles.hover.map((style) => style.clone());
      styles.static.setImage(iconStyles[candidate.class]);
      styles.hover[0].setImage(iconStyles[candidate.class].clone());
      styles.hover[0].getImage().setOpacity(1);
      styles.hover[1].getText().setText(candidate.phrase);
    } else { // GeoBC intersections
      styles.static.clone();
      styles.hover = styles.hover.clone();
      styles.hover.getText().setText(candidate.phrase);
    }

    const feature = new RideFeature({
      styles,
      geometry: new olPoint(ll2g(candidate.coords)),
      name: `${subkey} nearby intersections`,
      subkey,
      type: 'reference location',
      isVisible: visible,
      noSelect: true,
      raw: candidate,
    });
    source.addFeature(feature);
  }
}

/* Wrapper component for DnD
 */
function Sortable({id, children, classes, remove}) {
  const {
    attributes,
    listeners,
    setActivatorNodeRef,
    setNodeRef,
    transform,
  } = useSortable({ id });

  const style = {
    transform: CSS.Translate.toString(transform),
    transition: null,
  };

  return (
    <div
      className={classes}
      ref={setNodeRef}
      style={style}
      {... attributes}
    >
      <div
        className='handle drag'
        ref={setActivatorNodeRef}
        { ...listeners }
      >:::</div>
      <div className="control">{children}</div>
      <div
        className='handle delete'
        onClick={remove}
      >×</div>
    </div>
  );
}


const ICONS = {
  A1: faRoad,
  A2: faRoad,
  A3: faRoad,
  A5: faRoad,
  A8: faRoad,
  B3: faRoad,
  B4: faRoad,
  D1: faArchway,
  G6: faRoad,
  R1: faTree,
  R2: faTree,
  S4: faSignHanging,
  Y1: faMapLocation,
  Y3: faMapLocation,
  Y4: faMapLocation,
};

function getIcon(loc) {
  if (loc?.class === 'S4') {
    return <img src={kmMarker} style={{ width: '16px', height: '16px', filter: "dropShadow1px 1px 10px black" }} />
  }
  let icon = faCity;
  if (loc.source === 'intersections' || loc.source === 'landmarks') {
    icon = ICONS[loc?.class] || faRoad;
  } else if (loc.type === 'other') {
    icon = faInputText;
  } else if (loc.size === 'minor') {
    icon = faBuilding;
  }
  return <FontAwesomeIcon icon={icon} />
}

const INTERSECTION_LETTERS = ['A', 'B', 'G'];

function isIntersection(location) {
  if (location.source === 'intersections') { return true; }
  if (INTERSECTION_LETTERS.includes(location.class?.charAt(0))) { return true; }
}

export default function Point({ point, dispatch, goToFunc, subkey, map }) {
  const [other, setOther] = useState('');
  const [suggestionSearch, setSuggestionSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const otherRef = useRef();
  const tab = useContext(TabContext);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5, }}),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const startChange = (e) => setOther(e.target.value.substring(0, 100));
  const nearby = point?.nearby || [];
  const nearbyIds = nearby.map((n) => n.id);
  const municipality = nearby.filter((near) => near.source === 'municipalities')[0];
  const showSpinner = (point?.candidates || []).length === 0;

  const source = (suggestionSearch ? point?.searched : point?.candidates) || [];
  const candidates = source
    .filter((location) => !nearbyIds.includes(location.id))
    .filter((location) => {
      if (location.source === 'bcgnws' && location.name === municipality?.name) { return false; }

      if (filter === 'all') {
        return true;
      } else if (filter === 'places' && (location.source === 'municipalities' || location.source === 'bcgnws')) {
        return true;
      } else if (filter === 'intersections') {
        if (isIntersection(location) || location.isError) { return true; }
      } else if (filter === 'landmarks') {
        if (location.source === 'landmarks' && (location.isError || !isIntersection(location))) { return true; }
      }

      return false;
    })
    .slice(0, 5);

  const otherInNearby = nearbyIds.includes('other');

  function handleDragEnd(event) {
    if (event.active.id !== event.over.id) {
      const oldIndex = nearby.findIndex((el) => el.id === event.active.id);
      const newIndex = nearby.findIndex((el) => el.id === event.over.id);
      dispatch({ type: 'change nearby order', subkey, value: arrayMove(nearby, oldIndex, newIndex) });
    }
  }

  let nearbyPending = point.pending ? point.pending.size > 0 : false;

  updateMap(map, point, subkey, subkey === tab);

  const getOptions = async (term, callback) => {
    if (term.length < 4) { return []; }

    const params = new URLSearchParams({
      lon: point.coords[0],
      lat: point.coords[1],
      term,
    });
    const results = await fetch(`${API_HOST}/api/search?${params}`).then((body) => body.json())
    return callback(results);
  }

  const highlight = (phrase) => {
    if (!suggestionSearch) { return phrase }

    const term = suggestionSearch.toLowerCase();
    const field = phrase.toLowerCase();
    const start = field.indexOf(term);
    if (start < 0) { return phrase }
    const end = start + term.length;
    return <>
      <span className='fragment'>{phrase.substring(0, start)}</span>
      <span className='highlight'>{phrase.substring(start, end)}</span>
      <span className='fragment'>{phrase.substring(end)}</span>
    </>
  }

  return (
    <div className="toggleable">
      <div className="toggled">
        <div className='road-name'>
          <div>{ point?.name || 'no road found' }</div>
          <Tooltip text={`Center ${subkey} pin`}>
            <img
              src={PINS[subkey]}
              style={{ width: '20px' }}
              onClick={(e) => goToFunc(point?.coords)}
            />
          </Tooltip>
        </div>

        <div>
          Alias:&nbsp;
          <select
            name="start alias"
            value={point?.alias ?? ''}
            onChange={(e) => dispatch({ type: 'set alias', key: subkey, value: e.target.value })}
          >
            {point?.aliases.map((a) => <option key={a}>{a}</option>)}
            <option value=''>None</option>
          </select>
        </div>

        <div className='landmarks fa-width-auto'>
          <div className='label'><strong>Reference locations</strong></div>

          { point?.name && point?.nearbyError && <div className='nearby-error'>{point?.nearbyError}</div>}

          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
            modifiers={[restrictToVerticalAxis, restrictToParentElement]}
          >
            <SortableContext items={nearby} strategy={verticalListSortingStrategy}>
              { nearby.map((loc, ii) => (
                <Sortable
                  id={loc.id}
                  index={ii}
                  key={loc.id}
                  classes='landmark'
                  remove={(e) => dispatch({ type: 'remove nearby', key: subkey, id: loc.id})}
                >
                  <button
                    type='button'
                    className='icon'
                    onClick={() => goToFunc(loc.coords) }
                  >{getIcon(loc)}</button>
                  <div className='phrase'>{loc.phrase}</div>
                </Sortable>
              ))}
            </SortableContext>
          </DndContext>

          <div className='label'><strong>Add nearby location</strong></div>

          <div className='search-box'>
            <input
              className='landmark-search'
              type="text"
              name="search"
              value={suggestionSearch}
              placeholder='search landmarks'
              onChange={(e) => {
                if (e.target.value.length === 0 || !suggestionSearch.includes(e.target.value)) {
                  dispatch({ type: 'set search', subkey, search: '' });
                }
                setSuggestionSearch(e.target.value.substring(0, 100));
              }}
              onKeyPress={(e) => { if (e.charCode === 13) { e.target.blur(); }}}
              onBlur={(e) => {
                getNearby(`set ${subkey}`, point, dispatch, e.target.value);
                dispatch({ type: 'set search', subkey, search: e.target.value });
              }}
            />

            <button
              type='button'
              className='search-icon'
              onClick={() => {
                if (suggestionSearch) { setSuggestionSearch(''); }
                dispatch({ type: 'set search', subkey, search: '' });
              }}
            ><FontAwesomeIcon icon={suggestionSearch ? faXmark : faMagnifyingGlass} /></button>
          </div>

          <div className='filters'>
            <button
              type='button'
              className={filter === 'all' ? 'active' : ''}
              onClick={() => setFilter('all')}
            >All</button>
            <button
              type='button'
              className={filter === 'places' ? 'active' : ''}
              onClick={() => setFilter('places')}
            ><FontAwesomeIcon icon={faCity} /> places</button>
            <button
              type='button'
              className={filter === 'intersections' ? 'active' : ''}
              onClick={() => setFilter('intersections')}
            ><FontAwesomeIcon icon={faRoad} /> intersections</button>
            <button
              type='button'
              className={filter === 'landmarks' ? 'active' : ''}
              onClick={() => setFilter('landmarks')}
            ><FontAwesomeIcon icon={faSignHanging} /> landmarks</button>
          </div>

          <div className='sublabel'>
            { suggestionSearch ? 'search results' : 'suggested' }
            { showSpinner &&
              <button
                type="button"
                onClick={() => {
                  dispatch({ type: `set ${subkey}`, value: { ...point, nearbyPending: true } });
                  getNearby(`set ${subkey}`, point, dispatch, suggestionSearch);
                }}
              ><FontAwesomeIcon className={nearbyPending ? 'fa-spin' : ''} icon={faArrowRotateRight} /></button>
            }
          </div>

          { candidates.map((loc, ii) => (
            <div className={`landmark suggestion ${loc.isError ? 'error' : ''}`} key={loc.id}>
              <button
                type='button'
                className='icon'
                onClick={() => goToFunc(loc.coords) }
              >{getIcon(loc)}</button>
              <div className='phrase'>{highlight(loc.phrase)}</div>
              <button
                type='button'
                className='close'
                onClick={(e) => dispatch({ type: 'add nearby', key: subkey, candidate: loc})}
              ><FontAwesomeIcon icon={faPlus} /></button>
            </div>
          ))}
          { candidates.length === 0 && !nearbyPending &&
            <div className={`landmark suggestion no-results`}>No candidates found</div>
          }

          { nearbyPending && point?.name && <Skeleton width={250} height={20} />}

          { !nearbyIds.includes('other') &&
            <div className='landmark suggestion'>
              <div className='icon'><FontAwesomeIcon icon={faInputText} /></div>
              <div className='phrase phrase-other'>
                <input
                  type="text"
                  name="start other"
                  value={other || ''}
                  ref={otherRef}
                  onChange={startChange}
                  placeholder='custom landmark'
                />&nbsp;&nbsp;
                <span className={other?.length === 100 ? 'bold' : ''}>{other?.length}/100</span>
              </div>
              <button
                type='button'
                className='close'
                onClick={(e) => {
                  dispatch({ type: 'add nearby', key: subkey, candidate: { ...otherBlank, phrase: otherRef.current.value } })
                }}
              ><FontAwesomeIcon icon={faPlus} /></button>
            </div>
          }

        </div>

      </div>
    </div>
  )
}

const otherBlank = {
  id: 'other',
  type: 'other',
  phrase: 'not set',
  distance: Infinity,
}

