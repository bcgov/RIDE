import { createContext, useEffect, useRef, useState } from 'react';

import { applyStyle } from 'ol-mapbox-style';
import { fromLonLat, transformExtent } from 'ol/proj';
import Map from 'ol/Map';
import MVT from 'ol/format/MVT.js';
import { ScaleLine } from 'ol/control.js';
import VectorTileLayer from 'ol/layer/VectorTile.js';
import VectorTileSource from 'ol/source/VectorTile.js';
import View from 'ol/View';

import overrides from './overrides.js';

window.BASE_MAP = 'https://tiles.arcgis.com/tiles/ubm4tcTYICKBpist/arcgis/rest/services/BC_BASEMAP_20240307/VectorTileServer/tile/{z}/{y}/{x}.pbf';
window.MAP_STYLE = 'https://www.arcgis.com/sharing/rest/content/items/b1624fea73bd46c681fab55be53d96ae/resources/styles/root.json';

export const MapContext = createContext();

export function pointerMove(evt) {
  const feature = evt.map.getFeaturesAtPixel(evt.pixel)[0];
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
  const feature = evt.map.getFeaturesAtPixel(evt.pixel)[0];
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
    center: fromLonLat([-121.842954, 50.784370]),
    // center: fromLonLat([-116.519399, 51.366191]),
    zoom: 12,
    maxZoom: 15,
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