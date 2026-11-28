// React
import { useContext, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

// External imports
import { useSelector } from 'react-redux';
import * as turf from '@turf/turf';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCircleCheck, faXmark } from '@fortawesome/pro-regular-svg-icons';

// Internal imports
import { AlertContext } from '../contexts';
import { g2ll, getDRA, ll2g } from '../components/Map/helpers.js';
import { getNearby } from '../events/forms/Location/helpers';
import { createChainUp, getChainUpRoute, updateChainUp } from '../shared/data/chainups';
import RIDEDropdown from '../components/shared/dropdown';
import RIDETextInput from '../components/shared/textinput';
import Spinner from '../components/shared/spinner';
import { selectAllServiceAreaBoundaries } from '../slices/serviceAreaBoundaries';
import { selectDistrictById } from '../slices/districts';

export const DIRECTIONS = {
  BOTH: 'Both Directions',
  NORTHBOUND: 'Northbound',
  SOUTHBOUND: 'Southbound',
  EASTBOUND: 'Eastbound',
  WESTBOUND: 'Westbound',
};

const DIRECTION_ITEMS = Object.entries(DIRECTIONS).map(([value, name]) => ({ value, name }));

// on-road sources only; municipality/place centroids would pull the pin off the highway
const SNAP_SOURCES = ['landmarks', 'crossroads', 'intersections'];

export const areaLabel = (area) => area ? `${area.sortingOrder} - ${area.name}` : '';

