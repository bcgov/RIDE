import Skeleton from 'react-loading-skeleton';
import "react-loading-skeleton/dist/skeleton.css";

import './InfoBox.css';

const classify = (text) => text.replace(/[()0-9]/g, '').trim().replace(/\s/g, '-').toLowerCase();

export default function InfoBox({ className, point, ref }) {
    let streetName = point?.ROAD_NAME_FULL;
    if (!streetName) {
      streetName = point?.ROAD_CLASS;
    }
    const alias = point?.ROAD_NAME_ALIAS1;

  return (
    <div className={`infobox ${className} ${ point?.name && 'open' }`} ref={ref}>
      <div className="road-name">
        { point?.pending
          ? <div className="pending"><Skeleton width={120} height={20} /></div>
          : <span>
              {streetName}
              { alias && <span className="alias">&nbsp;({alias})</span> }
            </span>
        }
      </div>
      { point?.nearbyPending
        ? <div className="pending"><Skeleton width={120} height={20} /></div>
        : point?.nearby?.map((nearby, ii) => (
            <div key={`near-${ii}`} className={`near ${classify(nearby.type)}`}>{nearby.phrase}</div>
          ))
      }
    </div>
  )
}
