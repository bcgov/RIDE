import { useContext } from 'react';

import { DebuggingContext } from '../contexts';

import './ContextMenu.css';

export default function ContextMenu({ ref, options, setContextMenu }) {

  const debuggingIsOn = useContext(DebuggingContext);
  const items = options.filter((el) => !el.debugging || debuggingIsOn);

  return (
    <div
      ref={ref}
      className={`context-menu ${items.length > 0 && 'open'}`}
      onClick={() => null}
      onMouseLeave={(e) => setContextMenu([]) }
    >
      {items.map((item, ii) => (
        <div
          className={`
            context-option
            ${ debuggingIsOn && item.debugging && 'debugging' }
            ${ item.disabled ? 'disabled' : '' }
          `}
          onClick={item.action} key={'option-' + ii}
        >
          {item.label}
        </div>
      ))}
    </div>
  );
};
