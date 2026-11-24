// React
import { useContext, useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';

// Navigation
import { useNavigate } from 'react-router';
import { useSelector } from 'react-redux';

// OpenLayers
import Overlay from 'ol/Overlay';

// Internal imports
import Map from '../components/Map';
import { SetupAvalancheAreasLayer, SetupChainUpsLayer, SetupSegmentsLayer } from '../components/Map/layers';
import { AuthContext, MapContext } from '../contexts';
import { selectFeature } from '../components/Map/helpers.js';
import { getChainUpEvents } from '../shared/data/chainups';
import { selectDistrictById } from '../slices/districts';
import { getServiceAreas } from '../shared/data/organizations';
import { getRoutes } from '../shared/data/segments';
import RIDEDropdown from '../components/shared/dropdown';

// Styling
import './home.scss';

const LAYERS = ['Chain-ups', 'Road segments', 'Avalanche Areas'];

const DIRECTIONS = {
  BOTH: 'Both Directions',
  NORTHBOUND: 'Northbound',
  SOUTHBOUND: 'Southbound',
  EASTBOUND: 'Eastbound',
  WESTBOUND: 'Westbound',
};

const areaLabel = (area) => area ? `${area.sortingOrder} - ${area.name}` : '';

export function meta() {
  return [
    { title: 'RIDE Map Setup' },
  ];
}

export default function Home() {
  const navigate = useNavigate();
  const { authContext } = useContext(AuthContext);
  const [ map, setMap ] = useState(null);

  const [ serviceAreas, setServiceAreas ] = useState([]);
  const [ routes, setRoutes ] = useState([]);
  const [ activeChainups, setActiveChainups ] = useState(new Set());

  // chain-up tooltip
  const [ tooltip, setTooltip ] = useState(null);
  const [ selectedChainup, setSelectedChainup ] = useState(null);

  const [ selectedLayer, setSelectedLayer ] = useState(JSON.parse(localStorage.getItem('mapsetupLayer')) || LAYERS[0]);
  const [ selectedRoute, setSelectedRoute ] = useState(JSON.parse(localStorage.getItem('mapsetupRoute')) || 'All roads');
  const [ selectedArea, setSelectedArea ] = useState(JSON.parse(localStorage.getItem('mapsetupArea')) || 'All service areas');
  localStorage.setItem('mapsetupLayer', JSON.stringify(selectedLayer));
  localStorage.setItem('mapsetupRoute', JSON.stringify(selectedRoute));
  localStorage.setItem('mapsetupArea', JSON.stringify(selectedArea));

  useEffect(() => {
    if (!authContext?.loginStateKnown) { return; }

    if (!authContext.username) {
      navigate('/');

    } else if (!authContext.is_approver || !authContext.enable_map_setup) {
      navigate('/events/');
    }
  }, [authContext]);

  useEffect(() => {
    getServiceAreas().then(setServiceAreas);
    getRoutes().then(setRoutes);
    getChainUpEvents().then((events) => setActiveChainups(
      new Set(events.filter((e) => e.status === 'Active').map((e) => e.chainup))
    ));
  }, []);

  useEffect(() => {
    if (!map) { return; }

    const overlay = new Overlay({
      element: document.createElement('div'),
      positioning: 'center-right',
      offset: [-16, 0],
      stopEvent: true, // clicks inside tooltip don't reach map, so it stays open
    });
    overlay.getElement().className = 'chainup-tooltip';
    map.addOverlay(overlay);
    setTooltip(overlay);
  }, [map]);

  // bound once by Map, so only use e.map and state setters here
  const clickHandler = (e) => {
    const feature = e.map.getFeaturesAtPixel(e.pixel, {
      layerFilter: (layer) => layer === e.map.get('chainups'),
    })[0];

    selectFeature(e.map, feature || null);
    setSelectedChainup(feature || null);
  };

  useEffect(() => {
    tooltip?.setPosition(selectedChainup?.getGeometry().getCoordinates());
  }, [tooltip, selectedChainup]);

  // selected area plus its sub-areas
  const areaIds = useMemo(() => selectedArea === 'All service areas' ? null : new Set(
    serviceAreas.filter(sa => sa.id === selectedArea.id || sa.parent === selectedArea.id).map(sa => sa.id).concat(selectedArea.id)
  ), [selectedArea, serviceAreas]);

  const filter = useMemo(() => (cu) => (
    (selectedRoute === 'All roads' || cu.route === selectedRoute.id) && (!areaIds || areaIds.has(cu.area))
  ), [selectedRoute, areaIds]);

  // drop selection when filters hide it
  useEffect(() => {
    if (!map) { return; }
    selectFeature(map, null);
    setSelectedChainup(null);
  }, [filter, selectedLayer]);

  const chainup = selectedChainup?.get('raw');
  const area = chainup && serviceAreas.find(sa => sa.id === chainup.area);
  // service_areas API excludes districts
  const district = useSelector(state => area && selectDistrictById(state, area.parent));

  const displayedAreas = selectedRoute === 'All roads' ? serviceAreas :
    serviceAreas.filter(sa => sa.routes && sa.routes.includes(selectedRoute.id));

  const displayedRoutes = !areaIds ? routes : routes.filter(r => serviceAreas.some(
    sa => areaIds.has(sa.id) && sa.routes && sa.routes.includes(r.id)
  ));

  return (
    <div className='mapsetup-home'>
      <div className={'toolbar'}>
        <div className={'left'}>
          <span>Filter</span>

          <RIDEDropdown
            label={''}
            extraClasses={'extra-margin-right open-right'}
            items={LAYERS}
            handler={(layer) => setSelectedLayer(layer)}
            value={selectedLayer} />

          <RIDEDropdown
            label={''}
            extraClasses={'extra-margin-right fixed-width'}
            items={['All service areas', ...displayedAreas]}
            handler={(area) => setSelectedArea(area)}
            value={selectedArea} />

          <RIDEDropdown
            label={''}
            extraClasses={'extra-margin-right'}
            items={['All roads', ...displayedRoutes]}
            handler={(route) => setSelectedRoute(route)}
            value={selectedRoute} />
        </div>
      </div>

      <MapContext.Provider value={{ map, setMap }}>
        <Map clickHandler={clickHandler} hideSearch>
          <SetupChainUpsLayer filter={filter} visible={selectedLayer === 'Chain-ups'} />
          <SetupSegmentsLayer visible={selectedLayer === 'Road segments'} />
          <SetupAvalancheAreasLayer visible={selectedLayer === 'Avalanche Areas'} />
        </Map>
      </MapContext.Provider>

      { tooltip && chainup && createPortal(
        <>
          <strong>{chainup.name}</strong>
          <div>District: {areaLabel(district)}</div>
          <div>Service area: {areaLabel(area)}</div>
          <div>Direction: {DIRECTIONS[chainup.direction] || ''}</div>
          <div>Active chain-up: {activeChainups.has(chainup.uuid) ? 'Yes' : 'No'}</div>
        </>,
        tooltip.getElement()
      )}
    </div>
  );
}
