import { useCallback, useState } from 'react';

import Tooltip from './Tooltip';

const REF_LOC_TEXT = `Sorted by population class, then by distance.

1. City (> 5,000)
2. District Municipality (> 800 hectares, < 5 people/hectare)
3. Town (< 5,000, inc.)
4. Village (< 2,500, inc.)
5. Community (>50, uninc.)
6. Locality (<50, uninc.)`;

export default function Location({ start, end }) {
  const startName = start?.dra?.ROAD_NAME_FULL;
  const startAliases = [
    start?.dra?.ROAD_NAME_ALIAS1,
    start?.dra?.ROAD_NAME_ALIAS2,
    start?.dra?.ROAD_NAME_ALIAS3,
    start?.dra?.ROAD_NAME_ALIAS4,
  ].filter(el => el);
  const endName = end?.dra?.ROAD_NAME_FULL;
  const endAliases = [
    end?.dra?.ROAD_NAME_ALIAS1,
    end?.dra?.ROAD_NAME_ALIAS2,
    end?.dra?.ROAD_NAME_ALIAS3,
    end?.dra?.ROAD_NAME_ALIAS4,
  ].filter(el => el);

  const [hasEnd, setHasEnd] = useState(false);
  const [startOther, setStartOther] = useState('');
  const [endOther, setEndOther] = useState('');

  const toggleEnding = useCallback((e) => {
    e.preventDefault();
    setHasEnd(!hasEnd);
  }, [hasEnd]);

  const startChange = (e) => {
    if (e.target.value.length <= 100) {
      setStartOther(e.target.value)
    }
  }

  const endChange = (e) => {
    if (e.target.value.length <= 100) {
      setEndOther(e.target.value)
    }
  }

  return <>
    <div className="title">
      <p><strong>Location</strong></p>
      {/* <button onClick={toggleEnding}>
        { hasEnd && end ? 'Remove' : 'Add' } end location
      </button> */}
    </div>

    <div className="toggleable">
      <div className="toggle">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640" height="20" width="20">
          <path fill="black" d="M297.4 470.6C309.9 483.1 330.2 483.1 342.7 470.6L534.7 278.6C547.2 266.1 547.2 245.8 534.7 233.3C522.2 220.8 501.9 220.8 489.4 233.3L320 402.7L150.6 233.4C138.1 220.9 117.8 220.9 105.3 233.4C92.8 245.9 92.8 266.2 105.3 278.7L297.3 470.7z"/>
        </svg>
      </div>

      <div className="toggled">
        <div>{startName}</div>
        <input type="hidden" name="start name" value={startName} />
        <input type="hidden" name="start aliases" value={JSON.stringify(startAliases)} />

        { startAliases.length > 0 &&
          <div>
            <input type="checkbox" name="include start alias" defaultChecked={true} /> Include alias&nbsp;
            { startAliases.length > 1 ?
              <select name="start alias">
                {startAliases.map((a) => <option key={a}>{a}</option>)}
              </select> :
              <input type="text" defaultValue={startAliases[0]} name="start alias" readOnly={true} style={{ border: 'none' }} />
            }
          </div>
        }

        <input type="hidden" name="start nearby options" value={JSON.stringify(start?.nearby)} />
        { start?.nearby?.length > 0 &&
          <div>
            <div>
              Reference Location
              <Tooltip text={REF_LOC_TEXT} />
            </div>
            { start.nearby.map((loc, ii) => (
              <div key={loc.name}>&nbsp;&nbsp;
                <input type="checkbox" name="start nearby" value={ii} defaultChecked={ii === 0} />&nbsp;
                {loc.phrase}
              </div>
            ))}
            <div>&nbsp;&nbsp;
              <input type="checkbox" name='include start other' />&nbsp;
              Other&nbsp;&nbsp;
              <input type="text" name="start other" value={startOther} onChange={startChange} />&nbsp;&nbsp;
              <span className={startOther.length === 100 ? 'bold' : ''}>{startOther.length}/100</span>
            </div>
          </div>
        }

      </div>
    </div>

    { end &&
      <div className="toggleable">
        <div className="toggle">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640" height="20" width="20">
            <path fill="black" d="M297.4 470.6C309.9 483.1 330.2 483.1 342.7 470.6L534.7 278.6C547.2 266.1 547.2 245.8 534.7 233.3C522.2 220.8 501.9 220.8 489.4 233.3L320 402.7L150.6 233.4C138.1 220.9 117.8 220.9 105.3 233.4C92.8 245.9 92.8 266.2 105.3 278.7L297.3 470.7z"/>
          </svg>
        </div>
        <div className="toggled">
          <div>{endName || "place pin on map"}</div>
          <input type="hidden" name="end name" value={endName} />
          <input type="hidden" name="end aliases" value={JSON.stringify(endAliases)} />

          { endAliases.length > 0 &&
            <div>
              <input type="checkbox" name="include end alias" defaultChecked={true} /> Include alias&nbsp;
              { endAliases.length > 1 ?
                <select name="end alias">
                  {endAliases.map((a) => <option key={a}>{a}</option>)}
                </select> :
                <input type="text" defaultValue={endAliases[0]} name="end alias" readOnly={true} style={{ borderWidth: 0 }} />
              }
            </div>
          }

          <input type="hidden" name="end nearby options" value={JSON.stringify(end?.nearby)} />
          { end?.nearby?.length > 0 &&
            <div>
              <div>
                Reference Location
                <Tooltip text={REF_LOC_TEXT} />
              </div>
              { end.nearby.map((loc, ii) => (
                <div key={loc.name}>&nbsp;&nbsp;
                  <input type="checkbox" name='end nearby' value={ii} defaultChecked={ii === 0} />&nbsp;
                  {loc.phrase}
                </div>
              ))}
              <div>&nbsp;&nbsp;
                <input type="checkbox" name='include end other' />&nbsp;
                Other&nbsp;&nbsp;
                <input type="text" name="end other" value={endOther} onChange={endChange} />&nbsp;&nbsp;
                <span className={endOther.length === 100 ? 'bold' : ''}>{endOther.length}/100</span>
              </div>
            </div>
          }

        </div>
      </div>
    }
  </>;
}

