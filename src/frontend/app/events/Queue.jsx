import { useContext, useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faChevronRight } from '@fortawesome/pro-solid-svg-icons';
import { getPlainIcon } from './icons';

import { AuthContext } from '../contexts';
import { API_HOST, EVENT_POLLING_REFRESH } from '../env';
import { get } from '../shared/helpers';
import { PHRASES_LOOKUP } from './references';
import { selectFeature } from '../components/Map/helpers';
import PollingComponent from '../shared/PollingComponent';

import './Queue.scss';


function Pending({ event, dispatch, goToFunc, map }) {
  const { authContext } = useContext(AuthContext);
  const canReview = authContext?.is_approver || authContext?.is_superuser;

  const nearby = event.location.start.nearby.filter((loc) => loc.include)
  let location = 'Reference location not provided';
  if (nearby.length > 0)
    location = nearby[0].phrase;
  else if (event.location.start.useOther && event.location.start.other) {
    location = event.location.start.other;
  }

  let road = event.location.start.name;
  if (event.location.start.useAlias) {
    road = `${road} (${event.location.start.alias})`
  }

  let request = 'New event';
  if (event.clearing) {
    request = 'Event clearing'
  } else if (event.latest_published_version !== null) {
    request = 'Event update';
  }

  return (
    <div
      className="pending"
      onClick={() => {
        goToFunc(event.location.start.coords)
        dispatch({ type: 'reset form', value: event, showPreview: true, showForm: false });
        selectFeature(map, map.get('events').getSource().get(event.id));
      }}
    >
      <header>{request}&nbsp;requested</header>
      <section className='title'>
        <div className='icon'>
          <img src={getPlainIcon(event)} />
        </div>
        <div className='title'>
          <div className='situation'>
            {PHRASES_LOOKUP[event.details.situation]}&nbsp;-&nbsp;
            {event.details.severity}&nbsp;{event.type}
          </div>
          <div className='id'>{event.id}</div>
        </div>
      </section>
      <section className='location'>{location}</section>
      <section className='road'>{road}</section>

      {canReview && (
        <section className='button'>
          <button
            type='button'
            onClick={(e) => {
              e.stopPropagation();
              dispatch({ type: 'reset form', value: event, showPreview: true, showForm: true });
              goToFunc(event.location.start.coords)
            }}
          >
            Review
            <FontAwesomeIcon icon={faChevronRight} />
          </button>
        </section>
      )}
    </div>
  );
}

export default function Queue({ dispatch, goToFunc, map }) {
  const [ pending, setPending ] = useState([]);

  const pollEvents = async () => {
    const pending = await get(`${API_HOST}/api/events/pending`);
    setPending(pending);
    const bubble = document.getElementById('num-pending');
    if (pending.length > 0) {
      bubble.innerText = pending.length;
      bubble.style.visibility = 'visible';
    } else {
      bubble.innerText = '';
      bubble.style.visibility = 'hidden';
    }
  }


  return (
    <div className='queue'>
      {pending.map((event) => (
        <Pending key={event.id} event={event} dispatch={dispatch} goToFunc={goToFunc} map={map} />
      ))}
      <PollingComponent runnable={pollEvents} interval={EVENT_POLLING_REFRESH || 10000} runImmediately={true}/>
    </div>
  )
}