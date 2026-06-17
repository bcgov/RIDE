import { useContext } from 'react';
import { useSelector } from 'react-redux';

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faChevronRight } from '@fortawesome/pro-solid-svg-icons';
import { getPlainIcon } from './icons';

import { AuthContext } from '../contexts';
import { PHRASES_LOOKUP } from './references';
import { EventCardLocation } from './EventCardLocation.jsx';
import { selectFeature } from '../components/Map/helpers';

import { selectPending } from '../slices/events';

import './Queue.scss';


function Pending({ event, dispatch, goToFunc, map }) {
  const { authContext } = useContext(AuthContext);
  const canReview = authContext?.is_approver || authContext?.is_superuser;

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

          <div className='id'>{event.id} v{event.version}</div>
        </div>
      </section>
      <EventCardLocation event={event} />

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
  const pending = useSelector(selectPending);
  return (
    <div className='queue'>
      {pending.map((event) => (
        <Pending
          key={`pending-${event.id}v${event.version}`}
          event={event}
          dispatch={dispatch}
          goToFunc={goToFunc}
          map={map}
        />
      ))}
    </div>
  )
}
