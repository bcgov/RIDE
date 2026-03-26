import { useContext, useEffect, useRef, useState } from 'react';

import { API_HOST } from '../../env';
import { get } from '../../shared/helpers';

import Version from './Version';

import { TabContext } from '../../shared/Tabs';

import './History.scss';

export default function History({ event, dispatch }) {

  const [history, setHistory] = useState();
  const [selectedVersion, setSelectedVersion] = useState(0);
  const currentTab = useContext(TabContext);
  const divRef = useRef();

  // because tabs are rendered and hidden by CSS, selectedVersion persists
  // while switching tabs; must reset on switching tabs since we don't auto
  // preview any version
  if (selectedVersion && currentTab !== 'history') {
    setSelectedVersion(0);
    divRef.current.scrollTop = 0;
  }

  useEffect(() => {
    get(`${API_HOST}/api/events/${event.id}/history`)
      .then((data) => setHistory(data.reverse()));
  }, [event]);

  if (!history) {
    return <div className='history'></div>;
  }

  return (
    <div className='history' ref={divRef}>
      {history.map((version, ii) => {
        return (
          <Version key={`${version.id}v${version.version}`}
            event={version}
            later={history[ii - 1]}
            isSelected={ii === selectedVersion}
            onClick={() => {
              dispatch({ type: 'set preview', value: ii === 0 ? null : version });
              setSelectedVersion(ii)
            }}
          />
        );
      })}
    </div>
  );
}