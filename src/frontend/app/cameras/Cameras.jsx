import { useEffect, useMemo, useState, useRef, useContext } from 'react';
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
import { faVideoSlash, faBroomWide, faEyeSlash } from '@fortawesome/pro-solid-svg-icons';
import { faCheckCircle, faClock } from '@fortawesome/pro-regular-svg-icons';
import ServiceRequestModal from './ServiceRequestModal';
import DisableViewModal from './DisableViewModal.jsx';
import ExportReportModal from './ExportReportModal.jsx';
import Toast from './Toast.jsx';
import { AuthContext } from '../contexts';
import { getCookie } from '../shared/helpers.js';
import './Cameras.scss';
import { API_HOST } from '../env.js';

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


function CameraViewCard({ view, camera, onSelectCamera, onToggleView }) {
  const direction = orientationLabel(view.orientation);
  const imageUrl = view.image_url || '';
  const [imgFailed, setImgFailed] = useState(false);
  const isOn = !!view.is_on;
  const isStale = view.marked_stale ?? camera.marked_stale;
  const isDelayed = view.marked_delayed ?? camera.marked_delayed;
  const isUnavailable = !imageUrl || imgFailed;

  return (
    <div className="camera-card">
      <div className="camera-card-header">
        <span className="camera-direction">{direction || 'Camera'}</span>
        <button
          type="button"
          className={`camera-switch ${isOn ? 'camera-switch--on' : ''}`}
          onClick={(e) => {
            e.stopPropagation(); // prevent triggering onSelectCamera on the parent button
            onToggleView?.(camera, view);
          }}
          aria-label={isOn ? 'Turn view off' : 'Turn view on'}
          aria-pressed={isOn}
        >
          <span />
        </button>
      </div>

      <button
        type="button"
        className="camera-image"
        onClick={() => onSelectCamera?.(camera, view)}
        style={{ cursor: 'pointer' }}
      >
        {isUnavailable ? (
          <div className="camera-image-placeholder">
            <FontAwesomeIcon icon={faVideoSlash} />
            <span className="camera-status camera-status--unavailable">
              Unavailable
            </span>
          </div>
        ) : (
          <img
            src={imageUrl}
            alt={`${getCameraName(camera)} ${direction}`}
            onError={() => setImgFailed(true)}
          />
        )}

          {!isUnavailable && !isOn && (
            <span className="camera-off-badge">
              <FontAwesomeIcon icon={faEyeSlash} />
            </span>
          )}

        {!isUnavailable && isStale && (
          <span className="camera-status camera-status--stale">Stale</span>
        )}

        {!isUnavailable && isDelayed && (
          <span className="camera-status camera-status--delayed">Delayed</span>
        )}
      </button>
    </div>
  );
}

const formatRelativeTime = (dateString, now = Date.now()) => {
  if (!dateString) {
    return 'Unknown';
  }

  const updated = new Date(dateString).getTime();

  const diffSeconds = Math.floor(
    (now - updated) / 1000
  );

  if (diffSeconds < 60) {
    return 'Just now';
  }

  const minutes = Math.floor(diffSeconds / 60);

  if (minutes === 1) {
    return '1 minute ago';
  }

  if (minutes < 60) {
    return `${minutes} minutes ago`;
  }

  const hours = Math.floor(minutes / 60);

  if (hours === 1) {
    return '1 hour ago';
  }

  return `${hours} hours ago`;
};


