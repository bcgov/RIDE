import { useCallback, useContext, useEffect, useRef, useState } from 'react';
import Skeleton from 'react-loading-skeleton';
import "react-loading-skeleton/dist/skeleton.css";
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
import { faArrowRightArrowLeft,  faArrowRotateRight, faCity, faInputText, faMagnifyingGlass, faPlus, faXmark } from '@fortawesome/pro-regular-svg-icons';
import { faArchway, faRoad, faMapLocation, faSignHanging, faTree } from '@fortawesome/duotone-regular-svg-icons';

import pinStart from '../../public/pin-start.svg';
import pinEnd from '../../public/pin-end.svg';
import kmMarker from '../../public/km-marker.svg';

import { getCardinalDirection, getNonDirectionalRoute, titleCase } from '../shared';
import Tabs from '../shared/Tabs';

import { bc2g, bc2ll, g2bc, g2ll, getNearby as getNearbyPopCenters, ll2bc, ll2g } from '../components/Map/helpers';
import RideFeature from '../components/Map/feature';
import { iconStyles, intersectionStyles, markerStyles } from '../components/Map/styles';

import { TabContext } from '../shared/Tabs';

import { API_HOST } from '../env';

import Tooltip from './Tooltip';

const PINS = {
  start: pinStart,
  end: pinEnd,
}


function getGeoserverParams(layer, cql='', numResults=100) {
  return new URLSearchParams({
    service: 'WFS',
    version: '2.0.0',
    request: 'GetFeature',
    typeNames: layer,
    outputFormat: 'application/json',
    count: numResults,
    srsName: 'EPSG:4326',
    cql_filter: cql,
  });
}

async function getIntersections(coords, subkey, dispatch) {
  const intersections = [];
  try {
    const params = new URLSearchParams({
      point: coords[0] + "," + coords[1],
      maxDistance: (10 * 1000), // convert to metres
      outputSRS: 4326,
      maxResults: 10,
      locationDescriptor: "intersectionPoint",
      setBack: 0,
      brief: false,
      minDegree: 3,
      excludeUnits: false,
      onlyCivic: false
    });

    const results = await fetch(`https://geocoder.api.gov.bc.ca/intersections/near.json?${params}`, {'mode': 'cors'}).then((body) => body.json());
    for (const result of results.features) {
      const intCoords = result.geometry.coordinates
      const route = await getNonDirectionalRoute(coords, result.geometry.coordinates)
      result.source = 'intersections';
      result.distance = route.distance;
      result.direction = getCardinalDirection(coords, intCoords, true);
      if (route.distance < 0.01) {
        result.phrase = `At ${result.properties.intersectionName}`;
      } else {
        result.phrase = `${route.distance * 1000}m ${result.direction} of ${result.properties.intersectionName}`;
      }
      result.id = `${subkey}-intersection-${result.properties.intersectionID}`;
      result.coords = result.geometry.coordinates;
    }

    intersections.push(...results.features.filter((feature) => feature.distance >= 0));
  } catch (err) {
    console.error(err);
    intersections.push({
      id: `${subkey}-intersection-error`,
      distance: 1,
      phrase: 'Problem retrieving GeoBC intersections data. Refresh to try again.',
      isError: true,
      source: 'intersections',
    })
  }
  dispatch(intersections);
}


const LANDMARK_TYPES = {
  A1: 'intersection',
  A2: 'intersection',
  A3: 'intersection',
  A5: 'intersection',
  A8: 'intersection',
  B3: 'exit',
  B4: 'entrance',
  D1: 'major structure',
  G6: 'forestry service road',
  R1: 'national park access',
  R2: 'provincial park access',
  S4: 'km post',
  Y1: 'rest area',
  Y3: 'viewpoint',
  Y4: 'point of interest',
}

