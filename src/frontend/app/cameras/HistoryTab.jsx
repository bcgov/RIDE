import React, { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faChevronUp,
  faChevronDown,
  faEyeSlash,
  faRotate,
  faPlus,
  faMinus,
  faUser,
} from '@fortawesome/pro-regular-svg-icons';

export default function HistoryTab({ history = [] }) {
  // Store collapsed card IDs
  const [collapsedIds, setCollapsedIds] = useState([]);

  const toggleCollapse = (id) => {
    setCollapsedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  // Helper to resolve action type icons
  const getActionIcon = (type) => {
    switch (type) {
      case 'visibility-off':
        return faEyeSlash;
      case 'update':
        return faRotate;
      case 'add':
        return faPlus;
      case 'remove':
        return faMinus;
      default:
        return faRotate;
    }
  };

  return (
    <div className="tab-content history-tab">
      {history.map((entry) => {
        const isCollapsed = collapsedIds.includes(entry.id);

        return (
          <div key={entry.id} className="history-card">
            {/* Entry Header */}
            <div className="history-card-header">
              <span className="timestamp-title">{entry.timestamp}</span>
              <button
                type="button"
                className="btn-collapse-toggle"
                onClick={() => toggleCollapse(entry.id)}
                aria-label={isCollapsed ? 'Expand history entry' : 'Collapse history entry'}
              >
                <FontAwesomeIcon icon={isCollapsed ? faChevronDown : faChevronUp} />
              </button>
            </div>

            {/* Entry Content (Shown when expanded) */}
            {!isCollapsed && (
              <div className="history-card-body">
                {entry.sections?.map((section, idx) => (
                  <div key={idx} className="history-section">
                    <span className="category-label">{section.category}</span>

                    <ul className="actions-list">
                      {section.actions?.map((action, actionIdx) => (
                        <li key={actionIdx} className="action-item">
                          <div className="action-row">
                            <FontAwesomeIcon
                              icon={getActionIcon(action.type)}
                              className={`action-icon ${action.type}`}
                            />
                            <span className="action-text">{action.text}</span>
                          </div>
                          {action.subtext && (
                            <p className="action-subtext">{action.subtext}</p>
                          )}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}

                {/* Footer User Attribution */}
                <div className="history-footer">
                  <FontAwesomeIcon icon={faUser} className="user-icon" />
                  <span className="author-name">{entry.user}</span>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}