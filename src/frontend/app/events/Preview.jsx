// React
import React, { useState } from 'react';

// External imports
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { format } from 'date-fns';

// Internal imports
import { desc } from './Schedule';
import { getConditionIcon, getPlainIcon } from './icons';
import { PHRASES_LOOKUP, TrafficImpacts, RoadConditionsLookup } from './references';
import { selectFeature } from '../components/Map/helpers';

// Styling
import './Preview.scss';
import RIDEDropdown from "../components/shared/dropdown.jsx";

const itemsByKey = TrafficImpacts.reduce((acc, curr) => {
  acc[curr.id] = curr;
  return acc;
}, {});

const sd = (date) => date ? format(new Date(date), 'MMM d, y') : '';
const inEffectUntilFormat = (date) => date ? format(new Date(date), "h:mm a 'on' EEE, MMM d, yyyy") : '';

export default function Preview({ event, dispatch, mapRef, segments }) {
  const start = event.location.start || {};
  const end = event.location.end || {};
  const isLinear = !!end.name;
  let startNearbies = start.nearby?.filter((loc) => loc.include).map((loc) => loc.phrase) || [];
  if (start.other && start.useOther) { startNearbies.push(start.other); }
  let endNearbies = (end.nearby || []).filter((loc) => loc.include).map((loc) => loc.phrase) || [];
  if (end.other && end.useOther) { endNearbies.push(end.other); }

  const lastUpdated = event.last_updated ? new Date(event.last_updated) : new Date(Date.now());
  const cleared = event.status === 'Inactive' && (!event.approved || lastUpdated > Date.now() - 60000 * 15);  // TODO: time window move to env variable

  const icon = getPlainIcon(event);
  const nextUpdate = new Date(event?.timing?.nextUpdate);
  const banner = event.approved === false && 'Event awaiting approval';

  // States
  const [selectedSeg, setSelectedSeg] = useState(segments ? segments[0] : null);

  const conditions = (event.conditions || []).map((c) => {
    if (typeof(c) === 'number') {
      return { id: c, label: RoadConditionsLookup[c] };
    }
    return c;
  });
  const isRoadCondition = event.type === 'ROAD_CONDITION';

  return (
    <div className={`preview ${event.details.severity.startsWith("Major") ? 'major' : 'minor'} ${event.status.toLowerCase()} ${cleared ? 'cleared' : ''}`}>
      {segments &&
        <div className={'segments-tab'}>
          <RIDEDropdown
            label={'Preview'}
            extraClasses={`mr-5 user-form`}
            items={segments}
            value={selectedSeg}
            handler={setSelectedSeg} />
        </div>
      }

      <div className="header">
        { banner && <div className="banner">{ banner }</div> }
        <div style={{padding: '1rem'}}>
          <div className="icons">
            <img src={icon} />

            <svg
              className="close"
              onClick={() => {
                if (event.showForm) {
                  dispatch({ type: 'set', value: { showPreview: false } });
                } else {
                  if (mapRef.current) {
                    selectFeature(mapRef.current, null);
                  }
                  dispatch({ type: 'reset form' });
                }
              }}
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 640 640" width="14" height="14" fill="currentColor"
            >
              <path strokeWidth="30" stroke="currentColor" d="M135.5 169C126.1 159.6 126.1 144.4 135.5 135.1C144.9 125.8 160.1 125.7 169.4 135.1L320.4 286.1L471.4 135.1C480.8 125.7 496 125.7 505.3 135.1C514.6 144.5 514.7 159.7 505.3 169L354.3 320L505.3 471C514.7 480.4 514.7 495.6 505.3 504.9C495.9 514.2 480.7 514.3 471.4 504.9L320.4 353.9L169.4 504.9C160 514.3 144.8 514.3 135.5 504.9C126.2 495.5 126.1 480.3 135.5 471L286.5 320L135.5 169z"/>
            </svg>
          </div>
          <h3>{ PHRASES_LOOKUP[event.details.situation] }</h3>

          {isRoadCondition ?
            <p>{conditions[0]?.label || 'Road condition'}</p> :
            <p>{ event.details.severity } {event.type === 'Incident' ? 'incident' : 'delay' }</p>
          }
        </div>
      </div>

      <div className="body">
        {!segments &&
          <h3 className="direction">
            {!isRoadCondition && `${event.details?.direction} on `}
            {start.name}
            {isLinear && end.name !== start.name &&
              <>&nbsp;to {end.name}</>
            }
          </h3>
        }

        {selectedSeg &&
          <div>
            <h3 className="direction">
              {selectedSeg.name}
            </h3>

            <p>
              {selectedSeg.description}
            </p>
          </div>
        }

        { start.useAlias && !isRoadCondition &&
          <p className="direction">
            {start.alias}
            {end.alias && end.useAlias && end.alias !== start.alias &&
              <>&nbsp;to {end.alias}</>
            }
          </p>
        }

        { isLinear ?
          <>
            { (startNearbies.length > 1 || endNearbies.length > 1) ?
              <>
                <p>starts:</p>
                <ul className="unboxed">
                  {startNearbies.map((loc, ii) => <li key={`loc ${ii}`}>{loc}</li>)}
                </ul>
              </> :
              <>{ startNearbies.length === 1 && <p>starts {startNearbies[0]}</p> }</>
            }
            { (startNearbies.length > 1 || endNearbies.length > 1) ?
              <>
                <p>ends:</p>
                <ul className="unboxed">
                  {endNearbies.map((loc, ii) => <li key={`loc ${ii}`}>{loc}</li>)}
                </ul>
              </> :
              <>{ endNearbies.length === 1 && <p>ends {endNearbies[0]}</p> }</>
            }
          </> :
          <>
            { startNearbies?.map((loc, ii) => <p key={`loc ${ii}`}>{loc}</p>) }
          </>
        }

        { event.impacts.length > 0 &&
          <>
            <h5>Traffic Impacts</h5>
            <ul>
              { event.impacts.map((impact, ii) => {
                  return (
                    <li key={'item ' + ii}>
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640" width="20" height="20" fill="currentColor"><path d="M320 112C434.9 112 528 205.1 528 320C528 434.9 434.9 528 320 528C205.1 528 112 434.9 112 320C112 205.1 205.1 112 320 112zM320 576C461.4 576 576 461.4 576 320C576 178.6 461.4 64 320 64C178.6 64 64 178.6 64 320C64 461.4 178.6 576 320 576zM232 296C218.7 296 208 306.7 208 320C208 333.3 218.7 344 232 344L408 344C421.3 344 432 333.3 432 320C432 306.7 421.3 296 408 296L232 296z"/></svg>
                      {impact.label}
                    </li>
                  )
                })
              }
            </ul>
          </>
        }

        { event.type === 'Planned event' &&
          <>
            <h5>In effect</h5>
            <div className="additional">
              <p>
                { event.timing.startTime && `From ${inEffectUntilFormat(event.timing.startTime)}`}

                { event.timing.ongoing
                  ? <p>until further notice</p>
                  : <p>{` ${event.timing.startTime ? 'to' : 'until'} ${inEffectUntilFormat(event.timing.endTime)}`}</p>
                }
              </p>
              <ul className='inner'>
                { event.timing.schedules.map((schedule) => (
                  <li key={schedule.id}>{desc(schedule)}</li>
                ))}
              </ul>
            </div>
          </>
        }

        { event.restrictions.length > 0 &&
          <>
            <h5>Restrictions</h5>
            <ul>
              { event.restrictions.map((restriction, ii) => {
                  return (
                    <li key={'item ' + ii}>
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640" width="20" height="20" fill="currentColor"><path d="M117.4 496L320 120.8L522.6 496L117.4 496zM355.2 85C348.2 72.1 334.7 64 320 64C305.3 64 291.8 72.1 284.8 85L68.8 485C62.1 497.4 62.4 512.4 69.6 524.5C76.8 536.6 89.9 544 104 544L536 544C550.1 544 563.1 536.6 570.4 524.5C577.7 512.4 577.9 497.4 571.2 485L355.2 85zM320 232C306.7 232 296 242.7 296 256L296 368C296 381.3 306.7 392 320 392C333.3 392 344 381.3 344 368L344 256C344 242.7 333.3 232 320 232zM346.7 448C347.3 438.1 342.4 428.7 333.9 423.5C325.4 418.4 314.7 418.4 306.2 423.5C297.7 428.7 292.8 438.1 293.4 448C292.8 457.9 297.7 467.3 306.2 472.5C314.7 477.6 325.4 477.6 333.9 472.5C342.4 467.3 347.3 457.9 346.7 448z"/></svg>
                      {restriction.label}&nbsp;{restriction.text}
                    </li>
                  )
                })
              }
            </ul>
          </>
        }

        { event.delays.amount > 0 &&
          <>
            <h5>Estimated Delay</h5>
            <ul>
              <li>
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640" width="20" height="20" color="currentColor"><path d="M528 320C528 434.9 434.9 528 320 528C205.1 528 112 434.9 112 320C112 205.1 205.1 112 320 112C434.9 112 528 205.1 528 320zM64 320C64 461.4 178.6 576 320 576C461.4 576 576 461.4 576 320C576 178.6 461.4 64 320 64C178.6 64 64 178.6 64 320zM296 184L296 320C296 328 300 335.5 306.7 340L402.7 404C413.7 411.4 428.6 408.4 436 397.3C443.4 386.2 440.4 371.4 429.3 364L344 307.2L344 184C344 170.7 333.3 160 320 160C306.7 160 296 170.7 296 184z"/></svg>
                Expect delays up to {event.delays.amount}&nbsp;{event.delays.unit}
              </li>
            </ul>
          </>
        }

        {conditions.length > 0 &&
          <div className={'conditions'}>
            <h5>Conditions</h5>
            <ul>
              {event.conditions.map((condition, ii) => {
                let id, label;
                if (typeof(condition) === 'number') {
                  id = condition;
                  label = RoadConditionsLookup[condition];
                } else {
                  id = condition.id;
                  label = condition.label;
                }
                return (
                  <li key={'item ' + ii}>
                    <FontAwesomeIcon icon={getConditionIcon(id)} className={'condition-icon'}/>{label}
                  </li>
                );
              })}
            </ul>
          </div>
        }

        { (event.additional || event?.external?.url) &&
          <>
            <h5>{event.type === 'ROAD_CONDITION' ? 'Notes' : 'Additional Information'}</h5>
            { event.additional &&
              <div className="additional">{event.additional}</div>
            }
            { event?.external?.url &&
              <div className="more-info">
                <a href={event.external.url}>
                  More information
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640" width="20" height="20" fill="currentColor"><path d="M352 88C352 101.3 362.7 112 376 112L494.1 112L263.1 343C253.7 352.4 253.7 367.6 263.1 376.9C272.5 386.2 287.7 386.3 297 376.9L528 145.9L528 264C528 277.3 538.7 288 552 288C565.3 288 576 277.3 576 264L576 88C576 74.7 565.3 64 552 64L376 64C362.7 64 352 74.7 352 88zM144 160C99.8 160 64 195.8 64 240L64 496C64 540.2 99.8 576 144 576L400 576C444.2 576 480 540.2 480 496L480 408C480 394.7 469.3 384 456 384C442.7 384 432 394.7 432 408L432 496C432 513.7 417.7 528 400 528L144 528C126.3 528 112 513.7 112 496L112 240C112 222.3 126.3 208 144 208L232 208C245.3 208 256 197.3 256 184C256 170.7 245.3 160 232 160L144 160z"/></svg>
                </a>
              </div>
            }
          </>
        }

        { event.type === 'Incident' && event.timing.endTime &&
          <>
            <h5>In effect until</h5>
            <ul>
              <li>{inEffectUntilFormat(event.timing.endTime)}</li>
            </ul>
          </>
        }

        <div className="timing">
          { !isNaN(lastUpdated) &&
            <div className="time">
              <strong>{event?.status === 'Inactive' ? 'Cleared' : 'Last updated'}</strong><br />
              {lastUpdated.toLocaleString()}
            </div>
          }

          { (event.type === 'Incident' || event.type === 'ROAD_CONDITION') && event?.status !== 'Inactive' &&
            <div className="time">
              <strong>Next update</strong><br />
              {!isNaN(nextUpdate) && nextUpdate.toLocaleString()}
            </div>
          }
        </div>
      </div>

      { event.id &&
        <div className="footer" onClick={() => console.log(event)}>
          Reference ID: { event.id } v{event.version}
        </div>
      }
    </div>
  )
}