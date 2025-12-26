import { createContext } from 'react';

import { applyStyle } from 'ol-mapbox-style';
import Map from 'ol/Map';
import MVT from 'ol/format/MVT.js';
import { ScaleLine } from 'ol/control.js';
import { circular } from 'ol/geom/Polygon';
import { Point, LineString, MultiLineString } from 'ol/geom';
import VectorTileLayer from 'ol/layer/VectorTile.js';
import PointerInteraction from 'ol/interaction/Pointer.js';
import { fromLonLat, getTransform, transform, transformExtent } from 'ol/proj';
import VectorTileSource from 'ol/source/VectorTile.js';
import View from 'ol/View';
import proj4 from 'proj4';
import * as turf from '@turf/turf';

import overrides from './overrides.js';
import RideFeature from './feature.js';
import { BASE_MAP_URL, MAP_STYLE_URL, ROUTER_CLIENT_ID } from '../../env.js';
import { get, post } from '../../shared/helpers'

import { dotStyle, dotStyle2, lineStyle } from './styles.js';

proj4.defs([
  ["EPSG:3005", "+proj=aea +lat_1=50 +lat_2=58.5 +lat_0=45 +lon_0=-126 +x_0=1000000 +y_0=0 +ellps=GRS80 +datum=NAD83 +units=m +no_defs"],
  ["EPSG:26907", "+proj=utm +zone=7 +ellps=GRS80 +datum=NAD83 +units=m +no_defs"],
  ["EPSG:26908", "+proj=utm +zone=8 +ellps=GRS80 +datum=NAD83 +units=m +no_defs"],
  ["EPSG:26909", "+proj=utm +zone=9 +ellps=GRS80 +datum=NAD83 +units=m +no_defs"],
  ["EPSG:26910", "+proj=utm +zone=10 +ellps=GRS80 +datum=NAD83 +units=m +no_defs"],
  ["EPSG:26911", "+proj=utm +zone=11 +ellps=GRS80 +datum=NAD83 +units=m +no_defs"]
]);

export const MapContext = createContext();

export function pointerMove(evt) {
  const feature = evt.map.getFeaturesAtPixel(evt.pixel, {
    layerFilter: (layer) => layer.listenForHover,
  })[0];
  if (feature?.noHover) { return; }
  if (!feature?.styleState) {
    if (evt.map.hoveredFeature) {
      evt.map.hoveredFeature.hovered = false;
      evt.map.hoveredFeature.updateStyle();
      evt.map.hoveredFeature = null;
    }
    return;
  }
  if (evt.map.hoveredFeature && evt.map.hoveredFeature !== feature) {
    evt.map.hoveredFeature.hovered = false;
    evt.map.hoveredFeature.updateStyle();
  }
  evt.map.hoveredFeature = feature;
  if (!feature.hovered) {
    feature.hovered = true;
    feature.updateStyle();
  }
}

/* This clickhandler is solely for toggling selection state on existing map
 * elements.  Hover is handled in the pointerMove handler.
 */
export function click(evt, dispatch) {
  const feature = evt.map.getFeaturesAtPixel(evt.pixel,{
    layerFilter: (layer) => layer.listenForClicks,
  })[0];

  if (feature?.noSelect) { return; }

  if (feature?.styleState) { // new selection
    selectFeature(evt.map, feature);
    const raw = feature.pointFeature.get('raw');
    dispatch({ type: 'reset form', value: raw, showPreview: true, showForm: false });
  } else if (evt.map.selectedFeature) {  // deselect existing selection
    selectFeature(evt.map, null);
    dispatch({ type: 'reset form' });
    evt.stopPropagation();  // prevent placing a start pin
    evt.map.route.getGeometry().setCoordinates([]);
  }
}

export function selectFeature(map, feature) {
  if (map.selectedFeature && map.selectedFeature !== feature) {
    map.selectedFeature.selected = false;
    map.selectedFeature.updateStyle();
  }

  map.selectedFeature = feature;

  if (feature) {
    feature.selected = true;
    feature.updateStyle();
  }
}

/* Creates and returns the base OpenLayers map with layers for the vector tiles
 * and a duplicate layer containing only the highway symbols and road names.
 */
