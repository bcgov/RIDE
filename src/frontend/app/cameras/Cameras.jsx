
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
import CameraForm from './CameraForm';
import './Cameras.scss';


/*
 * Return the camera image URL.
 *
 * Change this function if your API uses a different field for
 * the current camera image.
 */
function getCameraImage(camera) {
  return (
    camera.locations_thumbnail_map_url
  );
}


/*
 * Return a useful display name for the camera highway group.
 */
function getCameraName(camera) {
  return (
    camera.ccp_camera_highway ||
    'Unnamed camera'
  );
}


/*
 * Return the location name shown under a highway group.
 */
function getCameraLocation(camera) {
  return (
    getCameraName(camera)
  );
}


/*
 * Return the direction of a camera.
 */
function getCameraDirection(camera) {
  return (
    camera.locations_orientation
  );
}


/*
 * Camera card.
 */
function CameraCard({ camera, onEdit, onDelete, onSelectCamera }) {
  const imageUrl = getCameraImage(camera);
  const direction = getCameraDirection(camera);

  return (
    <div className="camera-card">
      <div className="camera-card-header">
        <span className="camera-direction">
          {direction || 'Camera'}
        </span>

        <span
          className={`camera-switch ${
            camera.is_on ? 'camera-switch--on' : ''
          }`}
        >
          <span />
        </span>
      </div>

      <div
        className="camera-image"
        onClick={() => onSelectCamera?.(camera)}
        style={{ cursor: 'pointer' }}
      >
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={getCameraName(camera)}
          />
        ) : (
          <div className="camera-image-placeholder">
            No image
          </div>
        )}

        {camera.marked_stale && (
          <span className="camera-status camera-status--stale">
            Stale
          </span>
        )}

        {camera.marked_delayed && (
          <span className="camera-status camera-status--delayed">
            Delayed
          </span>
        )}
      </div>

      <div className="camera-card-actions">
        <button
          type="button"
          onClick={() => onEdit(camera)}
        >
          Edit
        </button>

        <button
          type="button"
          onClick={() => onDelete(camera.id)}
        >
          Delete
        </button>
      </div>
    </div>
  );
}


/*
 * A group of cameras belonging to one location.
 */
