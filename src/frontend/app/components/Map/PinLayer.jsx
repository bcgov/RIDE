/* eslint-disable no-unused-vars */
import { useContext, useEffect, useState } from 'react';

import GeoJSON from 'ol/format/GeoJSON.js';
import VectorLayer from 'ol/layer/Vector';
import VectorSource from 'ol/source/Vector';
import { Point, LineString, Polygon, Circle } from 'ol/geom';
import { circular } from 'ol/geom/Polygon';
import * as ol from 'ol';

import { routeNormalStyle, routeActiveStyle, routeHoverStyle } from './styles.js';

window.ol = ol;
window.Circle = Circle;
window.Polygon = Polygon;
window.circular = circular;

import { Drag, MapContext } from './helpers.js';
import RideFeature from './feature.js';

export default function PinLayer({ upCallback, menuRef }) {
  const { map } = useContext(MapContext);

  useEffect(() => {
    if (!map) { return; }

    if (!map.get('pins')) {
      const layer = new VectorLayer({
        classname: 'pins',
        visible: true,
        source: new VectorSource({ format: new GeoJSON() }),
        style: () => null
      });
      layer.listenForClicks = true;
      layer.listenForContext = true;
      layer.listenForHover = true;
      layer.canDragFeatures = true;
      layer.setZIndex(1000);
      map.addLayer(layer);
      map.pins = layer;
      map.set('pins', layer);
      map.getInteractions().extend([new Drag({ upCallback, menuRef })]);
      map.route = new RideFeature({
        normalStyle: routeNormalStyle,
        activeStyle: routeActiveStyle,
        hoverStyle: routeHoverStyle,
        geometry: new LineString([]),
      })
      layer.getSource().addFeature(map.route);
    }
  });

  return null;
}
