/* eslint-disable no-unused-vars */
import { useContext, useEffect, useState } from 'react';

import GeoJSON from 'ol/format/GeoJSON.js';
import VectorLayer from 'ol/layer/Vector';
import VectorSource from 'ol/source/Vector';
import { Point, LineString, Polygon } from 'ol/geom';
import { Circle, Fill, Stroke, Style } from 'ol/style';
import * as ol from 'ol';

import { MapContext } from './helpers.js';
import RideFeature from './feature.js';

export default function Layer(props) {
  const { map } = useContext(MapContext);

  useEffect(() => {
    if (!map) { return; }

    fetch('http://localhost:5173/events.json', {
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

        data.forEach((event) => {
          if (event.display_category !== 'majorEvents') { return; }

          let coords = event.location.coordinates;
          if (Array.isArray(coords[0])) { coords = coords[0]; }
          const pointFeature = new RideFeature({
            ...event,
            type: 'event',
            geometry: new Point(coords),
          });
          pointFeature.getGeometry().transform('EPSG:4326', map.getView().getProjection().getCode());
          source.addFeature(pointFeature);
        });
      })
  }, [map]);

  return null;
}
