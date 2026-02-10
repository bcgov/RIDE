import { useContext, useEffect, useState, useRef } from 'react';

import * as turf from '@turf/turf';

import GeoJSON from 'ol/format/GeoJSON.js';
import VectorLayer from 'ol/layer/Vector';
import VectorSource from 'ol/source/Vector';
import { linear } from 'ol/easing';
import { Point, LineString, GeometryCollection, MultiPolygon, Polygon } from 'ol/geom';
import { Icon, Style } from 'ol/style';

import { MapContext } from '../../contexts';

import { ll2g, selectFeature, pointerMove } from './helpers.js';
import RideFeature, { PinFeature } from './feature.js';
import ContextMenu from '../../events/ContextMenu';
import { getInitialEvent } from '../../events/forms';

import { API_HOST } from '../../env.js';
import { getIconAndStroke } from '../../events/icons';
import { getNextUpdate, getPendingNextUpdate } from '../../shared/helpers.js';
import { endHandler } from './PinLayer';
import { patch } from '../../shared/helpers';


export function addEvent(event, map, dispatch) {
  const source = map.get('events').getSource();
  const existing = source.get(event.id);

  if (existing) {
    if (event.version <= existing.get('version')) { return; }

    source.unset(event.id, true);
    source.removeFeature(existing);
  }

  let coords = event.location.start.coords;
  if (Array.isArray(coords[0])) { coords = coords[0]; }
  const g = event.geometry.geometries;

  let start, mid, route;
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
  if (!start) { start = ll2g(coords); }

  const styles = {};
  ['static', 'hover', 'active'].forEach((state) => {
    const [icon, stroke] = getIconAndStroke(event, state);
    styles[state] = [new Style({ image: new Icon({ src: icon }), ...stroke, })];
  });

  const feature = new RideFeature({
    styles,
    type: 'event',
    raw: structuredClone(event),
    version: event.version,
    geometry: new GeometryCollection([new Point(mid || start)]),
  });
  feature.setId(event.id);

  if (feature.getGeometry().getGeometries()[0].getCoordinates()[0] > -1000) {
    feature.getGeometry().getGeometries()[0].transform('EPSG:4326', map.getView().getProjection().getCode());
  }
  feature.set('visible', getVisibility(event, map.get('visibleLayers')));

  if (route) {
    const gg = feature.getGeometry().getGeometries();
    if (event.type === 'ROAD_CONDITION') {
      gg.push(new Polygon([event.polygon.map((latLng) => ll2g(latLng))]));
    } else {
      gg.push(new LineString(route.geometry.coordinates.map((latLng) => ll2g(latLng))));
    }
    feature.getGeometry().setGeometries(gg);
  }
  source.set(event.id, feature, true);
  source.addFeature(feature);

  if (map.selectedFeature && map.selectedFeature.getId() === event.id) {
    dispatch({ type: 'update event', value: event})
  }
}

async function updateEvents(map, dispatch, layerStyle) {
  fetch(`${API_HOST}/api/events`, {
    headers: { 'Accept': 'application/json' },
    credentials: "include",
  }).then((response) => response.json())
    .then((data) => {
      if (!map.get('events')) {
        const layer = new VectorLayer({
          classname: 'events',
          visible: true,
          source: new VectorSource({ format: new GeoJSON() }),
          style: layerStyle,
          renderBuffer: 30,
        });
        layer.listenForHover = true;
        layer.listenForClicks = true;
        map.addLayer(layer);
        map.set('events', layer);
      }

      const source = map.get('events').getSource();

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
          source.removeFeature(existing);
        }
      });
    });
}


