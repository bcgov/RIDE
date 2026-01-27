import { useContext, useCallback, useEffect, useRef, useState } from 'react';
import { components } from 'react-select';
import AsyncSelect from 'react-select/async';


import { MapContext } from '../../contexts';
import { createMap, ll2g } from './helpers';
import { get } from '../../shared/helpers';

import { GEOCODER_CLIENT_ID, GEOCODER_HOST } from '../../env';

import './map.scss';

const DropdownIndicator = (props) => (
  <components.DropdownIndicator {...props}>
    { (props.selectProps.inputValue || props.selectProps.value)
      ? <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640" width="20" height="20" fill="currentColor"><path d="M183.1 137.4C170.6 124.9 150.3 124.9 137.8 137.4C125.3 149.9 125.3 170.2 137.8 182.7L275.2 320L137.9 457.4C125.4 469.9 125.4 490.2 137.9 502.7C150.4 515.2 170.7 515.2 183.2 502.7L320.5 365.3L457.9 502.6C470.4 515.1 490.7 515.1 503.2 502.6C515.7 490.1 515.7 469.8 503.2 457.3L365.8 320L503.1 182.6C515.6 170.1 515.6 149.8 503.1 137.3C490.6 124.8 470.3 124.8 457.8 137.3L320.5 274.7L183.1 137.4z"/></svg>
      : <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640" width="20" height="20" fill="currentColor"><path d="M480 272C480 317.9 465.1 360.3 440 394.7L566.6 521.4C579.1 533.9 579.1 554.2 566.6 566.7C554.1 579.2 533.8 579.2 521.3 566.7L394.7 440C360.3 465.1 317.9 480 272 480C157.1 480 64 386.9 64 272C64 157.1 157.1 64 272 64C386.9 64 480 157.1 480 272zM272 416C351.5 416 416 351.5 416 272C416 192.5 351.5 128 272 128C192.5 128 128 192.5 128 272C128 351.5 192.5 416 272 416z"/></svg>
    }
  </components.DropdownIndicator>
);

async function getLocations(addressInput) {
  if (addressInput.length < 3) { return []; }
  return get(`${GEOCODER_HOST}/addresses.json`, {
      minScore: 50,
      maxResults: 7,
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
  ).then(data => data.features.map((feature) => ({
    value: feature.properties.fullAddress,
    label: feature.properties.fullAddress,
    location: feature.geometry.coordinates,
  })))
}


export default function Map({ children, dispatch, event, clickHandler }) {

  let creatingMap = false;

  const elementRef = useRef();
  const searchRef = useRef();
  const eventRef = useRef();
  eventRef.current = event;

  const { map, setMap } = useContext(MapContext);
  const [ base, setBase ] = useState('vector')

  const click = useCallback((e) => {
    clickHandler(e, eventRef.current);
  }, [event]);

  useEffect(() => {
    if (creatingMap) { return; }  // only once
    creatingMap = true;

    const map = createMap();
    map.setTarget(elementRef.current);
    map.on('click', click);
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
    })
    setMap(map);
  }, []);
  globalThis.map = map;

  const otherBase = base === 'vector' ? 'aerial' : 'vector';

  return (
    <div ref={elementRef} className="map-container">
      <div className="geosearch">
        <AsyncSelect
          ref={searchRef}
          onFocus={() => {
            searchRef.current.clearValue();
            map.location.getGeometry().setCoordinates([]);
          }}
          blurInputOnSelect={true}
          loadOptions={getLocations}
          placeholder="type to search"
          openMenuOnFocus={false}
          noOptionsMessage={(e) => e.inputValue && e.inputValue.length > 2 ? 'No matches' : null }
          components={{ IndicatorSeparator: () => null, DropdownIndicator, }}
          onChange={(e) => {
            if (e?.location) {
              const coordinate = ll2g(e.location);
              map.getView().animate({ center: coordinate, duration: 500 });
              map.location.getGeometry().setCoordinates(coordinate);
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
