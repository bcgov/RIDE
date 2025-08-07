import { createContext, useEffect, useRef, useState } from 'react';

import { applyStyle } from 'ol-mapbox-style';
import { fromLonLat, transformExtent } from 'ol/proj';
import Map from 'ol/Map';
import MVT from 'ol/format/MVT.js';
import { ScaleLine } from 'ol/control.js';
import { circular } from 'ol/geom/Polygon';
import { Point } from 'ol/geom';
import VectorTileLayer from 'ol/layer/VectorTile.js';
import PointerInteraction from 'ol/interaction/Pointer.js';
import { transform, getTransform } from 'ol/proj';
import VectorTileSource from 'ol/source/VectorTile.js';
import View from 'ol/View';
import proj4 from 'proj4';
import * as turf from '@turf/turf';

import overrides from './overrides.js';
import RideFeature from './feature.js';

window.BASE_MAP = 'https://tiles.arcgis.com/tiles/ubm4tcTYICKBpist/arcgis/rest/services/BC_BASEMAP_20240307/VectorTileServer/tile/{z}/{y}/{x}.pbf';
window.MAP_STYLE = 'https://www.arcgis.com/sharing/rest/content/items/b1624fea73bd46c681fab55be53d96ae/resources/styles/root.json';

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
  if (!feature || !feature.styleState) {
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

export function click(evt) {
  const feature = evt.map.getFeaturesAtPixel(evt.pixel,{
    layerFilter: (layer) => layer.listenForClicks,
  })[0];
  if (!feature || !feature.styleState) {
    if (evt.map.selectedFeature) {
      evt.map.selectedFeature.selected = false;
      evt.map.selectedFeature.updateStyle();
      evt.map.selectedFeature = null;
    }
  } else {
    if (evt.map.selectedFeature && evt.map.selectedFeature !== feature) {
      evt.map.selectedFeature.selected = false;
      evt.map.selectedFeature.updateStyle();
    }
    evt.map.selectedFeature = feature;
    if (!feature.selected) {
      feature.selected = true;
      feature.updateStyle();
    }
  }
}

/* Creates and returns the base OpenLayers map with layers for the vector tiles
 * and a duplicate layer containing only the highway symbols and road names.
 */
export function createMap() {
  const tileSource = new VectorTileSource({
    format: new MVT({layerName: 'mvt:layer'}), // layername required for ol-mapbox-style 13+
    url: window.BASE_MAP,
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

  // Apply the basemap style from the arcgis resource
  fetch(window.MAP_STYLE, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  }).then(function (response) {
    response.json().then(function (glStyle) {
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

      applyStyle(vectorLayer, glStyle, 'esri');
      applyStyle(symbolLayer, symbolsStyle, 'esri');
    });
  });

  // create map
  const map = new Map({
    layers: [vectorLayer, symbolLayer],
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
    this.upCallback = options.upCallback || (() => {});

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
  const map = evt.map;

  const feature = map.getFeaturesAtPixel(evt.pixel, {
    layerFilter: (layer) => layer.canDragFeatures,
  })[0];

  if (feature) {
    this.coordinate_ = evt.coordinate;
    this.feature_ = feature;
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
  if (e.originalEvent?.button > 0) { return false; } // right or middle click
  this.upCallback(e, this.feature_);
  this.coordinate_ = null;
  this.feature_ = null;
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

export const g2ll = getTransform('EPSG:3857', 'EPSG:4326');
export const ll2g = getTransform('EPSG:4326', 'EPSG:3857');
export const bc2ll = (coords) => proj4('EPSG:3005', 'EPSG:4326', coords);
export const ll2bc = (coords) => proj4('EPSG:4326', 'EPSG:3005', coords);
export const bc2g = (coords) => proj4('EPSG:3005', 'EPSG:3857', coords);
export const g2bc = (coords) => proj4('EPSG:3857', 'EPSG:3005', coords);


export function getDRA(coords, point, resolution) {
  /* Resolution is projection unit per pixel.  For EPSG:3857, the unit is
   * meter; if the resolution is 30, then one pixel represents 30m.
   */
  console.log('dra');
  const polygon = circular(coords, resolution * 50, 8); // 100 pixel circle
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
    count: 25,
    srsName: 'EPSG:4326',
    cql_filter: `ROAD_SURFACE = 'paved' AND INTERSECTS(GEOMETRY, POLYGON((${actual.join(', ')})))`,
  });
  return fetch('https://openmaps.gov.bc.ca/geo/wfs?' + params, {'mode': 'cors'})
    .then((body) => body.json())
    .then((data) => {
      let closest, feature;
      (data.features || []).forEach((feat) => {
        const line = turf.lineString(feat.geometry.coordinates);
        const point = turf.point(coords);
        var snapped = turf.nearestPointOnLine(line, point, { units: "meters" });
        if (!closest || snapped.properties.dist < closest.properties.dist) {
          closest = snapped;
          feature = feat;
        }
      });
      if (closest) {
        point.getGeometry().setCoordinates(ll2g(closest.geometry.coordinates));
        point.set('dra', feature.properties);
        let streetName = feature.properties.ROAD_NAME_FULL;
        if (streetName) {
          if (feature.properties.ROAD_NAME_ALIAS1) {
            streetName += ` (${feature.properties.ROAD_NAME_ALIAS1})`;
          }
        } else {
          streetName = feature.properties.ROAD_CLASS;
        }
        return streetName;
      }
      return 'undefined'
    })
    .then(async (name) => {
      const nearby = await getNearby(coords);
      point.set('nearby', nearby);
      const texts = nearby.reduce((acc, curr) => {
        acc.push(curr.phrase);
        acc.push(`${getSize(curr.priority)}pt Arial`, '\n', '');
        return acc;
      }, [name, 'bold 13pt Arial', '\n', '']);
      point.getStyle().getText().setText(texts);
      point.changed();
      return {dra: point.get('dra'), nearby };
    });
}

function getSize(priority) {
  switch (priority) {
    case 6:
    case 5:
      return '12';
    case 4:
      return '11';
    default:
      return '10';
  }
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

async function getNearby(coords) {
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
  const apiKey = "6097f62f6a8144edae53c59fc7c12351";
  const apiUrl = `${baseUrl}?points=${encodeURIComponent(pointString)}&criteria=fastest&roundTrip=false&correctSide=false&apikey=${apiKey}`;

  try {
    const response = await fetch(apiUrl, {mode: 'cors'});
    const data = await response.json();
    return data;
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
};
