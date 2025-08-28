import { useCallback, useState } from 'react';
import Skeleton from 'react-loading-skeleton';
import "react-loading-skeleton/dist/skeleton.css";

import Tooltip from './Tooltip';

const REF_LOC_TEXT = `Sorted by population class, then by distance.

1. City (> 5,000)
2. District Municipality (> 800 hectares, < 5 people/hectare)
3. Town (< 5,000, inc.)
4. Village (< 2,500, inc.)
5. Community (>50, uninc.)
6. Locality (<50, uninc.)`;

export default function Location({ event, dispatch, goToFunc }) {
  const start = event.location.start;
  const end = event.location.end;

  const [startOther, setStartOther] = useState(start?.other);
  const [endOther, setEndOther] = useState(end?.other || '');

  const startChange = (e) => {
    if (e.target.value.length <= 100) { setStartOther(e.target.value); }
  }

  const endChange = (e) => {
    if (e.target.value.length <= 100) { setEndOther(e.target.value); }
  }

  return <>
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

    <div className="toggleable">
      <div className="toggle">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640" width="20" height="20"
          className="fold"
          onClick={(e) => { e.target.parentNode.parentNode.classList.toggle('folded'); }}
        >
          <path fill="currentColor" d="M297.4 470.6C309.9 483.1 330.2 483.1 342.7 470.6L534.7 278.6C547.2 266.1 547.2 245.8 534.7 233.3C522.2 220.8 501.9 220.8 489.4 233.3L320 402.7L150.6 233.4C138.1 220.9 117.8 220.9 105.3 233.4C92.8 245.9 92.8 266.2 105.3 278.7L297.3 470.7z"/>
        </svg>
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640" width="20" height="20"
          className="unfold"
          onClick={(e) => { e.target.parentNode.parentNode.classList.toggle('folded'); }}
        >
        <path fill="currentColor" d="M471.1 297.4C483.6 309.9 483.6 330.2 471.1 342.7L279.1 534.7C266.6 547.2 246.3 547.2 233.8 534.7C221.3 522.2 221.3 501.9 233.8 489.4L403.2 320L233.9 150.6C221.4 138.1 221.4 117.8 233.9 105.3C246.4 92.8 266.7 92.8 279.2 105.3L471.2 297.3z"/></svg>
      </div>

      <div className="toggled">
        <div>
          { start?.name || 'Greenfield'}&nbsp;&nbsp;
          <Tooltip text="Center start pin">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640" width="20" height="20" className="go-to" color="currentColor" onClick={(e) => goToFunc(start?.coords)}>
              <path fill="currentColor" d="M528 320C528 205.1 434.9 112 320 112C205.1 112 112 205.1 112 320C112 434.9 205.1 528 320 528C434.9 528 528 434.9 528 320zM64 320C64 178.6 178.6 64 320 64C461.4 64 576 178.6 576 320C576 461.4 461.4 576 320 576C178.6 576 64 461.4 64 320zM422.2 246.7L338.2 442.7C334.7 450.8 326.8 456 318 456C316.6 456 315.1 455.9 313.6 455.6C303.4 453.5 296 444.4 296 434L296 344L206 344C195.6 344 186.5 336.6 184.5 326.4C182.4 316.2 187.8 305.9 197.4 301.8L393.4 217.8C401.9 214.3 411.4 216.1 417.6 222.5C424 228.8 425.8 238.4 422.3 246.7z"/>
            </svg>
          </Tooltip>
        </div>

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
              </select> :
              <input type="text" defaultValue={start.aliases[0]} name="start alias" readOnly={true} style={{ border: 'none' }} />
            }
          </div>
        }

        { !start?.nearby && start?.name && <Skeleton width={120} height={20} />}
        { start?.nearby?.length > 0 &&
          <div>
            <div>
              Reference Location
              <Tooltip text={REF_LOC_TEXT} />
            </div>
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
          </div>
        }

      </div>
    </div>

    { end?.name &&
      <div className="toggleable">
        <div className="toggle">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640" width="20" height="20"
            className="fold"
            onClick={(e) => { e.target.parentNode.parentNode.classList.toggle('folded'); }}
          >
            <path fill="currentColor" d="M297.4 470.6C309.9 483.1 330.2 483.1 342.7 470.6L534.7 278.6C547.2 266.1 547.2 245.8 534.7 233.3C522.2 220.8 501.9 220.8 489.4 233.3L320 402.7L150.6 233.4C138.1 220.9 117.8 220.9 105.3 233.4C92.8 245.9 92.8 266.2 105.3 278.7L297.3 470.7z"/>
          </svg>

          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640" width="20" height="20"
            className="unfold"
            onClick={(e) => { e.target.parentNode.parentNode.classList.toggle('folded'); }}
          >
            <path fill="currentColor" d="M471.1 297.4C483.6 309.9 483.6 330.2 471.1 342.7L279.1 534.7C266.6 547.2 246.3 547.2 233.8 534.7C221.3 522.2 221.3 501.9 233.8 489.4L403.2 320L233.9 150.6C221.4 138.1 221.4 117.8 233.9 105.3C246.4 92.8 266.7 92.8 279.2 105.3L471.2 297.3z"/>
          </svg>
        </div>

        <div className="toggled">
          <div>{end?.name}&nbsp;
            <Tooltip text="Center end pin">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640" width="20" height="20" className="go-to" color="currentColor" onClick={(e) => goToFunc(end?.coords)}>
                <path d="M528 320C528 205.1 434.9 112 320 112C205.1 112 112 205.1 112 320C112 434.9 205.1 528 320 528C434.9 528 528 434.9 528 320zM64 320C64 178.6 178.6 64 320 64C461.4 64 576 178.6 576 320C576 461.4 461.4 576 320 576C178.6 576 64 461.4 64 320zM422.2 246.7L338.2 442.7C334.7 450.8 326.8 456 318 456C316.6 456 315.1 455.9 313.6 455.6C303.4 453.5 296 444.4 296 434L296 344L206 344C195.6 344 186.5 336.6 184.5 326.4C182.4 316.2 187.8 305.9 197.4 301.8L393.4 217.8C401.9 214.3 411.4 216.1 417.6 222.5C424 228.8 425.8 238.4 422.3 246.7z"/>
              </svg>
            </Tooltip>
          </div>

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

          { end?.nearby?.length > 0 &&
            <div>
              <div>
                Reference Location
                <Tooltip text={REF_LOC_TEXT} />
              </div>
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
            </div>
          }

        </div>
      </div>
    }
  </>;
}

