import React, { useEffect, useMemo, useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faCalendarDays,
  faWifiSlash,
  faCircleCheck,
} from '@fortawesome/pro-regular-svg-icons';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import './LogsTab.scss';

export default function LogsTab({ cameraId, refreshKey }) {
  const [logs, setLogs] = useState([]);
  const [selectedDate, setSelectedDate] = useState(null); // Date | null
  const [errorsOnly, setErrorsOnly] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!cameraId) {
      setLogs([]);
      return;
    }

    const fetchLogs = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const response = await fetch(`/api/cameras/${cameraId}/logs/`);

        if (!response.ok) {
          throw new Error(`Failed to load logs: ${response.status}`);
        }

        const data = await response.json();
        setLogs(data);
      } catch (err) {
        console.error('Failed to load camera logs:', err);
        setError(err.message);
        setLogs([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchLogs();
  }, [cameraId, refreshKey]);

  const formatTime = (timestamp) => {
    if (!timestamp) return '';
    return new Date(timestamp).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  const isSameDay = (dateA, dateB) =>
    dateA.getFullYear() === dateB.getFullYear() &&
    dateA.getMonth() === dateB.getMonth() &&
    dateA.getDate() === dateB.getDate();

  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      if (errorsOnly && !log.is_error) {
        return false;
      }

      if (selectedDate) {
        const logDate = new Date(log.timestamp);
        if (!isSameDay(logDate, selectedDate)) {
          return false;
        }
      }

      return true;
    });
  }, [logs, errorsOnly, selectedDate]);

  return (
    <div className="tab-content logs-tab">
      <div className="form-group date-filter-group">
        <label htmlFor="logDate">Date</label>

        <div className="input-with-icon">
          <DatePicker
            id="logDate"
            selected={selectedDate}
            onChange={(date) => setSelectedDate(date)}
            dateFormat="dd-MMM-yyyy"
            placeholderText="dd-MMM-yyyy"
            className="date-picker-input"
          />
          <FontAwesomeIcon icon={faCalendarDays} className="input-icon" />
        </div>
      </div>

      <div className="filter-actions">
        <button
          type="button"
          className={`btn-pill ${errorsOnly ? 'active' : ''}`}
          onClick={() => setErrorsOnly((prev) => !prev)}
        >
          Errors only
        </button>
      </div>

      {isLoading && <div className="no-logs">Loading logs...</div>}

      {!isLoading && error && <div className="no-logs">Failed to load logs.</div>}

      {!isLoading && !error && filteredLogs.length > 0 && (
        <div className="logs-list">
          {filteredLogs.map((log) => (
            <div
              key={log.id}
              className={`log-item ${log.is_error ? 'log-item--error' : ''}`}
            >
              <span className="log-time">{formatTime(log.timestamp)}</span>

              <div className="log-details">
                <FontAwesomeIcon
                  icon={log.is_error ? faWifiSlash : faCircleCheck}
                  className={log.is_error ? 'error-icon' : 'success-icon'}
                />
                <span className="log-message">{log.message}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {!isLoading && !error && filteredLogs.length === 0 && (
        <div className="no-logs">No logs found for this filter.</div>
      )}
    </div>
  );
}