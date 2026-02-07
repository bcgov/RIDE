// React
import React, { useContext, useEffect, useState } from 'react';

// Navigation
import { useNavigate } from "react-router";

// Internal imports
import { AlertContext, AuthContext } from "../contexts";
import { getChainUps, toggleChainUps, reconfirmChainUps } from "../shared/data/chainups";
import { getServiceAreas } from "../shared/data/organizations";
import { getRoutes } from "../shared/data/segments";
import RIDEDropdown from '../components/shared/dropdown';
import Spinner from "../components/shared/spinner.jsx";
import Preview from "../events/Preview.jsx";

// External imports
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faClock, faCalendar, faUser, faCheck, faToggleOn, faToggleOff, faEye } from '@fortawesome/pro-regular-svg-icons';

// Styling
import './home.scss';

export function meta() {
  return [
    { title: "RIDE Chain-Ups" },
  ];
}

export default function Home() {
  /* Setup */
  const navigate = useNavigate();

  /* Hooks */
  const { setAlertContext } = useContext(AlertContext);
  const { authContext } = useContext(AuthContext);

  // Base states
  const [ chainups, setChainups ] = useState();
  const [ serviceAreas, setServiceAreas ] = useState([]);
  const [ routes, setRoutes ] = useState([]);

  // Displaying states
  const [ displayedChainups, setDisplayedChainups ] = useState();
  const [ displayedAreas, setDisplayedAreas ] = useState([]);
  const [ displayedRoutes, setDisplayedRoutes ] = useState([]);

  // Selected states
  const [ selectedRoute, setSelectedRoute ] = useState('All roads');
  const [ selectedArea, setSelectedArea ] = useState('All service areas');

  // Preview state
  const [ previewChainup, setPreviewChainup ] = useState(null);

  // Effects
  useEffect(() => {
    if (!authContext?.loginStateKnown) { return; }

    if (!authContext.username) {
      navigate('/');
    }
  }, [authContext]);

  useEffect(() => {
    Promise.all([getChainUps(), getRoutes()]).then(([cuData, routeData]) => {
      // Build a map of route ID -> index in the routes API response
      const routeIndex = {};
      routeData.forEach((r, i) => { routeIndex[r.id] = i; });

      // Sort by route order, then area, then sorting_order
      const ordered = cuData.sort((a, b) => {
        const ra = routeIndex[a.route] ?? Infinity;
        const rb = routeIndex[b.route] ?? Infinity;
        if (ra !== rb) return ra - rb;
        if (a.area < b.area) return -1;
        if (a.area > b.area) return 1;
        if (a.sorting_order < b.sorting_order) return -1;
        if (a.sorting_order >= b.sorting_order) return 1;
        return 0;
      });

      setChainups(ordered);
      setDisplayedChainups(ordered);
      setRoutes(routeData);
      setDisplayedRoutes(routeData);
    });

    getServiceAreas().then(data => { setServiceAreas(data); setDisplayedAreas(data); });
  }, []);

  useEffect(() => {
    let filtered = chainups;

    // Filter chainups by route
    if (selectedRoute !== 'All roads') {
      filtered = chainups.filter(cu => cu.route === selectedRoute.id);
    }

    // Filter chainups by area
    if (selectedArea !== 'All service areas') {
      // Include chainups from the selected area and any of its sub-areas
      const areaIds = new Set([selectedArea.id]);
      serviceAreas.forEach(sa => {
        if (sa.parent === selectedArea.id) {
          areaIds.add(sa.id);
        }
      });
      filtered = filtered.filter(cu => areaIds.has(cu.area));
    }

    setDisplayedChainups(filtered);

    // Filter areas based on selected route
    if (selectedRoute !== 'All roads') {
      setDisplayedAreas(serviceAreas.filter(sa => sa.routes && sa.routes.includes(selectedRoute.id)));
    } else {
      setDisplayedAreas(serviceAreas);
    }

    // Filter routes based on selected area
    if (selectedArea !== 'All service areas') {
      // Collect route IDs from selected area and its sub-areas
      const areaRouteIds = new Set();
      serviceAreas.forEach(sa => {
        if (sa.id === selectedArea.id || sa.parent === selectedArea.id) {
          if (sa.routes) {
            sa.routes.forEach(rid => areaRouteIds.add(rid));
          }
        }
      });
      setDisplayedRoutes(routes.filter(r => areaRouteIds.has(r.id)));
    } else {
      setDisplayedRoutes(routes);
    }

  }, [selectedRoute, selectedArea]);

  /* Handlers */
  const updateChainups = (response, message) => {
    if (response.status === 202) {
      const updatedMap = {};
      response.data.forEach(cu => { updatedMap[cu.id] = cu; }); // use ID since UUID will be updated

      const updateList = (list) =>
        list.map(cu => updatedMap[cu.id] ? { ...cu, ...updatedMap[cu.id] } : cu);

      setChainups(prev => updateList(prev));
      setDisplayedChainups(prev => updateList(prev));

      setAlertContext({ message });
    }
  };

  const toggle = (uuid, currentActive) => {
    toggleChainUps([uuid]).then((response) => {
      updateChainups(response, currentActive ? 'Chain-up disabled' : 'Chain-up enabled');
    });
  };

  const reconfirm = (uuid) => {
    reconfirmChainUps([uuid]).then((response) => {
      updateChainups(response, 'Chain-up reconfirmed');
    });
  };

  const getDefaultNextUpdate = () => {
    const newDate = new Date();
    newDate.setDate(newDate.getDate() + 1);
    return newDate;
  }

  const toPreviewEvent = (cu) => {
    return ({
      type: 'CHAIN_UP',
      status: 'Active',
      approved: true,
      last_updated: cu.last_updated,
      location: { start: {}, end: {} },
      details: { severity: 'Minor', situation: 0, direction: '' },
      timing: { nextUpdate: cu.active ? cu.next_update : getDefaultNextUpdate() },
      conditions: [],
      impacts: [],
      restrictions: [],
      delays: { amount: 0 },
      additional: '',
      showForm: false,
      showPreview: true,
      id: cu.id,
      version: cu.version,
      name: cu.name,
      description: cu.description
    });
  };

  const previewDispatch = (action) => {
    if (action.type === 'set' || action.type === 'reset form') {
      setPreviewChainup(null);
    }
  };

  /* Rendering */
  const FormattedDt = ({date, user, showExpiredWarning}) => {
    if (!date) return null;
    if (!user && !showExpiredWarning) return null;

    const dateObj = new Date(date);

    const dateFormatted = dateObj.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });

    const timeFormatted = dateObj.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
      timeZone: 'America/Los_Angeles',
      timeZoneName: 'short'
    });

    const expired = !user && new Date() > dateObj;

    return (
      <div className={`formatted-dt ${(expired && showExpiredWarning)? 'expired' : ''}`}>
        <div className={'dt-row'}>
          <FontAwesomeIcon icon={faClock} aria-hidden="true" />
          {timeFormatted}
        </div>

        <div className={'dt-row'}>
          <FontAwesomeIcon icon={faCalendar} aria-hidden="true" />
          {dateFormatted}
        </div>

        {user &&
          <div className={'dt-row'}>
            <FontAwesomeIcon icon={faUser} aria-hidden="true" />
            {user.first_name}
          </div>
        }
      </div>
    );
  };

  const columns = [
    'Segments',
    'Current chain-up',
    'First reported',
    'Last updated',
    'Next update',
  ];

  return (
    <div className='chainups-home'>
      <div className={'toolbar'}>
        <div className={'left'}>
          <span>Filter</span>

          <RIDEDropdown
            label={''}
            extraClasses={'extra-margin-right'}
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

      {displayedChainups &&
        <div className={'chainups-table'}>
          {/* Header row */}
          <div className='header-row'>
            {columns.map((col, index) => (
              <div key={index} className='header'>
                {col}
              </div>
            ))}
          </div>

          <div className={'chainups-rows'}>
            {!!displayedChainups.length && displayedChainups.map((cu) => (
              <div key={cu.uuid} className='chainup-row'>
                <div className={'chainup-cell main-cell'}>
                  <div className={'name'}>{cu.name}</div>
                    <div className={'action-row'}>
                      <div className={'action'} onClick={() => toggle(cu.uuid, cu.active)}>
                        <FontAwesomeIcon icon={cu.active ? faToggleOn : faToggleOff} aria-hidden="true" />
                        {`${cu.active ? 'Disable' : 'Enable'} chain-up`}
                      </div>

                      <div className={'action'} onClick={() => setPreviewChainup(cu)}>
                        <FontAwesomeIcon icon={faEye} aria-hidden="true" />
                        Preview
                      </div>

                      {cu.active &&
                        <div className={'action'} onClick={() => reconfirm(cu.uuid)}>
                          <FontAwesomeIcon icon={faCheck} aria-hidden="true" />
                          Reconfirm
                        </div>
                      }
                    </div>
                </div>
                <div className={'chainup-cell'}>{cu.active ? 'Chain-up in effect' : ''}</div>
                <div className={'chainup-cell'}>{cu.user && <FormattedDt date={cu.first_reported.date} user={cu.first_reported.user} />}</div>
                <div className={'chainup-cell'}><FormattedDt date={cu.last_updated} user={cu.user} /></div>
                <div className={'chainup-cell'}><FormattedDt date={cu.next_update} showExpiredWarning={true} /></div>
              </div>
            ))}

            {!displayedChainups.length &&
              <div className='empty-search'>No chain-up locations found using current filters.</div>
            }
          </div>
        </div>
      }

      {!displayedChainups &&
        <Spinner />
      }

      {previewChainup && (
        <>
          <div className={'preview-backdrop'} onClick={() => setPreviewChainup(null)} />
          <div className={'preview-panel'}>
            <Preview
              event={toPreviewEvent(previewChainup)}
              dispatch={previewDispatch}
              mapRef={{current: null}}
            />
          </div>
        </>
      )}
    </div>
  );
}
