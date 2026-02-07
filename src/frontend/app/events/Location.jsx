import { useCallback, useState } from 'react';
import Skeleton from 'react-loading-skeleton';
import "react-loading-skeleton/dist/skeleton.css";

import pinStart from '../../public/pin-start.svg';
import pinEnd from '../../public/pin-end.svg';

import Tooltip from './Tooltip';

const REF_LOC_TEXT = `Sorted by population class, then by distance.

1. City (> 5,000)
2. District Municipality (> 800 hectares, < 5 people/hectare)
3. Town (< 5,000, inc.)
4. Village (< 2,500, inc.)
5. Community (>50, uninc.)
6. Locality (<50, uninc.)`;

export default function Location({ errors, event, dispatch, goToFunc }) {
  const start = event.location.start;
  const end = event.location.end;

  const [startOther, setStartOther] = useState(start?.other);
  const [endOther, setEndOther] = useState(end?.other || '');

  const startChange = (e) => setStartOther(e.target.value.substring(0, 100));
  const endChange = (e) => setEndOther(e.target.value.substring(0, 100));

  if (event.segment) {
    return (
      <div>
        <p><strong>Segment</strong></p>
        <p>{event.location.start.name}</p>
      </div>
    );
  }

  return <>
    <div className={`title ${(errors['End location'] && !end?.name) ? 'error' : ''}`}>
      <div>
        <strong>Location</strong>&nbsp;&nbsp;
        <Tooltip text="Zoom to include all points">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640" width="20" height="20"
            className="go-to"
            onClick={(e) => goToFunc([start?.coords, end?.coords])}
          >
            <path fill="currentColor" d="M320 48C333.3 48 344 58.7 344 72L344 97.3C448.5 108.4 531.6 191.5 542.7 296L568 296C581.3 296 592 306.7 592 320C592 333.3 581.3 344 568 344L542.7 344C531.6 448.5 448.5 531.6 344 542.7L344 568C344 581.3 333.3 592 320 592C306.7 592 296 581.3 296 568L296 542.7C191.5 531.6 108.4 448.5 97.3 344L72 344C58.7 344 48 333.3 48 320C48 306.7 58.7 296 72 296L97.3 296C108.4 191.5 191.5 108.4 296 97.3L296 72C296 58.7 306.7 48 320 48zM496 320C496 222.8 417.2 144 320 144C222.8 144 144 222.8 144 320C144 417.2 222.8 496 320 496C417.2 496 496 417.2 496 320zM384 320C384 284.7 355.3 256 320 256C284.7 256 256 284.7 256 320C256 355.3 284.7 384 320 384C355.3 384 384 355.3 384 320zM208 320C208 258.1 258.1 208 320 208C381.9 208 432 258.1 432 320C432 381.9 381.9 432 320 432C258.1 432 208 381.9 208 320z"/>
          </svg>
        </Tooltip>
      </div>
    </div>

    <div className="toggleable">
      <div className="toggle">
        <Tooltip text="Center start pin">
          <img
            src={pinStart}
            style={{ width: '20px' }}
            onClick={(e) => goToFunc(start?.coords)}
          />
        </Tooltip>
      </div>

      <div className="toggled">
        <div>{ start?.name || 'Greenfield'}</div>

        { start?.aliases.length > 0 &&
          <div>
            <input
              type="checkbox"
              name="include start alias"
              defaultChecked={event.location.start.useAlias}
              onChange={(e) => dispatch({ type: 'toggle alias', key: 'start', value: e.target.checked })}
            /> Include alias&nbsp;

            { start?.aliases.length > 1 ?
              <select
                name="start alias"
                onChange={(e) => dispatch({ type: 'set alias', key: 'start', value: e.target.value })}
              >
                {start?.aliases.map((a) => <option key={a}>{a}</option>)}
              </select> : start.aliases[0]
            }
          </div>
        }

          <div>
            <div>
              Reference Location
              &nbsp;<Tooltip text={REF_LOC_TEXT} />
            </div>
          { !start?.nearby && start?.name && <Skeleton width={250} height={20} />}
          { start?.nearby?.length > 0 && <>
            { start.nearby.map((loc, ii) => (
              <div key={loc.name}>&nbsp;&nbsp;
                <input
                  type="checkbox"
                  name="start nearby"
                  value={ii}
                  defaultChecked={loc.include}
                  onChange={(e) => {
                    dispatch({ type: 'toggle checked', key: 'start', value: ii, checked: loc.include})
                  }}
                />&nbsp;
                {loc.phrase}
              </div>
            ))}
            <div>&nbsp;&nbsp;
              <input type="checkbox"
                name='include start other'
                defaultChecked={start.useOther}
                onChange={(e) => {
                  dispatch({ type: 'toggle other', key: 'start', checked: start.useOther})
                }}
              />&nbsp;
              Other&nbsp;&nbsp;
              <input
                type="text"
                name="start other"
                value={startOther || ''}
                onChange={startChange}
                onBlur={(e) => {
                  dispatch({ type: 'set other', key: 'start', value: e.target.value})
                }}
              />&nbsp;&nbsp;
              <span className={startOther?.length === 100 ? 'bold' : ''}>{startOther?.length}/100</span>
            </div>
          </>
        }
        </div>

      </div>
    </div>

    { errors['End location'] && !end?.name &&
      <div className="toggleable">
        <div className="toggle">
          <Tooltip text="Center end pin">
            <img
              src={pinEnd}
              style={{ width: '20px' }}
              onClick={(e) => goToFunc(end?.coords)}
            />
          </Tooltip>
        </div>

        <div className="title error">
          <p>{errors['End location']}</p>
        </div>
      </div>
    }

    { end?.name &&
      <div className="toggleable">
        <div className="toggle">
          <Tooltip text="Center end pin">
            <img
              src={pinEnd}
              style={{ width: '20px' }}
              onClick={(e) => goToFunc(end?.coords)}
            />
          </Tooltip>
        </div>

        <div className="toggled">
          <div>{end?.name}</div>

          { end?.aliases.length > 0 &&
            <div>
              <input
                type="checkbox"
                name="include end alias"
                defaultChecked={event.location.end.useAlias}
                onChange={(e) => dispatch({ type: 'toggle alias', key: 'end', value: e.target.checked })}
              /> Include alias&nbsp;
              { end?.aliases.length > 1 ?
                <select name="end alias">
                  {end?.aliases.map((a) => <option key={a}>{a}</option>)}
                </select> :
                <input type="text" defaultValue={end?.aliases[0]} name="end alias" readOnly={true} style={{ borderWidth: 0 }} />
              }
            </div>
          }

            <div>
              <div>
                Reference Location
                &nbsp;<Tooltip text={REF_LOC_TEXT} />
              </div>
          { !end?.nearby && end?.name && <Skeleton width={250} height={20} />}
          { end?.nearby?.length > 0 && <>
              { end.nearby.map((loc, ii) => (
                <div key={loc.name}>&nbsp;&nbsp;
                  <input
                    type="checkbox"
                    name='end nearby'
                    value={ii}
                    defaultChecked={loc.include}
                    onChange={(e) => {
                      dispatch({ type: 'toggle checked', key: 'end', value: ii, checked: loc.include})
                    }}
                  />&nbsp;
                  {loc.phrase}
                </div>
              ))}
              <div>&nbsp;&nbsp;
                <input
                  type="checkbox"
                  name='include end other'
                  defaultChecked={end.useOther}
                  onChange={(e) => {
                    dispatch({ type: 'toggle other', key: 'end', checked: end.useOther})
                  }}
                />&nbsp;
                Other&nbsp;&nbsp;
                <input
                  type="text"
                  name="end other"
                  value={endOther || ''}
                  onChange={endChange}
                  onBlur={(e) => {
                    dispatch({ type: 'set other', key: 'end', value: e.target.value})
                  }}
                />&nbsp;&nbsp;
                <span className={endOther.length === 100 ? 'bold' : ''}>{endOther.length}/100</span>
              </div>
            </>
            }
            </div>

        </div>
      </div>
    }
  </>;
}

