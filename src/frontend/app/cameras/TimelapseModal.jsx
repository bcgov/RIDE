import { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faClock, faDownload } from '@fortawesome/pro-regular-svg-icons';
import {
  faBackwardStep,
  faForwardStep,
  faPause,
  faPlay,
  faVideoSlash,
} from '@fortawesome/pro-solid-svg-icons';
import './TimelapseModal.scss';
import Button from '../components/shared/Button.jsx';
import { orientationLabel } from './helpers.js';
import Dialog, { DialogCancel } from '../components/shared/Dialog.jsx';
import Skeleton from 'react-loading-skeleton';
import 'react-loading-skeleton/dist/skeleton.css';
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
    const year = Number.parseInt(ts.slice(0, 4), 10);
    const month = Number.parseInt(ts.slice(4, 6), 10) - 1; // JS months are 0-indexed
    const day = Number.parseInt(ts.slice(6, 8), 10);
    const hours = Number.parseInt(ts.slice(8, 10), 10);
    const mins = Number.parseInt(ts.slice(10, 12), 10);
    const secs = Number.parseInt(ts.slice(12, 14), 10);
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

    void fetchTimelapseList();
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
    link.remove();
  };

  const viewOrientation = selectedView?.orientation || '';
  const modalTitle = `Timelapse for ${camera?.title || 'Camera'}${
    viewOrientation ? ` - ${orientationLabel(viewOrientation)}` : ''
  }`;

  // Picks what to show in the display pane. Uses early returns instead of a
  // nested ternary (SonarCloud: extract nested ternary into a statement).
  const renderDisplayContent = () => {
    if (loading) {
      return <Skeleton containerClassName="timelapse-skeleton" height="100%" borderRadius={0} />;
    }

    if (error) {
      return (
        <div className="timelapse-placeholder">
          <FontAwesomeIcon icon={faVideoSlash} />
          <span>{error}</span>
        </div>
      );
    }

    if (timestamps.length === 0) {
      return (
        <div className="timelapse-placeholder">
          No timelapse frames available for this timeframe.
        </div>
      );
    }

    return <img src={currentImageUrl} alt={`Frame from ${formatTimestamp(currentTimestamp)}`} />;
  };

  return (
    <Dialog
      icon={faClock}
      title={modalTitle}
      onClose={onClose}
      message
      actions={
        <>
          <Button size="dialog" onClick={handleSaveImages} disabled={timestamps.length === 0}>
            Save image
            <FontAwesomeIcon icon={faDownload} />
          </Button>
          <DialogCancel onClick={onClose} />
        </>
      }
    >
      <div className="timelapse-body">
        {/* 1. TIMEFRAME SELECTION */}
        <div className="timelapse-timeframe">
          <label className="timelapse-field">
            Beginning:
            <input
              type="datetime-local"
              className="ride-dialog__input"
              value={beginTime}
              onChange={(e) => setBeginTime(e.target.value)}
            />
          </label>
          <label className="timelapse-field">
            Ending:
            <input
              type="datetime-local"
              className="ride-dialog__input"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
            />
          </label>
        </div>

        {/* 2. DISPLAY PANE */}
        <div className="timelapse-display">
          {renderDisplayContent()}
        </div>

        {/* 3. PLAY CONTROLS & SCRUBBER */}
        <div className="timelapse-controls">
          <div className="timelapse-play-controls">
            <button
              type="button"
              className="ctrl-btn"
              onClick={handlePrev}
              disabled={currentIndex === 0 || loading}
              aria-label="Previous frame"
            >
              <FontAwesomeIcon icon={faBackwardStep} />
            </button>

            <button
              type="button"
              className="ctrl-btn ctrl-btn--play"
              onClick={() => setIsPlaying(!isPlaying)}
              disabled={timestamps.length === 0 || loading}
              aria-label={isPlaying ? 'Pause' : 'Play'}
            >
              <FontAwesomeIcon icon={isPlaying ? faPause : faPlay} />
            </button>

            <button
              type="button"
              className="ctrl-btn"
              onClick={handleNext}
              disabled={currentIndex === timestamps.length - 1 || loading}
              aria-label="Next frame"
            >
              <FontAwesomeIcon icon={faForwardStep} />
            </button>
          </div>

          <input
            type="range"
            min="0"
            max={timestamps.length > 0 ? timestamps.length - 1 : 0}
            value={currentIndex}
            onChange={(e) => setCurrentIndex(Number(e.target.value))}
            disabled={timestamps.length === 0 || loading}
            className="timelapse-scrubber"
            aria-label={`Frame ${timestamps.length > 0 ? currentIndex + 1 : 0} of ${timestamps.length}`}
          />
        </div>
      </div>
    </Dialog>
  );
}