export function createMap() {
  const tileSource = new VectorTileSource({
    format: new MVT({layerName: 'mvt:layer'}), // layername required for ol-mapbox-style 13+
    url: BASE_MAP_URL,
  });

  // base tile map layer
  const vectorLayer = new VectorTileLayer({
    declutter: true,
    source: tileSource,
    style: function() { return null; }, // avoids displaying blueline default style before style loads
    displayCategory: 'basemap',
  });

  // highway symbol layer
  const symbolLayer = new VectorTileLayer({
    declutter: true,
    source: tileSource,
    style: function() { return null; }, // avoids displaying blueline default style before style loads
  });
  // should be highest z-index so that highway symbols are always visible
  symbolLayer.setZIndex(200);

  // Set map extent (W, S, E, N)
  const extent = [-155.230138, 36.180153, -102.977437, 66.591323];
  const transformedExtent = transformExtent(extent, 'EPSG:4326', 'EPSG:3857');

  const view = new View({
    projection: 'EPSG:3857',
    center: fromLonLat([-120.789719, 50.112778]), // merritt
    // center: fromLonLat([-121.842954, 50.784370]), // lillooet
    // center: fromLonLat([-116.519399, 51.366191]),
    zoom: 12,
    maxZoom: 22,
    minZoom: 5,
    extent: transformedExtent,
    enableRotation: false
  });
  globalThis.view = view;

  // Apply the basemap style from the arcgis resource
  post(MAP_STYLE_URL).then(function (glStyle) {
    // DBC22-2153
    glStyle.metadata['ol:webfonts'] = '/fonts/{font-family}/{fontweight}{-fontstyle}.css';

    // Overrides
    for (const layer of glStyle.layers) {
      overrides.merge(layer, overrides[layer.id] || {});
    }

    // clone the basemap style so we can override the style layers,
    // filtering out everything that isn't a highway symbol.
    const symbolsStyle = {
      ...glStyle,
      layers: glStyle.layers.filter((layer) => (
        layer.id.startsWith('TRANSPORTATION/DRA/Hwy Symbols') ||
        layer.id.startsWith('TRANSPORTATION/DRA/Road Names')
      )),
    };

    // console.log(glStyle);
    applyStyle(vectorLayer, glStyle, 'esri');
    applyStyle(symbolLayer, symbolsStyle, 'esri');
  });

  // create map
  const map = new Map({
    // layers: [vectorLayer, symbolLayer],
    layers: [vectorLayer],
    view: view,
    moveTolerance: 7,
    controls: [new ScaleLine({ units: 'metric' })],
  });

  map.set('layerNames', ['basemap', 'symbols']);
  map.set('basemap', vectorLayer);
  map.set('symbols', symbolLayer);
  return map;
}

export class Drag extends PointerInteraction {
  constructor(options) {
    super({
      handleDownEvent: handleDownEvent,
      handleDragEvent: handleDragEvent,
      handleMoveEvent: handleMoveEvent,
      handleUpEvent: handleUpEvent,
    });
    options = options || {};
    this.endHandler = options.endHandler || (() => {});
    this.menuRef = options.menuRef;
    this.dispatch = options.dispatch;
    this.resetContextMenu = options.resetContextMenu

    /**
     * @type {import('ol/coordinate.js').Coordinate}
     * @private
     */
    this.coordinate_ = null;

    /**
     * @type {string|undefined}
     * @private
     */
    this.cursor_ = 'pointer';

    /**
     * @type {Feature}
     * @private
     */
    this.feature_ = null;

    /**
     * @type {string|undefined}
     * @private
     */
    this.previousCursor_ = undefined;
  }
}

/**
 * @param {import('ol/MapBrowserEvent.js').default} evt Map browser event.
 * @return {boolean} `true` to start the drag sequence.
 */
