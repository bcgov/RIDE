import { useCallback, useRef, useState } from 'react';
import Skeleton from 'react-loading-skeleton';
import "react-loading-skeleton/dist/skeleton.css";

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

import { bc2g, bc2ll, g2bc, getNearby as getNearbyPopCenters, ll2bc } from '../components/Map/helpers';

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
  const apiUrl = `${baseUrl}?points=${encodeURIComponent(pointString)}&criteria=shortest&roundTrip=false&correctSide=false&apikey=${apiKey}&distanceUnit=km`;

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

async function getIntersections(coords) {
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

  return results.features.filter((feature) => feature.distance >= 0);
}
globalThis.getIntersections = getIntersections;

async function getIntersections2(coords) {
  const params = new URLSearchParams({
    lat: coords[1],
    lon: coords[0],
  });

  const results = await fetch(`${API_HOST}/api/landmarks?${params}`, {'mode': 'cors'}).then((body) => body.json());

  // const intersections = results.filter((feat) => feat.landmark_type === 'A5').slice(0, 5);
  const intersections = results.slice(0, 10);

  return intersections.map((i) => {
    const distance = i.distance / 1000;
    const displayDistance = Math.round(distance < 1 ? i.distance : distance);
    const unit = distance < 1 ? 'm' : 'km';
    const intCoords = i.geometry.coordinates
    const points = [coords[0], coords[1], intCoords[0], intCoords[1]];
    const direction = getCardinalDirection(points);
    let km_post;
    if (i.landmark_type === 'S4') {
      km_post = i.description.split(' ')[0];
    }
    return {
      source: 'intersections',
      class: i.landmark_type,
      distance,
      direction,
      phrase: `${displayDistance}${unit} ${direction} of ${i.description}`,
      id: `intersection-${i.id}`,
      coords: i.geometry.coordinates,
      km_post,
    }
  })
}
globalThis.getIntersections2 = getIntersections2;

async function getMunicipality(coords) {
  coords = ll2bc(coords);
  const cql = `INTERSECTS(SHAPE, POINT(${coords[0]} ${coords[1]}))`;
  const params = getGeoserverParams(LAYERS.municipalities, cql);
  const results = await fetch(`${HOST}?${params}`, {'mode': 'cors'}).then((body) => body.json());
  return {
    name: results.features[0]?.properties?.ADMIN_AREA_ABBREVIATION,
    id: `municipality-${results.features[0]?.properties?.LGL_ADMIN_AREA_ID}`,
  };
}
globalThis.getMunicipality = getMunicipality;

export async function getNearby(coords, useGeocoder=true) {
  const nearby = [];
  const { name, id } = await getMunicipality(coords);
  if (name) {
    nearby.push({ id, name, phrase: `in ${name}`, source: 'municipalities', distance: 0 });
  }
  let intersections;
  if (useGeocoder){
    intersections = await getIntersections(coords);
  } else {
    intersections = await getIntersections2(coords);
  }
  nearby.push(...intersections);
  const popCenters = (await getNearbyPopCenters(coords)).filter((pop) => !pop.name.toLowerCase().includes(name?.toLowerCase()));
  nearby.push(...popCenters);
  nearby.sort((a, b) => a.distance - b.distance);
  return nearby;
}
globalThis.getNearby = getNearby;

async function getDistanceRoute(pointA, pointB) {
  const route1 = await getRoute([pointA[0], pointA[1], pointB[0], pointB[1]]);
  const route2 = await getRoute([pointB[0], pointB[1], pointA[0], pointA[1]]);
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
  if (loc.source === 'intersections') {
    return loc.class === 'S4' ? faSignHanging : faRoad;
  } else if (loc.type === 'other') {
    return faInputText;
  }
  return faCity;
}