function RelativeUpdateTime({ lastUpdated }) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setNow(Date.now());
    }, 60 * 1000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, []);

  const relativeTime = formatRelativeTime(lastUpdated, now);

  return <span>{relativeTime}</span>;
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
  isCameraRole,
  isCameraAdmin,
  onToggleView,
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

  const viewsList = (
    camera.views ||
    camera.cameraview_set ||
    []
  ).filter((view) => !!view.image_url);

  const latestUpdated = viewsList
    .map((view) => view.last_update_modified)
    .filter(Boolean)
    .sort(
      (a, b) =>
        new Date(b) - new Date(a)
    )[0];

  return (
    <section className="camera-location">
      <div className="camera-location-header">
        <div className="camera-location-title-group">
          <div className="camera-location-meta">
            <h4 className="camera-landmark">{camera.title}</h4>
            <div className="camera-update-time">
              <FontAwesomeIcon icon={faRotate} />
              <RelativeUpdateTime lastUpdated={latestUpdated} />
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
                {/* Available to all users */}
                <button
                  type="button"
                  className="flyout-item"
                  onClick={() => {
                    setIsMenuOpen(false);
                    onViewOnDriveBC?.(camera);
                  }}
                >
                  <FontAwesomeIcon
                    icon={faUpRightFromSquare}
                    className="item-icon"
                  />
                  <span>View on DriveBC</span>
                </button>

                {/* Camera Admin only */}
                {isCameraAdmin && (
                  <button
                    type="button"
                    className="flyout-item"
                    onClick={() => {
                      setIsMenuOpen(false);
                      onServiceRequest?.(camera);
                    }}
                  >
                    <FontAwesomeIcon
                      icon={faWrench}
                      className="item-icon"
                    />
                    <span>Service request</span>
                  </button>
                )}

                {/* Camera Admin only */}
                {isCameraAdmin && (
                  <button
                    type="button"
                    className="flyout-item"
                    onClick={() => {
                      setIsMenuOpen(false);
                      onClone?.(camera);
                    }}
                  >
                    <FontAwesomeIcon
                      icon={faPlus}
                      className="item-icon"
                    />
                    <span>Clone camera location</span>
                  </button>
                )}
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
            onToggleView={onToggleView}
          />
        ))}
      </div>
    </section>
  );
}

/*
 * Highway group — maps each camera straight to a CameraRow.
 */
