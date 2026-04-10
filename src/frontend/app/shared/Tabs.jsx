import { createContext, useState } from 'react';

import './Tabs.scss';

function Tab({ children }) {
  return <div className={`tab-control`}>{children}</div>;
}

const getDefault = (children) => {
  if (!Array.isArray(children)) {
    return children?.props?.name;
  }
  let def = children.filter((child) => child).find((child) => child.props.default);
  return (def || children[0])?.props.name;
}

export const TabContext = createContext('');

export default function Tabs({ children, onChange, hideSingleTabHandle }) {
  const [currentTab, setCurrentTab] = useState(getDefault(children));

  let tabs = Array.isArray(children) ? children : [children];
  tabs = tabs.filter((child) => child);

  const hasMultipleTabs = tabs.length > 1;
  const showHandles = hasMultipleTabs || !hideSingleTabHandle;

  return (
    <TabContext.Provider value={currentTab}>
      <div className='tabs-control'>
        { showHandles &&
          <div className='tabs-handles'>
            {tabs.filter(child => child).map((child) => {
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
        }

        {tabs.filter((child) => child).map((child) => {
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
