import { useCallback, useEffect, useRef, useState } from 'react';
import Skeleton from 'react-loading-skeleton';
import "react-loading-skeleton/dist/skeleton.css";
import { Circle, Fill, Icon, Style, Stroke, Text } from 'ol/style';
import { Point as olPoint, LineString, Polygon } from 'ol/geom';

import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  restrictToVerticalAxis,
  restrictToParentElement,
} from '@dnd-kit/modifiers';

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faArrowRightArrowLeft,  faArrowRotateRight, faCity, faInputText, faMagnifyingGlass, faPlus, faRoad, faSignHanging, faXmark } from '@fortawesome/pro-regular-svg-icons';

import pinStart from '../../public/pin-start.svg';
import pinEnd from '../../public/pin-end.svg';
import { ROUTER_CLIENT_ID } from '../env.js';

import Tabs from '../shared/Tabs';

import { bc2g, bc2ll, g2bc, g2ll, getNearby as getNearbyPopCenters, ll2bc, ll2g } from '../components/Map/helpers';
import RideFeature from '../components/Map/feature';

import { API_HOST } from '../env';

const PINS = {
  start: pinStart,
  end: pinEnd,
}

import Tooltip from './Tooltip';

const REF_LOC_TEXT = `Reference locations within 100km as the crow flies.  Sorted by population class, then by distance.

1. City (> 5,000)
2. District Municipality (> 800 hectares, < 5 people/hectare)
3. Town (< 5,000, inc.)
4. Village (< 2,500, inc.)
5. Community (>50, uninc.)
6. Locality (<50, uninc.)`;

const LAYERS = {
  DRA: 'pub:WHSE_BASEMAPPING.DRA_DGTL_ROAD_ATLAS_MPAR_SP',
  municipalities: 'pub:WHSE_LEGAL_ADMIN_BOUNDARIES.ABMS_MUNICIPALITIES_SP',
};

const markerStyles = {
  static: new Style({
    image: new Circle({
      stroke: new Stroke({
        color: 'rgb(30, 83, 167)',
        width: 2,
      }),
      fill: new Fill({ color: 'rgba(24, 148, 230, 0.75)' }),
      radius: 10,
    }),
    text: new Text({
      font: '11px BC Sans',
      fill: new Fill({ color: [ 255, 255, 255, 1], }),
      text: '',
      textBaseline: 'bottom',
      offsetY: 8,
    }),
  }),
  hover: [
    new Style({
      image: new Circle({
        stroke: new Stroke({
          color: 'rgba(30, 83, 167, 1)',
          width: 3,
        }),
        fill: new Fill({ color: 'rgba(30, 83, 167, 0.7)' }),
        radius: 11,
      }),
      text: new Text({
        font: 'bold 11px BC Sans',
        fill: new Fill({ color: [ 255, 255, 255, 1], }),
        text: '',
        textBaseline: 'bottom',
        offsetY: 8,
      }),
    }),
    new Style({
      text: new Text({
        font: '13px BC Sans',
        // fill: new Fill({ color: [ 0, 0, 0, 1], }),
        fill: new Fill({ color: [ 255, 255, 255, 1], }),
        backgroundFill: new Fill({ color: [ 0, 0, 0, 0.5], }),
        padding: [3, 5, 1, 6],
        // stroke: new Stroke({ color: [255, 255, 255,1], width: 2 }),
        text: 'asdfasdf',
        offsetY: -20,
        textBaseline: 'bottom',
      }),
    }),
  ],
  active: new Style({
    image: new Circle({
      stroke: new Stroke({
        color: 'rgba(30, 83, 167, 1)',
        width: 2,
      }),
      fill: new Fill({ color: 'rgba(30, 83, 167, 0.7)' }),
      radius: 8,
    }),
  }),
}

