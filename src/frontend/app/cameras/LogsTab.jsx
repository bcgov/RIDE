import React, { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faCalendarDays,
  faWifiSlash,
} from '@fortawesome/pro-regular-svg-icons';

export default function LogsTab({ logs = [] }) {
  const [selectedDate, setSelectedDate] = useState('01-Aug-2026');
  const [errorsOnly, setErrorsOnly] = useState(true);

  // Filter logs based on errors toggle
  const filteredLogs = logs.filter((log) => {
    if (errorsOnly) return log.isError;
    return true;
  });

  return (
    <div className="tab-content logs-tab">
      {/* Date Filter */}
      <div className="form-group date-filter-group">
        <label htmlFor="logDate">Date</label>
        <div className="input-with-icon">
          <input
            type="text"
            id="logDate"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
          />
          <FontAwesomeIcon icon={faCalendarDays} className="input-icon" />
        </div>
      </div>

      {/* Filter Pill Toggle */}
      <div className="filter-actions">
        <button
          type="button"
          className={`btn-pill ${errorsOnly ? 'active' : ''}`}
          onClick={() => setErrorsOnly(!errorsOnly)}
        >
          Errors only
        </button>
      </div>

      {/* Log Entries List */}
      <div className="logs-list">
        {filteredLogs.length > 0 ? (
          filteredLogs.map((log) => (
            <div key={log.id} className="log-item">
              <span className="log-time">{log.time}</span>
              <div className="log-details">
                {log.isError && (
                  <FontAwesomeIcon icon={faWifiSlash} className="error-icon" />
                )}
                <span className="log-message">{log.message}</span>
              </div>
            </div>
          ))
        ) : (
          <div className="no-logs">No logs found for this filter.</div>
        )}
      </div>
    </div>
  );
}