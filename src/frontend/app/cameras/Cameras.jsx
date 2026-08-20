import { useEffect, useMemo, useState, useRef } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { useNavigate } from "react-router";
import {
  faMagnifyingGlass,
  faXmark,
  faSliders,
  faChevronDown,
  faRotate,
  faEllipsisVertical,
  faPlus,
  faFileLines,
  faWrench,
  faCloudSun,
  faBolt,
  faFire,
  faUpRightFromSquare,
} from '@fortawesome/pro-regular-svg-icons';
import { faBroomWide } from '@fortawesome/pro-solid-svg-icons';
import './Cameras.scss';

/*
 * Return a useful display name for the camera highway group.
 */
function getCameraName(camera) {
  return (
    camera.road?.name ||
    'Unnamed camera'
  );
}

function orientationLabel(orientation) {
  if (!orientation) return '';
  return orientation.charAt(0) + orientation.slice(1).toLowerCase();
}


/*
 * Single view thumbnail (North/East/South/etc.) within a camera row.
 */
function CameraViewCard({ view, camera, onSelectCamera }) {
  const direction = orientationLabel(view.orientation);
  const imageUrl = view.image_url || camera.locations_thumbnail_map_url || '';
  const isOn = !!view.is_on;

  // NOTE: assuming stale/delayed can be per-view. If your API only has
  // these on the camera (not the view), swap back to camera.marked_stale.
  const isStale = view.marked_stale ?? camera.marked_stale;
  const isDelayed = view.marked_delayed ?? camera.marked_delayed;

  return (
    <div className="camera-card">
      <div className="camera-card-header">
        <span className="camera-direction">
          {direction || 'Camera'}
        </span>

        <span
          className={`camera-switch ${isOn ? 'camera-switch--on' : ''}`}
        >
          <span />
        </span>
      </div>

      <div
        className="camera-image"
        onClick={() => onSelectCamera?.(camera, view)}
        style={{ cursor: 'pointer' }}
      >
        {imageUrl ? (
          <img src={imageUrl} alt={`${getCameraName(camera)} ${direction}`} />
        ) : (
          <div className="camera-image-placeholder">No image</div>
        )}

        {isStale && (
          <span className="camera-status camera-status--stale">Stale</span>
        )}

        {isDelayed && (
          <span className="camera-status camera-status--delayed">Delayed</span>
        )}
      </div>
    </div>
  );
}


/*
 * One row = one camera, with all of its views shown as thumbnails.
 */
