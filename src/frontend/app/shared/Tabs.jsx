import { useState } from 'react';

import './Tabs.scss';

function Tab({ children }) {
  return <div className={`tab-control`}>{children}</div>;
}

const getDefault = (children) => {
  let def = children.find((child) => child.props.default);
  return (def || children[0]).props.name;
}


export default function Tabs({ children }) {
  const [currentTab, setCurrentTab] = useState(getDefault(children));

  return (
    <div className={`tabs-control`}>
      <div className='tabs-handles'>
        {children.map((child) => {
          const name = child.props.name;
          return (
            <button
              type="button"
              key={`${name}-handle`}
              className={`tab-handle ${currentTab === name ? 'active' : ''}`}
              onClick={(e) => {
                e.stopPropagation();
                if (currentTab !== name) {
                  setCurrentTab(name);
                }
              }}
            >
              {child.props.label}
            </button>
          );
        })}
      </div>

      {children.map((child) => {
        const name = child.props.name;
        return (
          <div
            key={`${name}-handle`}
            className={`tab-body ${currentTab === name ? 'open' : ''}`}
          >{child}</div>
        );
      })}
    </div>
  );
}

Tabs.Tab = Tab;
