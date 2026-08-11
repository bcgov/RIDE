import React, { useState, useEffect } from 'react';
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
import './HistoryTab.scss'

export default function HistoryTab({ cameraId }) {
  const [history, setHistory] = useState([]);
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

  const formatTimestamp = (iso) => {
    const date = new Date(iso);
    return new Intl.DateTimeFormat('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
      timeZoneName: 'short',
    }).format(date);
  };

  const renderSubtext = (subtext) => {
    if (!subtext) return null;
    const [oldVal, newVal] = subtext.split(' → ');
    return (
      <div className="value-chips">
        {newVal && <span className="chip chip-new">{newVal}</span>}
        {oldVal && oldVal !== newVal && (
          <span className="chip chip-old">{oldVal}</span>
        )}
      </div>
    );
  };

  useEffect(() => {
    if (!cameraId) {
      return;
    }

    const loadHistory = async () => {
      try {


        const response = await fetch(
          `/api/cameras/${cameraId}/history/`
        );

        if (!response.ok) {
          if (!response.ok) {
            let errorDetail;
            try {
              errorDetail = await response.json();
            } catch {
              errorDetail = await response.text().catch(() => '<no body>');
            }

            console.log('History request failed:', {
              status: response.status,
              statusText: response.statusText,
              url: response.url,
              detail: errorDetail,
            });
          }


          throw new Error(
            `Failed to load history: ${response.status}`
          );
        }

        const data = await response.json();

        setHistory(
          Array.isArray(data) ? data : []
        );

      } catch (err) {
        console.error(
          'Failed to load camera history:',
          err
        );
      }
    };

    loadHistory();
  }, [cameraId]);

  return (
    <div className="tab-content history-tab">
      {Array.isArray(history) &&
        history.map((entry) => {
        const isCollapsed = collapsedIds.includes(entry.id);

        return (
          <div key={entry.id} className="history-card">
            {/* Entry Header */}
            <div className="history-card-header">
              <span className="timestamp-title">{formatTimestamp(entry.timestamp)}</span>
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
                  <div key={`section-${section.actions[0].type}-${section.actions[0].text}-${section.actions[0].subtext}`} className="history-section">
                    <span className="category-label">{section.category}</span>

                    <ul className="actions-list">
                      {section.actions?.map((action, actionIdx) => (
                        <li key={`${action.type}-${action.text}-${action.subtext}`} className="action-item">
                          <div className="action-row">
                            <FontAwesomeIcon
                              icon={getActionIcon(action.type)}
                              className={`action-icon ${action.type}`}
                            />
                            <span className="action-text">{action.text}</span>
                          </div>
                          {/* {action.subtext && (
                            <p className="action-subtext">{action.subtext}</p>
                          )} */}
                          {action.subtext && renderSubtext(action.subtext)}
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