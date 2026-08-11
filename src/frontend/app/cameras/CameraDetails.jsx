import React, { useState, useEffect, useMemo, useRef } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { useParams, useNavigate, useSearchParams, useLocation } from "react-router";
import {
  faPenToSquare,
  faWrench,
  faTrash,
  faEllipsisVertical,
  faInfoCircle,
  faClock,
  faExpand,
  faFloppyDisk,
  faMagnifyingGlass,
  faChevronDown,
  faChevronRight,
  faUpRightFromSquare,
  faCloudSun,
  faBolt,
  faFire,
} from '@fortawesome/pro-regular-svg-icons';

import { faVideoSlash } from '@fortawesome/pro-solid-svg-icons';
import { getCookie } from "../shared/helpers.js";
import BasicsTab from './BasicsTab';
import SetupTab from './SetupTab';
import ViewsTab from './ViewsTab';
import NotesTab from './NotesTab';
import LogsTab from './LogsTab';
import HistoryTab from './HistoryTab';
import './CameraDetails.scss';
import DeleteCameraModal from './DeleteCameraModal.jsx';
import Toast from './Toast.jsx';
import TimelapseModal from './TimelapseModal.jsx';

export default function CameraDetails({ onBack }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const location = useLocation();
  const initialViewId =
    searchParams.get('view') ||
    location.state?.selectedViewId ||
    null;

  // Default template for a brand-new camera
  const DEFAULT_VIEWS = [
    {
      id: 'new-1',
      orientation: 'NORTH',
      description: '',
      image_url: '',
      is_on: false,
      is_default: false,
    },
    {
      id: 'new-2',
      orientation: 'SOUTH',
      description: '',
      image_url: '',
      is_on: false,
      is_default: false,
    },
    {
      id: 'new-3',
      orientation: 'EAST',
      description: '',
      image_url: '',
      is_on: false,
      is_default: false,
    },
    {
      id: 'new-4',
      orientation: 'WEST',
      description: '',
      image_url: '',
      is_on: false,
      is_default: false,
    },
    {
      id: 'new-5',
      orientation: 'NORTHEAST',
      description: '',
      image_url: '',
      is_on: false,
      is_default: false,
    },
    {
      id: 'new-6',
      orientation: 'NORTHWEST',
      description: '',
      image_url: '',
      is_on: false,
      is_default: false,
    },
    {
      id: 'new-7',
      orientation: 'SOUTHEAST',
      description: '',
      image_url: '',
      is_on: false,
      is_default: false,
    },
    {
      id: 'new-8',
      orientation: 'SOUTHWEST',
      description: '',
      image_url: '',
      is_on: false,
      is_default: false,
    },
  ];

  // ---------------------------------------------------------
  // Navigation Panel State
  // ---------------------------------------------------------

  const [allCameras, setAllCameras] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedRegions, setExpandedRegions] = useState({});
  const [expandedHighways, setExpandedHighways] = useState({});

  // ---------------------------------------------------------
  // Details State
  // ---------------------------------------------------------

  const [camera, setCamera] = useState(null);
  const [activeTab, setActiveTab] = useState('Basics');
  const [selectedViewId, setSelectedViewId] = useState(initialViewId);
  const [basicsData, setBasicsData] = useState({
    title: '',
    description: '',
    businessArea: '',
    region: '',
    road: null,
    roadMaintenanceContractor: '',
    electricalContractor: '',
    latitude: '',
    longitude: '',
    elevation: '',
    imageWatermark: '',
    cameraCredit: '',
    cameraCreditUrl: '',
  });

  const [setupData, setSetupData] = useState({
    cameraId: '',
    cameraType: '',
    cameraMake: '',
    connectionType: '',
    connectionProtocol: '',
    communicationType: '',
    powerSource: '',
    communicationDevice: '',
    antenna: '',
    serviceProvider: '',
  });

  const [isEditingName, setIsEditingName] = useState(false);
  const [cameraName, setCameraName] = useState('');
  const [mainImgFailed, setMainImgFailed] = useState(false);
  const [failedThumbs, setFailedThumbs] = useState({});

  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef(null);

  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [toast, setToast] = useState(null);

  const [isTimelapseModalOpen, setIsTimelapseModalOpen] = useState(false);

  // ---------------------------------------------------------
  // Camera Name
  // ---------------------------------------------------------

  const handleSaveCameraName = async () => {
    const trimmedName = cameraName.trim();

    if (!trimmedName) {
      return;
    }

    if (trimmedName === camera?.title) {
      setIsEditingName(false);
      return;
    }

    try {
      const response = await fetch(`/api/cameras/${camera.id}/`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRFToken': getCookie('csrftoken'),
        },
        body: JSON.stringify({
          title: trimmedName,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);

        console.error('Failed to update camera name:', errorData);

        throw new Error(
          `Failed to update camera name: ${response.status}`
        );
      }

      const updatedCamera = await response.json();

      setCamera(updatedCamera);
      setBasicsData((prev) => ({
        ...prev,
        title: updatedCamera.title || '',
      }));
      setIsEditingName(false);

    } catch (error) {
      console.error(error);
      alert(error.message);
    } finally {
      setIsSavingName(false);
    }
  };

  const handleCameraNameKeyDown = (event) => {
    if (event.key === 'Enter') {
      handleSaveCameraName();
    }

    if (event.key === 'Escape') {
      handleCancelCameraName();
    }
  };

  const handleCancelCameraName = () => {
    setCameraName(camera?.title || basicsData.title || '');
    setIsEditingName(false);
  };

  // ---------------------------------------------------------
  // Helper functions
  // ---------------------------------------------------------

  const toNumberOrNull = (value) => {
    return value ? Number(value) : null;
  };

  const getViewId = (id) => {
    if (!id) {
      return undefined;
    }

    const numericId = Number(id);

    if (
      Number.isNaN(numericId) ||
      String(id).startsWith('new-')
    ) {
      return undefined;
    }

    return numericId;
  };

  const buildViewsPayload = (views) => {
    return views.map((view, index) => ({
      id: getViewId(view.id),
      orientation: view.orientation
        ? view.orientation.toUpperCase()
        : '',
      image_url: view.image_url,
      description: view.description,
      is_on: view.is_on,
      is_default: view.is_default,
      display_order: index,
    }));
  };

  // ---------------------------------------------------------
  // Save Camera
  // ---------------------------------------------------------
  
  const handleSave = async () => {
    try {
      const payload = {
        title: basicsData.title,
        description: basicsData.description,

        business_area_id: toNumberOrNull(
          basicsData.businessArea
        ),
        region_id: toNumberOrNull(basicsData.region),
        road_id: toNumberOrNull(basicsData.road),

        camera_type_id: toNumberOrNull(
          setupData.cameraType
        ),
        camera_make_id: toNumberOrNull(
          setupData.cameraMake
        ),
        connection_type_id: toNumberOrNull(
          setupData.connectionType
        ),
        connection_protocol_id: toNumberOrNull(
          setupData.connectionProtocol
        ),
        communication_type_id: toNumberOrNull(
          setupData.communicationType
        ),
        power_source_id: toNumberOrNull(
          setupData.powerSource
        ),
        communication_device_id: toNumberOrNull(
          setupData.communicationDevice
        ),
        antenna_id: toNumberOrNull(setupData.antenna),
        service_provider_id: toNumberOrNull(
          setupData.serviceProvider
        ),

        image_watermark: basicsData.imageWatermark,
        camera_credit: basicsData.cameraCredit,
        camera_credit_url: basicsData.cameraCreditUrl,

        road_maintenance_contractor_id: toNumberOrNull(
          basicsData.roadMaintenanceContractor
        ),
        electrical_contractor_id: toNumberOrNull(
          basicsData.electricalContractor
        ),

        locations_geo_latitude: toNumberOrNull(
          basicsData.latitude
        ),
        locations_geo_longitude: toNumberOrNull(
          basicsData.longitude
        ),
        locations_elevation: toNumberOrNull(
          basicsData.elevation
        ),

        views: buildViewsPayload(viewsData),
      };

      const url = camera
        ? `/api/cameras/${camera.id}/`
        : '/api/cameras/';

      const method = camera ? 'PATCH' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'X-CSRFToken': getCookie('csrftoken'),
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response
          .json()
          .catch(() => null);

        console.error(
          'Camera save failed:',
          errorData
        );

        throw new Error(
          `Failed to save camera: ${response.status}`
        );
      }

      const savedCamera = await response.json();

      console.log('Camera saved:', savedCamera);

      if (onBack) {
        onBack(savedCamera);
      }

      navigate('/cameras');
    } catch (error) {
      console.error(error);
      alert(error.message);
    }
  };

  // ---------------------------------------------------------
  // Delete Camera
  // ---------------------------------------------------------

  const handleDelete = async () => {
    if (!id) {
      return;
    }

    try {
      const response = await fetch(`/api/cameras/${id}/`, {
        method: 'DELETE',
        credentials: 'include',
        headers: {
          'X-CSRFToken': getCookie('csrftoken'),
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Camera delete failed:', {
          status: response.status,
          response: errorText,
        });
        throw new Error(`Failed to delete camera: ${response.status}`);
      }

      console.log(`Camera ${id} deleted successfully`);
      setIsDeleteModalOpen(false);
      setToast({ message: 'Camera successfully deleted', variant: 'success' });

      // Give the toast a beat to render before navigating away
      window.setTimeout(() => {
        navigate('/cameras');
      }, 800);
    } catch (error) {
      console.error('Failed to delete camera:', error);
      alert(error.message);
    }
  };

  // ---------------------------------------------------------
  // Fetch All Cameras
  // ---------------------------------------------------------
  
  useEffect(() => {
    const fetchAllCameras = async () => {
      try {
        const res = await fetch('/api/cameras/');

        if (res.ok) {
          const data = await res.json();
          setAllCameras(data);
        }

      } catch (err) {
        console.error(
          'Failed to load camera hierarchy:',
          err
        );
      }
    };

    fetchAllCameras();
  }, []);

  // ---------------------------------------------------------
  // Fetch Individual Camera
  // ---------------------------------------------------------
  
  useEffect(() => {
    const loadCamera = async () => {
      try {
        const response = await fetch(
          `/api/cameras/${id}/`
        );

        if (!response.ok) {
          throw new Error(
            `Failed to load camera: ${response.status}`
          );
        }

        const data = await response.json();

        setCamera(data);

        // ---------------------------------------------------
        // Select initial view
        //
        // Priority:
        // 1. ?view=123
        // 2. router state view
        // 3. default view
        // 4. active/on view
        // 5. first view
        // ---------------------------------------------------

        if (data.views?.length) {
          let viewToSelect = null;

          if (initialViewId) {
            viewToSelect = data.views.find(
              (view) =>
                String(view.id) === String(initialViewId)
            );
          }

          if (!viewToSelect) {
            viewToSelect =
              data.views.find((view) => view.is_default) ||
              data.views.find((view) => view.is_on) ||
              data.views[0];
          }

          if (viewToSelect) {
            setSelectedViewId(
              String(viewToSelect.id)
            );
          }
        } else {
          setSelectedViewId(null);
        }

        // Auto-expand the active region and highway
        const regName =
          data.region?.name || 'Other';

        const roadName =
          data.road?.name || 'Other';

        setExpandedRegions((prev) => ({
          ...prev,
          [regName]: true,
        }));

        setExpandedHighways((prev) => ({
          ...prev,
          [`${regName}-${roadName}`]: true,
        }));

        // Update Basics form state
        setBasicsData({
          title: data.title || '',
          description: data.description || '',

          road: data.road?.id ?? null,

          region: data.region?.id ?? '',

          roadMaintenanceContractor:
            data.road_maintenance_contractor?.id ??
            null,

          electricalContractor:
            data.electrical_contractor?.id ??
            null,

          businessArea:
            data.business_area?.id ?? null,

          latitude:
            data.locations_geo_latitude ?? '',

          longitude:
            data.locations_geo_longitude ?? '',

          elevation:
            data.locations_elevation || '',

          imageWatermark:
            data.image_watermark || '',

          cameraCredit:
            data.camera_credit || '',

          cameraCreditUrl:
            data.camera_credit_url || '',
        });

        // Update Setup form state
        setSetupData({
          cameraId: data.id ?? '',

          cameraType:
            data.camera_type?.id ??
            data.camera_type_id ??
            '',

          cameraMake:
            data.camera_make?.id ??
            data.camera_make_id ??
            '',

          connectionType:
            data.connection_type?.id ??
            data.connection_type_id ??
            '',

          connectionProtocol:
            data.connection_protocol?.id ??
            data.connection_protocol_id ??
            '',

          communicationType:
            data.communication_type?.id ??
            data.communication_type_id ??
            '',

          powerSource:
            data.power_source?.id ??
            data.power_source_id ??
            '',

          communicationDevice:
            data.communication_device?.id ??
            data.communication_device_id ??
            '',

          antenna:
            data.antenna?.id ??
            data.antenna_id ??
            '',

          serviceProvider:
            data.service_provider?.id ??
            data.service_provider_id ??
            '',
        });

      } catch (error) {
        console.error(
          'Failed to load camera details:',
          error
        );
      }
    };

    if (id) {
      loadCamera();
    }
  }, [id]);

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

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 4000);
    return () => window.clearTimeout(timer);
  }, [toast]);

  // ---------------------------------------------------------
  // Group Cameras by Region -> Highway
  // ---------------------------------------------------------
  
  const cameraHierarchy = useMemo(() => {
    const hierarchy = {};

    allCameras.forEach((cam) => {
      const regName =
        cam.region?.name || 'Unassigned';

      const hwyName =
        cam.road?.name || 'Other';

      if (!hierarchy[regName]) {
        hierarchy[regName] = {};
      }

      if (!hierarchy[regName][hwyName]) {
        hierarchy[regName][hwyName] = [];
      }

      if (
        !searchQuery ||
        cam.title
          ?.toLowerCase()
          .includes(searchQuery.toLowerCase()) ||
        hwyName
          .toLowerCase()
          .includes(searchQuery.toLowerCase())
      ) {
        hierarchy[regName][hwyName].push(cam);
      }
    });

    return hierarchy;
  }, [allCameras, searchQuery]);

  // ---------------------------------------------------------
  // Navigation
  // ---------------------------------------------------------
  
  const toggleRegion = (regionName) => {
    setExpandedRegions((prev) => ({
      ...prev,
      [regionName]: !prev[regionName],
    }));
  };

  const toggleHighway = (key) => {
    setExpandedHighways((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  // ---------------------------------------------------------
  // Form Changes
  // ---------------------------------------------------------
  
  const handleBasicsChange = (field, value) => {
    setBasicsData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSetupChange = (field, value) => {
    setSetupData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  // ---------------------------------------------------------
  // View Data
  // ---------------------------------------------------------
  
  const handleSetDefaultView = (selectedId) => {
    setViewsData((prev) =>
      prev.map((view) => ({
        ...view,
        is_default: view.id === selectedId,
      }))
    );
  };

  const [viewsData, setViewsData] = useState(
    DEFAULT_VIEWS
  );

  // Keep ViewsTab data synchronized with camera
  useEffect(() => {
    if (camera?.views?.length) {
      const formattedViews = [...camera.views]
        .sort(
          (a, b) =>
            (a.display_order ?? 0) -
            (b.display_order ?? 0)
        )
        .map((view) => ({
          id: String(view.id),
          orientation: view.orientation || '',
          image_url: view.image_url || '',
          description: view.description || '',
          is_on: view.is_on ?? true,
          is_default: view.is_default ?? false,
          display_order: view.display_order ?? 0,
        }));

      setViewsData(formattedViews);
    } else {
      setViewsData(DEFAULT_VIEWS);
    }
  }, [camera?.views]);

  // ---------------------------------------------------------
  // Select View
  // ---------------------------------------------------------
  
  const handleViewSelect = (viewId) => {
    const stringViewId = String(viewId);

    // Update local state immediately so the image changes
    // without another API request.
    setSelectedViewId(stringViewId);
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        next.set('view', stringViewId);
        return next;
      },
      { replace: true }
    );
  };

  // ---------------------------------------------------------
  // Main Preview Image
  // ---------------------------------------------------------
  
  const getMainImageUrl = (cam, preferredViewId) => {
    const views = cam?.views;

    if (!views || views.length === 0) {
      return '';
    }

    // First try the explicitly selected view
    if (preferredViewId) {
      const preferred = views.find(
        (view) =>
          String(view.id) ===
          String(preferredViewId)
      );

      if (preferred?.image_url) {
        return preferred.image_url;
      }
    }

    // Then default view
    const defaultView = views.find(
      (view) => view.is_default
    );

    if (defaultView?.image_url) {
      return defaultView.image_url;
    }

    // Then active/on view
    const activeView = views.find(
      (view) => view.is_on
    );

    if (activeView?.image_url) {
      return activeView.image_url;
    }

    // Finally first view
    return views[0]?.image_url || '';
  };

  const getProxiedImageUrl = (view, cameraId) => {
    if (!view) return '';
    if (view.drivebc_webcam_id) {
      return `/api/cameras/${cameraId}/image-proxy/?webcam_id=${view.drivebc_webcam_id}&t=${Date.now()}`;
    }
    return view.image_url || '';
  };

  const getMainViewForImage = (cam, preferredViewId) => {
    const views = cam?.views;
    if (!views || views.length === 0) return null;

    if (preferredViewId) {
      const preferred = views.find(
        (view) => String(view.id) === String(preferredViewId)
      );
      if (preferred?.image_url || preferred?.drivebc_webcam_id) return preferred;
    }

    return (
      views.find((view) => view.is_default) ||
      views.find((view) => view.is_on) ||
      views[0] ||
      null
    );
  };

  const mainImageUrl = useMemo(() => {
    const view = getMainViewForImage(camera, selectedViewId);
    return getProxiedImageUrl(view, camera?.id);
  }, [camera, selectedViewId]);



  // reset when the underlying URL changes (e.g. camera comes back online)
  useEffect(() => {
    setMainImgFailed(false);
  }, [mainImageUrl]);


  const viewsList = [...(camera?.views || [])].sort(
    (a, b) =>
      (a.display_order ?? 0) -
      (b.display_order ?? 0)
  );

  return (
    <div className="camera-details-layout">

      {/* LEFT SIDE NAVIGATION PANEL */}
      <aside className="camera-nav-panel">

        <div className="search-box">
          <FontAwesomeIcon
            icon={faMagnifyingGlass}
            className="search-icon"
          />

          <input
            type="text"
            placeholder="Search"
            value={searchQuery}
            onChange={(e) =>
              setSearchQuery(e.target.value)
            }
          />
        </div>

        <div className="hierarchy-tree">

          {Object.entries(cameraHierarchy).map(
            ([regionName, highways]) => {
              const isRegionExpanded =
                expandedRegions[regionName] ?? true;

              return (
                <div
                  key={regionName}
                  className="region-group"
                >

                  <button
                    type="button"
                    className="region-header"
                    onClick={() =>
                      toggleRegion(regionName)
                    }
                  >
                    <span>{regionName}</span>

                    <FontAwesomeIcon
                      icon={
                        isRegionExpanded
                          ? faChevronDown
                          : faChevronRight
                      }
                    />
                  </button>

                  {isRegionExpanded && (
                    <div className="region-content">

                      {Object.entries(highways).map(
                        ([highwayName, cameras]) => {
                          if (cameras.length === 0) {
                            return null;
                          }

                          const hwyKey =
                            `${regionName}-${highwayName}`;

                          const isHighwayExpanded =
                            expandedHighways[hwyKey] ??
                            true;

                          return (
                            <div
                              key={hwyKey}
                              className="highway-group"
                            >

                              <button
                                type="button"
                                className="highway-header"
                                onClick={() =>
                                  toggleHighway(hwyKey)
                                }
                              >
                                <span>
                                  {highwayName}
                                </span>

                                <FontAwesomeIcon
                                  icon={
                                    isHighwayExpanded
                                      ? faChevronDown
                                      : faChevronRight
                                  }
                                />
                              </button>

                              {isHighwayExpanded && (
                                <ul className="camera-list">

                                  {cameras.map((item) => {
                                    const isSelected =
                                      String(item.id) ===
                                      String(id);

                                    return (
                                      <li
                                        key={item.id}
                                        className={`camera-item ${
                                          isSelected ? 'selected' : ''
                                        }`}
                                      >
                                        <button
                                          type="button"
                                          className="camera-item-button"
                                          onClick={() => navigate(`/cameras/${item.id}`)}
                                        >
                                          {item.title}
                                        </button>
                                      </li>
                                    );
                                  })}

                                </ul>
                              )}

                            </div>
                          );
                        }
                      )}

                    </div>
                  )}

                </div>
              );
            }
          )}

        </div>
      </aside>

      {/* RIGHT MAIN DETAILS CONTAINER */}
      <div className="camera-details-container">

        {/* HEADER */}

        <header className="details-header">

          <div className="title-section">

            {isEditingName ? (

              <input
                type="text"
                className="camera-name-input"
                value={basicsData.title}
                onChange={(event) =>
                  setBasicsData((prev) => ({
                    ...prev,
                    title: event.target.value,
                  }))
                }
                onKeyDown={handleCameraNameKeyDown}
                onBlur={() =>
                  setIsEditingName(false)
                }
                autoFocus
              />

            ) : (

              <>
                <h1>
                  {basicsData.title ||
                    'New Camera'}
                </h1>

                <button
                  type="button"
                  className="icon-edit-btn"
                  aria-label="Edit title"
                  onClick={() => {
                    setCameraName(
                      basicsData.title || ''
                    );
                    setIsEditingName(true);
                  }}
                >
                  <FontAwesomeIcon
                    icon={faPenToSquare}
                  />
                </button>
              </>

            )}

          </div>

          <div className="actions-toolbar">

            <button
              type="button"
              className="btn-secondary btn-service"
            >
              <FontAwesomeIcon icon={faWrench} />
              <span>Request service</span>
            </button>

            <button
              type="button"
              className="circle-action-btn danger"
              aria-label="Delete camera"
              // onClick={handleDelete}
              onClick={() => setIsDeleteModalOpen(true)}
            >
              <FontAwesomeIcon icon={faTrash} />
            </button>

            <div className="context-menu-wrapper" ref={menuRef}>
              <button
                type="button"
                className="circle-action-btn"
                onClick={() => setIsMenuOpen((prev) => !prev)}
                aria-label="More options"
                aria-expanded={isMenuOpen}
              >
                <FontAwesomeIcon icon={faEllipsisVertical} />
              </button>
              {isMenuOpen && (
                <div className="context-flyout">
                  <div className="flyout-section">
                    <span className="flyout-title">
                      External links
                    </span>

                    <a
                      href="https://timelapse.drivebc.ca"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flyout-item"
                    >
                      <FontAwesomeIcon
                        icon={faClock}
                        className="item-icon"
                      />
                      <span>Timelapse</span>
                      <FontAwesomeIcon
                        icon={faUpRightFromSquare}
                        className="external-icon"
                      />
                    </a>

                    <a
                      href="https://weather.gc.ca"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flyout-item"
                    >
                      <FontAwesomeIcon
                        icon={faCloudSun}
                        className="item-icon"
                      />
                      <span>Weather</span>
                      <FontAwesomeIcon
                        icon={faUpRightFromSquare}
                        className="external-icon"
                      />
                    </a>

                    <a
                      href="#electrical-outages"
                      className="flyout-item"
                    >
                      <FontAwesomeIcon
                        icon={faBolt}
                        className="item-icon"
                      />
                      <span>Electrical outages</span>
                      <FontAwesomeIcon
                        icon={faUpRightFromSquare}
                        className="external-icon"
                      />
                    </a>

                    <a
                      href="#forest-fires"
                      className="flyout-item"
                    >
                      <FontAwesomeIcon
                        icon={faFire}
                        className="item-icon"
                      />
                      <span>Forest fires</span>
                      <FontAwesomeIcon
                        icon={faUpRightFromSquare}
                        className="external-icon"
                      />
                    </a>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* DETAILS GRID */}
        <div className="details-grid">

          {/* LEFT MEDIA PREVIEW PANE */}

          <div className="media-pane">

            {/* MAIN IMAGE */}

            <div className="main-preview-card">

              <div className="preview-toolbar">

                <span className="badge-ondemand">
                  <FontAwesomeIcon
                    icon={faInfoCircle}
                  />
                  On-demand
                </span>

                <button
                  type="button"
                  className="btn-timelapse"
                  onClick={() => setIsTimelapseModalOpen(true)}
                >
                  <FontAwesomeIcon
                    icon={faClock}
                  />
                  View timelapse
                </button>

              </div>

              <div className="main-image-wrapper">
                {mainImageUrl && !mainImgFailed ? (
                  <img
                    src={mainImageUrl}
                    alt={camera?.title || 'Camera view'}
                    onError={() => setMainImgFailed(true)}
                  />
                ) : (
                  <div className="image-placeholder">
                    <FontAwesomeIcon icon={faVideoSlash} />
                    <span className="camera-status camera-status--unavailable-details">
                      Unavailable
                    </span>
                  </div>
                )}
              </div>

            </div>

            {/* VIEWS */}
            <div className="views-section">

              <div className="views-header">

                <h2>Views</h2>

                <button
                  type="button"
                  className="btn-expand"
                >
                  <FontAwesomeIcon
                    icon={faExpand}
                  />
                  Expand all
                </button>

              </div>

              <div className="views-grid">

                {viewsList
                  .filter(
                    (view) =>
                      view.is_on ?? true
                  )
                  .map((view) => {

                    const isSelected =
                      selectedViewId != null &&
                      String(view.id) ===
                        String(selectedViewId);

                    return (

                      <button
                        type="button"
                        key={view.id}
                        className={`view-card ${isSelected ? 'selected' : ''}`}
                        onClick={() => handleViewSelect(view.id)}
                        aria-pressed={isSelected}
                        aria-label={`Select ${view.orientation} view`}
                      >

                        <div className="view-card-top">

                          <span className="direction-label">
                            {view.orientation}
                          </span>

                        </div>

                        {/* <div className="view-card-image">
                          {view.image_url && !failedThumbs[view.id] ? (
                            <img
                              src={view.image_url}
                              alt={view.orientation}
                              onError={() =>
                                setFailedThumbs((prev) => ({ ...prev, [view.id]: true }))
                              }
                            />
                          ) : (
                            <div className="placeholder-thumb placeholder-thumb--unavailable">
                              <FontAwesomeIcon icon={faVideoSlash} />
                            </div>
                          )}
                        </div> */}

                        <div className="view-card-image">
                          {(view.image_url || view.drivebc_webcam_id) && !failedThumbs[view.id] ? (
                            <img
                              src={getProxiedImageUrl(view, camera?.id)}
                              alt={view.orientation}
                              onError={() =>
                                setFailedThumbs((prev) => ({ ...prev, [view.id]: true }))
                              }
                            />
                          ) : (
                            <div className="placeholder-thumb placeholder-thumb--unavailable">
                              <FontAwesomeIcon icon={faVideoSlash} />
                            </div>
                          )}
                        </div>

                      </button>

                    );
                  })}

              </div>
            </div>

          </div>

          {/* RIGHT FORM TABS PANE */}
          <div className="form-pane">

            <nav className="details-tabs">

              {[
                'Basics',
                'Setup',
                'Views',
                'Notes',
                'Logs',
                'History',
              ].map((tab) => (

                <button
                  key={tab}
                  type="button"
                  className={`tab-btn ${
                    activeTab === tab
                      ? 'active'
                      : ''
                  }`}
                  onClick={() =>
                    setActiveTab(tab)
                  }
                >
                  {tab}
                </button>

              ))}

            </nav>

            {activeTab === 'Basics' && (
              <BasicsTab
                basicsData={basicsData}
                onChange={handleBasicsChange}
              />
            )}

            {activeTab === 'Setup' && (
              <SetupTab
                setupData={setupData}
                onChange={handleSetupChange}
              />
            )}

            {activeTab === 'Views' && (
              <ViewsTab
                views={viewsData}
                onChange={setViewsData}
                onSetDefault={
                  handleSetDefaultView
                }
              />
            )}

            {activeTab === 'Notes' && (
              <NotesTab
                cameraId={camera?.id}
              />
            )}

            {activeTab === 'Logs' && (
              <LogsTab
                cameraId={camera?.id}
              />
            )}

            {activeTab === 'History' && (
              <HistoryTab
                cameraId={camera?.id}
              />
            )}

            <footer className="form-footer">

              <button
                type="button"
                className="btn-save"
                onClick={handleSave}
              >
                <FontAwesomeIcon
                  icon={faFloppyDisk}
                />
                <span>
                  Save all changes
                </span>
              </button>

            </footer>

          </div>

        </div>

      </div>

      {isDeleteModalOpen && (
        <DeleteCameraModal
          onClose={() => setIsDeleteModalOpen(false)}
          onConfirm={handleDelete}
        />
      )}

      {toast && (
        <Toast
          message={toast.message}
          variant={toast.variant}
          onClose={() => setToast(null)}
        />
      )}

      {isTimelapseModalOpen && (
        <TimelapseModal
          camera={camera}
          selectedView={getMainViewForImage(camera, selectedViewId)}
          onClose={() => setIsTimelapseModalOpen(false)}
        />
      )}
      
    </div>
  );
}