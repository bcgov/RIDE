// React
import React, { useContext, useEffect, useReducer, useState } from 'react';

// Navigation
import { useNavigate } from "react-router";

// Internal imports
import { AlertContext, AuthContext } from "../contexts";
import { clearRcs, confirmRcs, getRcs } from "../shared/data/roadConditions";
import { getServiceAreas } from "../shared/data/organizations";
import { getSegments, getRoutes } from "../shared/data/segments";
import { RoadConditions } from "../events/references";
import { eventReducer, getInitialEvent } from '../events/forms';
import RIDEDropdown from '../components/shared/dropdown';
import Preview from '../events/Preview';

// External imports
import { Checkbox } from "@headlessui/react";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faClock, faCalendar, faUser, faTrashCan, faCheck, faCheckCircle, faXmark} from '@fortawesome/pro-regular-svg-icons';

// Styling
import './home.scss';
import '../components/shared/checkbox.scss'
import RIDECheckBoxes from "../components/shared/checkboxes.jsx";
import RcsForm, { getInitialRc } from "./forms.jsx";

export function meta() {
  return [
    { title: "RIDE Road Conditions" },
  ];
}

export default function Home() {
  /* Setup */
  // Navigation
  const navigate = useNavigate();

  /* Hooks */
  // Context
  const { setAlertContext } = useContext(AlertContext);
  const { authContext } = useContext(AuthContext);

  // States
  const [ segments, setSegments ] = useState();
  const [ displayedSegments, setDisplayedSegments ] = useState()
  const [ serviceAreas, setServiceAreas ] = useState([]);
  const [ routes, setRoutes ] = useState([]);
  const [ selectedRoute, setSelectedRoute ] = useState('All roads');
  const [ selectedArea, setSelectedArea ] = useState('All service areas');
  const [ rcsMap, setRcsMap ] = useState({});

  // Segment selection states
  const [ checkedSegs, setCheckedSegs ] = useState([]);
  const [ showBulkBtns, setShowBulkBtns ] = useState(false);

  // Conditions selection states
  const [ checkedConditions, setCheckedConditions ] = useState([]);

  // Side panel state for event form
  const [ showEventPanel, setShowEventPanel ] = useState(false);

  const initialEvent = getInitialEvent();
  initialEvent.type = 'ROAD_CONDITION';
  const [ event, dispatch ] = useReducer(eventReducer, initialEvent);

  // Effects
  useEffect(() => {
    if (!authContext?.loginStateKnown) { return; }

    if (!authContext.username) {
      navigate('/');
    }
  }, [authContext]);

  useEffect(() => {
    getSegments().then(data => {
      // order by route, then sorting_order
      const orderedSegs = data.sort((a, b) => {
        if (a.route < b.route) return -1;
        if (a.route > b.route) return 1;
        if (a.sorting_order < b.sorting_order) return -1;
        if (a.sorting_order >= b.sorting_order) return 1;
      });

      setSegments(orderedSegs);
      setDisplayedSegments(orderedSegs);
    });

    getRoutes().then(data => setRoutes(data));
    getServiceAreas().then(data => setServiceAreas(data));
    getRcs().then(data => {
      const newRcsMap = {};
      data.forEach(rc => {
        newRcsMap[rc.segment] = rc;
      });

      setRcsMap(newRcsMap);
    });
  }, []);

  useEffect(() => {
    let filteredSegs = segments;

    // filter segments by route
    if (selectedRoute !== 'All roads') {
      filteredSegs = segments.filter(seg => seg.route === selectedRoute.id);
    }

    // filter segments by area
    if (selectedArea !== 'All service areas') {
      filteredSegs = filteredSegs.filter(seg => seg.areas.includes(selectedArea.id));
    }

    setDisplayedSegments(filteredSegs);
  }, [selectedRoute, selectedArea]);

  /* Handlers */
  const clearConditions = (segPks) => {
    const payload = segPks.filter(pk => pk in rcsMap);
    clearRcs(payload).then((response) => {
      if (response.status === 202) {
        // Update road conditions map
        const newRcsMap = { ...rcsMap };
        response.data.forEach(rc => {
          newRcsMap[rc.segment] = rc;
        });
        setRcsMap(newRcsMap);

        // Send alert
        setAlertContext({
          message: payload.length === 1 ?
            `Segment road conditions cleared` :
            `Road conditions cleared for ${payload.length} segments`
        });

        // Reset checked segments if bulk action
        if (segPks.length > 1) {
          setCheckedSegs([]);
        }
      }
    });
  }

  const reconfirmConditions = (segPks) => {
    const payload = segPks.filter(pk => pk in rcsMap);
    confirmRcs(payload).then((response) => {
      if (response.status === 202) {
        // Update road conditions map
        const newRcsMap = { ...rcsMap };
        response.data.forEach(rc => {
          newRcsMap[rc.segment] = rc;
        });
        setRcsMap(newRcsMap);

        // Send alert
        setAlertContext({
          message: payload.length === 1 ?
            `Segment road conditions reconfirmed` :
            `Road conditions reconfirmed for ${payload.length} segments`
        });

        // Reset checked segments if bulk action
        if (segPks.length > 1) {
          setCheckedSegs([]);
        }
      }
    });
  }

  const bulkUpdateCallback = (response) => {
    // Update road conditions map
    const newRcsMap = {...rcsMap};
    response.data.forEach(rc => {
      newRcsMap[rc.segment] = rc;
    });
    setRcsMap(newRcsMap);

    // Send alert
    const message = checkedSegs.length === 1
      ? `Road conditions updated for 1 segment`
      : `Road conditions updated for ${checkedSegs.length} segments`;
    setAlertContext({ message });

    // Reset checked segments, conditions, form
    setCheckedSegs([]);
    setCheckedConditions([]);
    dispatch({ type: 'reset form', cancel: true });
    setShowEventPanel(false);
  }

  /* Rendering */
  // Sub-components
  const MainSegmentCell = ({ seg, event }) => {
    return (
      <div className={'segment-cell main-cell'}>
        <div className={'title-row'}>
          <Checkbox
            className="checkbox-container"
            checked={checkedSegs.includes(seg.uuid)}
            onChange={(checked) => {
              let newChecked = [...checkedSegs];

              if (checked) {
                newChecked.push(seg.uuid);

              } else {
                newChecked = newChecked.filter((id) => id !== seg.uuid);
              }

              setCheckedSegs(newChecked);

              const hasCheckedRcs = newChecked.length > 0 &&
                newChecked.some(segUuid => rcsMap[segUuid] && rcsMap[segUuid].status === 'Active');
              setShowBulkBtns(hasCheckedRcs);
            }}>
            <div className={'checkbox'}></div>
            <div className={'checkbox-label'}>{seg.name}</div>
          </Checkbox>
        </div>

        {event && event.status === 'Active' &&
          <div className={'action-row'}>
            <div className={'action'} onClick={() => clearConditions([seg.uuid])}>
              <FontAwesomeIcon icon={faTrashCan} aria-hidden="true" />
              Clear conditions
            </div>
            <div className={'action'} onClick={() => reconfirmConditions([seg.uuid])}>
              <FontAwesomeIcon icon={faCheck} aria-hidden="true" />
              Reconfirm conditions
            </div>
          </div>
        }
      </div>
    )
  }

  const FormattedDt = ({date, user}) => {
    const dateObj = new Date(date);

    // Day, Month Day, Year
    const dateFormatted = dateObj.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    }); // e.g., "Tue, Jan 6, 2026"

    // Hour:Minute am/pm TZ
    const timeFormatted = dateObj.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
      timeZone: 'America/Los_Angeles',
      timeZoneName: 'short'
    }).replace('GMT', 'PST'); // e.g., "4:28 pm PST"

    const expired = !user && new Date() > dateObj;

    return (
      <div className={`formatted-dt ${expired ? 'expired' : ''}`}>
        <div className={'dt-row'}>
          <FontAwesomeIcon icon={faClock} aria-hidden="true" className="" />
          {timeFormatted}
        </div>

        <div className={'dt-row'}>
          <FontAwesomeIcon icon={faCalendar} aria-hidden="true" className="" />
          {dateFormatted}
        </div>

        {user ?
          <div className={'dt-row'}>
            <FontAwesomeIcon icon={faUser} aria-hidden="true" className="" />
            {user.first_name}
          </div> : <div className={'dt-row'} />
        }
      </div>
    )
  };

  const ConditionsPanel = () => {
    return (
      <div className={'conditions-panel'}>
        <div className={'header-bar'}>
          <div className={'label'}>Update conditions</div>
          <div className={'unselect-btn'} onClick={() => setCheckedConditions([])}>Unselect all</div>
        </div>

        <RIDECheckBoxes
          label={''}
          itemsList={RoadConditions.map((condition) => { return { id: condition.id, name: condition.label }; })}
          extraClasses={''}
          itemsState={checkedConditions}
          setItemsState={setCheckedConditions} />

        <div className={'footer-bar'}>
          <div 
            className={`apply-btn ${checkedConditions.length === 0 ? 'disabled' : ''}`} 
            onClick={() => {
              if (checkedConditions.length > 0) {
                // Initialize event with selected conditions
                const initialEvent = getInitialRc();

                // Convert selected condition IDs to condition objects with id and label
                const conditions = checkedConditions.map(conditionId => {
                  const condition = RoadConditions.find(c => c.id === conditionId);
                  return condition ? { id: condition.id, label: condition.label } : null;
                }).filter(Boolean);

                initialEvent.conditions = conditions;
                
                dispatch({ type: 'reset form', value: initialEvent, showPreview: true, showForm: true });
                setShowEventPanel(true);
              }
            }}>
            <FontAwesomeIcon icon={faCheckCircle} aria-hidden={'true'} />
            Apply to {checkedSegs.length} segments
          </div>
          <div className={'cancel-btn'} onClick={() => setCheckedSegs([])}>
            <FontAwesomeIcon icon={faXmark} aria-hidden={'true'} />
            Cancel
          </div>
        </div>
      </div>
    );
  }

  // Main Component
  const columns = [
    'Segments',
    'Current conditions',
    'Reference',
    'First reported',
    'Last updated',
    'Next update'
  ]

  return (
    <div className='segments-home p-4'>
      <div className={'toolbar'}>
        <div className={'left'}>
          <span>Filter</span>

          <RIDEDropdown
            label={''}
            extraClasses={'mr-5'}
            items={['All service areas', ...serviceAreas]}
            handler={(area) => setSelectedArea(area)}
            value={selectedArea} />

          <RIDEDropdown
            label={''}
            extraClasses={'mr-5'}
            items={['All roads', ...routes]}
            handler={(route) => setSelectedRoute(route)}
            value={selectedRoute} />
        </div>

        <div className={'right'}>
        </div>
      </div>

      {checkedSegs.length > 0 &&
        <ConditionsPanel />
      }

      {checkedSegs.length > 0 ?
        <div className={'select-bar'}>
          <div className={'count'}>{checkedSegs.length} selected</div>

          {showBulkBtns &&
            <>
              <div className={'select-btn'} onClick={() => clearConditions(checkedSegs)}>Clear selected</div>
              <div className={'select-btn'} onClick={() => reconfirmConditions(checkedSegs)}>Reconfirm selected</div>
            </>
          }
        </div> :

        <div className={'select-bar no-select'}>
          No segments selected
        </div>
      }

      {showEventPanel && (
        <>
          <div className={'event-panel-backdrop'} />

          <div className={'event-side-panel'}>
            <div className={'panel-content'}>
              {event.showPreview &&
                <div className={'panel-preview'}>
                  <Preview
                    event={event}
                    dispatch={dispatch}
                    mapRef={{current: null}}
                    segments={segments.filter((seg) => checkedSegs.includes(seg.uuid))}
                  />
                </div>
              }

              <div className={'panel-form'}>
                <RcsForm
                  segPks={checkedSegs}
                  preview={() => dispatch({ type: 'set', value: { showPreview: !event.showPreview } })}
                  cancel={() => {
                    dispatch({ type: 'reset form', cancel: true });
                    setShowEventPanel(false);
                  }}
                  event={event}
                  dispatch={dispatch}
                  callback={bulkUpdateCallback} />
              </div>
            </div>
          </div>
        </>
      )}

      {displayedSegments &&
        <div className={'segments-table'}>
          {/* Header row */}
          <div className='header-row'>
            {columns.map((row, index) => (
              <div key={index} className='header'>
                {row}
              </div>
            ))}
          </div>

          {/* Data columns */}
          {!!displayedSegments.length && displayedSegments.map((seg) => {
            const event = rcsMap[seg.uuid];

            return (
              <div key={seg.uuid} className='segment-row'>
                <MainSegmentCell event={event} seg={seg} />
                <div className={'segment-cell'}>{event && event.status === 'Active' && event.conditions.map(c => <p key={c}>{c}</p>)}</div>
                <div className={'segment-cell'}>{event && event.status === 'Active' && event.id}</div>
                <div className={'segment-cell'}>{event && event.status === 'Active' && <FormattedDt date={event.first_reported.date} user={event.first_reported.user} />}</div>
                <div className={'segment-cell'}>{event && <FormattedDt date={event.last_updated} user={event.user} />}</div>
                <div className={'segment-cell'}>{event && event.status === 'Active' && <FormattedDt date={event.timing.nextUpdate} />}</div>
              </div>
            );
          })}

          {/* Data columns */}
          {!displayedSegments.length &&
            <div className='empty-search ml-2 mt-4'>No segments found using current filters.</div>
          }
        </div>
      }
    </div>
  );
}
