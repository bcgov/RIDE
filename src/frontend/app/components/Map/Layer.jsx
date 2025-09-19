/* eslint-disable no-unused-vars */
import { useContext, useEffect, useState } from 'react';

import * as turf from '@turf/turf';

import GeoJSON from 'ol/format/GeoJSON.js';
import VectorLayer from 'ol/layer/Vector';
import VectorSource from 'ol/source/Vector';
import { Point, LineString, Polygon } from 'ol/geom';
import { Circle, Fill, Stroke, Style } from 'ol/style';
import * as ol from 'ol';

import { MapContext, ll2g, g2ll } from './helpers.js';
import RideFeature from './feature.js';

import { API_HOST } from '../../env.js';

export function addEvent(event, map) {
  const source = map.get('majorEvents').getSource();
  let coords = event.location.start.coords;
  if (Array.isArray(coords[0])) { coords = coords[0]; }
  const g = event.geometry.geometries;
  let start, end, mid, route;
  g.forEach((geo) => {
    if (geo.type === 'Point') {
      if (!start) {
        start = ll2g(geo.coordinates);
      }
    } else if (geo.type === 'LineString') {
      route = geo.coordinates;
      if (route[0][0] > -1000) {
        route = route.map(gg => ll2g(gg));
      }
      const r = turf.lineString(route.map(gg => g2ll(gg)));
      const len = turf.length(r);

      mid = turf.along(r, len/2).geometry.coordinates;
    }
  });

  // const is_closure = event.isClosure || event.impacts.reduce((val, key) => val || key.id === 7, false)
  const is_closure = event.impacts.reduce((val, key) => val || key.id === 7, false)
  const pointFeature = new RideFeature({
    feat: getStyle(event),
    type: 'event',
    raw: { ...event, showForm: false, is_closure },
    geometry: new Point(mid || start),
  });

  if (pointFeature.getGeometry().getCoordinates()[0] > -1000) {
    pointFeature.getGeometry().transform('EPSG:4326', map.getView().getProjection().getCode());
  }

  if (route) {
    route = new RideFeature({
      feat: getStyle(event, true),
      geometry: new LineString(route),
    });
    source.addFeature(route);
    pointFeature.paired = route;
    route.paired = pointFeature;
  }
  source.addFeature(pointFeature);
}

function getStyle(event, isRoute=false) {
  const path = ['eventStyles'];
  if (isRoute) {
    path.push('segments');
    if (event.is_closure) {
      path.push('closures');
    } else if (event.details.severity === 'Major') {
      path.push('majorEvents');
    } else if (event.details.severity === 'Minor') {
      path.push('minorEvents');
    }
  } else {
    if (event.is_closure) {
      path.push('closures');
    } else if (event.details.severity === 'Major') {
      path.push('major_generic_delays');
    } else if (event.details.severity === 'Minor') {
      path.push('generic_delays');
    }
  }
  return path.join('.');
}

export default function Layer(props) {
  const { map } = useContext(MapContext);

  useEffect(() => {
    if (!map) { return; }

    fetch(`${API_HOST}/api/events`, {
      headers: { 'Accept': 'application/json' },
      credentials: "include",
    }).then((response) => response.json())
      .then((data) => {
        if (!map.get('majorEvents')) {
          const layer = new VectorLayer({
            classname: 'events',
            visible: true,
            source: new VectorSource({ format: new GeoJSON() }),
            style: () => null
          });
          layer.listenForHover = true;
          layer.listenForClicks = true;
          map.addLayer(layer);
          map.set('majorEvents', layer);
        }

        const source = map.get('majorEvents').getSource();
        window.s = source; window.vl = map.get('majorEvents');

        data.forEach((event) => { addEvent(event, map)});
      })
  }, [map]);

  return null;
}
