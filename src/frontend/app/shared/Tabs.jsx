import { createContext, useState } from 'react';

import './Tabs.scss';

function Tab({ children }) {
  return <div className={`tab-control`}>{children}</div>;
}

const getDefault = (children) => {
  let def = children.filter((child) => child).find((child) => child.props.default);
  return (def || children[0])?.props.name;
}

export const TabContext = createContext('');

export default function Tabs({ children, onChange }) {
  const [currentTab, setCurrentTab] = useState(getDefault(children));

  return (
    <TabContext.Provider value={currentTab}>
      <div className={`tabs-control`}>
        <div className='tabs-handles'>
          {children.filter(child => child).map((child) => {
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
                    onChange?.(name);
                  }
                }}
              >
                {child.props.label}
              </button>
            );
          })}
        </div>

        {children.filter((child) => child).map((child) => {
          const name = child.props.name;
          return (
            <div
              key={`${name}-handle`}
              className={`tab-body ${currentTab === name ? 'open' : ''}`}
            >{child}</div>
          );
        })}
      </div>
    </TabContext.Provider>
  );
}

Tabs.Tab = Tab;