function Point({ point, dispatch, goToFunc, subkey }) {
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
  const candidates = (point?.candidates || [])
    .filter((loc) => !nearbyIds.includes(loc.id))
    .filter((loc) => {
      if (filter === 'all') return true;
      if (filter === 'intersections' && loc.source === 'intersections' && loc.class?.startsWith('A')) { return true; }
      if (filter === 'landmarks' && loc.class === 'S4') { return true; }
      if (filter === 'places' && (loc.source === 'municipalities' || loc.source === 'BCGNWS')) { return true; }

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

          { point?.nearbyPending && point?.name && <Skeleton width={250} height={20} />}

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
            <button
              type="button"
              onClick={() => null}
            ><FontAwesomeIcon icon={faArrowRotateRight} /></button>
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

export default function Location({ errors, event, dispatch, goToFunc }) {
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
        <Point point={start} dispatch={dispatch} goToFunc={goToFunc} subkey='start' />
      </Tabs.Tab>

      { end?.name &&
        <Tabs.Tab name='end' label='End location'>
          <Point point={end} dispatch={dispatch} goToFunc={goToFunc} subkey='end' />
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

const near = [
    {
        "id": "a1",
        "phrase": "in Nanaimo",
        "source": "municipalities",
        "distance": 0,
        "include": true
    },
    {
        "id": "a2",
        "type": "Feature",
        "geometry": {
            "type": "Point",
            "crs": {
                "type": "EPSG",
                "properties": {
                    "code": 4326
                }
            },
            "coordinates": [
                -124.0140724,
                49.1992367
            ]
        },
        "properties": {
            "fullAddress": "Labieux Rd and Pheasant Terr, Nanaimo, BC",
            "intersectionName": "Labieux Rd and Pheasant Terr",
            "localityName": "Nanaimo",
            "localityType": "City",
            "provinceCode": "BC",
            "locationPositionalAccuracy": "high",
            "locationDescriptor": "intersectionPoint",
            "intersectionID": "318c2f8f-aa6e-441a-a911-d2d4da063257",
            "degree": 3
        },
        "distance": 0.002,
        "direction": "NW",
        "phrase": "2m NW of Labieux Rd and Pheasant Terr"
    },
    {
        "id": "a3",
        "type": "Feature",
        "geometry": {
            "type": "Point",
            "crs": {
                "type": "EPSG",
                "properties": {
                    "code": 4326
                }
            },
            "coordinates": [
                -124.013394,
                49.1992287
            ]
        },
        "properties": {
            "fullAddress": "Conlin Way and Labieux Rd, Nanaimo, BC",
            "intersectionName": "Conlin Way and Labieux Rd",
            "localityName": "Nanaimo",
            "localityType": "City",
            "provinceCode": "BC",
            "locationPositionalAccuracy": "high",
            "locationDescriptor": "intersectionPoint",
            "intersectionID": "187242f8-e625-4c4f-8150-15f95d3a9cb5",
            "degree": 3
        },
        "distance": 0.051,
        "direction": "W",
        "phrase": "51m W of Conlin Way and Labieux Rd"
    },
    {
        "id": "a4",
        "type": "Feature",
        "geometry": {
            "type": "Point",
            "crs": {
                "type": "EPSG",
                "properties": {
                    "code": 4326
                }
            },
            "coordinates": [
                -124.0151041,
                49.1996429
            ]
        },
        "properties": {
            "fullAddress": "Labieux Rd and Meadow Lark Trail, Nanaimo, BC",
            "intersectionName": "Labieux Rd and Meadow Lark Trail",
            "localityName": "Nanaimo",
            "localityType": "City",
            "provinceCode": "BC",
            "locationPositionalAccuracy": "high",
            "locationDescriptor": "intersectionPoint",
            "intersectionID": "cceff48a-1a9b-4b88-8fb4-a117d6a4613a",
            "degree": 3
        },
        "distance": 0.086,
        "direction": "SE",
        "phrase": "86m SE of Labieux Rd and Meadow Lark Trail"
    },
    {
        "id": "a5",
        "type": "Feature",
        "geometry": {
            "type": "Point",
            "crs": {
                "type": "EPSG",
                "properties": {
                    "code": 4326
                }
            },
            "coordinates": [
                -124.0140695,
                49.1979265
            ]
        },
        "properties": {
            "fullAddress": "Pheasant Terr and Willow Grouse Cres, Nanaimo, BC",
            "intersectionName": "Pheasant Terr and Willow Grouse Cres",
            "localityName": "Nanaimo",
            "localityType": "City",
            "provinceCode": "BC",
            "locationPositionalAccuracy": "high",
            "locationDescriptor": "intersectionPoint",
            "intersectionID": "0461041f-2c5d-439d-a0bf-453d7e4465fa",
            "degree": 3
        },
        "distance": 0.148,
        "direction": "N",
        "phrase": "148m N of Pheasant Terr and Willow Grouse Cres"
    },
    {
        "id": "a6",
        "type": "Feature",
        "geometry": {
            "type": "Point",
            "crs": {
                "type": "EPSG",
                "properties": {
                    "code": 4326
                }
            },
            "coordinates": [
                -124.015885,
                49.1999814
            ]
        },
        "properties": {
            "fullAddress": "Black Franks Dr and Labieux Rd, Nanaimo, BC",
            "intersectionName": "Black Franks Dr and Labieux Rd",
            "localityName": "Nanaimo",
            "localityType": "City",
            "provinceCode": "BC",
            "locationPositionalAccuracy": "high",
            "locationDescriptor": "intersectionPoint",
            "intersectionID": "91453062-ac8a-4c44-86b0-3f6e2d92023d",
            "degree": 3
        },
        "distance": 0.154,
        "direction": "SE",
        "phrase": "154m SE of Black Franks Dr and Labieux Rd"
    },
    {
        "id": "a7",
        "source": "BCGNWS",
        "name": "Lantzville",
        "type": "District Municipality (1)",
        "coordinates": [
            -124.0744444438,
            49.2505555511
        ],
        "distance": 9.254,
        "direction": "SE",
        "phrase": "9.3km SE of Lantzville"
    },
    {
        "id": "a8",
        "source": "BCGNWS",
        "name": "Ladysmith",
        "type": "Town",
        "coordinates": [
            -123.8155555555,
            48.9933333289
        ],
        "distance": 30.96,
        "direction": "NW",
        "phrase": "31km NW of Ladysmith"
    },
    {
        "id": "a9",
        "source": "BCGNWS",
        "name": "North Cowichan",
        "type": "District Municipality (1)",
        "coordinates": [
            -123.7197222225,
            48.8247222182
        ],
        "distance": 53.187,
        "direction": "NW",
        "phrase": "53.2km NW of North Cowichan"
    },
    {
        "id": "a10",
        "source": "BCGNWS",
        "name": "Duncan",
        "type": "City",
        "coordinates": [
            -123.708055555,
            48.7786111072
        ],
        "distance": 58.636,
        "direction": "NW",
        "phrase": "58.6km NW of Duncan"
    },
];