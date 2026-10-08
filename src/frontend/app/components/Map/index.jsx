import { useContext, useCallback, useEffect, useRef, useState } from 'react';
import { components } from 'react-select';
import AsyncSelect from 'react-select/async';
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";

import {
  faArrowRotateRight,
  faBuilding,
  faCity,
  faInputText,
  faMagnifyingGlass,
  faPlus,
  faXmark
} from '@fortawesome/pro-regular-svg-icons';
import {
  faArchway,
  faRoad,
  faMapLocation,
  faSignHanging,
  faTrafficLightStop,
  faTree
} from '@fortawesome/duotone-regular-svg-icons';

import { DebuggingContext, MapContext } from '../../contexts';
import { createMap, ll2g, pointerMove } from './helpers';
import { get } from '../../shared/helpers';

import { API_HOST, GEOCODER_CLIENT_ID, GEOCODER_HOST, ROUTABLE_LOCATIONS_HOST } from '../../env';

import './map.scss';

const Input = (props) => <components.Input {...props} isHidden={false} />;

const DropdownIndicator = (props) => {
  const showClear = props.selectProps.inputValue || props.selectProps.value;
  const innerProps = showClear
    ? {
        ...props.innerProps,
        onMouseDown: (e) => {
          e.preventDefault();
          e.stopPropagation();
          props.selectProps.onClearAll?.();
        },
        onTouchEnd: (e) => {
          e.preventDefault();
          e.stopPropagation();
          props.selectProps.onClearAll?.();
        },
      }
    : props.innerProps;

  return (
    <components.DropdownIndicator {...props} innerProps={innerProps}>
      { showClear
        ? <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640" width="20" height="20" fill="currentColor"><path d="M183.1 137.4C170.6 124.9 150.3 124.9 137.8 137.4C125.3 149.9 125.3 170.2 137.8 182.7L275.2 320L137.9 457.4C125.4 469.9 125.4 490.2 137.9 502.7C150.4 515.2 170.7 515.2 183.2 502.7L320.5 365.3L457.9 502.6C470.4 515.1 490.7 515.1 503.2 502.6C515.7 490.1 515.7 469.8 503.2 457.3L365.8 320L503.1 182.6C515.6 170.1 515.6 149.8 503.1 137.3C490.6 124.8 470.3 124.8 457.8 137.3L320.5 274.7L183.1 137.4z"/></svg>
        : <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640" width="20" height="20" fill="currentColor"><path d="M480 272C480 317.9 465.1 360.3 440 394.7L566.6 521.4C579.1 533.9 579.1 554.2 566.6 566.7C554.1 579.2 533.8 579.2 521.3 566.7L394.7 440C360.3 465.1 317.9 480 272 480C157.1 480 64 386.9 64 272C64 157.1 157.1 64 272 64C386.9 64 480 157.1 480 272zM272 416C351.5 416 416 351.5 416 272C416 192.5 351.5 128 272 128C192.5 128 128 192.5 128 272C128 351.5 192.5 416 272 416z"/></svg>
      }
    </components.DropdownIndicator>
  );
};

const OPTION_ICON = {
  landmarks: {
    A1: <FontAwesomeIcon icon={faRoad} />,
    A2: <FontAwesomeIcon icon={faRoad} />,
    A3: <FontAwesomeIcon icon={faRoad} />,
    A5: <FontAwesomeIcon icon={faRoad} />,
    A8: <FontAwesomeIcon icon={faRoad} />,
    B3: <FontAwesomeIcon icon={faRoad} />,
    B4: <FontAwesomeIcon icon={faRoad} />,
    D1: <FontAwesomeIcon icon={faArchway} />,
    G6: <FontAwesomeIcon icon={faRoad} />,
    R1: <FontAwesomeIcon icon={faTree} />,
    R2: <FontAwesomeIcon icon={faTree} />,
    S4: <FontAwesomeIcon icon={faSignHanging} />,
    Y1: <FontAwesomeIcon icon={faMapLocation} />,
    Y3: <FontAwesomeIcon icon={faMapLocation} />,
    Y4: <FontAwesomeIcon icon={faMapLocation} />,
  },
  crossroad: <FontAwesomeIcon icon={faTrafficLightStop} />,
  geocoder: {
    street: <FontAwesomeIcon icon={faRoad} />,
    default: <FontAwesomeIcon icon={faCity} />
  },
  routable: <FontAwesomeIcon icon={faArchway} />,
}


function getIcon(data) {
  if (data.source === 'landmarks') {
    return OPTION_ICON['landmarks'][data.type]
  } else if (data.source === 'geocoder') {
    const sub = data.matchPrecision === 'STREET' ? 'street' : 'default';
    return OPTION_ICON['geocoder'][sub];
  }
  return OPTION_ICON[data.source];
}

const CustomOption = ({ data, label, innerProps, }) => {
  return (
    <div className='option' {...innerProps}>
      <div className='option-icon'>{getIcon(data)}</div>
      <div className='option-label'>{label}</div>
    </div>
  );
}

async function getCrossroads(road) {
  return get(`${API_HOST}/api/crossroads`, {
    road
  }).then((data) => data.map((crossroad) => ({
    value: crossroad.name,
    label: `${crossroad.name} on ${crossroad.route}`,
    location: crossroad.geometry.coordinates,
    source: 'crossroad',
  })));
}

async function getLandmarks(address) {
  return get(`${API_HOST}/api/landmarks`, {
    address
  }).then((data) => data.map((landmark) => ({
    value: landmark.description,
    label: landmark.description,
    location: landmark.geometry.coordinates,
    source: 'landmarks',
    type: landmark.landmark_type
  })));
}

