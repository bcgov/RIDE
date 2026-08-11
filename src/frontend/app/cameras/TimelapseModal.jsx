import React, { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faClock,
  faXmark,
  faPlay,
  faPause,
  faStepBackward,
  faStepForward,
  faDownload,
} from '@fortawesome/pro-regular-svg-icons';
import { faVideoSlash } from '@fortawesome/pro-solid-svg-icons';
import './Modal.scss';
import './TimelapseModal.scss';
import { getCookie } from "../shared/helpers.js";

export default function TimelapseModal({ camera, selectedView, onClose }) {
  const [timestamps, setTimestamps] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Default timeframe: past 24 hours
  const now = new Date();
  const past24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);

  const [beginTime, setBeginTime] = useState(
    past24h.toISOString().slice(0, 16)
  );
  const [endTime, setEndTime] = useState(
    now.toISOString().slice(0, 16)
  );

  // Extract viewId from selectedView or URL query parameters
  const urlParams = new URLSearchParams(window.location.search);
  const viewId = selectedView?.id || urlParams.get("view");

  // Parses "YYYYMMDDHHmmss" string into a JS Date object
    const parseApiTimestamp = (ts) => {
    if (!ts || ts.length < 14) return null;
    const year = parseInt(ts.slice(0, 4), 10);
    const month = parseInt(ts.slice(4, 6), 10) - 1; // JS months are 0-indexed
    const day = parseInt(ts.slice(6, 8), 10);
    const hours = parseInt(ts.slice(8, 10), 10);
    const mins = parseInt(ts.slice(10, 12), 10);
    const secs = parseInt(ts.slice(12, 14), 10);
    return new Date(year, month, day, hours, mins, secs);
    };

    // Parses "YYYY-MM-DDTHH:mm" datetime-local string into a JS Date object
    const parseLocalInputDate = (inputStr) => {
        if (!inputStr) return null;
        return new Date(inputStr);
    };

    // 1. Fetch raw list once when camera or view changes
    useEffect(() => {
        if (!camera?.id) return;

        const fetchTimelapseList = async () => {
            setLoading(true);
            setError(null);
            try {
            const response = await fetch(
                `/api/cameras/${camera.id}/timelapse/?view=${viewId || ''}`,
                {
                headers: {
                    'X-CSRFToken': getCookie('csrftoken'),
                },
                credentials: 'include',
                }
            );

            if (!response.ok) {
                throw new Error(`Failed to load timelapse data: ${response.status}`);
            }

            const rawTimestamps = await response.json();

            // Convert input string range to Date objects for comparison
            const startDate = parseLocalInputDate(beginTime);
            const endDate = parseLocalInputDate(endTime);

            // Filter raw timestamps to keep only those within [startDate, endDate]
            const filteredTimestamps = rawTimestamps.filter((ts) => {
                const tsDate = parseApiTimestamp(ts);
                if (!tsDate) return false;

                if (startDate && tsDate < startDate) return false;
                if (endDate && tsDate > endDate) return false;

                return true;
            });

            setTimestamps(filteredTimestamps);
            setCurrentIndex(0); // Reset slider to start of filtered list
            } catch (err) {
            console.error('Error fetching timelapse list:', err);
            setError('Unable to load timelapse images.');
            } finally {
            setLoading(false);
            }
        };

        fetchTimelapseList();
        }, [camera?.id, viewId, beginTime, endTime]);

    // 2. Playback timer logic
    useEffect(() => {
        let interval = null;
        if (isPlaying && timestamps.length > 0) {
        interval = setInterval(() => {
            setCurrentIndex((prevIndex) => {
            if (prevIndex >= timestamps.length - 1) {
                setIsPlaying(false);
                return prevIndex;
            }
            return prevIndex + 1;
            });
        }, 500); // 500ms per frame
        }
        return () => clearInterval(interval);
    }, [isPlaying, timestamps]);

  // Construct proxy image URL for current frame
  const currentTimestamp = timestamps[currentIndex];
  const currentImageUrl = currentTimestamp
    ? `/api/cameras/${camera.id}/timelapse-image/?view=${viewId || ''}&timestamp=${currentTimestamp}`
    : '';

  // Format YYYYMMDDHHmmss string into readable date display
  const formatTimestamp = (ts) => {
    if (!ts || ts.length < 14) return '';
    const year = ts.slice(0, 4);
    const month = ts.slice(4, 6);
    const day = ts.slice(6, 8);
    const hours = ts.slice(8, 10);
    const mins = ts.slice(10, 12);
    const secs = ts.slice(12, 14);
    return `${year}-${month}-${day} ${hours}:${mins}:${secs}`;
  };

  const handleNext = () => {
    if (currentIndex < timestamps.length - 1) {
      setCurrentIndex((prev) => prev + 1);
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex((prev) => prev - 1);
    }
  };

  const handleSaveImages = () => {
    if (!currentImageUrl) return;
    const link = document.createElement('a');
    link.href = currentImageUrl;
    link.download = `camera-${camera?.id}-frame-${currentTimestamp}.jpg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const viewOrientation = selectedView?.orientation || '';
  const modalTitle = `Timelapse for ${camera?.title || 'Camera'}${
    viewOrientation ? ` - ${viewOrientation}` : ''
  }`;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content timelapse-modal" onClick={(e) => e.stopPropagation()}>
        {/* HEADER */}
        <div className="modal-header">
          <FontAwesomeIcon icon={faClock} />
          <h2>{modalTitle}</h2>
          <button type="button" onClick={onClose} aria-label="Close modal">
            <FontAwesomeIcon icon={faXmark} />
          </button>
        </div>

        {/* 1. TIMEFRAME SELECTION */}
        <div className="timelapse-timeframe">
          <label>
            Beginning:
            <input
              type="datetime-local"
              value={beginTime}
              onChange={(e) => setBeginTime(e.target.value)}
            />
          </label>
          <label>
            Ending:
            <input
              type="datetime-local"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
            />
          </label>
        </div>

        {/* 2. DISPLAY PANE */}
        <div className="timelapse-display">
          {loading ? (
            <div className="timelapse-placeholder">Loading timelapse...</div>
          ) : error ? (
            <div className="timelapse-placeholder">
              <FontAwesomeIcon icon={faVideoSlash} />
              <span>{error}</span>
            </div>
          ) : timestamps.length === 0 ? (
            <div className="timelapse-placeholder">No timelapse frames available for this timeframe.</div>
          ) : (
            <>
              <img src={currentImageUrl} alt={`Frame ${currentTimestamp}`} />
              <div className="timestamp-overlay">
                {formatTimestamp(currentTimestamp)}
              </div>
            </>
          )}
        </div>

        {/* 3. SCRUBBER & CONTROLS */}
        <div className="timelapse-controls">
          <button
            type="button"
            className="ctrl-btn"
            onClick={handlePrev}
            disabled={currentIndex === 0 || loading}
          >
            <FontAwesomeIcon icon={faStepBackward} />
          </button>

          <button
            type="button"
            className="ctrl-btn play-btn"
            onClick={() => setIsPlaying(!isPlaying)}
            disabled={timestamps.length === 0 || loading}
          >
            <FontAwesomeIcon icon={isPlaying ? faPause : faPlay} />
          </button>

          <button
            type="button"
            className="ctrl-btn"
            onClick={handleNext}
            disabled={currentIndex === timestamps.length - 1 || loading}
          >
            <FontAwesomeIcon icon={faStepForward} />
          </button>

          <input
            type="range"
            min="0"
            max={timestamps.length > 0 ? timestamps.length - 1 : 0}
            value={currentIndex}
            onChange={(e) => setCurrentIndex(Number(e.target.value))}
            disabled={timestamps.length === 0 || loading}
            className="timelapse-scrubber"
          />

          <span className="frame-counter">
            {timestamps.length > 0 ? `${currentIndex + 1} / ${timestamps.length}` : '0 / 0'}
          </span>
        </div>

        {/* 4. ACTIONS */}
        <div className="modal-actions">
          <button
            type="button"
            className="btn-primary"
            onClick={handleSaveImages}
            disabled={timestamps.length === 0}
          >
            <span>Save image</span>
            <FontAwesomeIcon icon={faDownload} />
          </button>
          <button type="button" className="btn-text" onClick={onClose}>
            <span>Cancel</span>
            <FontAwesomeIcon icon={faXmark} />
          </button>
        </div>
      </div>
    </div>
  );
}