function handleDownEvent(evt) {
  // only drag for left mouse
  if (evt.originalEvent.button > 0) {
    return false;
  }

  const map = evt.map;
  if (this.menuRef.current) {
    this.resetContextMenu();
  }

  const feature = map.getFeaturesAtPixel(evt.pixel, {
    layerFilter: (layer) => layer.canDragFeatures,
  })[0];

  if (feature) {
    if (feature.noSelect) { return false; }
    map.route?.clear();
    this.coordinate_ = evt.coordinate;
    feature.getGeometry().setCoordinates(evt.coordinate);
    this.feature_ = feature;
    if (feature.ref.current) {
      feature.ref.current.style.visibility = 'hidden';
      feature.ref.current.querySelectorAll('.near').forEach((el) => el.style.display = 'none');
    }
  }

  return !!feature;
}

/**
 * @param {import('ol/MapBrowserEvent.js').default} evt Map browser event.
 */
function handleDragEvent(evt) {
  const deltaX = evt.coordinate[0] - this.coordinate_[0];
  const deltaY = evt.coordinate[1] - this.coordinate_[1];

  const geometry = this.feature_.getGeometry();
  geometry.translate(deltaX, deltaY);

  this.coordinate_[0] = evt.coordinate[0];
  this.coordinate_[1] = evt.coordinate[1];
}

/**
 * @param {import('ol/MapBrowserEvent.js').default} evt Event.
 */
function handleMoveEvent(evt) {
  if (this.cursor_) {
    const map = evt.map;
    const feature = map.getFeaturesAtPixel(evt.pixel, {
      layerFilter: (layer) => layer.canDragFeatures,
    })[0];
    const element = evt.map.getTargetElement();
    if (feature) {
      if (feature.noHover) { return; }
      if (element.style.cursor != this.cursor_) {
        this.previousCursor_ = element.style.cursor;
        element.style.cursor = this.cursor_;
      }
    } else if (this.previousCursor_ !== undefined) {
      element.style.cursor = this.previousCursor_;
      this.previousCursor_ = undefined;
    }
  }
}

/**
 * @return {boolean} `false` to stop the drag sequence.
 */
function handleUpEvent(e) {
  if (e.originalEvent?.button === 0) { // ignore right or middle click
    this.endHandler(e, this.feature_, this.dispatch);
    this.coordinate_ = null;
    if (this.feature_.upHandler) { this.feature_.upHandler(e) }
    this.feature_ = null;
  }
  return false;
}

export function getCoords(map, feature) {
  return transform(
    feature.getGeometry().flatCoordinates,
    map.getView().getProjection().getCode(),
    'EPSG:4326'
  );
}

function getPoint(coords) {
  return new RideFeature({ geometry: new Point(coords)})
}

export const g2ll = getTransform('EPSG:3857', 'EPSG:4326'); globalThis.g2ll = g2ll;
export const ll2g = getTransform('EPSG:4326', 'EPSG:3857'); globalThis.ll2g = ll2g;
export const bc2ll = (coords) => proj4('EPSG:3005', 'EPSG:4326', coords);
export const ll2bc = (coords) => proj4('EPSG:4326', 'EPSG:3005', coords);
export const bc2g = (coords) => proj4('EPSG:3005', 'EPSG:3857', coords);
export const g2bc = (coords) => proj4('EPSG:3857', 'EPSG:3005', coords);

import { Feature } from 'ol';

function eq(a, b) {
  return a[0] === b[0] && a[1] === b[1];
}

