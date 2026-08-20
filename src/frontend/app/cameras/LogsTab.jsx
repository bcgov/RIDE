import React, { useEffect, useMemo, useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faCalendarDays,
  faWifiSlash,
} from '@fortawesome/pro-regular-svg-icons';

export default function LogsTab({ cameraId }) {
  const [logs, setLogs] = useState([]);
  const [selectedDate, setSelectedDate] = useState('');
  const [errorsOnly, setErrorsOnly] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  // ---------------------------------------------------------
  // Load camera logs
  // ---------------------------------------------------------

  useEffect(() => {
    if (!cameraId) {
      setLogs([]);
      return;
    }

    const fetchLogs = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const response = await fetch(
          `/api/cameras/${cameraId}/logs/`
        );

        if (!response.ok) {
          throw new Error(
            `Failed to load logs: ${response.status}`
          );
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
  }, [cameraId]);

  // ---------------------------------------------------------
  // Format date
  // ---------------------------------------------------------

  const formatDate = (timestamp) => {
    if (!timestamp) {
      return '';
    }

    const date = new Date(timestamp);

    return date.toLocaleDateString('en-CA', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  // ---------------------------------------------------------
  // Format time
  // ---------------------------------------------------------

  const formatTime = (timestamp) => {
    if (!timestamp) {
      return '';
    }

    const date = new Date(timestamp);

    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  // ---------------------------------------------------------
  // Filter logs
  // ---------------------------------------------------------

  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      // Errors only filter
      if (errorsOnly && !log.is_error) {
        return false;
      }

      // Date filter
      if (selectedDate) {
        const logDate = formatDate(log.timestamp);

        if (logDate !== selectedDate) {
          return false;
        }
      }

      return true;
    });
  }, [logs, errorsOnly, selectedDate]);

  // ---------------------------------------------------------
  // Render
  // ---------------------------------------------------------

  return (
    <div className="tab-content logs-tab">

      {/* Date Filter */}

      <div className="form-group date-filter-group">

        <label htmlFor="logDate">
          Date
        </label>

        <div className="input-with-icon">

          <input
            type="text"
            id="logDate"
            value={selectedDate}
            placeholder="e.g. 20-Aug-2026"
            onChange={(e) =>
              setSelectedDate(e.target.value)
            }
          />

          <FontAwesomeIcon
            icon={faCalendarDays}
            className="input-icon"
          />

        </div>

      </div>

      {/* Filter Pill Toggle */}

      <div className="filter-actions">

        <button
          type="button"
          className={`btn-pill ${
            errorsOnly ? 'active' : ''
          }`}
          onClick={() =>
            setErrorsOnly((prev) => !prev)
          }
        >
          Errors only
        </button>

      </div>

      {/* Loading */}

      {isLoading && (
        <div className="no-logs">
          Loading logs...
        </div>
      )}

      {/* Error */}

      {!isLoading && error && (
        <div className="no-logs">
          Failed to load logs.
        </div>
      )}

      {/* Log Entries */}

      {!isLoading &&
        !error &&
        filteredLogs.length > 0 && (

          <div className="logs-list">

            {filteredLogs.map((log) => (

              <div
                key={log.id}
                className="log-item"
              >

                <span className="log-time">
                  {formatTime(log.timestamp)}
                </span>

                <div className="log-details">

                  {log.is_error && (
                    <FontAwesomeIcon
                      icon={faWifiSlash}
                      className="error-icon"
                    />
                  )}

                  <span className="log-message">
                    {log.message}
                  </span>

                </div>

              </div>

            ))}

          </div>
        )}

      {/* Empty */}

      {!isLoading &&
        !error &&
        filteredLogs.length === 0 && (

          <div className="no-logs">
            No logs found for this filter.
          </div>

        )}

    </div>
  );
}