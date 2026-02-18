import { useEffect, useState } from 'react';

import { API_HOST } from '../../env';
import { get } from '../../shared/helpers';

import Version from './Version';

import './History.scss';

export default function History({ event, dispatch }) {

  const [history, setHistory] = useState();
  const [selectedVersion, setSelectedVersion] = useState(0);

  useEffect(() => {
    get(`${API_HOST}/api/events/${event.id}/history`)
      .then((data) => setHistory(data.reverse()));
  }, [event]);

  if (!history) {
    return <div className='history'></div>;
  }

  return (
    <div className='history'>
      {history.map((version, ii) => {
        return (
          <Version key={`${version.id}v${version.version}`}
            event={version}
            later={history[ii - 1]}
            isSelected={ii === selectedVersion}
            onClick={() => {
              dispatch({ type: 'set preview', value: version });
              setSelectedVersion(ii)
            }}
          />
        );
      })}
    </div>
  );
}