import { getCardinalDirection, getNonDirectionalRoute, titleCase } from '../../../shared';

import { ll2bc } from '../../../components/Map/helpers';

import { API_HOST } from '../../../env';


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

async function getIntersections(coords, subkey, roadName, dispatch, search) {
  const intersections = [];
  try {
    const params = new URLSearchParams({
      point: coords[0] + "," + coords[1],
      maxDistance: 1000, // in metres
      outputSRS: 4326,
      maxResults: 50,
      locationDescriptor: "intersectionPoint",
      setBack: 0,
      brief: false,
      minDegree: 3,
      excludeUnits: false,
      onlyCivic: false
    });

    const results = await fetch(
      `https://geocoder.api.gov.bc.ca/intersections/near.json?${params}`,
      {'mode': 'cors'}
    ).then((body) => body.json());

    for (const result of results.features) {
      // skip intersections not on the current road
      const name = result.properties.intersectionName;
      if (!name.includes(roadName) || (search && !name.toLowerCase().includes(search))) {
        continue;
      }
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
      result.from = coords;
      result.search = search;
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

async function getLandmarks(location, subkey, dispatch, search) {
  if (!location.HIGHWAY_ROUTE_NUMBER) { return []; }
  let landmarks = [];
  search = search.toLowerCase();

  try {
    const coords = location.coords;
    const params = new URLSearchParams({ lat: coords[1], lon: coords[0], });

    const results = await fetch(`${API_HOST}/api/landmarks?${params}`, {'mode': 'cors'}).then((body) => body.json());

    // keep a dict of candidates by their description, replacing them if a
    // candidate has the same description with a shorter distance. The end
    // result will be an index by description of the nearest candidate.
    const byDescription = {};

    for (const landmark of results) {
      // filter out forest service roads with no name, and landmarks not
      // matching the search term when it's present
      if ((landmark.landmark_type === 'G6' && landmark.description.toLowerCase() === 'fsr') ||
        (search && landmark.description.toLowerCase().indexOf(search) < 0)
      ) {
        continue;
      }
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
        id: `${subkey}-${landmark.id}`,
        source: 'landmarks',
        type: LANDMARK_TYPES[landmark.landmark_type] || landmark.landmark_types,
        class: landmark.landmark_type,
        distance: route.distance,
        direction,
        description: landmark.description,
        phrase,
        coords: landmarkCoords,
        raw: landmark,
        from: coords,
        km_post,
        search,
      }

      // update the byDescription dict if this landmark isn't present or if it's
      // closer than the stored landmark
      if (!byDescription[candidate.description] ||
        byDescription[candidate.description].distance > candidate.distance
      ) {
        byDescription[candidate.description] = candidate;
      }
      landmarks.push(candidate);

      // stop at 20 since they're coming from the backend sorted by crow-flies
      // distance, and already filtered for landmarks on the current highway, so
      // it's unlikely that a short linear distance might have a long road
      // distance; this saves us a lot of calls to the router that are adding a
      // noticeable lag.
      if (landmarks.length > 20) { break; }
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

const MajorPopulationCenterTypes = [
  // 'Locality', // < 50
  // 'Community', // > 50, unincorporated
  'Village', // < 2,500
  'Village (1)',
  'Village (2)',
  'First Nation Village',
  'Town', // < 5,000
  'District Municipality (1)', // > 800 hectares, < 5 people/hectare
  'City', // > 5,000
];

const MinorPopulationCenterTypes = [
  // 'Locality', // < 50
  'Community', // > 50, unincorporated
];

async function filterByTypes(features, types, fromCoords) {
  const results = [];
  for (const feature of features) {
    const index = types.indexOf(feature.properties.featureType);
    if (index < 0) { continue; }

    const toCoords = feature.geometry.coordinates;
    let direction = getCardinalDirection(fromCoords, toCoords, true);
    const route = await getNonDirectionalRoute(fromCoords, toCoords);

    if (!route || route.distance < 0) { continue; }

    results.push({
      id: `bcgnws-${feature.properties.feature.id}`,
      source: "bcgnws",
      name: feature.properties.name,
      type: feature.properties.featureType,
      coordinates: feature.geometry.coordinates,
      coords: feature.geometry.coordinates,
      distance: route.distance,
      direction,
      phrase: `${Math.round(route.distance)}km ${direction} of ${feature.properties.name}`,
      size: types === MajorPopulationCenterTypes ? 'major' : 'minor',
    });
  }
  return results;
};


export async function getNearbyFromBCGNWS(coords, search='') {
  try {
    search = search.toLowerCase();
    const baseUrl = "https://apps.gov.bc.ca/pub/bcgnws/names/near";
    const params = {
      featureClass: 1,
      official: 1,
      itemsPerPage: 200,
      startIndex: 1,
      featurePoint: coords[0] + "," + coords[1],
      distance: 100, // km
      outputFormat: "json",
      outputStyle: "detail",
      outputSRS: 4326
    };
    const url = new URL(baseUrl);
    url.search = new URLSearchParams(params).toString();
    const apiUrl = url.toString();

    const response = await fetch(apiUrl, {mode: 'cors'});
    if (!response.ok) {
      const text = await response.text();
      const message = (text.match(/<p><b>Message<\/b>(.*?)<\/p>/imv) || ['', 'No detail provided'])[1];
      throw Error(`BCGNWS request failed (status ${response.status})`, { cause: message.trim() });
    }
    const data = await response.json();

    let features = data.features;
    if (search) {
      features = features.filter(
        (feature) => feature.properties.name.toLowerCase().includes(search)
      ).map((feature) => {
        feature.search = search;
        feature.from = coords;
        return feature;
      });
    }
    let results = await filterByTypes(features, MajorPopulationCenterTypes, coords);
    if (results.length === 0) {
      results.push(...await filterByTypes(features, MinorPopulationCenterTypes, coords));
    }

    results.sort((a, b) => a.distance - b.distance);
    return results.map((result) => ({... result, source: 'bcgnws', displayDistance: Math.round(result.distance)})).slice(0, 6);
  } catch (err) {
    console.error(err);
    return [{ source: 'bcgnws', name: 'error', phrase: 'Problem retrieving population centres data.' }];
  }
}

/* Get nearby features from multiple sources.  As any source may fail, or
 * have a lengthy timeout, retrieval must be concurrent, relying on dispatch to
 * update the possible candidates as they come in.  In order to show a loading
 * skeleton while a request is pending, each call must be preceded by a dispatch
 * to a pending set where the velue is removed on completion.  This means that
 * all calls must complete, returning error values as normal values to be
 * handled later.
 */
export async function getNearby(action, location, dispatch, search='') {
  const roadName = location.name.split(' ').slice(0, -1).join(' ');
  const subkey = action.split(' ')[1];
  search = search.toLowerCase();

  const type = search ? 'add searched' : 'add candidates';
  if (!search) {
    dispatch({ type: 'add to pending', subkey, value: 'municipalities' });
    getMunicipality(location.coords, subkey, (value) => {
      dispatch({ type, subkey, value, source: 'municipalities' });
    });
  }

  if (location.HIGHWAY_ROUTE_NUMBER){
    dispatch({ type: 'add to pending', subkey, value: 'landmarks' });
    getLandmarks(location, subkey, (value) => {
      dispatch({ type, subkey, value, source: 'landmarks', search });
    }, search);
  } else {
    dispatch({ type: 'add to pending', subkey, value: 'intersections' });
    getIntersections(location.coords, subkey, roadName, (value) => {
      dispatch({ type, subkey, value, source: 'intersections', search });
    }, search);
  }

  dispatch({ type: 'add to pending', subkey, value: 'bcgnws' });
  const value = await getNearbyFromBCGNWS(location.coords, search);
  dispatch({ type, subkey, value, source: 'bcgnws', search });
}

