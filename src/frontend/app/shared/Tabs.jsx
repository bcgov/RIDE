import { createContext, useState } from 'react';

import './Tabs.scss';

function Tab({ children }) {
  return <div className={`tab-control`}>{children}</div>;
}

const getDefault = (children) => {
  if (!Array.isArray(children)) {
    return children?.props?.disabled ? undefined : children?.props?.name;
  }
  const available = children.filter((child) => child && !child.props.disabled);
  let def = available.find((child) => child.props.default);
  return (def || available[0])?.props.name;
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
              const disabled = !!child.props.disabled;
              return (
                <button
                  type="button"
                  key={`${name}-handle`}
                  className={`tab-handle ${currentTab === name ? 'active' : ''} ${disabled ? 'disabled' : ''}`}
                  aria-disabled={disabled}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (!disabled && currentTab !== name) {
                      setCurrentTab(name);
                      onChange?.(name);
                    }
                  }}
                >
                  {child.props.label}
                  {disabled && child.props.disabledHint &&
                    <span className="tab-tooltip">{child.props.disabledHint}</span>
                  }
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
