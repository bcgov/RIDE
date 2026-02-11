// React
import React, { useContext, useEffect, useState } from 'react';

// Navigation
import { useNavigate } from "react-router";

// Internal imports
import { AuthContext } from "../contexts";
import { getChainUps } from "../shared/data/chainups";
import { getServiceAreas } from "../shared/data/organizations";
import { getRoutes } from "../shared/data/segments";
import RIDEDropdown from '../components/shared/dropdown';

// External imports
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faClock, faCalendar, faUser } from '@fortawesome/pro-regular-svg-icons';

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
  const { authContext } = useContext(AuthContext);

  // Base states
  const [ chainups, setChainups ] = useState([]);
  const [ serviceAreas, setServiceAreas ] = useState([]);
  const [ routes, setRoutes ] = useState([]);

  // Displaying states
  const [ displayedChainups, setDisplayedChainups ] = useState([]);
  const [ displayedAreas, setDisplayedAreas ] = useState([]);
  const [ displayedRoutes, setDisplayedRoutes ] = useState([]);

  // Selected states
  const [ selectedRoute, setSelectedRoute ] = useState('All roads');
  const [ selectedArea, setSelectedArea ] = useState('All service areas');

  // Effects
  useEffect(() => {
    if (!authContext?.loginStateKnown) { return; }

    if (!authContext.username) {
      navigate('/');
    }
  }, [authContext]);

  useEffect(() => {
    getChainUps().then(data => {
      const ordered = data.sort((a, b) => {
        if (a.route < b.route) return -1;
        if (a.route > b.route) return 1;
        if (a.area < b.area) return -1;
        if (a.area > b.area) return 1;
        if (a.sorting_order < b.sorting_order) return -1;
        if (a.sorting_order >= b.sorting_order) return 1;
      });

      setChainups(ordered);
      setDisplayedChainups(ordered);
    });

    getRoutes().then(data => { setRoutes(data); setDisplayedRoutes(data); });
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

  /* Rendering */
  const FormattedDt = ({date, user, showExpiredWarning}) => {
    if (!date) return null;
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
    <div className='chainups-home p-4'>
      <div className={'toolbar'}>
        <div className={'left'}>
          <span>Filter</span>

          <RIDEDropdown
            label={''}
            extraClasses={'mr-5'}
            items={['All service areas', ...displayedAreas]}
            handler={(area) => setSelectedArea(area)}
            value={selectedArea} />

          <RIDEDropdown
            label={''}
            extraClasses={'mr-5'}
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
                <div className={'chainup-cell'}>{cu.name}</div>
                <div className={'chainup-cell'}>{cu.active ? 'Chain-up in effect' : ''}</div>
                <div className={'chainup-cell'}><FormattedDt date={cu.created} /></div>
                <div className={'chainup-cell'}><FormattedDt date={cu.last_updated} /></div>
                <div className={'chainup-cell'}><FormattedDt date={cu.next_update} showExpiredWarning={true} /></div>
              </div>
            ))}

            {!displayedChainups.length &&
              <div className='empty-search ml-2 mt-4'>No chain-up locations found using current filters.</div>
            }
          </div>
        </div>
      }
    </div>
  );
}