export function getDRA(coords, point, map) {
  /* Resolution is projection unit per pixel.  For EPSG:3857, the unit is
   * meter; if the resolution is 30, then one pixel represents 30m.
   */
  const polygon = circular(g2ll(coords), map.getView().getResolution() * 20, 8); // 50 pixel circle
  const actual = [];
  for (let ii = 0; ii < polygon.flatCoordinates.length; ii += 2) {
    const coords = [polygon.flatCoordinates[ii], polygon.flatCoordinates[ii + 1]];
    actual.push(proj4('EPSG:3005', coords).join(' '));
  }
  const params = new URLSearchParams({
    service: 'WFS',
    version: '2.0.0',
    request: 'GetFeature',
    typeNames: 'pub:WHSE_BASEMAPPING.DRA_DGTL_ROAD_ATLAS_MPAR_SP',
    outputFormat: 'application/json',
    count: 200,
    srsName: 'EPSG:4326',
    // cql_filter: `ROAD_SURFACE = 'paved' AND INTERSECTS(GEOMETRY, POLYGON((${actual.join(', ')})))`,
    cql_filter: `INTERSECTS(GEOMETRY, POLYGON((${actual.join(', ')})))`,
  });
  const point2 = turf.point(g2ll(coords));
  return fetch('https://openmaps.gov.bc.ca/geo/wfs?' + params, {'mode': 'cors'})
    .then((body) => body.json())
    .then((data) => {
      let closest, feature, line;
      (data.features || []).forEach((feat) => {
        try {
          line = turf.lineString(feat.geometry.coordinates);
          let snapped;
          try {
            snapped = turf.nearestPointOnLine(line, point2, { units: "meters" });
          } catch (ex) {
            /* ITN linestrings sometimes contain duplicate coordinates in
             * sequence; this causes turf's function to throw the error below.
             * Retry the segment after filtering out sequential duplicates
             */
            if (ex.message === 'coordinates must contain numbers') {
              line = turf.lineString(
                feat.geometry.coordinates.filter((cc, i, list) => i < 1 || !eq(cc, list[i - 1]))
              );
              snapped = turf.nearestPointOnLine(line, point2, { units: "meters" });
            }
          }
          if (!closest || snapped.properties.dist < closest.properties.dist) {
            closest = snapped;
            feature = feat;
          }

        } catch (ex) {
          console.error(ex);
          console.log(closest, feature, line, point2);
        }
      });
      if (closest) {
        point.set('dra', feature.properties);
        return {properties: feature.properties, closest };
      }
      return {};
    });
}