function CameraLocation({
  cameras,
  locationName,
  onEdit,
  onDelete,
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

  return (
    <section className="camera-location">
      <div className="camera-location-header">
        {/* Title and metadata container */}
        <div className="camera-location-title-group">
          <div className="camera-location-meta">
            <h4 className="camera-landmark">{cameras[0]?.ccp_camera_title}</h4>
            <div className="camera-update-time">
              <FontAwesomeIcon icon={faRotate} />
              <span>5 minutes</span>
            </div>
          </div>
        </div>

        {/* Menu button aligned to the far right */}
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
                    onViewOnDriveBC?.(locationName, cameras);
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
                    onServiceRequest?.(locationName, cameras);
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
                    onClone?.(locationName, cameras);
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
        {cameras.map((camera) => (
          <CameraCard
            key={camera.id}
            camera={camera}
            onEdit={onEdit}
            onDelete={onDelete}
            onSelectCamera={onSelectCamera}
          />
        ))}
      </div>
    </section>
  );
}

/*
 * Highway group.
 */
function CameraHighwayGroup({
  highwayName,
  cameras,
  onEdit,
  onDelete,
  onSelectCamera,
}) {
  const locations = useMemo(() => {
    const grouped = {};

    cameras.forEach((camera) => {
      const location = getCameraLocation(camera);

      if (!grouped[location]) {
        grouped[location] = [];
      }

      grouped[location].push(camera);
    });

    return grouped;
  }, [cameras]);

  return (
    <section className="camera-highway-group">
      <h2>{highwayName}</h2>

      {Object.entries(locations).map(
        ([locationName, locationCameras]) => (
          <CameraLocation
            key={locationName}
            locationName={locationName}
            cameras={locationCameras}
            onEdit={onEdit}
            onDelete={onDelete}
            onSelectCamera={onSelectCamera}
          />
        )
      )}
    </section>

  );
}

export default function Cameras() {
  const [cameras, setCameras] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [editingCamera, setEditingCamera] = useState(null);
  const [showForm, setShowForm] = useState(false);

  const [search, setSearch] = useState('');

  const [region, setRegion] = useState('');
  const [highway, setHighway] = useState('');
  const [status, setStatus] = useState('');
  const [visibility, setVisibility] = useState('');
  const [cameraType, setCameraType] = useState('');
  const [communicationMethod, setCommunicationMethod] = useState('');
  const [powerSource, setPowerSource] = useState('');
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


  const createCamera = async (camera) => {
    const response = await fetch('/api/cameras/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(camera),
    });

    if (!response.ok) {
      throw new Error(
        `Failed to create camera: ${response.status}`
      );
    }

    await loadCameras();
    setShowForm(false);
  };


  const updateCamera = async (camera) => {
    const response = await fetch(
      `/api/cameras/${camera.id}/`,
      {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(camera),
      }
    );

    if (!response.ok) {
      throw new Error(
        `Failed to update camera: ${response.status}`
      );
    }

    await loadCameras();
    setEditingCamera(null);
  };


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


  /*
   * Get unique values for filters.
   */
  const regions = useMemo(() => {
    return [
      ...new Set(
        cameras
          .map((camera) =>
            camera.region_name ||
            camera.region ||
            camera.locations_region ||
            ''
          )
          .filter(Boolean)
      ),
    ].sort();
  }, [cameras]);


  const highways = useMemo(() => {
    return [
      ...new Set(
        cameras
          .map((camera) =>
            camera.highway ||
            camera.highway_group ||
            ''
          )
          .filter(Boolean)
      ),
    ].sort();
  }, [cameras]);

  const filteredCameras = useMemo(() => {
    const term = search.trim().toLowerCase();

    return cameras.filter((camera) => {
      const cameraRegion =
        camera.region_name ||
        camera.region ||
        camera.locations_region ||
        '';

      const cameraHighway =
        camera.highway ||
        camera.highway_group ||
        '';

      /*
      * Search.
      */
      if (term) {
        // Extract and combine all view descriptions and orientations
        const viewsSearchable = (camera.views || [])
          .map((view) => `${view.description || ''} ${view.orientation || ''} ${view.direction || ''}`)
          .join(' ');

        const searchable = [
          camera.ccp_camera_title,
          camera.ccp_camera_description,
          camera.id,
          camera.name,
          camera.caption,
          camera.cam_internet_name,
          camera.cam_internet_caption,
          camera.location,
          camera.highway,
          camera.highway_group,
          camera.direction,
          camera.locations_highway,
          camera.locations_region,
          camera.locations_orientation,
          camera.locations_thumbnail_map_url,
          viewsSearchable, // Added view descriptions here
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();

        if (!searchable.includes(term)) {
          return false;
        }
      }

      /*
      * Region.
      */
      if (
        region &&
        cameraRegion !== region
      ) {
        return false;
      }

      /*
      * Highway.
      */
      if (
        highway &&
        cameraHighway !== highway
      ) {
        return false;
      }

      /*
      * Status.
      */
      if (status === 'online' && !camera.is_on) {
        return false;
      }

      if (status === 'offline' && camera.is_on) {
        return false;
      }

      if (
        status === 'stale' &&
        !camera.marked_stale
      ) {
        return false;
      }

      if (
        status === 'delayed' &&
        !camera.marked_delayed
      ) {
        return false;
      }

      /*
      * Visibility.
      */
      if (
        visibility === 'visible' &&
        camera.should_appear === false
      ) {
        return false;
      }

      if (
        visibility === 'hidden' &&
        camera.should_appear !== false
      ) {
        return false;
      }

      /*
      * Camera type.
      */
      if (
        cameraType &&
        camera.camera_type !== cameraType
      ) {
        return false;
      }

      /*
      * Communication method.
      */
      if (
        communicationMethod &&
        camera.communication_method !== communicationMethod
      ) {
        return false;
      }

      /*
      * Power source.
      */
      if (
        powerSource &&
        camera.power_source !== powerSource
      ) {
        return false;
      }

      return true;
    });
  }, [
    cameras,
    search,
    region,
    highway,
    status,
    visibility,
    cameraType,
    communicationMethod,
    powerSource,
  ]);


  /*
   * Group cameras by highway.
   */
  const cameraGroups = useMemo(() => {
    const groups = {};

    filteredCameras.forEach((camera) => {
      const groupName =
        camera.ccp_camera_highway ||
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
    setCommunicationMethod('');
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
          >
            Clear all
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
            'online',
            'offline',
            'stale',
            'delayed',
          ]}
          onChange={setStatus}
        />


        <CameraFilterSection
          title="Visibility"
          value={visibility}
          options={[
            'visible',
            'hidden',
          ]}
          onChange={setVisibility}
        />


        <CameraFilterSection
          title="Camera types"
          value={cameraType}
          options={[]}
          onChange={setCameraType}
        />


        <CameraFilterSection
          title="Communication methods"
          value={communicationMethod}
          options={[]}
          onChange={setCommunicationMethod}
        />


        <CameraFilterSection
          title="Power sources"
          value={powerSource}
          options={[]}
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

          <button
            type="button"
            className="add-camera-button"
            onClick={() => {
              setEditingCamera(null);
              setShowForm(true);
            }}
          >
            Add Camera
          </button>
        </div>


        {error && (
          <div className="cameras-error">
            {error}
          </div>
        )}


        {showForm && (
          <CameraForm
            onSubmit={createCamera}
            onCancel={() => setShowForm(false)}
          />
        )}


        {editingCamera && (
          <CameraForm
            camera={editingCamera}
            onSubmit={updateCamera}
            onCancel={() =>
              setEditingCamera(null)
            }
          />
        )}


        {/* SEARCH */}
        <div className="camera-search">
          <input
            type="text"
            value={search}
            onChange={(e) =>
              setSearch(e.target.value)
            }
            placeholder="Search"
          />

          <FontAwesomeIcon
            icon={faMagnifyingGlass}
          />

          {search && (
            <button
              type="button"
              onClick={() => setSearch('')}
            >
              <FontAwesomeIcon icon={faXmark} />
            </button>
          )}
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
                onEdit={(camera) => {
                  setShowForm(false);
                  setEditingCamera(camera);
                }}
                onDelete={deleteCamera}
                onSelectCamera={(camera) => {
                  navigate(`/cameras/${camera.id}`, {
                    state: { camera },
                  });
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