const intersectionStyles = {
  static: new Style({
    image: new Circle({
      stroke: new Stroke({
        color: 'rgba(88, 66, 21, 1)',
        width: 2,
      }),
      fill: new Fill({ color: 'rgba(249, 196, 48, 0.4)' }),
      radius: 8,
    }),
  }),
  hover: new Style({
    image: new Circle({
      stroke: new Stroke({
        color: 'rgba(88, 66, 21, 1)',
        width: 3,
      }),
      fill: new Fill({ color: 'rgba(249, 196, 48, 0.7)' }),
      radius: 10,
    }),
    text: new Text({
      font: '13px BC Sans',
      // fill: new Fill({ color: [ 0, 0, 0, 1], }),
      fill: new Fill({ color: [ 255, 255, 255, 1], }),
      backgroundFill: new Fill({ color: [ 0, 0, 0, 0.5], }),
      padding: [3, 5, 1, 6],
      // stroke: new Stroke({ color: [255, 255, 255,1], width: 2 }),
      text: '',
      offsetY: -20,
      textBaseline: 'bottom',
    }),
  }),
  active: new Style({
    image: new Circle({
      stroke: new Stroke({
        color: 'rgba(88, 66, 21, 1)',
        width: 2,
      }),
      fill: new Fill({ color: 'rgba(249, 196, 48, 0.7)' }),
      radius: 8,
    }),
  }),
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

const HOST = 'https://openmaps.gov.bc.ca/geo/wfs';

export async function getRoute(points) {
  const pointString = `${points[0]},${points[1]},${points[2]},${points[3]}`;
  const baseUrl = "https://router.api.gov.bc.ca/directions.json";
  const apiKey = ROUTER_CLIENT_ID;
  const apiUrl = `${baseUrl}?points=${encodeURIComponent(pointString)}&criteria=shortest&apikey=${apiKey}&distanceUnit=km`;

  try {
    const response = await fetch(apiUrl, {mode: 'cors'});
    return response.json();
  } catch (error) {
    console.error("Failed to fetch route:", error);
    return null;
  }
}

const directions = ["S", "SW", "W", "NW", "N", "NE", "E", "SE"];

function getCardinalDirection(points) {
  const lat1 = points[1] * Math.PI / 180;
  const lat2 = points[3] * Math.PI / 180;
  const dLon = (points[2] - points[0]) * Math.PI / 180;
  const y = Math.sin(dLon) * Math.cos(lat2);
  const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLon);
  const bearing = Math.atan2(y, x) * 180 / Math.PI;
  const normalized = (bearing + 360) % 360;
  const index = Math.round(normalized / 45) % 8;
  return directions[index];
}


async function getIntersections(coords, dispatch, subkey) {
  const retval = [];
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
      const points = [coords[0], coords[1], intCoords[0], intCoords[1]];
      const route = await getDistanceRoute(coords, result.geometry.coordinates)
      result.source = 'intersections';
      result.distance = route.distance;
      result.direction = getCardinalDirection(points);
      result.phrase = `${route.distance * 1000}m ${result.direction} of ${result.properties.intersectionName}`;
      result.id = `geobc-intersection-${result.properties.intersectionID}`;
      result.coords = result.geometry.coordinates;
    }

    retval.push(...results.features.filter((feature) => feature.distance >= 0));
  } catch (err) {
    console.error(err);
    return [{ source: 'error', detail: 'Geocoder intersections not available at this time' }];
  }
  dispatch({
    type: 'add candidates',
    source: 'intersections',
    subkey,
    value: retval,
  });
}
globalThis.getIntersections = getIntersections;