function CameraRow({
  camera,
  onViewOnDriveBC,
  onServiceRequest,
  onClone,
  onSelectCamera,
}) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setIsMenuOpen(false);
      }
    };

    if (isMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isMenuOpen]);

  // const viewsList = camera.views || camera.cameraview_set || [];
  const viewsList = (camera.views || camera.cameraview_set || []).filter(
  (view) => !!view.image_url
);

  return (
    <section className="camera-location">
      <div className="camera-location-header">
        <div className="camera-location-title-group">
          <div className="camera-location-meta">
            <h4 className="camera-landmark">{camera.title}</h4>
            <div className="camera-update-time">
              <FontAwesomeIcon icon={faRotate} />
              <span>5 minutes</span>
            </div>
          </div>
        </div>

        <div className="camera-header-menu" ref={menuRef}>
          <button
            type="button"
            className={`circle-menu-btn ${isMenuOpen ? 'active' : ''}`}
            onClick={() => setIsMenuOpen((prev) => !prev)}
            aria-label="Location options"
          >
            <FontAwesomeIcon icon={faEllipsisVertical} />
          </button>

          {isMenuOpen && (
            <div className="context-flyout">
              <div className="flyout-section">
                <button
                  type="button"
                  className="flyout-item"
                  onClick={() => {
                    setIsMenuOpen(false);
                    onViewOnDriveBC?.(camera);
                  }}
                >
                  <FontAwesomeIcon icon={faUpRightFromSquare} className="item-icon" />
                  <span>View on DriveBC</span>
                </button>

                <button
                  type="button"
                  className="flyout-item"
                  onClick={() => {
                    setIsMenuOpen(false);
                    onServiceRequest?.(camera);
                  }}
                >
                  <FontAwesomeIcon icon={faWrench} className="item-icon" />
                  <span>Service request</span>
                </button>

                <button
                  type="button"
                  className="flyout-item"
                  onClick={() => {
                    setIsMenuOpen(false);
                    onClone?.(camera);
                  }}
                >
                  <FontAwesomeIcon icon={faPlus} className="item-icon" />
                  <span>Clone</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="camera-cards">
        {viewsList.map((view) => (
          <CameraViewCard
            key={view.id}
            view={view}
            camera={camera}
            onSelectCamera={onSelectCamera}
          />
        ))}
      </div>
    </section>
  );
}

/*
 * Highway group — maps each camera straight to a CameraRow.
 * No re-grouping by road/location name (that was the bug).
 */
function CameraHighwayGroup({
  highwayName,
  cameras,
  onSelectCamera,
  onViewOnDriveBC,
  onServiceRequest,
  onClone,
}) {
  return (
    <section className="camera-highway-group">
      <h2>{highwayName}</h2>

      {cameras.map((camera) => (
        <CameraRow
          key={camera.id}
          camera={camera}
          onSelectCamera={onSelectCamera}
          onViewOnDriveBC={onViewOnDriveBC}
          onServiceRequest={onServiceRequest}
          onClone={onClone}
        />
      ))}
    </section>
  );
}

export default function Cameras() {
  const [cameras, setCameras] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);


  const [search, setSearch] = useState('');

  const [region, setRegion] = useState('');
  const [highway, setHighway] = useState('');
  const [status, setStatus] = useState('');
  const [visibility, setVisibility] = useState('');
  const [cameraType, setCameraType] = useState('');
  const [communicationType, setCommunicationType] = useState('');
  const [powerSource, setPowerSource] = useState('');

  const [viewMode, setViewMode] = useState('compact');


  const navigate = useNavigate();

  const loadCameras = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/cameras/');

      if (!response.ok) {
        throw new Error(
          `Failed to load cameras: ${response.status}`
        );
      }

      const data = await response.json();

      setCameras(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };


  useEffect(() => {
    loadCameras();
  }, []);


  const deleteCamera = async (id) => {
    if (
      !window.confirm(
        'Are you sure you want to delete this camera?'
      )
    ) {
      return;
    }

    const response = await fetch(
      `/api/cameras/${id}/`,
      {
        method: 'DELETE',
      }
    );

    if (!response.ok) {
      throw new Error(
        `Failed to delete camera: ${response.status}`
      );
    }

    await loadCameras();
  };

  const regions = useMemo(() => {
    return [
      ...new Set(
        cameras
          .map((camera) =>
            camera.region?.name ||
            ''
          )
          .filter(Boolean)
      ),
    ].sort();
  }, [cameras]);

  const cameraTypes = useMemo(() => {
    return [
      ...new Set(
        cameras
          .map((camera) => camera.camera_type?.name)
          .filter(Boolean)
      ),
    ].sort();
  }, [cameras]);

  const communicationTypes = useMemo(() => {
    return [
      ...new Set(
        cameras
          .map((camera) => camera.communication_type?.name)
          .filter(Boolean)
      ),
    ].sort();
  }, [cameras]);

  const powerSources = useMemo(() => {
    return [
      ...new Set(
        cameras
          .map((camera) => camera.power_source?.name)
          .filter(Boolean)
      ),
    ].sort();
  }, [cameras]);


  const highways = useMemo(() => {
    return [
      ...new Set(
        cameras
          .map((camera) => camera.road?.name)
          .filter(Boolean)
      ),
    ].sort();
  }, [cameras]);

  const filteredCameras = useMemo(() => {
    const term = search.trim().toLowerCase();

    return cameras.filter((camera) => {
      const cameraRegion = camera.region?.name || '';
      const cameraHighway = camera.road?.name || '';
      const cameraCameraType = camera.camera_type?.name || '';

      /*
      * Search
      */
      const viewsSearchable = (camera.views || [])
        .map(
          (view) =>
            `${view.description || ''} ${
              view.orientation || ''
            } ${view.direction || ''}`
        )
        .join(' ');

      const searchable = [
        camera.title,
        camera.description,
        camera.road?.name,
        camera.id,
        viewsSearchable,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      /*
      * Check whether the camera matches each filter.
      */
      const matchesSearch =
        !term || searchable.includes(term);

      const matchesRegion =
        !region || cameraRegion === region;

      const matchesHighway =
        !highway || cameraHighway === highway;

      const camIsOn = (camera.views || camera.cameraview_set || []).some(
        (view) => view.is_on
      );

      const matchesStatus =
        !status ||
        (status === 'Delayed' && camera.marked_delayed) ||
        (status === 'Non-functions' && !camIsOn);

      const matchesVisibility =
        !visibility ||
        (visibility === 'Visible on DriveBC' &&
          camera.visible !== false) ||
        (visibility === 'Hidden on DriveBC' &&
          camera.visible === false);

      const matchesCameraType =
        !cameraType || cameraCameraType === cameraType;

      const cameraCommunicationType = camera.communication_type?.name || '';

      const matchesCommunicationType =
        !communicationType || cameraCommunicationType === communicationType;


      const cameraPowerSource = camera.power_source?.name || '';

      const matchesPowerSource =
        !powerSource || cameraPowerSource === powerSource;

      /*
      * OR logic:
      *
      * If no filters are selected, show everything.
      * Otherwise, show the camera if it matches
      * ANY selected filter.
      */
      const hasFilters =
        term ||
        region ||
        highway ||
        status ||
        visibility ||
        cameraType ||
        communicationType ||
        powerSource;

      if (!hasFilters) {
        return true;
      }

      return (
        (term && matchesSearch) ||
        (region && matchesRegion) ||
        (highway && matchesHighway) ||
        (status && matchesStatus) ||
        (visibility && matchesVisibility) ||
        (cameraType && matchesCameraType) ||
        (communicationType && matchesCommunicationType) ||
        (powerSource && matchesPowerSource)
      );
    });
  }, [
    cameras,
    search,
    region,
    highway,
    status,
    visibility,
    cameraType,
    communicationType,
    powerSource,
  ]);


  /*
   * Group cameras by highway. Each entry stays a *list of cameras*
   * (not re-grouped by location) — CameraHighwayGroup renders one
   * row per camera.
   */
  const cameraGroups = useMemo(() => {
    const groups = {};

    filteredCameras.forEach((camera) => {
      const groupName =
        camera.road?.name ||
        'Other';

      if (!groups[groupName]) {
        groups[groupName] = [];
      }

      groups[groupName].push(camera);
    });

    return groups;
  }, [filteredCameras]);


  const clearFilters = () => {
    setRegion('');
    setHighway('');
    setStatus('');
    setVisibility('');
    setCameraType('');
    setCommunicationType('');
    setPowerSource('');
    setSearch('');
  };

  // Context Menu State
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef(null);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setIsMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);



  if (loading) {
    return (
      <div className="cameras-loading">
        Loading cameras...
      </div>
    );
  }

  return (
    <div className="cameras-page">

      {/* LEFT FILTER PANEL */}
      <aside className="camera-filters">

        <div className="camera-filters-header">
          <div className="camera-filters-title">
            <FontAwesomeIcon icon={faSliders} />
            <span>Filters</span>
          </div>

          <button
            type="button"
            onClick={clearFilters}
            className="clear-filters-btn"
          >
            <FontAwesomeIcon icon={faBroomWide} />
            <span>Clear all</span>
          </button>
        </div>


        <div className="camera-filter-section">
          <div className="camera-filter-label">
            Regions
            <FontAwesomeIcon icon={faChevronDown} />
          </div>

          <div className="camera-filter-options">
            {regions.map((item) => (
              <button
                key={item}
                type="button"
                className={
                  region === item
                    ? 'active'
                    : ''
                }
                onClick={() =>
                  setRegion(
                    region === item ? '' : item
                  )
                }
              >
                {item}
              </button>
            ))}
          </div>
        </div>


        <CameraFilterSection
          title="Roads"
          value={highway}
          options={highways}
          onChange={setHighway}
        />


        <CameraFilterSection
          title="Statuses"
          value={status}
          options={[
            'Delayed',
            'Non-functions',
          ]}
          onChange={setStatus}
        />


        <CameraFilterSection
          title="Visibility"
          value={visibility}
          options={[
            'Visible on DriveBC',
            'Hidden on DriveBC',
          ]}
          onChange={setVisibility}
        />


        <CameraFilterSection
          title="Camera types"
          value={cameraType}
          options={cameraTypes}
          onChange={setCameraType}
        />


        <CameraFilterSection
          title="Communication methods"
          value={communicationType}
          options={communicationTypes}
          onChange={setCommunicationType}
        />


        <CameraFilterSection
          title="Power sources"
          value={powerSource}
          options={powerSources}
          onChange={setPowerSource}
        />

      </aside>

      <div className="camera-content-wrapper">
        <div className="cameras-header">
          <div>
            <h1>Cameras</h1>

            <div className="camera-count">
              Filtered to {filteredCameras.length}{' '}
              camera locations
            </div>
          </div>


          {/* Context Menu Container */}
          <div className="camera-header-menu" ref={menuRef}>
            <button
              type="button"
              className={`circle-menu-btn ${isMenuOpen ? 'active' : ''}`}
              onClick={() => setIsMenuOpen((prev) => !prev)}
              aria-label="More options"
            >
              <FontAwesomeIcon icon={faEllipsisVertical} />
            </button>

            {isMenuOpen && (
              <div className="context-flyout">
                {/* Actions Section */}
                <div className="flyout-section">
                  <span className="flyout-title">Actions</span>

                  <button
                    type="button"
                    className="flyout-item"
                    onClick={() => {
                      navigate('/cameras/new');
                      setIsMenuOpen(false);
                    }}
                  >
                    <FontAwesomeIcon icon={faPlus} className="item-icon" />
                    <span>New camera</span>
                  </button>

                  <button
                    type="button"
                    className="flyout-item"
                    onClick={() => {
                      // Handle export report logic
                      setIsMenuOpen(false);
                    }}
                  >
                    <FontAwesomeIcon icon={faFileLines} className="item-icon" />
                    <span>Export report</span>
                  </button>

                  <button
                    type="button"
                    className="flyout-item"
                    onClick={() => {
                      // Handle manage settings logic
                      setIsMenuOpen(false);
                    }}
                  >
                    <FontAwesomeIcon icon={faWrench} className="item-icon" />
                    <span>Manage settings</span>
                  </button>
                </div>

                {/* External Links Section */}
                <div className="flyout-section">
                  <span className="flyout-title">External links</span>

                  <a
                    href="https://weather.gc.ca"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flyout-item"
                  >
                    <FontAwesomeIcon icon={faCloudSun} className="item-icon" />
                    <span>Weather</span>
                    <FontAwesomeIcon icon={faUpRightFromSquare} className="external-icon" />
                  </a>

                  <a
                    href="#electrical-outages"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flyout-item"
                  >
                    <FontAwesomeIcon icon={faBolt} className="item-icon" />
                    <span>Electrical outages</span>
                    <FontAwesomeIcon icon={faUpRightFromSquare} className="external-icon" />
                  </a>

                  <a
                    href="#forest-fires"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flyout-item"
                  >
                    <FontAwesomeIcon icon={faFire} className="item-icon" />
                    <span>Forest fires</span>
                    <FontAwesomeIcon icon={faUpRightFromSquare} className="external-icon" />
                  </a>
                </div>
              </div>
            )}
          </div>
        </div>


        {error && (
          <div className="cameras-error">
            {error}
          </div>
        )}

        <div className="camera-header-divider" />

        {/* SEARCH ROW */}
        <div className="camera-search-row">
          <div className="camera-search">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search"
            />
            <FontAwesomeIcon icon={faMagnifyingGlass} />
            {search && (
              <button type="button" onClick={() => setSearch('')}>
                <FontAwesomeIcon icon={faXmark} />
              </button>
            )}
          </div>

          <div className="view-mode-toggle">
            <button
              type="button"
              className={viewMode === 'list' ? 'active' : ''}
              onClick={() => setViewMode('list')}
            >
              List
            </button>
            <button
              type="button"
              className={viewMode === 'compact' ? 'active' : ''}
              onClick={() => setViewMode('compact')}
            >
              Compact
            </button>
          </div>
        </div>

        {/* MAIN CAMERA CONTENT */}
        <main className="camera-content">

          {/* CAMERA GROUPS */}
          <div className="camera-groups">

            {Object.entries(cameraGroups).map(
              ([groupName, groupCameras]) => (
                <CameraHighwayGroup
                  key={groupName}
                  highwayName={groupName}
                  cameras={groupCameras}
                  onSelectCamera={(camera) => {
                    navigate(`/cameras/${camera.id}`, {
                      state: { camera },
                    });
                  }}
                  onViewOnDriveBC={(camera) => {
                    // TODO: wire up "View on DriveBC" action
                  }}
                  onServiceRequest={(camera) => {
                    // TODO: wire up service request action
                  }}
                  onClone={(camera) => {
                    // TODO: wire up clone action
                  }}
                />
              )
            )}

          </div>


          {filteredCameras.length === 0 && (
            <div className="camera-no-results">
              No cameras match the search and
              filtering criteria selected.
            </div>
          )}

        </main>

      </div>
    </div>
  );
}


/*
 * Reusable filter section.
 */
function CameraFilterSection({
  title,
  value,
  options,
  onChange,
}) {
  const [open, setOpen] = useState(true);

  return (
    <div className="camera-filter-section">

      <button
        type="button"
        className="camera-filter-label"
        onClick={() => setOpen(!open)}
      >
        <span>{title}</span>

        <FontAwesomeIcon
          icon={faChevronDown}
          className={
            open ? '' : 'collapsed'
          }
        />
      </button>

      {open && options.length > 0 && (
        <div className="camera-filter-options">

          {options.map((option) => (
            <button
              key={option}
              type="button"
              className={
                value === option
                  ? 'active'
                  : ''
              }
              onClick={() =>
                onChange(
                  value === option
                    ? ''
                    : option
                )
              }
            >
              {option}
            </button>
          ))}

        </div>
      )}

    </div>
  );
}