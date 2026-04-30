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
import { faRoad, faSignHanging } from '@fortawesome/duotone-regular-svg-icons';

import pinStart from '../../public/pin-start.svg';
import pinEnd from '../../public/pin-end.svg';
import kmMarker from '../../public/km-marker.svg';

import { getCardinalDirection, getNonDirectionalRoute, titleCase } from '../shared';
import Tabs from '../shared/Tabs';

import { bc2g, bc2ll, g2bc, g2ll, getNearby as getNearbyPopCenters, ll2bc, ll2g } from '../components/Map/helpers';
import RideFeature from '../components/Map/feature';

import { TabContext } from '../shared/Tabs';

import { API_HOST } from '../env';

const PINS = {
  start: pinStart,
  end: pinEnd,
}

import Tooltip from './Tooltip';

const LAYERS = {
  DRA: 'pub:WHSE_BASEMAPPING.DRA_DGTL_ROAD_ATLAS_MPAR_SP',
  municipalities: 'pub:WHSE_LEGAL_ADMIN_BOUNDARIES.ABMS_MUNICIPALITIES_SP',
};

const markerStyles = {
  static: new Style({
    // image: new Circle({
    //   stroke: new Stroke({
    //     color: '#1e53a7',
    //     width: 2,
    //   }),
    //   fill: new Fill({ color: 'rgba(24, 148, 230, 0.75)' }),
    //   radius: 10,
    // }),
    image: new Icon({
      src: '/km-marker.svg',
      height: 32,
      opacity: 0.7,
      // displacement: [0, 16],
    }),
    text: new Text({
      font: '10px/1 BC Sans',
      fill: new Fill({ color: [ 255, 255, 255, 1], }),
      text: '',
      textBaseline: 'middle',
      offsetY: 2,
    }),
  }),
  hover: [
    new Style({
      image: new Icon({
        src: '/km-marker.svg',
        height: 32,
      }),
      text: new Text({
        font: '10px/1 BC Sans',
        fill: new Fill({ color: [ 255, 255, 255, 1], }),
        text: '',
        textBaseline: 'middle',
        offsetY: 2,
      }),
    }),
    new Style({
      text: new Text({
        font: '13px BC Sans',
        fill: new Fill({ color: [ 255, 255, 255, 1], }),
        backgroundFill: new Fill({ color: [ 0, 0, 0, 0.5], }),
        padding: [3, 5, 1, 6],
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

async function getIntersections(coords, subkey, dispatch) {
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
      const route = await getNonDirectionalRoute(coords, result.geometry.coordinates)
      result.source = 'intersections';
      result.distance = route.distance;
      result.direction = getCardinalDirection(coords, intCoords, true);
      result.phrase = `${route.distance * 1000}m ${result.direction} of ${result.properties.intersectionName}`;
      result.id = `${subkey}-intersection-${result.properties.intersectionID}`;
      result.coords = result.geometry.coordinates;
    }

    retval.push(...results.features.filter((feature) => feature.distance >= 0));
  } catch (err) {
    console.error(err);
    retval.push({
      id: `${subkey}-intersection-error`,
      distance: 1,
      phrase: 'Error retrieving GeoBC intersections',
      isError: true,
      source: 'intersections',
    })
  }
  dispatch(retval);
}
globalThis.getIntersections = getIntersections;


async function getLandmarks(location, subkey, dispatch) {
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
      const route = await getNonDirectionalRoute(coords, landmarkCoords);

      // if the road linear distance is greater than twice the crow-flies distance,
      // filter it out as it's probably on a parallel highway
      if (route.distance > (landmark.distance * 0.002)) { continue; }

      const displayDistance = Math.round(route.distance < 1 ? landmark.distance : route.distance);
      const unit = route.distance < 1 ? 'm' : 'km';
      const points = [coords[0], coords[1], landmarkCoords[0], landmarkCoords[1]];
      const direction = getCardinalDirection(coords, landmarkCoords, true);
      let km_post;
      if (landmark.landmark_type === 'S4') {
        km_post = landmark.description.split(' ')[0];
      }

      retval.push({
        source: 'landmarks',
        class: landmark.landmark_type,
        distance: route.distance,
        direction,
        phrase: `${displayDistance}${unit} ${direction} of ${titleCase(landmark.description)}`,
        id: `${subkey}-landmark-${landmark.id}`,
        coords: landmark.geometry.coordinates,
        km_post,
      });
    }
  } catch (err) {
    console.error(err);
    retval.push({
      source: 'landmarks',
      distance: 1,
      phrase: 'Error retrieving landmarks',
      id: `${subkey}-landmark-error`,
      isError: true,
    });
  }
  dispatch(retval.slice(0, 20));
}
globalThis.getLandmarks = getLandmarks;


const HOST = 'https://openmaps.gov.bc.ca/geo/wfs';

async function getMunicipality(coords, subkey, dispatch) {
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
        id: `${subkey}-municipality-${results.features[0]?.properties?.LGL_ADMIN_AREA_ID}`,
        source: 'municipalities',
        distance: 0,
        phrase: `In ${name}`
      });
    } else {
      retval.push({
        name: 'no municipality found',
        id: `${subkey}-municipality-none`,
        source: 'municipalities',
        distance: 0,
        phrase: `Outside a recognized municipality`
      });
    }
  } catch (err) {
    console.error(err);
    retval.push({
      name: 'error',
      id: `${subkey}-municipality-error`,
      source: 'municipalities',
      distance: 0,
      phrase: 'Error retrieving municipality',
      isError: true,
    })
  }
  dispatch(retval);
}
globalThis.getMunicipality = getMunicipality;


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
      if (km.length > 2) {
        styles.static.getText().setFont('8px/1 BC Sans')
        styles.hover[0].getText().setFont('8px/1 BC Sans');
      }
      km = km.split('').join('\n');
      styles.static.getText().setText(km);
      styles.hover[0].getText().setText(km);
      styles.hover[1].getText().setText(candidate.phrase);
    } else {
      styles.hover = styles.hover.clone();
      styles.hover.getText().setText(candidate.phrase);
    }

    const feature = new RideFeature({
      styles,
      geometry: new olPoint(ll2g(candidate.coords)),
      name: `${subkey} nearby intersections`,
      isVisible: visible,
      noSelect: true,
    });
    source.addFeature(feature);
  }
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
      if (filter === 'all') return true;
      if (filter === 'intersections') {
        if (location.source === 'intersections' ||
            location.isError ||
            location.class?.startsWith('A')) {
            return true;
        }
      }
      if (filter === 'landmarks' && (location.class === 'S4' || (location.source === 'landmarks' && location.isError))) { return true; }
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
              ><FontAwesomeIcon className={nearbyPending ? 'fa-spin' : ''} icon={faArrowRotateRight} /></button>
            }
          </div>

          { candidates.map((loc, ii) => (
            <div className={`landmark suggestion ${loc.isError ? 'error' : ''}`} key={loc.id}>
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