async function getLandmarks(location, dispatch, subkey) {
  if (!location.HIGHWAY_ROUTE_NUMBER) { return []; }
  const retval = [];

  try {
    const coords = location.coords;
    const params = new URLSearchParams({ lat: coords[1], lon: coords[0], });

    const landmarks = await fetch(`${API_HOST}/api/landmarks?${params}`, {'mode': 'cors'}).then((body) => body.json());

    for (const landmark of landmarks) {
      let wrongHighway = true;
      const pinHwys = location.HIGHWAY_ROUTE_NUMBER.split('+');
      const hwys = landmark.segment.highways.map((hwy) => hwy.full_name);
      // console.log(hwys, pinHwys);
      for (const ph of pinHwys) {
        if (hwys.includes(ph)) {
          wrongHighway = false;
          break;
        }
      }
      if (wrongHighway) { continue; }

      const landmarkCoords = landmark.geometry.coordinates
      const route = await getDistanceRoute(coords, landmarkCoords);

      // if the road linear distance is greater than twice the crow-flies distance,
      // filter it out as it's probably on a parallel highway
      if (route.distance > (landmark.distance * 0.002)) { continue; }

      const displayDistance = Math.round(route.distance < 1 ? landmark.distance : route.distance);
      const unit = route.distance < 1 ? 'm' : 'km';
      const points = [coords[0], coords[1], landmarkCoords[0], landmarkCoords[1]];
      const direction = getCardinalDirection(points);
      let km_post;
      if (landmark.landmark_type === 'S4') {
        km_post = landmark.description.split(' ')[0];
      }

      retval.push({
        source: 'landmarks',
        class: landmark.landmark_type,
        distance: route.distance,
        direction,
        phrase: `${displayDistance}${unit} ${direction} of ${landmark.description}`,
        id: `intersection-${landmark.id}`,
        coords: landmark.geometry.coordinates,
        km_post,
      });
    }
  } catch (err) {
    console.error(err);
    return [{ source: 'error', detail: 'Landmarks not available at this time' }];
  }
  dispatch({
    type: 'add candidates',
    source: 'landmarks',
    subkey,
    value: retval.slice(0, 20),
  });
}
globalThis.getLandmarks = getLandmarks;


async function getMunicipality(coords, dispatch, subkey) {
  const retval = [];
  try {
    coords = ll2bc(coords);
    const cql = `INTERSECTS(SHAPE, POINT(${coords[0]} ${coords[1]}))`;
    const params = getGeoserverParams(LAYERS.municipalities, cql);
    const results = await fetch(`${HOST}?${params}`, {'mode': 'cors'}).then((body) => body.json());
    const name = results.features[0]?.properties?.ADMIN_AREA_ABBREVIATION;
    if (name) {
      retval.push({
        name: results.features[0]?.properties?.ADMIN_AREA_ABBREVIATION,
        id: `municipality-${results.features[0]?.properties?.LGL_ADMIN_AREA_ID}`,
        source: 'municipalities',
        distance: 0,
        phrase: `In ${name}`
      });
    }
  } catch (err) {
    console.error(err);
    return [{ source: 'error', detail: 'Municipality not available at this time' }];
  }
  dispatch({
    type: 'add candidates',
    source: 'municipalities',
    subkey,
    value: retval,
  });
}
globalThis.getMunicipality = getMunicipality;


export async function getNearby(action, location, dispatch) {
  const subkey = action.split(' ')[1];
  dispatch({ type: 'reset retrieved', subkey });

  getMunicipality(location.coords, dispatch, subkey);
  getLandmarks(location, dispatch, subkey);

  if (location.HIGHWAY_ROUTE_NUMBER){
    getLandmarks(location, dispatch, subkey);
  } else {
    getIntersections(location.coords, dispatch, subkey);
  }

  const populations = await getNearbyPopCenters(location.coords);
  if (populations.length > 0 && populations[0].source !== 'error') {
    dispatch({
      type: 'add candidates',
      source: 'bcgnws',
      subkey,
      value: populations,
    });
  }
}
globalThis.getNearby = getNearby;


/* For the given point, reset all the candidate markers on the map with
 * updated text describing their distance from the pin
 */
