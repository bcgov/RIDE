/* eslint-disable no-unused-vars */
import { useContext, useEffect, useState, useRef } from 'react';

import * as turf from '@turf/turf';

import GeoJSON from 'ol/format/GeoJSON.js';
import VectorLayer from 'ol/layer/Vector';
import VectorSource from 'ol/source/Vector';
import { linear } from 'ol/easing';
import { Point, LineString } from 'ol/geom';
import { Icon, Style } from 'ol/style';

import { MapContext } from '../../contexts';

import { ll2g, selectFeature } from './helpers.js';
import RideFeature, { PinFeature } from './feature.js';
import ContextMenu from '../../events/ContextMenu';
import { getInitialEvent } from '../../events/forms';

import { API_HOST } from '../../env.js';
import { getIcon } from '../../events/icons';
import { endHandler } from './PinLayer';
import { patch } from '../../shared/helpers';


export function addEvent(event, map, dispatch) {
  // TODO: remove earlier feature if exists
  const source = map.get('majorEvents').getSource();
  const existing = source.get(event.id);

  if (existing) {
    if (event.version <= existing.get('version')) { return; }

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
    version: event.version,
    geometry: new Point(mid || start),
  });
  pointFeature.pointFeature = pointFeature;
  pointFeature.setId(event.id);

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

  if (map.selectedFeature && map.selectedFeature.getId() === event.id) {
    dispatch({ type: 'update event', value: event})
  }
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
  } else if (event.is_closure) {
    path.push('closures');
  } else if (event.details.severity === 'Major') {
    path.push('major_generic_delays');
  } else if (event.details.severity === 'Minor') {
    path.push('generic_delays');
  }
  return path.join('.');
}

async function updateEvents(map, dispatch) {
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
      globalThis.s = source; globalThis.vl = map.get('majorEvents');

      const eventIds = {};
      data.forEach((event) => {
        addEvent(event, map, dispatch);
        eventIds[event.id] = true;
      });

      // remove events no longer in the list of events
      source.getKeys().forEach((key) => {
        if (!key.startsWith('DBC')) { return; }
        if (!eventIds[key]) {
          const existing = source.get(key);
          source.unset(key, true);
          if (existing.paired) { source.removeFeature(existing.paired); }
          source.removeFeature(existing);
        }
      });
    });
}

export default function Layer({ event, dispatch, startRef, endRef }) {

  const { map } = useContext(MapContext);
  const [ contextMenu, setContextMenu ] = useState([]);
  const [ fetchInterval, setFetchInterval ] = useState();
  const menuRef = useRef();
  const eventRef = useRef(); // necessary for early-bound handler to read current prop
  eventRef.current = event;

  const contextHandler = (e) => {
    e.preventDefault();
    const event = eventRef.current; // updated event prop

    const feature = e.map.getFeaturesAtPixel(e.pixel, {
      layerFilter: (layer) => layer.listenForClicks,
    })[0];

    menuRef.current.style.left = (e.pixel[0] - 1) + 'px';
    menuRef.current.style.top = (e.pixel[1] - 1) + 'px';
    menuRef.current.style.visibility = undefined;

    const coordinate = e.coordinate;
    const pixel = e.pixel;
    const items = [];

    if (!feature) {
      if (!event.location.start?.name) {
        items.push({
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
        });
      } else if (!event.location.end?.name && event.showForm) {
        items.push({
          label: 'Add end point',
          action: (e) => {
            setContextMenu([]);
            map.end = new PinFeature({
              style: 'end',
              geometry: new Point(coordinate),
              ref: endRef,
              action: 'set end',
            });
            map.pins.getSource().addFeature(map.end);
            map.getView().animate({ center: coordinate, duration: 250, easing: linear });
            endHandler({ coordinate, pixel, map, }, map.end, dispatch);
          }
        });
      }
    }

    if (feature && feature !== map.location) {
      e.stopPropagation();
      const map = e.map; // necessary to bind map for callback below

      if (!event.showForm) {

        // TODO: add permission based checks on these items
        items.push(
          {
            label: 'Edit event',
            action: (e) => {
              setContextMenu([]);
              selectFeature(map, feature);
              dispatch({ type: 'reset form', value: feature.get('raw'), showPreview: true, showForm: true });
            }
          },
          {
            label: 'View history',
            action: (e) => {
              setContextMenu([]);
            }
          }
        );

        if (feature.get('raw').status === 'Active') {
          items.push({
            label: 'Clear event',
            action: (e) => {
              setContextMenu([]);
              const event = feature.get('raw');
              patch(
                `${API_HOST}/api/events/${event.id}`,
                { status: 'Inactive' },
              ).then((event) => {
                  feature.set('raw', event);
                  dispatch({ type: 'reset form', value: event, showPreview: true, showForm: false });
                });
            }
          });
        } else if (feature.get('raw').approved) {
          items.push({
            label: 'Reactivate event',
            action: (e) => {
              setContextMenu([]);
              const event = feature.get('raw');
              patch(
                `${API_HOST}/api/events/${event.id}`,
                { status: 'Active' },
              ).then((event) => {
                  feature.set('raw', event);
                  dispatch({ type: 'reset form', value: event, showPreview: true, showForm: false });
                });
            }
          });
        }
      }

      items.push(
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
      );
    }

    setContextMenu(items);
  };

  useEffect(() => {
    if (!map) { return; }
    map.on('contextmenu', contextHandler);
    if (!fetchInterval) {
      setFetchInterval(setInterval(() => updateEvents(map, dispatch), 1000));
    }
  }, [map]);

  return (
    <ContextMenu ref={menuRef} options={contextMenu} setContextMenu={setContextMenu} myevent={event} />
  );
}
