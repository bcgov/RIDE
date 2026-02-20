import { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faXmark, faLayerGroup, faDiamond, faTriangle, faLink,

} from '@fortawesome/pro-regular-svg-icons';
import { faDoNotEnter, faCalendarDays, faClockRotateLeft,
  faGameBoardSimple, faSignPosts
} from '@fortawesome/pro-solid-svg-icons';

import incidentMajorActiveStatic from './icons/majorincident-default-static.svg';
import incidentMajorClosureActiveStatic from './icons/closure-default-static.svg';
import plannedMajorActiveStatic from './icons/majordelay-default-static.svg';
import plannedMajorClosureActiveStatic from './icons/closure-default-static.svg';
import plannedMajorFutureActiveStatic from './icons/majorfuture-default-static.svg';
import plannedMajorFutureClosureActiveStatic from './icons/majorfutureclosure-default-static.svg';
import incidentMinorActiveStatic from './icons/minorincident-default-static.svg';
import incidentMinorClosureActiveStatic from './icons/closure-default-static.svg';
import plannedMinorActiveStatic from './icons/minordelay-default-static.svg';
import plannedMinorClosureActiveStatic from './icons/closure-default-static.svg';
import plannedMinorFutureActiveStatic from './icons/minorfuture-default-static.svg';
import plannedMinorFutureClosureActiveStatic from './icons/minorfutureclosure-default-static.svg';
import chainupActiveStatic from './icons/chainup-default-static.svg';
import roadconditionActiveStatic from './icons/roadcondition-default-static.svg';

import './Layers.scss';

const BUTTONS = {
  Delays: {
    closures: {icon: faDoNotEnter, classes: 'red', label: 'Closures'},
    major: {icon: faDiamond, classes: 'red stroke', label: 'Major'},
    minor: {icon: faTriangle, classes: 'stroke', label: 'Minor'},
    future: {icon: faCalendarDays, classes: 'future', label: 'Future'},
    cleared7: {icon: faClockRotateLeft, classes: '', label: 'Cleared in the last 7 days'},
  },
  'Conditions and features': {
    roadConditions: {icon: faGameBoardSimple, classes: 'road-conditions', label: 'Road conditions'},
    dms: {icon: faSignPosts, classes: 'dms', label: 'Dynamic message signs'},
  },
  'Commercial vehicles': {
    chainups: {icon: faLink, classes: 'stroke', label: 'Chain-ups in effect'},
  }
}

export const allLayers = Object.values(BUTTONS).flatMap((section) => Object.keys(section)).reduce((acc, curr) => { acc[curr] = true; return acc }, {});

function Legend() {
  return (
    <div className='legend'>
      <div className='group'>Major delays</div>
      <p>Expect delays of 30 minutes or more</p>

      <div className='option major'>
        <img src={incidentMajorClosureActiveStatic} alt="" />Closures
      </div>
      <p>Travel is not possible in one or both directions on this road. Find an alternate route or detour if possible.</p>

      <div className='option major'>
        <img src={incidentMajorActiveStatic} alt="" />Incident
      </div>
      <p>An unexpected occurrence on the road that contributes to major delays.</p>

      <div className='option major'>
        <img src={plannedMajorActiveStatic} alt="" />Delay
      </div>
      <p>A planned for and expected delay that&apos;s typically part of anticipated road work or construction.</p>

      <div className='option major'>
        <img src={plannedMajorFutureActiveStatic} alt="" />Future event
      </div>
      <p>A planned for and expected event, typically part of anticipated road work or construction, that will occur sometime in the future that will contribute to major delays.</p>

      <div className='group'>Minor delays</div>
      <p>Expect delays of 30 minutes or less</p>

      <div className='option minor'>
        <img src={incidentMinorActiveStatic} alt="" />Incident
      </div>
      <p>An unexpected occurrence on the road that contributes to minor delays</p>

      <div className='option minor'>
        <img src={plannedMinorActiveStatic} alt="" />Delay
      </div>
      <p>A planned for and expected delay that&apos;s typically part of anticipated road work or construction.</p>

      <div className='option minor'>
        <img src={plannedMinorFutureActiveStatic} alt="" />Future event
      </div>
      <p>A planned for and expected event, typically part of anticipated road work or construction, that will occur sometime in the future and could contribute to minor delays.</p>

      <div className='group'>Cleared</div>

      <div className='option'>
        <FontAwesomeIcon icon={faClockRotateLeft}/>Cleared in the last 7 days
      </div>
      <p>This option is unique to RIDE and is not available on DriveBC. Displays all the Incidents and Planned Events that have been removed from DriveBC in the last 7 days. Cleared events are shown on DriveBC as cleared for 15 minutes after they have been set to the cleared state (afterwards they are no longer shown on DriveBC).</p>

      <div className='group'>Conditions and features</div>

      <div className='option minor'>
        <img src={roadconditionActiveStatic} alt="" />Road conditions
      </div>
      <p>States of the road that may impact drivability.</p>

      <div className='option'>
        Dynamic message signs
      </div>
      <p>Digital traffic signs that communicate travel information to drivers.</p>

      <div className='group'>Commercial vehicles</div>

      <div className='option'>
        <img src={chainupActiveStatic} alt="" />Chain-ups in effect
      </div>
      <p>Segments of the highway that require commercial vehicles over 11,794 kg to have chains on in order to use the highway.</p>
    </div>
  );
}

export default function Layers ({ visibleLayers, dispatch }) {

  const [tab, setTab] = useState(localStorage.getItem('tab open'));

  const changeTab = (tab) => {
    if (tab) {
      localStorage.setItem('tab open', tab)
    } else {
      localStorage.removeItem('tab open');
    }
    setTab(tab);
  }

  if (!tab) {
    return (
      <div className='layers-control closed'>
        <div className="header closed">
          <button
            type="button"
            className={tab === 'layers' ? 'active' : ''}
            onClick={() => changeTab('layers')}
          >
            <FontAwesomeIcon icon={faLayerGroup}/>&nbsp;
            Map Layers
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className='layers-control'>
      <div className={`header ${tab ? '' : 'closed'}`}>
        <button
          type="button"
          className={tab === 'layers' ? 'active' : ''}
          onClick={() => changeTab('layers')}
        >Map Layers</button>

        <button
          type="button"
          className={tab === 'legend' ? 'active' : ''}
          onClick={() => changeTab('legend')}
        >Legend</button>

        <button
          type="button"
          className='close'
          onClick={() => changeTab(null)}
        ><FontAwesomeIcon icon={faXmark} /></button>
      </div>

      <div className={`tab ${!tab && 'closed'}`}>
        { tab === 'layers' && (
          <div className='layers'>
            { Object.keys(BUTTONS).map((group) => (
              <div key={group}>
                <p className='group'>{group}</p>

                <div className="options-group">
                  {Object.keys(BUTTONS[group]).map((key) => {
                    const option = BUTTONS[group][key];
                    return (
                      <button
                        key={key}
                        className={`${option.classes} ${visibleLayers[key] ? 'enabled' : ''}`}
                        onClick={() => dispatch({ layer: key, value: !visibleLayers[key]})}
                      >
                        <FontAwesomeIcon icon={option.icon}/>
                        {BUTTONS[group][key].label}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}

        { tab === 'legend' && <Legend /> }
      </div>
    </div>
  )
}