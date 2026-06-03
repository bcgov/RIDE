// React
import 'react';

// External imports
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faXmark } from '@fortawesome/pro-regular-svg-icons';
import { format } from 'date-fns';

// Styling
import './Dms.scss';

const formatDate = (date) => {
  if (!date) return '';
  date = new Date(date);
  const tz = date.toLocaleString(['en-CA'], { timeZoneName: 'short' }).slice(-3);
  return format(date, `E, MMM do, y, h:mm a '${tz}'`);
}

import dmsEastIconStatic from './icons/dms-east-static.png';
import dmsSouthIconStatic from './icons/dms-south-static.png';
import dmsWestIconStatic from './icons/dms-west-static.png';
import dmsNorthIconStatic from './icons/dms-north-static.png';

const DIRECTION = {
  Eastbound: dmsEastIconStatic,
  Northbound: dmsNorthIconStatic,
  Westbound: dmsWestIconStatic,
  Southbound: dmsSouthIconStatic,
}


function Message({ message, index }) {
  const status = message.trim() ? 'Active' : 'No message';
  const lines = message.split('\n');
  return (
    <div className='message'>
      <div className='message-title'>
        <h5>Display {index}</h5>
        <div className={`status ${status}`}>{status}</div>
      </div>
      <div className='blackboard'>
        {lines.map((line, ii) => <div key={`${line}-${ii}`}>{line}</div>)}
      </div>
    </div>
  )
}


export default function DmsPreview({ sign, close }) {
  return (
    <div className={`preview sign`}>

      <div className='header'>
        <div style={{padding: '1rem'}}>
          <div className='icons'>
            <img src={DIRECTION[sign.roadway_direction]} />
            <p>Dynamic message sign</p>
            <button
              className="close"
              type='button'
              onClick={close}
            ><FontAwesomeIcon icon={faXmark} /></button>
          </div>
        </div>
      </div>

      <div className="body">
        <h3>{sign.name}</h3>
        <div className='last-updated'>{formatDate(sign.updated_datetime_utc)}</div>
        <Message message={sign.message_display_1} index={1} />
        <Message message={sign.message_display_2} index={2} />
        <Message message={sign.message_display_3} index={3} />
      </div>

      { sign.id &&
        <div className="footer" onClick={() => console.log(sign)}>
          Sign ID: { sign.id }
        </div>
      }
    </div>
  )
}