// feature without raw data is a new pin: create mode. showPanel false keeps just the
// landmarks tooltip, for the right-click preview before "Create chain-up" is chosen.
export default function EditChainUp({ map, feature, serviceAreas, tooltip, onClose, showPanel = true }) {
  const { setAlertContext } = useContext(AlertContext);
  const chainup = feature.get('raw');
  const creating = !chainup;
  const originalCoords = useRef(feature.getGeometry().getCoordinates());
  const lookup = useRef(0); // ignore nearby results from an earlier pin position

  const [ name, setName ] = useState(chainup?.name || '');
  const [ description, setDescription ] = useState(chainup?.description || '');
  const [ direction, setDirection ] = useState(DIRECTION_ITEMS.find((d) => d.value === chainup?.direction) || DIRECTION_ITEMS[0]);
  const [ road, setRoad ] = useState(); // undefined: loading, null: no road found
  const [ route, setRoute ] = useState(null);
  const [ pending, setPending ] = useState(new Set());
  const [ nearby, setNearby ] = useState({});
  const [ snap, setSnap ] = useState(creating ? 'Manually specified' : 'Current location');
  const [ saving, setSaving ] = useState(false);
  const [ submitted, setSubmitted ] = useState(false); // show errors after first save attempt

  // service area follows the pin; district is its parent
  const [ areaId, setAreaId ] = useState(chainup?.area);
  const boundaries = useSelector(selectAllServiceAreaBoundaries);
  const boundariesRef = useRef();
  boundariesRef.current = boundaries;
  const area = serviceAreas.find((sa) => sa.id === areaId);
  const district = useSelector((state) => area && selectDistrictById(state, area.parent));

  // snap pin to nearest road, then load landmarks around it
  const locate = async (coords, snapPin = true) => {
    const current = ++lookup.current;
    setNearby({});
    setRoad(undefined);
    setPending(new Set(['road']));

    const { properties, closest } = await getDRA(coords, null, map);
    if (current !== lookup.current) { return; }
    if (snapPin && closest) { coords = ll2g(closest.geometry.coordinates); }
    feature.getGeometry().setCoordinates(coords);
    tooltip.setPosition(coords);

    const lnglat = g2ll(coords);
    const containing = Object.values(boundariesRef.current || {}).find((b) => (
      b?.geometry && turf.booleanPointInPolygon(lnglat, b.geometry)
    ));
    if (containing) { setAreaId(containing.id); } // outside all areas: keep last

    const routeNumber = properties?.HIGHWAY_ROUTE_NUMBER?.split('+')[0];
    const roadName = properties && ((routeNumber && properties.ROAD_CLASS !== 'ramp') ? `Highway ${routeNumber}` : properties.ROAD_NAME_FULL);

    // route comes from geometry on the backend, same lookup as create
    setRoute(null);
    if (creating) {
      setPending(new Set(['route']));
      getChainUpRoute(lnglat)
        .then((found) => { if (current === lookup.current) { setRoute(found); } })
        .catch(() => {}) // 400: nothing nearby
        .finally(() => {
          if (current !== lookup.current) { return; }
          setPending((prev) => { const next = new Set(prev); next.delete('route'); return next; });
        });
    } else {
      setPending(new Set());
    }
    if (!properties) { setRoad(null); return; }

    const alias = [properties.ROAD_NAME_FULL, properties.ROAD_NAME_ALIAS1].find((n) => n && n !== roadName);
    setRoad({ name: roadName, alias });

    getNearby('set start', { ...properties, name: roadName, coords: g2ll(coords) }, (action) => {
      if (current !== lookup.current) { return; }
      if (action.type === 'add to pending') {
        setPending((prev) => new Set(prev).add(action.value));
      } else if (action.type === 'add candidates') {
        setNearby((prev) => ({ ...prev, [action.source]: action.value }));
        setPending((prev) => { const next = new Set(prev); next.delete(action.source); return next; });
      }
    });
  };

  useEffect(() => {
    tooltip.setPositioning(showPanel ? 'center-left' : 'center-right');
    tooltip.setOffset(showPanel ? [16, 0] : [-16, 0]);
  }, [showPanel]);

  useEffect(() => {
    feature.set('canDrag', true);
    feature.dragEnd = (coords) => { setSnap('Manually specified'); locate(coords); };
    locate(originalCoords.current, creating); // edit keeps the saved spot

    return () => {
      tooltip.setPosition(undefined);
      tooltip.setPositioning('center-right');
      tooltip.setOffset([-16, 0]);
      feature.set('canDrag', false);
      delete feature.dragEnd;
    };
  }, [feature]);

  const candidates = Object.values(nearby).flat()
    .filter((c) => !c.isError)
    .sort((a, b) => a.distance - b.distance);
  const snapItems = candidates
    .filter((c) => SNAP_SOURCES.includes(c.source))
    .map((c) => ({ name: c.phrase, candidate: c }));

  const cancel = () => {
    lookup.current++;
    feature.getGeometry().setCoordinates(originalCoords.current);
    onClose(null);
  };

  const errors = {};
  if (!name.trim()) { errors.name = 'Name is required'; }
  if (!description.trim()) { errors.description = 'Detailed location is required'; }
  if (creating && !route) { errors.location = 'Move the pin onto a highway to create a chain-up.'; }
  const shown = submitted ? errors : {};

  const save = () => {
    setSubmitted(true);
    if (Object.keys(errors).length) { return; }

    setSaving(true);

    // backend re-snaps line and route whenever primary_point is sent; only send it on a move
    const coords = feature.getGeometry().getCoordinates();
    const moved = creating || coords.some((c, i) => c !== originalCoords.current[i]);
    const data = {
      name: name.trim(),
      description: description.trim(),
      direction: direction.value,
      area: areaId,
      ...(moved && { primary_point: { type: 'Point', coordinates: g2ll(coords) } }),
    };
    const request = creating ? createChainUp(data) : updateChainUp(chainup.uuid, data);

    request.then((saved) => {
      setAlertContext({ message: `Chain-up successfully ${creating ? 'created' : 'updated'}`, type: 'success' });
      onClose(saved);
    }).catch((err) => {
      setAlertContext({ message: err.message || `Could not ${creating ? 'create' : 'update'} chain-up` });
      setSaving(false);
    });
  };

  const tooltipContent = createPortal(
    <>
      { pending.size > 0 ? <Spinner size='sm' label='' /> : <>
        <strong>{road ? `${road.name}${road.alias ? ` (${road.alias})` : ''}` : 'Custom location'}</strong>
        { candidates.length > 0 &&
          <ul>
            {candidates.slice(0, 5).map((c) => <li key={c.id || c.phrase}>{c.phrase}</li>)}
          </ul>
        }
      </> }
    </>,
    tooltip.getElement()
  );

  if (!showPanel) { return tooltipContent; }

  return (
    <div className='edit-chainup'>
      <h3 className='header'>{creating ? 'Create' : 'Edit'} chain-up</h3>

      <div className='card'>
        <strong>Details</strong>

        <div className='details'>
          <div>
            <label>District</label>
            <p>{areaLabel(district)}</p>
          </div>
          <div>
            <label>Service Area</label>
            <p>{areaLabel(area)}</p>
          </div>
          { !creating &&
            <div>
              <label>Active chain-up</label>
              <p>No</p>
            </div>
          }
        </div>

        <div className='field'>
          <label>Direction</label>
          <RIDEDropdown label={''} items={DIRECTION_ITEMS} handler={setDirection} value={direction} />
        </div>

        <div className={shown.name ? 'error' : ''}>
          <RIDETextInput label='Name' extraClasses='field' value={name} handler={setName} maxLength={90} />
          { shown.name && <span className='error-message'>{shown.name}</span> }
        </div>

        <div className={shown.description ? 'error' : ''}>
          <RIDETextInput label='Detailed location' extraClasses='field' value={description} handler={setDescription} maxLength={255} />
          { shown.description && <span className='error-message'>{shown.description}</span> }
        </div>
      </div>

      <div className='card'>
        <strong>Location</strong>

        <div className={`field ${shown.location ? 'error' : ''}`}>
          <label>Snap to</label>
          { pending.size > 0
            ? <div className='loading-select'>{snap}<Spinner size='sm' label='' /></div>
            : <RIDEDropdown
                label={''}
                items={snapItems}
                handler={(item) => {
                  // drop the distance from the label
                  setSnap(item.name.replace(/^(At |.+? of )/, ''));
                  locate(ll2g(item.candidate.coords));
                }}
                value={snap} />
          }
        </div>

        { shown.location && <span className='error-message'>{shown.location}</span> }

      </div>

      <div className='actions'>
        <button
          type='button'
          className='update'
          disabled={saving || pending.size > 0}
          onClick={save}>
          <FontAwesomeIcon icon={faCircleCheck} /> {creating ? 'Create' : 'Update'}
        </button>
        <button type='button' className='cancel' onClick={cancel}>
          <FontAwesomeIcon icon={faXmark} /> Cancel
        </button>
      </div>

      {tooltipContent}
    </div>
  );
}