async function getGeocoderLocations(addressInput) {
  return get(`${GEOCODER_HOST}/addresses.json`, {
      minScore: 50,
      maxResults: 15,
      echo: 'false',
      brief: true,
      autoComplete: true,
      addressString: addressInput,
      exactSpelling: false,
      locationDescriptor: 'routingPoint',
      fuzzyMatch: true,
    }, {
      'apiKey': `${GEOCODER_CLIENT_ID}`,
    }
  ).then(data => {
    return data.features.map((feature) => ({
    value: feature.properties.fullAddress,
    label: feature.properties.fullAddress,
    location: feature.geometry.coordinates,
    source: 'geocoder',
    matchPrecision: feature.properties.matchPrecision,
  }))});
}

function escapeCqlString(value) {
  return String(value).replace(/'/g, "''");
}

function sanitizeForILikePrefix(value) {
  return String(value).replace(/%/g, "").replace(/_/g, "");
}

export function getRoutableLocations(addressInput) {
  // return empty promise if address input is less than 2 characters
  const trimmed = (addressInput || "").trim();
  if (trimmed.length < 2) {
    return Promise.resolve({ type: "FeatureCollection", features: [] });
  }

  // escape CQL string and sanitize for ILike prefix
  const literal = escapeCqlString(sanitizeForILikePrefix(trimmed));
  return get(
    `${ROUTABLE_LOCATIONS_HOST}public/ows`,
    {
      service: "WFS",
      version: "1.0.0",
      request: "GetFeature",
      typeName: "public:routable-locations",
      outputFormat: "application/json",
      maxFeatures: 5,
      cql_filter: `authority='DriveBC' and name ilike '%${literal}%'`,
    },
    {},
    false,
  ).then((data) => data.features.map((feature) => ({
    value: feature.properties.name,
    label: feature.properties.name,
    location: feature.geometry.coordinates,
    source: 'routable',
  })));
}

async function getLocations(addressInput) {
  addressInput = addressInput.trim();
  if (addressInput.length < 3) { return []; }

  const geocoderPromise = getGeocoderLocations(addressInput);
  const routablePromise = getRoutableLocations(addressInput);
  const landmarksPromise = getLandmarks(addressInput);
  const crossroadsPromise = getCrossroads(addressInput);

  return Promise.all([
    geocoderPromise, routablePromise, landmarksPromise, crossroadsPromise
  ]).then(
    ([geocoderResults, routableResults, landmarkResults, crossroadResults]) => {
      const results = [
        ...geocoderResults,
        ...routableResults,
        ...landmarkResults,
        ...crossroadResults,
      ];
      results.sort((a, b) => a.value < b.value ? -1 : 1);
      return results;
    }
  );
}


export default function Map({ children, event, clickHandler }) {

  let creatingMap = false;

  const elementRef = useRef();
  const searchRef = useRef();
  const eventRef = useRef();
  eventRef.current = event;

  const { map, setMap } = useContext(MapContext);
  const debuggingIsOn = useContext(DebuggingContext);
  const [ base, setBase ] = useState('vector')
  const [ searchInput, setSearchInput ] = useState('');

  const click = useCallback((e) => {
    clickHandler(e, eventRef.current);
  }, [event]);

  useEffect(() => {
    if (creatingMap) { return; }  // only once
    creatingMap = true;

    const map = createMap();
    map.setTarget(elementRef.current);
    map.on('click', click);
    map.on('pointermove', pointerMove);
    map.on('propertychange', (e) => {
      if (e.key !== 'base') { return; }
      if (e.target.get('base') === 'vector') {
        map.get('vector').set('visible', true);
        map.get('aerial').set('visible', false);
        map.get('roads').set('visible', false);
      } else {
        map.get('vector').set('visible', false);
        map.get('aerial').set('visible', true);
        map.get('roads').set('visible', true);
      }
    });
    setMap(map);
  }, []);
  globalThis.map = map;

  const otherBase = base === 'vector' ? 'aerial' : 'vector';

  if (map) {
    map.get('debug').setVisible(debuggingIsOn);
  }

  return (
    <div ref={elementRef} className="map-container">
      <div className="geosearch">
        <AsyncSelect
          ref={searchRef}
          inputValue={searchInput}
          controlShouldRenderValue={false}
          onInputChange={(newValue, { action }) => {
            if (action === 'input-change') {
              setSearchInput(newValue);
            }
          }}
          blurInputOnSelect={true}
          loadOptions={getLocations}
          placeholder="Search location"
          openMenuOnFocus={false}
          menuIsOpen={true}
          noOptionsMessage={(e) => e.inputValue && e.inputValue.length > 2 ? 'No matches' : null }
          components={{
            IndicatorSeparator: () => null,
            DropdownIndicator,
            ClearIndicator: () => null,
            Input,
            Option: CustomOption,
          }}
          onClearAll={() => {
            setSearchInput('');
            searchRef.current?.clearValue();
            map.location.getGeometry().setCoordinates([]);
          }}
          onChange={(e, actionMeta) => {
            if (actionMeta?.action === 'clear') {
              setSearchInput('');
              map.location.getGeometry().setCoordinates([]);
              return;
            }
            if (e?.location) {
              const coordinate = ll2g(e.location);
              map.getView().animate({ center: coordinate, duration: 500, zoom: 12 });
              map.location.getGeometry().setCoordinates(coordinate);
              setSearchInput(e.label);
            }
          }}
        />
      </div>
      <button
        type="button"
        className="toggle"
        onClick={() => {
          map.set('base', otherBase);
          setBase(otherBase);
        }}
      ><img src={`/images/${otherBase}.png`} alt='${otherBase}' /></button>
      {children}
    </div>
  );
}