function getVisibility(event, visibleLayers) {
  const now = new Date()
  const SEVEN_DAYS_AGO = now - 1000 * 60 * 60 * 24 * 7;
  const FIFTEEN_MINUTES_AGO = now - 1000 * 60 * 15;

  const last_inactivated = new Date(event.last_inactivated);
  if (event.status === 'Active' || last_inactivated > FIFTEEN_MINUTES_AGO) {
    if (event.is_closure) {
      return visibleLayers.closures;
    } else if (new Date(event.timing.startTime) > now) {
      return visibleLayers.future;
    } else if (event.type === 'ROAD_CONDITION') {
      return visibleLayers.roadConditions;
    } else if (event.type === 'Incident' || event.type === 'Planned event') {
      return visibleLayers[event.details.severity.toLowerCase()];
    }
  } else if (event.status === 'Inactive') {
    return visibleLayers.cleared7 && new Date(event.last_inactivated) > SEVEN_DAYS_AGO;
  }
  return true;
}

function layerStyle(feature, resolution) {
  if (!feature.get('visible')) { return null; }
  if (feature.get('selected')) { return feature.active; }
  return feature.get('hovered') ? feature.hover : feature.normal;
}

export default function Layer({ visibleLayers, event, dispatch }) {

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
      if (!event.location.start?.name || !event.showForm) {
        items.push({
          label: 'Create event',
          action: (e) => {
            setContextMenu([]);
            dispatch({ type: 'reset form', value: getInitialEvent(), showPreview: true, showForm: true });
            map.start = new PinFeature({
              style: 'start',
              geometry: new Point(coordinate),
              action: 'set start',
              isVisible: true,
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
              action: 'set end',
              isVisible: true,
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

      const raw = feature.get('raw');

      if (!event.showForm) {
        // TODO: add permission based checks on these items
        items.push(
          {
            label: 'Edit event',
            action: (e) => {
              setContextMenu([]);
              selectFeature(map, feature);
              dispatch({ type: 'reset form', value: raw, showPreview: true, showForm: true });
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
          if (feature.get('raw').type === 'ROAD_CONDITION') {
            const pending = getPendingNextUpdate(raw);

            items.push({
              label: 'Reconfirm',
              disabled: !pending,
              action: (e) => {
                setContextMenu([]);
                if (pending) {
                  patch(
                    `${API_HOST}/api/events/${raw.id}`,
                    { timing: { nextUpdate: pending.toISOString() } },
                  ).then((updatedEvent) => {
                    feature.set('raw', updatedEvent);
                    dispatch({ type: 'reset form', value: updatedEvent, showPreview: true, showForm: false });
                  });
                }
              }
            });
          }

          items.push({
            label: 'Clear event',
            action: (e) => {
              setContextMenu([]);
              patch(
                `${API_HOST}/api/events/${raw.id}`,
                { status: 'Inactive' },
              ).then((updatedEvent) => {
                feature.set('raw', updatedEvent);
                dispatch({ type: 'reset form', value: updatedEvent, showPreview: true, showForm: false });
              });
            }
          });
        } else if (raw.approved) {
          items.push({
            label: 'Reactivate event',
            debugging: true,
            action: (e) => {
              setContextMenu([]);
              patch(
                `${API_HOST}/api/events/${raw.id}`,
                { status: 'Active' },
              ).then((updatedEvent) => {
                feature.set('raw', updatedEvent);
                dispatch({ type: 'reset form', value: updatedEvent, showPreview: true, showForm: false });
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
    map.on('propertychange', (e) => {
      if (e.key !== 'visibleLayers') { return; }
      const visibility = map.get('visibleLayers');
      map.get('events').getSource().getFeatures().forEach((feature) => {
        feature.set('visible', getVisibility(feature.get('raw'), visibility));
      });
    });
    map.on('pointermove', pointerMove);
    updateEvents(map, dispatch, layerStyle);
    if (!fetchInterval) {
      setFetchInterval(setInterval(() => updateEvents(map, dispatch, layerStyle), 10000));
    }
  }, [map]);

  return (
    <ContextMenu ref={menuRef} options={contextMenu} setContextMenu={setContextMenu} myevent={event} />
  );
}
