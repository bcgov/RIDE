/* eslint-disable no-unused-vars */
import { useContext, useEffect, useState, useRef } from 'react';

import * as turf from '@turf/turf';

import GeoJSON from 'ol/format/GeoJSON.js';
import VectorLayer from 'ol/layer/Vector';
import VectorSource from 'ol/source/Vector';
import { linear } from 'ol/easing';
import { Point, LineString, Polygon } from 'ol/geom';
import { Circle, Fill, Icon, Stroke, Style } from 'ol/style';
import * as ol from 'ol';

import { MapContext } from '../../contexts';

import { ll2g, g2ll } from './helpers.js';
import RideFeature, { PinFeature } from './feature.js';
import ContextMenu from '../../events/ContextMenu';
import { getInitialEvent } from '../../events/forms';

import { API_HOST } from '../../env.js';
import { getIcon } from '../../events/icons';
import { endHandler } from './PinLayer';


export function addEvent(event, map) {
  // TODO: remove earlier feature if exists
  const source = map.get('majorEvents').getSource();
  const existing = source.get(event.id);
  if (existing) {
    source.unset(event.id, true);
    if (existing.paired) { source.removeFeature(existing.paired); }
    source.removeFeature(existing);
  }

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
      route = turf.lineString(geo.coordinates);
      mid = ll2g(turf.along(route, turf.length(route) / 2).geometry.coordinates);
    }
  });

  const styles = {};
  ['static', 'hover', 'active'].forEach((state) => {
    styles[state] = new Style({ image: new Icon({ src: getIcon(event, state) }) });
  });

  const pointFeature = new RideFeature({
    feat2: styles,
    type: 'event',
    raw: structuredClone(event),
    geometry: new Point(mid || start),
  });
  pointFeature.pointFeature = pointFeature;

  if (pointFeature.getGeometry().getCoordinates()[0] > -1000) {
    pointFeature.getGeometry().transform('EPSG:4326', map.getView().getProjection().getCode());
  }

  if (route) {
    route = new RideFeature({
      feat: getStyle(event, true),
      geometry: new LineString(route.geometry.coordinates.map((cc) => ll2g(cc))),
    });
    source.addFeature(route);
    pointFeature.paired = route;
    route.paired = pointFeature;
    route.pointFeature = pointFeature;
  }
  source.addFeature(pointFeature);
  source.set(event.id, pointFeature, true);
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

export default function Layer({ dispatch, startRef, endRef }) {
  const { map } = useContext(MapContext);
  const [ contextMenu, setContextMenu ] = useState([]);
  const menuRef = useRef();

  const contextHandler = (e) => {
    e.preventDefault();
    const feature = e.map.getFeaturesAtPixel(e.pixel, {
      layerFilter: (layer) => layer.listenForClicks,
    })[0];

    menuRef.current.style.left = (e.pixel[0] - 1) + 'px';
    menuRef.current.style.top = (e.pixel[1] - 1) + 'px';
    menuRef.current.style.visibility = undefined;

    const coordinate = e.coordinate;
    const pixel = e.pixel;
    const items = [
      {
        label: 'Create event',
        action: (e) => {
          setContextMenu([]);
          dispatch({ type: 'reset form', value: getInitialEvent(), showPreview: true, showForm: true });
          map.start = new PinFeature({
            style: 'start',
            geometry: new Point(coordinate),
            ref: startRef,
            action: 'set start',
          });
          map.pins.getSource().addFeature(map.start);
          map.getView().animate({ center: coordinate, duration: 250, easing: linear });
          endHandler({ coordinate, pixel, map, }, map.start, dispatch);
        }
      },
    ];

    if (feature) {
      e.stopPropagation();
      const map = e.map; // necessary to bind map for callback below

      // TODO: add permission based checks on these items
      items.push(...[
        {
          label: 'Edit event',
          action: (e) => {
            setContextMenu([]);
            dispatch({ type: 'reset form', value: feature.get('raw'), showPreview: true, showForm: true });
          }
        },
        {
          label: 'View history',
          action: (e) => {
            setContextMenu([]);
            // dispatch({ type: 'reset form', value: feature.get('raw'), showPreview: true, showForm: true });
          }
        },
        {
          label: 'Clear event',
          action: (e) => {
            setContextMenu([]);
            const event = feature.get('raw');
            fetch(`http://localhost:8000/api/events/${event.id}`, {
              method: 'PATCH',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({ status: 'Inactive' }),
            }).then((response) => response.json())
              .then((event) => {
                feature.set('raw', event);
                dispatch({ type: 'reset form', value: event, showPreview: true, showForm: false });
              });
          }
        },
        {
          label: 'Unclear event',
          action: (e) => {
            setContextMenu([]);
            const event = feature.get('raw');
            fetch(`http://localhost:8000/api/events/${event.id}`, {
              method: 'PATCH',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({ status: 'Active' }),
            }).then((response) => response.json())
              .then((event) => {
                feature.set('raw', event);
                dispatch({ type: 'reset form', value: event, showPreview: true, showForm: false });
              });
          }
        },
        {
          label: 'Dump feature to console',
          debugging: true,
          action: (e) => {
            console.log(feature);
            setContextMenu([]);
          }
        },
        {
          label: 'Dump event to console',
          debugging: true,
          action: (e) => {
            console.log(feature.get('raw') || feature?.paired.get('raw'));
            setContextMenu([]);
          }
        },
      ]);
    }
    setContextMenu(items);
  };

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
      });

    map.on('contextmenu', contextHandler);
  }, [map]);

  return <>
    <ContextMenu ref={menuRef} options={contextMenu} setContextMenu={setContextMenu} />
  </>;
}