async function getLandmarks(location, subkey, dispatch) {
  if (!location.HIGHWAY_ROUTE_NUMBER) { return []; }
  let landmarks = [];

  try {
    const coords = location.coords;
    const params = new URLSearchParams({ lat: coords[1], lon: coords[0], });

    const results = await fetch(`${API_HOST}/api/landmarks?${params}`, {'mode': 'cors'}).then((body) => body.json());

    // keep a dict of candidates by their description, replacing them if a
    // candidate has the same description with a shorter distance. The end
    // result will be an index by description of the nearest candidate.
    const byDescription = {};

    for (const landmark of results) {
      // filter out landmarks on a highway other than the one the pin is on
      let wrongHighway = true;
      const pinHighways = location.HIGHWAY_ROUTE_NUMBER.split('+');
      const highways = landmark.segment.highways.map((highway) => highway.full_name);
      for (const pinHighway of pinHighways) {
        if (highways.includes(pinHighway)) {
          wrongHighway = false;
          break;
        }
      }
      if (wrongHighway) { continue; }

      const landmarkCoords = landmark.geometry.coordinates
      const route = await getNonDirectionalRoute(coords, landmarkCoords);

      // if the road linear distance is greater than twice the crow-flies
      // distance, filter it out as it's probably on a parallel highway
      if (route.distance > (landmark.distance * 0.002)) { continue; }

      const displayDistance = Math.round(route.distance < 1 ? landmark.distance : route.distance);
      const unit = route.distance < 1 ? 'm' : 'km';
      const direction = getCardinalDirection(coords, landmarkCoords, true);
      let km_post;
      if (landmark.landmark_type === 'S4') {
        km_post = landmark.description.split(' ')[0];
      }

      let phrase = `${displayDistance}${unit} ${direction} of ${titleCase(landmark.description)}`;
      if (route.distance < 0.01) {
        phrase = `At ${titleCase(landmark.description)}`;
      }

      const candidate = {
        source: 'landmarks',
        type: LANDMARK_TYPES[landmark.landmark_type] || landmark.landmark_types,
        class: landmark.landmark_type,
        distance: route.distance,
        direction,
        description: landmark.description,
        phrase,
        id: `${subkey}-landmark-${landmark.id}`,
        coords: landmarkCoords,
        km_post,
      }

      // update the byDescription dict if this landmark isn't present or if it's
      // closer than the stored landmark
      if (!byDescription[candidate.description] ||
        byDescription[candidate.description].distance > candidate.distance
      ) {
        byDescription[candidate.description] = candidate;
      }
      landmarks.push(candidate);
    }

    // filter out landmarks that are not the nearest to the pin
    landmarks = landmarks.filter(
      (candidate) => byDescription[candidate.description].id === candidate.id
    );
  } catch (err) {
    console.error(err);
    landmarks.push({
      source: 'landmarks',
      distance: 1,
      phrase: 'Problem retrieving Landmark data. Refresh to try again.',
      id: `${subkey}-landmark-error`,
      isError: true,
    });
  }
  dispatch(landmarks.slice(0, 20));
}


const HOST = 'https://openmaps.gov.bc.ca/geo/wfs';
const LAYERS = {
  DRA: 'pub:WHSE_BASEMAPPING.DRA_DGTL_ROAD_ATLAS_MPAR_SP',
  municipalities: 'pub:WHSE_LEGAL_ADMIN_BOUNDARIES.ABMS_MUNICIPALITIES_SP',
};

async function getMunicipality(coords, subkey, dispatch) {
  const municipality = [];
  try {
    coords = ll2bc(coords);
    const cql = `INTERSECTS(SHAPE, POINT(${coords[0]} ${coords[1]}))`;
    const params = getGeoserverParams(LAYERS.municipalities, cql);
    const results = await fetch(`${HOST}?${params}`, {'mode': 'cors'}).then((body) => body.json());
    const name = results.features[0]?.properties?.ADMIN_AREA_ABBREVIATION;
    if (name) {
      municipality.push({
        name: results.features[0].properties.ADMIN_AREA_ABBREVIATION,
        id: `${subkey}-municipality-${results.features[0].properties.LGL_ADMIN_AREA_ID}`,
        source: 'municipalities',
        distance: 0,
        phrase: `In ${name}`
      });
    }
  } catch (err) {
    console.error(err);
    municipality.push({
      name: 'error',
      id: `${subkey}-municipality-error`,
      source: 'municipalities',
      distance: 0,
      phrase: 'Error retrieving municipality',
      isError: true,
    })
  }
  dispatch(municipality);
}

/* Get nearby features from multiple sources.  As any source may fail, or
 * have a lengthy timeout, retrieval must be concurrent, relying on dispatch to
 * update the possible candidates as they come in.  In order to show a loading
 * skeleton while a request is pending, each call must be preceded by a dispatch
 * to a pending set where the velue is removed on completion.  This means that
 * all calls must complete, returning error values as normal values to be
 * handled later.
 */
export async function getNearby(action, location, dispatch) {
  const subkey = action.split(' ')[1];

  const type = 'add candidates';
  dispatch({ type: 'add to pending', subkey, value: 'municipalities' });
  getMunicipality(location.coords, subkey, (value) => {
    dispatch({ type, subkey, value, source: 'municipalities' });
  });

  if (location.HIGHWAY_ROUTE_NUMBER){
    dispatch({ type: 'add to pending', subkey, value: 'landmarks' });
    getLandmarks(location, subkey, (value) => {
      dispatch({ type, subkey, value, source: 'landmarks' });
    });
  } else {
    dispatch({ type: 'add to pending', subkey, value: 'intersections' });
    getIntersections(location.coords, subkey, (value) => {
      dispatch({ type, subkey, value, source: 'intersections' });
  });
  }

  dispatch({ type: 'add to pending', subkey, value: 'bcgnws' });
  const value = await getNearbyPopCenters(location.coords);
  dispatch({ type, subkey, value, source: 'bcgnws' });
}


const LANDMARK_CLASSES = ['D1', 'Y1', 'Y3', 'Y4'];

/* For the given point, reset all the candidate markers on the map with
 * updated text describing their distance from the pin
 */
function updateMap(map, point, subkey, visible=true) {
  const source = map.get('pins').getSource();
  source.remove(`${subkey} nearby intersections`);
  if (!point.candidates) { return; }

  for (const candidate of point.candidates) {
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
  }
  return <FontAwesomeIcon icon={icon} />
}

