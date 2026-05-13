import { useSelector } from 'react-redux';

import { selectServiceAreaById } from '../slices/serviceAreas';

import './EventCardLocation.scss';

function eventCardNearbyStrings(event) {
  let startNearby = event.location.start?.nearby?.[0];
  let endNearby = event.location.end?.nearby?.[0];

  if (startNearby) {
    if (startNearby.source !== 'municipalities') {
      startNearby = `starts ${startNearby.phrase}`;
    } else {
      startNearby = startNearby.phrase;
    }
  }
  if (endNearby) {
    const startCmp =
      typeof startNearby === 'string'
        ? startNearby
        : (startNearby?.phrase ?? '');
    if (endNearby.phrase.toLowerCase() === startCmp.toLowerCase()) {
      endNearby = null;
    } else {
      endNearby = `ends ${endNearby.phrase}`;
    }
    if (
      endNearby &&
      typeof startNearby === 'string' &&
      !startNearby.startsWith('starts')
    ) {
      startNearby = `starts ${startNearby}`;
    }
  }

  return { startNearby, endNearby };
}

/** Road, reference lines, and service area for event list cards (Active, Awaiting Approval). */
export function EventCardLocation({ event }) {
  const area = useSelector((state) =>
    selectServiceAreaById(state, event.service_area),
  );
  const { startNearby, endNearby } = eventCardNearbyStrings(event);

  return (
    <div className='event-card-place'>
      <div className='location'>
        <div className='location-name'>
          {event.location.start?.name}
          {event.location.start?.useAlias && event.location.start.alias && <>&nbsp;({event.location.start.alias})</>}
        </div>

        {startNearby && <div>{startNearby}</div>}
        {endNearby && <div>{endNearby}</div>}
      </div>

      {area && (
        <div className='service-area'>
          {area.name} ({area.sortingOrder})
        </div>
      )}
    </div>
  );
}