function updateMap(map, point) {
  const source = map.get('pins').getSource();
  source.remove('nearby intersections');

  for (const candidate of (point.candidates ? point.candidates : [])) {
    if (!['intersections', 'landmarks'].includes(candidate.source)) { continue; }

    // update feature styles's text
    let styles = intersectionStyles;
    if (candidate.class === 'S4') {
      styles = markerStyles;
      styles.static = styles.static.clone();
      styles.static.getText().setText(candidate.km_post);
      styles.hover = styles.hover.map((style) => style.clone());
      styles.hover[0].getText().setText(candidate.km_post);
      styles.hover[1].getText().setText(candidate.phrase);
    } else {
      styles.hover = styles.hover.clone();
      styles.hover.getText().setText(candidate.phrase);
    }

    const feature = new RideFeature({
      styles,
      geometry: new olPoint(ll2g(candidate.coords)),
      name: 'nearby intersections',
      isVisible: true,
      noSelect: true,
    });
    source.addFeature(feature);
  }
}


async function getDistanceRoute(pointA, pointB) {
  const [route1, route2] = await Promise.all([
    getRoute([pointA[0], pointA[1], pointB[0], pointB[1]]),
    getRoute([pointB[0], pointB[1], pointA[0], pointA[1]]),
  ]);
  return route1.distance < route2.distance ? route1 : route2;
}

function Sortable({id, children, classes}) {
  const {
    attributes,
    listeners,
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
      {... listeners}
    >{children}</div>
  );
}


function getIcon(loc) {
  if (loc.source === 'intersections' || loc.source === 'landmarks') {
    return loc.class === 'S4' ? faSignHanging : faRoad;
  } else if (loc.type === 'other') {
    return faInputText;
  }
  return faCity;
}


function Point({ point, dispatch, goToFunc, subkey, map }) {
  const [other, setOther] = useState('');
  const [filter, setFilter] = useState('all');
  const otherRef = useRef();

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
      if (filter === 'all') return true;
      if (filter === 'intersections' && ['intersections', 'landmarks'].includes(location.source) && location.class?.startsWith('A')) { return true; }
      if (filter === 'landmarks' && location.class === 'S4') { return true; }
      if (filter === 'places' && (location.source === 'municipalities' || location.source === 'bcgnws')) { return true; }

      return false;
    });

  const otherInNearby = nearbyIds.includes('other');

  function handleDragEnd(event) {
    if (event.active.id !== event.over.id) {
      const oldIndex = nearby.findIndex((el) => el.id === event.active.id);
      const newIndex = nearby.findIndex((el) => el.id === event.over.id);
      dispatch({ type: 'change nearby order', subkey, value: arrayMove(nearby, oldIndex, newIndex) });
    }
  }

  let nearbyPending = false;
  ['municipalities', 'bcgnws'].forEach((term) => {
    if (!point.retrieved?.includes(term)) {
      nearbyPending = true;
    }
  });
  if (!nearbyPending &&
      !(point.retrieved?.includes('intersections') ||
        point.retrieved?.includes('landmarks'))) {
    nearbyPending = false;
  }

  updateMap(map, point);

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
                <Sortable id={loc.id} index={ii} key={loc.id} classes='landmark'>
                    <div className='icon'><FontAwesomeIcon icon={getIcon(loc)} /></div>
                    <div className='phrase'>{loc.phrase}</div>
                    <button
                      type='button'
                      className='close'
                      onClick={(e) => dispatch({ type: 'remove nearby', key: subkey, id: loc.id})}
                    ><FontAwesomeIcon icon={faXmark} /></button>
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
              ><FontAwesomeIcon className={point.nearbyPending ? 'fa-spin' : ''} icon={faArrowRotateRight} /></button>
            }
          </div>

          { candidates.map((loc, ii) => (
            <div className='landmark suggestion' key={loc.id}>
              <div className='icon'><FontAwesomeIcon icon={getIcon(loc)} /></div>
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