const INTERSECTION_LETTERS = ['A', 'B', 'G'];

function isIntersection(location) {
  if (location.source === 'intersections') { return true; }
  if (INTERSECTION_LETTERS.includes(location.class?.charAt(0))) { return true; }
}

function Point({ point, dispatch, goToFunc, subkey, map }) {
  const [other, setOther] = useState('');
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

  const candidates = (point?.candidates || [])
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
    }).slice(0, 5);

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
          <div className='label'><strong>Reference landmarks</strong></div>

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
                  <div className='icon'>{getIcon(loc)}</div>
                  <div className='phrase'>{loc.phrase}</div>
                </Sortable>
              ))}
            </SortableContext>
          </DndContext>

          <div className='label'><strong>Add nearby landmark</strong></div>

          <div className='search-box'>
            <input
              className='landmark-search'
              type="text"
              name="search"
              value=''
              onChange={startChange}
              onBlur={(e) => {
                dispatch({ type: 'set other', key: subkey, value: e.target.value})
              }}
            />
            <span className='search-icon'><FontAwesomeIcon icon={faMagnifyingGlass} /></span>
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
            suggested
            { candidates.length === 0 &&
              <button
                type="button"
                onClick={() => {
                  dispatch({ type: `set ${subkey}`, value: { ...point, nearbyPending: true } });
                  getNearby(`set ${subkey}`, point, dispatch);
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
              <div className='phrase'>{loc.phrase}</div>
              <button
                type='button'
                className='close'
                onClick={(e) => dispatch({ type: 'add nearby', key: subkey, candidate: loc})}
              ><FontAwesomeIcon icon={faPlus} /></button>
            </div>
          ))}

          { nearbyPending && point?.name && <Skeleton width={250} height={20} />}

          { !nearbyIds.includes('other') &&
            <div className='landmark suggestion'>
              <div className='icon'><FontAwesomeIcon icon={faInputText} /></div>
              <div className='phrase'>
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

export default function Location({ errors, event, dispatch, goToFunc, map }) {
  const start = event?.location?.start;
  const end = event?.location?.end;

  if (event.from_bulk) {
    return (
      <div>
        <p><strong>Segment</strong></p>
        <p>{event.location.start.name}</p>
      </div>
    );
  }

  return <>
    <div className={`title ${(errors['End location'] && !end?.name) ? 'error' : ''}`}>
      <div>
        <strong>Location</strong>&nbsp;&nbsp;
        <Tooltip text="Zoom to include all points">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640" width="20" height="20"
            className="go-to"
            onClick={(e) => goToFunc([start?.coords, end?.coords])}
          >
            <path fill="currentColor" d="M320 48C333.3 48 344 58.7 344 72L344 97.3C448.5 108.4 531.6 191.5 542.7 296L568 296C581.3 296 592 306.7 592 320C592 333.3 581.3 344 568 344L542.7 344C531.6 448.5 448.5 531.6 344 542.7L344 568C344 581.3 333.3 592 320 592C306.7 592 296 581.3 296 568L296 542.7C191.5 531.6 108.4 448.5 97.3 344L72 344C58.7 344 48 333.3 48 320C48 306.7 58.7 296 72 296L97.3 296C108.4 191.5 191.5 108.4 296 97.3L296 72C296 58.7 306.7 48 320 48zM496 320C496 222.8 417.2 144 320 144C222.8 144 144 222.8 144 320C144 417.2 222.8 496 320 496C417.2 496 496 417.2 496 320zM384 320C384 284.7 355.3 256 320 256C284.7 256 256 284.7 256 320C256 355.3 284.7 384 320 384C355.3 384 384 355.3 384 320zM208 320C208 258.1 258.1 208 320 208C381.9 208 432 258.1 432 320C432 381.9 381.9 432 320 432C258.1 432 208 381.9 208 320z"/>
          </svg>
        </Tooltip>
      </div>
      {/* { end?.name &&
        <div>
          <button
            type='button'
            className='cancel'
            onClick={(e) => dispatch({ type: 'swap locations', start: end, end: start })}
          >
            <FontAwesomeIcon icon={faArrowRightArrowLeft} />&nbsp;
            Swap pins
          </button>
        </div>
      } */}
    </div>

    <Tabs hideSingleTabHandle={true}>
      <Tabs.Tab name='start' label='Start location'>
        <Point point={start} dispatch={dispatch} goToFunc={goToFunc} subkey='start' map={map} />
      </Tabs.Tab>

      { end?.name &&
        <Tabs.Tab name='end' label='End location'>
          <Point point={end} dispatch={dispatch} goToFunc={goToFunc} subkey='end' map={map} />
        </Tabs.Tab>
      }
    </Tabs>

          {/* { errors['End location'] && !end?.name &&
            <div className="toggleable">
              <div className="toggle">
                <Tooltip text="Center end pin">
                  <img
                    src={pinEnd}
                    style={{ width: '20px' }}
                    onClick={(e) => goToFunc(end?.coords)}
                  />
                </Tooltip>
              </div>

              <div className="title error">
                <p>{errors['End location']}</p>
              </div>
            </div>
          } */}


  </>;
}
