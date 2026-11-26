// React
import { useContext, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

// Navigation
import { useNavigate } from 'react-router';
import { useSelector } from 'react-redux';

// External imports
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCheckCircle, faXmark } from '@fortawesome/pro-regular-svg-icons';

// OpenLayers
import Overlay from 'ol/Overlay';
import { Point } from 'ol/geom';
import VectorLayer from 'ol/layer/Vector';
import VectorSource from 'ol/source/Vector';

// Internal imports
import Map from '../components/Map';
import { SetupAvalancheAreasLayer, SetupChainUpsLayer, SetupSegmentsLayer } from '../components/Map/layers';
import { chainupFeature } from '../components/Map/layers/SetupChainUps';
import { AlertContext, AuthContext, MapContext } from '../contexts';
import { Drag, selectFeature } from '../components/Map/helpers.js';
import RideFeature from '../components/Map/feature.js';
import ContextMenu from '../events/ContextMenu';
import EditChainUp, { areaLabel, DIRECTIONS } from './EditChainUp';
import { deleteChainUp, getChainUpEvents, restoreChainUp } from '../shared/data/chainups';
import { selectDistrictById } from '../slices/districts';
import { getServiceAreas } from '../shared/data/organizations';
import { getRoutes } from '../shared/data/segments';
import RIDEDropdown from '../components/shared/dropdown';
import '../components/shared/modal.scss';

// Styling
import './home.scss';

const LAYERS = ['Chain-ups', 'Road segments', 'Avalanche Areas'];

export function meta() {
  return [
    { title: 'RIDE Map Setup' },
  ];
}