function CameraHighwayGroup({
  highwayName,
  cameras,
  onSelectCamera,
  onViewOnDriveBC,
  onServiceRequest,
  onClone,
  isCameraRole,
  isCameraAdmin,
  onToggleView,
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
          isCameraRole={isCameraRole}
          isCameraAdmin={isCameraAdmin}
          onToggleView={onToggleView}
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
  const [serviceRequestCamera, setServiceRequestCamera] = useState(null);
  const [isServiceRequestModalOpen, setIsServiceRequestModalOpen] = useState(false);
  const [serviceRequestSent, setServiceRequestSent] = useState(false);
  const { authContext } = useContext(AuthContext);
  const isCameraRole = !!authContext.is_camera_role || !!authContext.is_camera_admin;
  const isCameraAdmin = !!authContext.is_camera_admin;
  const [disableModalTarget, setDisableModalTarget] = useState(null);
  const [toast, setToast] = useState(null);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const navigate = useNavigate();

  const handleToggleView = (camera, view) => {
    const turningOff = !!view.is_on;

    if (turningOff) {
      // Don't toggle yet — collect the disable reason first
      setDisableModalTarget({ camera, view });
      return;
    }

    // Turning on — no form needed, just toggle + confirm
    performToggle(camera, view, true, () => {
      setToast({ message: 'View enabled on DriveBC', variant: 'enabled' });
    });
  };

  const performToggle = async (camera, view, newIsOn, onSuccess, extraFields = {}) => {
    // Optimistic update
    setCameras((prev) =>
      prev.map((cam) =>
        cam.id !== camera.id
          ? cam
          : {
              ...cam,
              views: (cam.views || cam.cameraview_set || []).map((v) =>
                v.id === view.id ? { ...v, is_on: newIsOn } : v
              ),
            }
      )
    );

    try {
      const updatedViews = (camera.views || camera.cameraview_set || []).map((v) => ({
        id: v.id,
        is_on: v.id === view.id ? newIsOn : v.is_on,
        ...(v.id === view.id ? extraFields : {}),
      }));

      const response = await fetch(`${API_HOST}/api/cameras/${camera.id}/`, {
        method: 'PATCH',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRFToken': getCookie('csrftoken'),
        },
        body: JSON.stringify({ views: updatedViews }),
      });

      if (!response.ok) {
        const errorBody = await response.json().catch(() => null);
        console.error('Toggle view failed:', response.status, errorBody);
        throw new Error(`Failed to toggle view: ${response.status}`);
      }

      onSuccess?.();
    } catch (error) {
      console.error('Failed to toggle view:', error);

      // Roll back on failure
      setCameras((prev) =>
        prev.map((cam) =>
          cam.id !== camera.id
            ? cam
            : {
                ...cam,
                views: (cam.views || cam.cameraview_set || []).map((v) =>
                  v.id === view.id ? { ...v, is_on: view.is_on } : v
                ),
              }
        )
      );
    }
  };

  const handleConfirmDisable = async ({ reason, shortDescription, longDescription }) => {
    const { camera, view } = disableModalTarget;

    await performToggle(
      camera,
      view,
      false,
      () => {
        setDisableModalTarget(null);
        setToast({ message: 'View disabled on DriveBC', variant: 'disabled' });
      },
      {
        disabled_reason: reason,
        disabled_short_description: shortDescription,
        disabled_long_description: longDescription,
      }
    );
  };

  const loadCameras = async () => {
    try {
      setLoading(true);
      setError(null);

      const [cameraResponse, driveBCResponse] = await Promise.all([
        fetch(`${API_HOST}/api/cameras/`, {
          credentials: 'include',
          headers: {
            'Accept': 'application/json',
          },
        }),
        loadDriveBCWebcams(),
      ]);

      if (!cameraResponse.ok) {
        throw new Error(
          `Failed to load cameras: ${cameraResponse.status}`
        );
      }

      const cameraData = await cameraResponse.json();
      const driveBCWebcams = driveBCResponse;
      const driveBCWebcamMap = new Map(
        driveBCWebcams.map((webcam) => [
          String(webcam.id),
          webcam,
        ])
      );

      /*
      * Merge DriveBC live status into each camera view.
      */
      const mergedCameras = cameraData.map((camera) => ({
        ...camera,

        views: (camera.views || camera.cameraview_set || []).map(
          (view) => {
            const webcam = driveBCWebcamMap.get(
              String(view.drivebc_webcam_id)
            );

            if (!webcam) {
              return view;
            }

            return {
              ...view,

              is_on: view.is_on,

              marked_stale: webcam.marked_stale,

              marked_delayed: webcam.marked_delayed,

              last_update_modified:
                webcam.last_update_modified,

              last_update_attempt:
                webcam.last_update_attempt,

              update_period_mean:
                webcam.update_period_mean,

              image_url: view.drivebc_webcam_id
                ? `${API_HOST}/api/cameras/${camera.id}/image-proxy/?webcam_id=${view.drivebc_webcam_id}&t=${Date.now()}`
                : view.image_url,
            };
          }
        ),
      }));

      setCameras(mergedCameras);
    } catch (err) {
      console.log('Failed to load cameras:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const refreshDriveBCData = async () => {
    try {
      const driveBCWebcams = await loadDriveBCWebcams();

      const driveBCWebcamMap = new Map(
        driveBCWebcams.map((webcam) => [
          String(webcam.id),
          webcam,
        ])
      );

      setCameras((currentCameras) =>
        currentCameras.map((camera) => ({
          ...camera,

          views: (
            camera.views ||
            camera.cameraview_set ||
            []
          ).map((view) => {
            const webcam = driveBCWebcamMap.get(
              String(view.drivebc_webcam_id)
            );

            if (!webcam) {
              return view;
            }

            return {
              ...view,

              marked_stale: webcam.marked_stale,
              marked_delayed: webcam.marked_delayed,

              last_update_modified:
                webcam.last_update_modified,

              last_update_attempt:
                webcam.last_update_attempt,

              update_period_mean:
                webcam.update_period_mean,

              image_url: view.drivebc_webcam_id
                ? `${API_HOST}/api/cameras/${camera.id}/image-proxy/?webcam_id=${view.drivebc_webcam_id}&t=${Date.now()}`
                : view.image_url,
            };
          }),
        }))
      );
    } catch (error) {
      console.error(
        'Failed to refresh DriveBC data:',
        error
      );
    }
  };

  const loadDriveBCWebcams = async () => {
    const response = await fetch(
      `/drivebc-api/api/webcams/`
    );
      if (!response.ok) {
        throw new Error(
          `Failed to load DriveBC webcams: ${response.status}`
        );
      }

      return response.json();
    };


  useEffect(() => {
    loadCameras();
  }, []);

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      refreshDriveBCData();
    }, 60 * 1000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, []);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 4000);
    return () => window.clearTimeout(timer);
  }, [toast]);

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
    ].sort((a, b) => a.localeCompare(b));
  }, [cameras]);

  const cameraTypes = useMemo(() => {
    return [
      ...new Set(
        cameras
          .map((camera) => camera.camera_type?.name)
          .filter(Boolean)
      ),
    ].sort((a, b) => a.localeCompare(b));
  }, [cameras]);

  const communicationTypes = useMemo(() => {
    return [
      ...new Set(
        cameras
          .map((camera) => camera.communication_type?.name)
          .filter(Boolean)
      ),
    ].sort((a, b) => a.localeCompare(b));
  }, [cameras]);

  const powerSources = useMemo(() => {
    return [
      ...new Set(
        cameras
          .map((camera) => camera.power_source?.name)
          .filter(Boolean)
      ),
    ].sort((a, b) => a.localeCompare(b));
  }, [cameras]);


  const highways = useMemo(() => {
    return [
      ...new Set(
        cameras
          .map((camera) => camera.road?.name)
          .filter(Boolean)
      ),
    ].sort((a, b) => a.localeCompare(b));
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
   * CameraHighwayGroup renders one row per camera.
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

  if (loading) {
    return (
      <div className="cameras-loading">
        Loading cameras...
      </div>
    );
  }

  const handleExportReport = async () => {
    try {
      // 1. Retrieve saved field selections from the backend
      const settingsResponse = await fetch(
         `${API_HOST}/api/camera-report-settings/fields/`, 
         { 
          method: 'GET', 
          credentials: 'include', 
        } 
        ); 

        if (!settingsResponse.ok) { 
            throw new Error( `Failed to retrieve report fields: ${settingsResponse.status}` );
        } 
         
        const settings = await settingsResponse.json(); 
        const selectedFields = settings.selected_fields || [];

      // 2. Build URL with fields query parameter if selections exist
      const url = new URL(`${API_HOST}/api/cameras/export/`);
      if (selectedFields.length > 0) {
        url.searchParams.append('fields', selectedFields.join(','));
      }

      // 3. Fetch CSV report with configured fields
      const response = await fetch(url.toString(), {
        method: 'GET',
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error(`Failed to export report: ${response.status}`);
      }

      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = `camera-report-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(blobUrl);

      setIsExportModalOpen(false);
      setToast({ message: 'Report exported successfully', variant: 'success' });
    } catch (err) {
      console.error('Export failed:', err);
      setToast({ message: 'Failed to export report', variant: 'danger' });
    }
  };

  

  return (
    <>
    
      <div className="cameras-page">

        {/* LEFT FILTER PANEL */}
        <aside className="camera-filters">

          <div className="camera-filters-header">
            <div className="camera-filters-title">
              {/* <FontAwesomeIcon icon={faSliders} /> */}
              <div className="filter-icon-wrapper">
                <FontAwesomeIcon icon={faSliders} />
              </div>
              <span className="filter-label">Filters</span>
            </div>

            <button
              type="button"
              onClick={clearFilters}
              className="clear-filters-btn"
            >
              <FontAwesomeIcon icon={faBroomWide} />
              <span className="clear-label">Clear all</span>
            </button>
          </div>

          <CameraFilterSection
            title="Regions"
            value={region}
            options={regions}
            onChange={setRegion}
          />


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
                  {isCameraAdmin && (
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
                          setIsExportModalOpen(true);
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
                          navigate('/cameras/settings?setting=service-providers');
                          setIsMenuOpen(false);
                        }}
                      >
                        <FontAwesomeIcon icon={faWrench} className="item-icon" />
                        <span>Manage settings</span>
                      </button>
                    </div>
                  )}

                  {/* External Links Section */}
                  <div className="flyout-section">
                    <span className="flyout-title">External links</span>

                    <a
                      href="https://timelapse.drivebc.ca"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flyout-item"
                    >
                      <FontAwesomeIcon icon={faClock} className="item-icon" />
                      <span>Timelapse</span>
                      <FontAwesomeIcon icon={faUpRightFromSquare} className="external-icon" />
                    </a>
                    
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
                    isCameraRole={isCameraRole}
                    isCameraAdmin={isCameraAdmin}
                    onToggleView={handleToggleView}
                    onSelectCamera={(camera, view) => {
                      const viewQuery = view?.id ? `?view=${view.id}` : '';
                      navigate(
                        `/cameras/${camera.id}${viewQuery}`,
                        { state: { camera, selectedViewId: view?.id } }
                      );
                    }}

                    onViewOnDriveBC={(camera) => {
                      window.open(
                        `https://drivebc.ca/cameras/${camera.views[0].drivebc_webcam_id}`,
                        '_blank',
                        'noopener,noreferrer'
                      );
                    }}

                    onServiceRequest={(camera) => {
                      setServiceRequestCamera(camera);
                      setIsServiceRequestModalOpen(true);
                    }}
                    
                    onClone={async (camera) => {
                      try {
                        const response = await fetch(
                          `${API_HOST}/api/cameras/${camera.id}/clone/`,
                          {
                            method: 'POST',
                            headers: {
                              'Content-Type': 'application/json',
                            },
                          }
                        );

                        if (!response.ok) {
                          throw new Error(
                            `Failed to clone camera location: ${response.status}`
                          );
                        }

                        const clonedCamera = await response.json();

                        // Go directly to edit page for the newly cloned location
                        navigate(`/cameras/${clonedCamera.id}/edit`);
                      } catch (error) {
                        console.error('Clone camera location failed:', error);
                        setError(error.message);
                      }
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

      {isServiceRequestModalOpen && (
        <ServiceRequestModal
          camera={serviceRequestCamera}
          onClose={() => {
            setIsServiceRequestModalOpen(false);
            setServiceRequestCamera(null);
          }}
          onSuccess={() => {
            setServiceRequestSent(true);

            window.setTimeout(() => {
              setServiceRequestSent(false);
            }, 4000);
          }}
        />
      )}

    {/* SUCCESS TOAST */}
    {serviceRequestSent && (
      <div className="service-request-toast">
        <FontAwesomeIcon icon={faCheckCircle} />

        <span>Service request sent successfully</span>

        <button
          type="button"
          onClick={() => setServiceRequestSent(false)}
          aria-label="Close notification"
        >
          <FontAwesomeIcon icon={faXmark} />
        </button>
      </div>
    )}

    {disableModalTarget && (
      <DisableViewModal
        camera={disableModalTarget.camera}
        view={disableModalTarget.view}
        onClose={() => setDisableModalTarget(null)}
        onConfirm={handleConfirmDisable}
      />
    )}

    {toast && (
      <Toast
        message={toast.message}
        variant={toast.variant}
        onClose={() => setToast(null)}
      />
    )}

    {isExportModalOpen && (
      <ExportReportModal
        onClose={() => setIsExportModalOpen(false)}
        onConfirm={handleExportReport}
      />
    )}

    </>
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