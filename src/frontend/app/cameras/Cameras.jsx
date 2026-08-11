import { useEffect, useMemo, useState } from 'react';

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faMagnifyingGlass,
  faXmark,
  faSliders,
  faChevronDown,
  faRotate,
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
    camera.image_url ||
    camera.imageUrl ||
    camera.image ||
    camera.cam_image_url ||
    camera.camImageUrl ||
    camera.locations_thumbnail_map_url
  );
}


/*
 * Return a useful display name for the camera.
 */
function getCameraName(camera) {
  return (
    camera.name ||
    camera.cam_internet_name ||
    camera.cam_internet_caption ||
    camera.locations_highway ||
    'Unnamed camera'
  );
}


/*
 * Return the location name shown under a highway group.
 */
function getCameraLocation(camera) {
  return (
    camera.location ||
    camera.cam_internet_caption ||
    getCameraName(camera)
  );
}


/*
 * Return the direction of a camera.
 */
function getCameraDirection(camera) {
  return (
    camera.direction ||
    camera.cam_direction ||
    camera.locations_orientation
  );
}


/*
 * Camera card.
 */
function CameraCard({ camera, onEdit, onDelete }) {
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

      <div className="camera-image">
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
}) {
  return (
    <section className="camera-location">
      <div className="camera-location-title">
        <h3>{locationName}</h3>

        <div className="camera-update-time">
          <FontAwesomeIcon icon={faRotate} />
          <span>5 minutes</span>
        </div>
      </div>

      <div className="camera-cards">
        {cameras.map((camera) => (
          <CameraCard
            key={camera.id}
            camera={camera}
            onEdit={onEdit}
            onDelete={onDelete}
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


  /*
   * Filter cameras.
   */
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
        const searchable = [
          camera.id,
          camera.name,
          camera.caption,
          camera.cam_internet_name,
          camera.cam_internet_caption,
          camera.location,
          camera.highway,
          camera.highway_group,
          camera.direction,
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
       *
       * This assumes your API has camera_type.
       * Remove this filter until that field exists if necessary.
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
        camera.communication_method !==
          communicationMethod
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
        camera.highway_group ||
        camera.highway ||
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


      {/* MAIN CAMERA CONTENT */}
      <main className="camera-content">

        <div className="cameras-header">
          <div>
            <h1>Cameras</h1>

            <div className="camera-count">
              Filtered to {filteredCameras.length}{' '}
              camera locations
            </div>
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