const PopulationCenterTypes = [
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

async function filterByTypes(features, types, coords) {
  const results = [];
  for (const feature of features) {

    const index = types.indexOf(feature.properties.featureType);
    if (index < 0) { continue; }

    const points = [
      coords[0], coords[1],
      feature.geometry.coordinates[0], feature.geometry.coordinates[1],
    ];
    const route = await fetchRoute(points);

    if (!route || (route && route.distance < 0)) { continue; }
    const direction = getCardinalDirection(points);

    results.push({
      source: "BCGNWS",
      name: feature.properties.name,
      type: feature.properties.featureType,
      coordinates: feature.geometry.coordinates,
      distance: route.distance,
      direction,
      priority: index,
      phrase: `${Math.round(route.distance * 10) / 10}km ${direction} of ${feature.properties.name}`
    });

  }
  return results;
};

export async function getNearby(coords) {
  const baseUrl = "https://apps.gov.bc.ca/pub/bcgnws/names/near";
  const params = {
    featureClass: 1,
    official: 1,
    itemsPerPage: 100,
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

  try {
    const response = await fetch(apiUrl, {mode: 'cors'});
    const data = await response.json();
    const results = await filterByTypes(data.features, PopulationCenterTypes, coords);
    if (results.length < 5) {
      results.push(... await filterByTypes(data.features, ['', 'Community'], coords));
    }
    if (results.length < 5) {
      results.push(... await filterByTypes(data.features, ['Locality'], coords));
    }

    results.sort((a, b) => b.priority - a.priority || a.distance - b.distance);
    return results.slice(0, 5);
  } catch (error) {
    console.error("Error fetching BCGNWS data:", error);
  }
  return [];
}

export async function fetchRoute(points) {
  const pointString = `${points[0]},${points[1]},${points[2]},${points[3]}`;
  const baseUrl = "https://router.api.gov.bc.ca/directions.json";
  const apiKey = ROUTER_CLIENT_ID;
  const apiUrl = `${baseUrl}?points=${encodeURIComponent(pointString)}&criteria=fastest&roundTrip=false&correctSide=false&apikey=${apiKey}`;

  try {
    const response = await fetch(apiUrl, {mode: 'cors'});
    return response.json();
  } catch (error) {
    console.error("Failed to fetch route:", error);
    return null;
  }
}

/**
 * Get cardinal direction of route
 */
function getCardinalDirection(points) {
  const lat1 = points[1] * Math.PI / 180;
  const lat2 = points[3] * Math.PI / 180;
  const dLon = (points[2] - points[0]) * Math.PI / 180;
  const y = Math.sin(dLon) * Math.cos(lat2);
  const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLon);
  const bearing = Math.atan2(y, x) * 180 / Math.PI;
  const normalized = (bearing + 360) % 360;
  // const directions = ["South", "SouthWest", "West", "NorthWest", "North", "NorthEast", "East", "SouthEast"];
  const directions = ["S", "SW", "W", "NW", "N", "NE", "E", "SE"];
  const index = Math.round(normalized / 45) % 8;
  return directions[index];
}

export const convertToDateTimeLocalString = (date) => {
  if (!date) return '';

  const year = date.getFullYear();
  const month = (date.getMonth() + 1).toString().padStart(2, "0");
  const day = date.getDate().toString().padStart(2, "0");
  const hours = date.getHours().toString().padStart(2, "0");
  const minutes = date.getMinutes().toString().padStart(2, "0");

  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

export const selectStyle = {
  control: (css, state) => ({
    ...css,
    width: '100%',
    borderColor: state?.errors?.situation ? 'red' : 'auto',
    minHeight: 0,
  }),
  container: (css) => ({ ...css, flex: 1, }),
  input: (css) => ({ ...css, margin: 0, padding: 0 }),
  dropdownIndicator: (css) => ({ ...css, padding: 0, color: 'black' }),
  indicatorSeparator: (css) => ({ ...css, display: 'none', }),
  valueContainer: (css) => ({ ...css, padding: '0px 3px', }),
  option: (css, { data }) => {
    if (!data.closed) { return css; }
    return {
      ...css,
      ':after': {
        content: '" "',
        backgroundImage: 'url("/images/mapIcons/closure-static.png")',
        backgroundSize: '18px',
        display: 'inline-block',
        width: '16px',
        height: '16px',
      },
    }
  },
  singleValue: (css, { data }) => {
    if (!data.closed) { return css; }
    return {
      ...css,
      ':after': {
        content: '" "',
        backgroundImage: 'url("/images/mapIcons/closure-static.png")',
        backgroundSize: '18px',
        display: 'inline-block',
        width: '16px',
        height: '16px',
      },
    }
  },
};

export function getSnapped(coordinate, pixel, map) {
  const point = turf.point(g2ll(coordinate));
  let closest;
  map.getFeaturesAtPixel(pixel, { hitTolerance: 50 })
    .filter((f) => f.get('mvt:layer')?.startsWith('DRA Roads'))
    .map((f) => {
      const line = turf.multiLineString(multi(f.getFlatCoordinates(), f.getEnds().map(a => a), g2ll));
      f.snapped = turf.nearestPointOnLine(line, point, { units: "meters" });
      f.closest = !closest || f.snapped.properties.dist < closest.dist;
      if (f.closest) {
        if (closest) closest.closest = false;
        closest = f;
      }
      f.dist = f.snapped.properties.dist;
      return f;
    });
  if (closest) {
    map.pins.getSource().getFeatures().forEach((f) => {
      if (
        f.ol_uid === map.start?.ol_uid ||
        f.ol_uid === map.end?.ol_uid ||
        f.ol_uid === map.route?.ol_uid
      ) { return; }
      map.pins.getSource().removeFeature(f);
    })
  }
  return closest ? ll2g(closest.snapped.geometry.coordinates) : coordinate;
}

function unflatten(l) {
  const paired = [];
  for (let ii = 0; ii < l.length; ii += 2) {
    paired.push(g2ll([l[ii], l[ii + 1]]));
  }
  return paired;
}

const fun = (a) => a;
function multi(l, ends, func = fun) {
  let curr = [];
  let end = ends.shift();
  const all = [curr];
  for (let ii = 0; ii < l.length; ii += 2) {
    if (ii === end) {
      all.push(curr);
      curr = [];
      end = ends.shift();
    }
    curr.push(func([l[ii], l[ii + 1]]));
  }
  return all;
}

export const coordsMatch = (a, b) => (a[0] === b[0] && a[1] === b[1]);

class CustomError extends Error {
  constructor(message) {
    super(message);
    this.name = this.constructor.name; // Set the name of the error to the class name
    this.message = message; // Set the error message
    this.stack = (new Error()).stack; // Generate stack trace
  }
}
