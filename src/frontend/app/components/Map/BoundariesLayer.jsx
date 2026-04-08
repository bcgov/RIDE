import { useContext, useEffect, useState, useRef } from 'react';
import { useSelector, useDispatch, useStore } from 'react-redux';

import * as turf from '@turf/turf';

import GeoJSON from 'ol/format/GeoJSON.js';
import VectorLayer from 'ol/layer/Vector';
import VectorSource from 'ol/source/Vector';
import { linear } from 'ol/easing';
import { Point, LineString, GeometryCollection, MultiPolygon, Polygon } from 'ol/geom';
import { Icon, Style, Stroke, Fill, Text } from 'ol/style';
import { Feature } from 'ol';

import { AlertContext, MapContext } from '../../contexts.js';

import { ll2g, selectFeature, pointerMove } from './helpers.js';
import RideFeature, { PinFeature } from './feature.js';
import ContextMenu from '../../events/ContextMenu.jsx';
import { getInitialEvent } from '../../events/forms.jsx';

import { API_HOST, EVENT_POLLING_REFRESH } from '../../env.js';
import { getIconAndStroke } from '../../events/icons/index.js';
import { getNextUpdate, getPendingNextUpdate } from '../../shared/helpers.js';
import { endHandler } from './PinLayer.jsx';

import {
  selectAllServiceAreaBoundaries, selectServiceAreaBoundariesStatus,
} from '../../slices/serviceAreaBoundaries';
import {
  selectAllDistrictBoundaries, selectDistrictBoundariesStatus,
} from '../../slices/districtBoundaries';


function layerStyle(feature, visibleLayers) {
  return feature.get('visible') ? feature.get('style') : null ;
}

function addBoundariesLayer(map) {
  if (!map.get('boundaries')) {
    const layer = new VectorLayer({
      classname: 'boundaries',
      visible: true,
      source: new VectorSource({ format: new GeoJSON() }),
      style: layerStyle,
      renderBuffer: 30,
    });
    layer.listenForHover = false;
    layer.listenForClicks = false;
    map.addLayer(layer);
    map.set('boundaries', layer);
  }
}

const areaStyle = new Style({
  stroke: new Stroke({ color: [0, 51, 154, 0.5], width: 2 }),
  text: new Text({
    font: '15px BC Sans',
    // overflow: true,
    fill: new Fill({ color: [0, 51, 154, 0.75] }),
    stroke: new Stroke({ color: 'white', width: 2 }),
    text: 'Service Area'
  }),
});
const districtStyle = new Style({
  stroke: new Stroke({ color: [154, 51, 0, 0.5], width: 1 }),
  text: new Text({
    font: '18px BC Sans',
    // overflow: true,
    fill: new Fill({ color: [154, 51, 0, 1] }),
    stroke: new Stroke({ color: 'white', width: 2 }),
    text: 'Service Area'
  }),
});

// different background fills for service areas, keyed on their district parent
const fills = {
  50: new Fill({ color: [0, 154, 255, 0.1]}),
  46: new Fill({ color: [0, 154, 255, 0.2]}),
  47: new Fill({ color: [0, 154, 255, 0.35]}),
  44: new Fill({ color: [0, 154, 255, 0.1]}),
  41: new Fill({ color: [0, 154, 255, 0.2]}),
  42: new Fill({ color: [0, 154, 255, 0.35]}),
  48: new Fill({ color: [0, 154, 255, 0.2]}),
  51: new Fill({ color: [0, 154, 255, 0.2]}),
  45: new Fill({ color: [0, 154, 255, 0.1]}),
  43: new Fill({ color: [0, 154, 255, 0.35]}),
  49: new Fill({ color: [0, 154, 255, 0.1]}),
}

// custom offsets to service area and district labels to enhance visibility
const offsets = {
  3: [
    ['setOffsetY', -80],
  ],
  4: [
    ['setOffsetY', -20],
  ],
  15: [
    ['setOffsetY', 30],
  ],
  6: [
    ['setOffsetX', 20],
    ['setOffsetY', 60],
  ],
  19: [
    ['setOffsetX', 20],
    ['setOffsetY', 70],
  ],
  22: [
    ['setOffsetX', -60],
    ['setOffsetY', 75],
  ],
  29: [
    ['setOffsetY', -30],
  ],
  35: [
    ['setOffsetY', 30],
  ],
  31: [
    ['setOffsetY', 30],
  ],
  48: [
    ['setOffsetY', -10],
  ],
}

function addBoundary(map, boundary, type, style) {
  const source = map.get('boundaries').getSource();
  if (!source || source.get(boundary.id) || !boundary.geometry) { return; }

  const geometry = new Polygon(boundary.geometry.coordinates);
  geometry.transform('EPSG:4326', map.getView().getProjection().getCode());

  const feature = new Feature({
    type,
    geometry,
  });
  feature.set('id', boundary.id);
  feature.set('sortingOrder', boundary.sortingOrder);
  feature.set('name', boundary.name);
  feature.set('visible', true);
  style = style.clone();
  style.getText().setText(
    type === 'districts' ? boundary.name : `${boundary.sortingOrder} - ${boundary.name}`
  )

  if (boundary.parent) {
    style.setFill(fills[boundary.parent]);
  }

  if (offsets[boundary.id]) {
    const current = style.getText().clone();
    for (const offset of offsets[boundary.id]) {
      current[offset[0]](offset[1]);
    }
    style.setText(current);
  }
  // style is a property to be conditionally set in the layer style function
  feature.set('style', style);
  source.addFeature(feature);
  source.set(boundary.id, feature);
}

export default function BoundariesLayer() {

  const { map } = useContext(MapContext);

  const districtStatus = useSelector(selectDistrictBoundariesStatus);
  const districtBoundaries = useSelector(selectAllDistrictBoundaries);
  const serviceAreaStatus = useSelector(selectServiceAreaBoundariesStatus);
  const serviceAreaBoundaries = useSelector(selectAllServiceAreaBoundaries);
  const visibleLayers = useSelector(state => state.visibleLayers);

  useEffect(() => {
    if (!map) { return; }
    addBoundariesLayer(map);
  }, [map]);

  const setVisibility = () => {
    const layer = map?.get('boundaries');
    if (layer) {
      for (const feature of layer.getSource().getFeatures()) {
        feature.set('visible', visibleLayers[feature.get('type')]);
      }
    }
  }

  useEffect(() => {
    if (map && serviceAreaStatus === 'idle' && Object.keys(serviceAreaBoundaries).length > 0) {
      const layer = map.get('boundaries');
      if (layer) {
        const source = layer.getSource();
        for (const id in serviceAreaBoundaries) {
          addBoundary(map, serviceAreaBoundaries[id], 'serviceAreas', areaStyle);
        }
        for (const id in districtBoundaries) {
          addBoundary(map, districtBoundaries[id], 'districts', districtStyle);
        }
        setVisibility();
      } else { console.log('map not ready'); }
    }
  }, [map, districtStatus, districtBoundaries, serviceAreaStatus, serviceAreaBoundaries]);

  setVisibility();

  return (
    <div className='boundaries-status'>{serviceAreaStatus}</div>
  );
}