export default function Home() {
  const navigate = useNavigate();
  const { authContext } = useContext(AuthContext);
  const { setAlertContext } = useContext(AlertContext);
  const [ map, setMap ] = useState(null);

  const [ serviceAreas, setServiceAreas ] = useState([]);
  const [ routes, setRoutes ] = useState([]);
  const [ activeChainups, setActiveChainups ] = useState(new Set());

  // chain-up tooltip
  const [ tooltip, setTooltip ] = useState(null);
  const [ selectedChainup, setSelectedChainup ] = useState(null);

  // right-click menu and edit panel
  const [ contextMenu, setContextMenu ] = useState([]);
  const [ editing, setEditing ] = useState(null);
  const [ deleting, setDeleting ] = useState(null);
  const [ creating, setCreating ] = useState(null); // { feature: draft pin, panel: bool }
  const menuRef = useRef();

  // map handlers are bound once; read current values through refs
  const editingRef = useRef();
  editingRef.current = editing;
  const activeRef = useRef();
  activeRef.current = activeChainups;
  const creatingRef = useRef();
  creatingRef.current = creating;

  const [ selectedLayer, setSelectedLayer ] = useState(JSON.parse(localStorage.getItem('mapsetupLayer')) || LAYERS[0]);
  const [ selectedRoute, setSelectedRoute ] = useState(JSON.parse(localStorage.getItem('mapsetupRoute')) || 'All roads');
  const [ selectedArea, setSelectedArea ] = useState(JSON.parse(localStorage.getItem('mapsetupArea')) || 'All service areas');
  localStorage.setItem('mapsetupLayer', JSON.stringify(selectedLayer));
  localStorage.setItem('mapsetupRoute', JSON.stringify(selectedRoute));
  localStorage.setItem('mapsetupArea', JSON.stringify(selectedArea));
  const layerRef = useRef();
  layerRef.current = selectedLayer;

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

    // draft pin for a new chain-up; own layer so chain-up filters never see it
    const draftLayer = new VectorLayer({
      source: new VectorSource(),
      style: (f) => f.get('hovered') ? f.hover : f.normal,
      zIndex: 10,
    });
    draftLayer.canDragFeatures = true;
    draftLayer.listenForHover = true;
    map.addLayer(draftLayer);
    map.set('draft', draftLayer);

    map.addInteraction(new Drag({
      menuRef,
      resetContextMenu: () => setContextMenu([]),
      endHandler: (e, feature) => feature.dragEnd?.(feature.getGeometry().getCoordinates()),
    }));

    map.on('contextmenu', (e) => {
      e.preventDefault();
      if (editingRef.current || creatingRef.current?.panel) { return; }

      const feature = e.map.getFeaturesAtPixel(e.pixel, {
        layerFilter: (layer) => layer === e.map.get('chainups'),
      })[0];

      // any new right-click replaces an unconfirmed draft pin
      e.map.get('draft').getSource().clear();
      setCreating(null);
      menuRef.current.style.left = (e.pixel[0] - 1) + 'px';
      menuRef.current.style.top = (e.pixel[1] - 1) + 'px';

      if (!feature) {
        if (layerRef.current !== 'Chain-ups') { setContextMenu([]); return; }

        // pin snaps to road and shows landmarks while the menu is open
        const draft = new RideFeature({ style: 'start', geometry: new Point(e.coordinate) });
        e.map.get('draft').getSource().addFeature(draft);
        selectFeature(e.map, null);
        setSelectedChainup(null);
        setCreating({ feature: draft, panel: false });
        setContextMenu([{
          label: 'Create chain-up',
          action: () => {
            setContextMenu([]);
            setCreating({ feature: draft, panel: true });
          },
        }]);
        return;
      }
      const unlessActive = (fn) => () => {
        setContextMenu([]);
        if (activeRef.current.has(feature.get('raw').uuid)) {
          setAlertContext({ message: 'Chain-up can not be changed when active' });
          return;
        }
        fn();
      };

      setContextMenu([{
        label: 'Edit chain-up',
        action: unlessActive(() => {
          selectFeature(e.map, feature);
          setSelectedChainup(feature);
          setEditing(feature);
        }),
      }, {
        label: 'Delete chain-up',
        action: unlessActive(() => setDeleting(feature)),
      }]);
    });
  }, [map]);

  const finishEdit = (updated) => {
    if (updated) {
      const source = map.get('chainups').getSource();
      source.removeFeature(editing);
      addChainup(updated);
    }
    selectFeature(map, null);
    setSelectedChainup(null);
    setEditing(null);
  };

  const finishCreate = (created) => {
    map.get('draft').getSource().clear();
    if (created) { addChainup(created); }
    setCreating(null);
  };

  const addChainup = (cu) => {
    const feature = chainupFeature(cu);
    feature.set('visible', filter(cu));
    map.get('chainups').getSource().addFeature(feature);
  };

  const confirmDelete = () => {
    const feature = deleting;
    const { uuid } = feature.get('raw');
    setDeleting(null);

    deleteChainUp(uuid).then(() => {
      map.get('chainups').getSource().removeFeature(feature);
      selectFeature(map, null);
      setSelectedChainup(null);
      setAlertContext({
        type: 'success',
        message: 'Chain-up deleted',
        undoHandler: () => restoreChainUp(uuid).then((cu) => {
          addChainup(cu);
          setAlertContext({ type: 'success', message: 'Chain-up restored' });
        }).catch((err) => setAlertContext({ message: err.message || 'Could not restore chain-up' })),
      });
    }).catch((err) => setAlertContext({ message: err.message || 'Could not delete chain-up' }));
  };

  // bound once by Map, so only use e.map, refs and state setters here
  const clickHandler = (e) => {
    if (editingRef.current || creatingRef.current?.panel) { return; }

    // clicking away discards an unconfirmed draft pin
    if (creatingRef.current) {
      e.map.get('draft').getSource().clear();
      setCreating(null);
    }

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

  // menu stays open until a left-click outside it; right-clicks reopen it elsewhere
  useEffect(() => {
    if (!contextMenu.length) { return; }

    const close = (e) => {
      if (e.button === 0 && !menuRef.current?.contains(e.target)) { setContextMenu([]); }
    };

    document.addEventListener('pointerdown', close);
    return () => document.removeEventListener('pointerdown', close);
  }, [contextMenu]);

  // draft pins belong to the chain-up layer
  useEffect(() => {
    if (creating && !creating.panel && selectedLayer !== 'Chain-ups') { finishCreate(null); }
  }, [selectedLayer]);

  // drop selection when filters hide it
  useEffect(() => {
    if (!map || editing) { return; }
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
          <ContextMenu ref={menuRef} options={contextMenu} setContextMenu={setContextMenu} closeOnLeave={false} />

          { editing && tooltip &&
            <EditChainUp
              key={editing.ol_uid}
              map={map}
              feature={editing}
              serviceAreas={serviceAreas}
              tooltip={tooltip}
              onClose={finishEdit} />
          }

          { creating && tooltip &&
            <EditChainUp
              key={creating.feature.ol_uid}
              map={map}
              feature={creating.feature}
              serviceAreas={serviceAreas}
              tooltip={tooltip}
              showPanel={creating.panel}
              onClose={finishCreate} />
          }
        </Map>
      </MapContext.Provider>

      {/* Figma "Delete chain-up": confirm before deleting; shared modal styles */}
      { deleting &&
        <div className='modal-root confirm-delete'>
          <div className='modal-dialog'>
            <div className='modal-backdrop' onClick={() => setDeleting(null)} />
            <div className='modal-outer'>
              <div className='modal-center'>
                <div className='modal-panel' role='dialog' aria-modal='true'>
                  <div className='modal-content'>
                    <div className='modal-header'>
                      <div className='modal-title-container'>
                        <p className='modal-title'>Are you sure you want to delete this Chain-up location?</p>
                      </div>
                    </div>
                  </div>
                  <div className='modal-actions'>
                    <button type='button' className='modal-deactivate-btn' onClick={confirmDelete}>
                      <FontAwesomeIcon icon={faCheckCircle} /> Yes
                    </button>
                    <button type='button' className='modal-cancel-btn' onClick={() => setDeleting(null)}>
                      <FontAwesomeIcon icon={faXmark} /> No
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      }

      { tooltip && chainup && !editing && createPortal(
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
