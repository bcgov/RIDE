// React
import React, { useContext, useEffect, useState } from 'react';

// External imports
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCheckCircle, faCircleInfo } from '@fortawesome/pro-regular-svg-icons';

// Internal imports
import { AlertContext } from "../../contexts.js";

// Styling
import './Alert.scss';

export default function Alert() {
  /* Setup */
  // Context
  const { alertContext, setAlertContext } = useContext(AlertContext);
  
  // States
  const [visible, setVisible] = useState(false);
  const [renderedAlert, setRenderedAlert] = useState(alertContext);
  const [seconds, setSeconds] = useState(5);

  // Effects
  useEffect(() => {
    // Do not update on closing
    if (alertContext) {
      setVisible(true);
      setRenderedAlert(alertContext);
      setSeconds(5);

    } else {
      setVisible(false);
    }
  }, [alertContext]);

  // Countdown effect
  useEffect(() => {
    if (seconds === 0) return;

    const interval = setInterval(() => {
      setSeconds(prev => prev - 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [seconds]);

  /* Main rendering function */
  return renderedAlert && (
    <div className={`alert fade-out ${!visible ? 'hidden' : ''}`}>
      <div className="content">
        <div className="content__text">
          <FontAwesomeIcon icon={renderedAlert.icon === 'success' ? faCheckCircle : faCircleInfo} />
          {renderedAlert.message}
        </div>

        {renderedAlert.undoHandler &&
          <div className={'content__undo'}>
            {seconds}s

            <button
              tabIndex={0}
              onClick={() => {
                renderedAlert.undoHandler();
                setAlertContext(null);
              }}
              onKeyDown={(keyEvent) => {
                if (['Enter', 'NumpadEnter'].includes(keyEvent.key)) {
                  renderedAlert.undoHandler();
                  setAlertContext(null);
                }
              }}>
              Undo
            </button>
          </div>
        }
      </div>
    </div>
  );
}
