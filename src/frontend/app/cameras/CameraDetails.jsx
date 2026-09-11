import React, { useState, useEffect, useMemo, useRef } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { useParams, useNavigate, useSearchParams, useLocation } from "react-router";
import {
  faPenToSquare,
  faWrench,
  faTrash,
  faTrashCan,
  faEllipsisVertical,
  faInfoCircle,
  faClock,
  faExpand,
  faFloppyDisk,
  faMagnifyingGlass,
  faChevronDown,
  faChevronRight,
  faUpRightFromSquare,
  faArrowUpRightFromSquare,
  faArrowUpRight,
  faCloudSun,
  faBolt,
  faFire,
  faXmark,
  faBellConcierge,
} from '@fortawesome/pro-regular-svg-icons';

import { faVideoSlash } from '@fortawesome/pro-solid-svg-icons';
import { getCookie } from "../shared/helpers.js";
import BasicsTab from './BasicsTab.jsx';
import SetupTab from './SetupTab.jsx';
import ViewsTab from './ViewsTab.jsx';
import NotesTab from './NotesTab.jsx';
import LogsTab from './LogsTab.jsx';
import HistoryTab from './HistoryTab.jsx';
import './CameraDetails.scss';
import DeleteCameraModal from './DeleteCameraModal.jsx';
import Toast from './Toast.jsx';
import TimelapseModal from './TimelapseModal.jsx';
import ServiceRequestModal from './ServiceRequestModal';
import { toDate } from 'date-fns';

function orientationLabel(orientation) {
  if (!orientation) return '';
  return orientation.charAt(0) + orientation.slice(1).toLowerCase();
}

export default function CameraDetails({ onBack }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const location = useLocation();
  const initialViewId =
    searchParams.get('view') ||
    location.state?.selectedViewId ||
    null;

  const DEFAULT_VIEWS = [
    { id: 'new-1', orientation: 'NORTH', description: '', image_url: '', is_on: false, is_default: false },
    { id: 'new-2', orientation: 'SOUTH', description: '', image_url: '', is_on: false, is_default: false },
    { id: 'new-3', orientation: 'EAST', description: '', image_url: '', is_on: false, is_default: false },
    { id: 'new-4', orientation: 'WEST', description: '', image_url: '', is_on: false, is_default: false },
    { id: 'new-5', orientation: 'NORTHEAST', description: '', image_url: '', is_on: false, is_default: false },
    { id: 'new-6', orientation: 'NORTHWEST', description: '', image_url: '', is_on: false, is_default: false },
    { id: 'new-7', orientation: 'SOUTHEAST', description: '', image_url: '', is_on: false, is_default: false },
    { id: 'new-8', orientation: 'SOUTHWEST', description: '', image_url: '', is_on: false, is_default: false },
  ];

  const [allCameras, setAllCameras] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedRegions, setExpandedRegions] = useState({});
  const [expandedHighways, setExpandedHighways] = useState({});

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
    cameraInstalled: '',
    cameraLastInspected: '',
    modemInstalled: '',
    connectionType: '',
    connectionProtocol: '',
    communicationType: '',
    powerSource: '',
    communicationDevice: '',
    antenna: '',
    serviceProvider: '',
    updateFrequency: '',
    macAddress: '',
    username: '',
    password: '',
    phoneNumber: '',
    serialNumber: '',
    baudRate: '',
    supplyType: '',
    supplySerial: '',
  });

  const [viewsData, setViewsData] = useState(DEFAULT_VIEWS);

  const [isEditingName, setIsEditingName] = useState(false);
  const [cameraName, setCameraName] = useState('');
  const [isSavingName, setIsSavingName] = useState(false);
  const [mainImgFailed, setMainImgFailed] = useState(false);
  const [failedThumbs, setFailedThumbs] = useState({});

  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef(null);

  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [toast, setToast] = useState(null);

  const [isTimelapseModalOpen, setIsTimelapseModalOpen] = useState(false);

  const [isExpandedView, setIsExpandedView] = useState(false);
  const [isServiceRequestModalOpen, setIsServiceRequestModalOpen] = useState(false);
  const [serviceRequestCamera, setServiceRequestCamera] = useState(null);
  const [savedSnapshot, setSavedSnapshot] = useState(null);

  const handleSaveCameraName = async () => {
    const trimmedName = cameraName.trim();
    if (!trimmedName) return;
    if (trimmedName === camera?.title) {
      setIsEditingName(false);
      return;
    }

    try {
      setIsSavingName(true);
      const response = await fetch(`/api/cameras/${camera.id}/`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRFToken': getCookie('csrftoken'),
        },
        body: JSON.stringify({ title: trimmedName }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        console.error('Failed to update camera name:', errorData);
        throw new Error(`Failed to update camera name: ${response.status}`);
      }

      const updatedCamera = await response.json();
      setCamera(updatedCamera);
      setBasicsData((prev) => ({ ...prev, title: updatedCamera.title || '' }));
      setIsEditingName(false);
    } catch (error) {
      console.error(error);
      alert(error.message);
    } finally {
      setIsSavingName(false);
    }
  };

  const handleCameraNameKeyDown = (event) => {
    if (event.key === 'Enter') handleSaveCameraName();
    if (event.key === 'Escape') handleCancelCameraName();
  };

  const handleCancelCameraName = () => {
    setCameraName(camera?.title || basicsData.title || '');
    setIsEditingName(false);
  };

  const toNumberOrNull = (value) => (value ? Number(value) : null);

  const getViewId = (id) => {
    if (!id) return undefined;
    const numericId = Number(id);
    if (Number.isNaN(numericId) || String(id).startsWith('new-')) {
      return undefined;
    }
    return numericId;
  };

  const buildViewsPayload = (views) => {
    return views.map((view, index) => ({
      id: getViewId(view.id),
      orientation: view.orientation ? view.orientation.toUpperCase() : '',
      image_url: view.image_url,
      description: view.description,
      is_on: view.is_on,
      is_default: view.is_default,
      display_order: index,
    }));
  };

  const handleSave = async () => {
    try {
      const payload = {
        title: basicsData.title,
        description: basicsData.description,
        business_area_id: toNumberOrNull(basicsData.businessArea),
        region_id: toNumberOrNull(basicsData.region),
        road_id: toNumberOrNull(basicsData.road),
        camera_type_id: toNumberOrNull(setupData.cameraType),
        camera_make_id: toNumberOrNull(setupData.cameraMake),
        on_demand: setupData.onDemand,
        camera_installed: setupData.cameraInstalled || null,
        camera_last_inspected: setupData.cameraLastInspected || null,
        modem_installed: setupData.modemInstalled || null,
        update_frequency: setupData.updateFrequency || 0,
        mac_address: setupData.macAddress || null,
        username: setupData.username || null,
        password: setupData.password || null,
        serial_number: setupData.serialNumber || null,
        phone_number: setupData.phoneNumber || null,
        baud_rate: setupData.baudRate || 0,
        supply_type: setupData.supplyType || null,
        supply_serial: setupData.supplySerial || null,
        connection_type_id: toNumberOrNull(setupData.connectionType),
        connection_protocol_id: toNumberOrNull(setupData.connectionProtocol),
        communication_type_id: toNumberOrNull(setupData.communicationType),
        power_source_id: toNumberOrNull(setupData.powerSource),
        communication_device_id: toNumberOrNull(setupData.communicationDevice),
        antenna_id: toNumberOrNull(setupData.antenna),
        service_provider_id: toNumberOrNull(setupData.serviceProvider),
        image_watermark: basicsData.imageWatermark,
        camera_credit: basicsData.cameraCredit,
        camera_credit_url: basicsData.cameraCreditUrl,
        road_maintenance_contractor_id: toNumberOrNull(basicsData.roadMaintenanceContractor),
        electrical_contractor_id: toNumberOrNull(basicsData.electricalContractor),
        locations_geo_latitude: toNumberOrNull(basicsData.latitude),
        locations_geo_longitude: toNumberOrNull(basicsData.longitude),
        locations_elevation: toNumberOrNull(basicsData.elevation),
        views: buildViewsPayload(viewsData),
      };

      const url = camera ? `/api/cameras/${camera.id}/` : '/api/cameras/';
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
        throw new Error(`Failed to save camera: ${response.status}`);
      }

      const savedCamera = await response.json();
      setCamera(savedCamera);

      if (onBack) onBack(savedCamera);
      setSavedSnapshot(JSON.stringify({ basics: basicsData, setup: setupData, views: viewsData }));
      setToast({ message: 'Changes saved', variant: 'success' });
    } catch (error) {
      console.error(error);
      alert(error.message);
    }
  };

  const handleDelete = async () => {
    if (!id) return;

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
        console.error('Camera delete failed:', { status: response.status, response: errorText });
        throw new Error(`Failed to delete camera: ${response.status}`);
      }

      setIsDeleteModalOpen(false);
      setToast({ message: 'Camera successfully deleted', variant: 'success' });

      window.setTimeout(() => {
        navigate('/cameras');
      }, 800);
    } catch (error) {
      console.error('Failed to delete camera:', error);
      alert(error.message);
    }
  };

  useEffect(() => {
    const fetchAllCameras = async () => {
      try {
        const res = await fetch('/api/cameras/');
        if (res.ok) {
          const data = await res.json();
          setAllCameras(data);
        }
      } catch (err) {
        console.error('Failed to load camera hierarchy:', err);
      }
    };

    fetchAllCameras();
  }, []);

  useEffect(() => {
    const loadCamera = async () => {
      try {
        const response = await fetch(`/api/cameras/${id}/`);
        if (!response.ok) {
          throw new Error(`Failed to load camera: ${response.status}`);
        }

        const data = await response.json();
        setCamera(data);

        if (data.views?.length) {
          let viewToSelect = null;
          if (initialViewId) {
            viewToSelect = data.views.find((view) => String(view.id) === String(initialViewId));
          }
          if (!viewToSelect) {
            viewToSelect =
              data.views.find((view) => view.is_default) ||
              data.views.find((view) => view.is_on) ||
              data.views[0];
          }
          if (viewToSelect) setSelectedViewId(String(viewToSelect.id));
        } else {
          setSelectedViewId(null);
        }

        const regName = data.region?.name || 'Other';
        const roadName = data.road?.name || 'Other';

        setExpandedRegions((prev) => ({ ...prev, [regName]: true }));
        setExpandedHighways((prev) => ({ ...prev, [`${regName}-${roadName}`]: true }));

        setBasicsData({
          title: data.title || '',
          description: data.description || '',
          road: data.road?.id ?? null,
          region: data.region?.id ?? '',
          roadMaintenanceContractor: data.road_maintenance_contractor?.id ?? null,
          electricalContractor: data.electrical_contractor?.id ?? null,
          businessArea: data.business_area?.id ?? null,
          latitude: data.locations_geo_latitude ?? '',
          longitude: data.locations_geo_longitude ?? '',
          elevation: data.locations_elevation || '',
          imageWatermark: data.image_watermark || '',
          cameraCredit: data.camera_credit || '',
          cameraCreditUrl: data.camera_credit_url || '',
        });

        setSetupData({
          cameraId: data.id ?? '',
          cameraType: data.camera_type?.id ?? data.camera_type_id ?? '',
          cameraMake: data.camera_make?.id ?? data.camera_make_id ?? '',
          onDemand: data.on_demand,
          cameraInstalled: data.camera_installed,
          cameraLastInspected: data.camera_last_inspected,
          modemInstalled: data.modem_installed,
          connectionType: data.connection_type?.id ?? data.connection_type_id ?? '',
          connectionProtocol: data.connection_protocol?.id ?? data.connection_protocol_id ?? '',
          communicationType: data.communication_type?.id ?? data.communication_type_id ?? '',
          powerSource: data.power_source?.id ?? data.power_source_id ?? '',
          communicationDevice: data.communication_device?.id ?? data.communication_device_id ?? '',
          antenna: data.antenna?.id ?? data.antenna_id ?? '',
          serviceProvider: data.service_provider?.id ?? data.service_provider_id ?? '',
          updateFrequency: data.update_frequency,
          macAddress: data.mac_address,
          username: data.username,
          password: data.password,
          serialNumber: data.serial_number,
          phoneNumber: data.phone_number,
          baudRate: data.baud_rate,
          supplyType: data.supply_type,
          supplySerial: data.supply_serial,
        });

        const newBasics = {
          title: data.title || '',
          description: data.description || '',
          road: data.road?.id ?? null,
          region: data.region?.id ?? '',
          roadMaintenanceContractor: data.road_maintenance_contractor?.id ?? null,
          electricalContractor: data.electrical_contractor?.id ?? null,
          businessArea: data.business_area?.id ?? null,
          latitude: data.locations_geo_latitude ?? '',
          longitude: data.locations_geo_longitude ?? '',
          elevation: data.locations_elevation || '',
          imageWatermark: data.image_watermark || '',
          cameraCredit: data.camera_credit || '',
          cameraCreditUrl: data.camera_credit_url || '',
        };

        const newSetup = {
          cameraId: data.id ?? '',
          cameraType: data.camera_type?.id ?? data.camera_type_id ?? '',
          cameraMake: data.camera_make?.id ?? data.camera_make_id ?? '',
          onDemand: data.on_demand,
          cameraInstalled: data.camera_installed,
          cameraLastInspected: data.camera_last_inspected,
          modemInstalled: data.modem_installed,
          connectionType: data.connection_type?.id ?? data.connection_type_id ?? '',
          connectionProtocol: data.connection_protocol?.id ?? data.connection_protocol_id ?? '',
          communicationType: data.communication_type?.id ?? data.communication_type_id ?? '',
          powerSource: data.power_source?.id ?? data.power_source_id ?? '',
          communicationDevice: data.communication_device?.id ?? data.communication_device_id ?? '',
          antenna: data.antenna?.id ?? data.antenna_id ?? '',
          serviceProvider: data.service_provider?.id ?? data.service_provider_id ?? '',
          cameraInstalled: data.camera_installed,
          cameraLastInspected: data.camera_last_inspected,
          modemInstalled: data.modem_installed,
          updateFrequency: data.update_frequency,
          macAddress: data.mac_address,
          username: data.username,
          password: data.password,
          serialNumber: data.serial_number,
          phoneNumber: data.phone_number,
          baudRate: data.baud_rate,
          supplyType: data.supply_type,
          supplySerial: data.supply_serial,
        };

        const newViews = data.views?.length
          ? [...data.views]
              .sort((a, b) => (a.display_order ?? 0) - (b.display_order ?? 0))
              .map((view) => ({
                id: String(view.id),
                orientation: view.orientation || '',
                image_url: view.image_url || '',
                description: view.description || '',
                is_on: view.is_on ?? true,
                is_default: view.is_default ?? false,
                display_order: view.display_order ?? 0,
              }))
          : DEFAULT_VIEWS;

        setBasicsData(newBasics);
        setSetupData(newSetup);
        setViewsData(newViews);
        setSavedSnapshot(JSON.stringify({ basics: newBasics, setup: newSetup, views: newViews }));

      } catch (error) {
        console.error('Failed to load camera details:', error);
      }
    };

    if (id) {
      loadCamera();
    }
  }, [id]);

  const isDirty = useMemo(() => {
    if (!savedSnapshot) return false;
    return (
      JSON.stringify({ basics: basicsData, setup: setupData, views: viewsData }) !==
      savedSnapshot
    );
  }, [basicsData, setupData, viewsData, savedSnapshot]);

  const handleUndoChanges = () => {
    if (!savedSnapshot) return;
    const { basics, setup, views } = JSON.parse(savedSnapshot);
    setBasicsData(basics);
    setSetupData(setup);
    setViewsData(views);
  };

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

  const cameraHierarchy = useMemo(() => {
    const hierarchy = {};

    allCameras.forEach((cam) => {
      const regName = cam.region?.name || 'Unassigned';
      const hwyName = cam.road?.name || 'Other';

      if (!hierarchy[regName]) hierarchy[regName] = {};
      if (!hierarchy[regName][hwyName]) hierarchy[regName][hwyName] = [];

      if (
        !searchQuery ||
        cam.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        hwyName.toLowerCase().includes(searchQuery.toLowerCase())
      ) {
        hierarchy[regName][hwyName].push(cam);
      }
    });

    return hierarchy;
  }, [allCameras, searchQuery]);

  const toggleRegion = (regionName) => {
    setExpandedRegions((prev) => ({ ...prev, [regionName]: !prev[regionName] }));
  };

  const toggleHighway = (key) => {
    setExpandedHighways((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleBasicsChange = (field, value) => {
    setBasicsData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSetupChange = (field, value) => {
    setSetupData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSetDefaultView = (selectedId) => {
    setViewsData((prev) =>
      prev.map((view) => ({
        ...view,
        is_default: view.id === selectedId,
      }))
    );
  };

  useEffect(() => {
    if (camera?.views?.length) {
      const formattedViews = [...camera.views]
        .sort((a, b) => (a.display_order ?? 0) - (b.display_order ?? 0))
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

  const handleViewSelect = (viewId) => {
    const stringViewId = String(viewId);
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
      const preferred = views.find((view) => String(view.id) === String(preferredViewId));
      if (preferred?.image_url || preferred?.drivebc_webcam_id) return preferred;
    }

    return (
      views.find((view) => view.is_default) ||
      views.find((view) => view.is_on) ||
      views[0] ||
      null
    );
  };

  const renderViewCard = (view, { expanded = false } = {}) => {
    const isSelected = selectedViewId != null && String(view.id) === String(selectedViewId);

    const formattedTime = view.updated_at
      ? new Date(view.updated_at).toLocaleTimeString('en-US', {
          hour: 'numeric',
          minute: '2-digit',
          timeZoneName: 'short',
        })
      : '1:00 pm PST';

    const handleSelect = () => {
      handleViewSelect(view.id);
      if (expanded) setIsExpandedView(false);
    };

    return (
      <div
        key={view.id}
        className={`view-card ${expanded ? 'view-card--expanded' : ''} ${
          isSelected ? 'selected' : ''
        }`}
      >
        <button
          type="button"
          className="view-card-select-area"
          onClick={handleSelect}
          aria-pressed={isSelected}
          aria-label={`Select ${view.orientation} view`}
        >
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

        <div className="view-card-footer">
          <div className="view-info-left">
            <span
              className={`status-toggle-pill ${view.is_on ? 'active' : ''}`}
              title={view.is_on ? 'Active' : 'Inactive'}
              aria-label={view.is_on ? 'Active' : 'Inactive'}
            >
              <span className="toggle-dot" />
            </span>
            <span className="direction-label">
              {orientationLabel(view.orientation)}
            </span>
          </div>

          <div className="view-info-right">
            <FontAwesomeIcon icon={faClock} className="timestamp-icon" />
            <span className="timestamp-text">{formattedTime}</span>
          </div>
        </div>
      </div>
    );
  };

  const mainImageUrl = useMemo(() => {
    const view = getMainViewForImage(camera, selectedViewId);
    return getProxiedImageUrl(view, camera?.id);
  }, [camera, selectedViewId]);

  const currentView = useMemo(() => {
    return getMainViewForImage(camera, selectedViewId);
  }, [camera, selectedViewId]);

  useEffect(() => {
    setMainImgFailed(false);
  }, [mainImageUrl]);

  const viewsList = [...(camera?.views || [])].sort(
    (a, b) => (a.display_order ?? 0) - (b.display_order ?? 0)
  );

  const driveBCWebcamId = useMemo(() => {
    if (currentView?.drivebc_webcam_id) {
      return currentView.drivebc_webcam_id;
    }
    const withWebcam = (camera?.views || []).find((v) => v.drivebc_webcam_id);
    return withWebcam?.drivebc_webcam_id || null;
  }, [camera, currentView]);

  return (
    <div className="camera-details-layout">
      {!isExpandedView && (
        <aside className="camera-nav-panel">
          <div className="search-box">
            <FontAwesomeIcon icon={faMagnifyingGlass} className="search-icon" />
            <input
              type="text"
              placeholder="Search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div className="hierarchy-tree">
            {Object.entries(cameraHierarchy).map(([regionName, highways]) => {
              const isRegionExpanded = expandedRegions[regionName] ?? true;

              return (
                <div key={regionName} className="region-group">
                  <button
                    type="button"
                    className="region-header"
                    onClick={() => toggleRegion(regionName)}
                  >
                    <span>{regionName}</span>
                    <FontAwesomeIcon
                      icon={isRegionExpanded ? faChevronDown : faChevronRight}
                    />
                  </button>

                  {isRegionExpanded && (
                    <div className="region-content">
                      {Object.entries(highways).map(([highwayName, cameras]) => {
                        if (cameras.length === 0) return null;
                        const hwyKey = `${regionName}-${highwayName}`;
                        const isHighwayExpanded = expandedHighways[hwyKey] ?? true;

                        return (
                          <div key={hwyKey} className="highway-group">
                            <button
                              type="button"
                              className="highway-header"
                              onClick={() => toggleHighway(hwyKey)}
                            >
                              <span>{highwayName}</span>
                              <FontAwesomeIcon
                                icon={isHighwayExpanded ? faChevronDown : faChevronRight}
                              />
                            </button>

                            {isHighwayExpanded && (
                              <ul className="camera-list">
                                {cameras.map((item) => {
                                  const isSelected = String(item.id) === String(id);
                                  return (
                                    <li
                                      key={item.id}
                                      className={`camera-item ${isSelected ? 'selected' : ''}`}
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
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </aside>
      )}

      <div className="camera-details-container">
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
                onBlur={() => setIsEditingName(false)}
                autoFocus
                disabled={isSavingName}
              />
            ) : (
              <>
                <h1>{basicsData.title || 'New Camera'}</h1>
                <span className="badge-ondemand">
                  <FontAwesomeIcon icon={faInfoCircle} />
                  On-demand
                </span>
              </>
            )}
          </div>

          <div className="actions-toolbar">
            <button
              type="button"
              className="btn-secondary btn-service"
              onClick={() => {
                setIsServiceRequestModalOpen(true);
                setServiceRequestCamera(camera);
              }}
            >
              <FontAwesomeIcon icon={faBellConcierge} />
              <span>Request service</span>
            </button>

            {driveBCWebcamId && (
              <a
                href={`https://drivebc.ca/cameras/${driveBCWebcamId}`}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-text btn-view-drivebc"
              >
                <FontAwesomeIcon icon={faArrowUpRight} />
                <span>View on DriveBC</span>
              </a>
            )}

            <button
              type="button"
              className="btn-text btn-delete"
              aria-label="Delete camera location"
              onClick={() => setIsDeleteModalOpen(true)}
            >
              <FontAwesomeIcon icon={faTrashCan} />
              <span>Delete location</span>
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
                    <span className="flyout-title">More</span>

                    <a
                      href="#"
                      className="flyout-item"
                      aria-label="Edit title"
                      onClick={(e) => {
                        e.preventDefault();
                        setCameraName(basicsData.title || '');
                        setIsEditingName(true);
                      }}
                    >
                      <FontAwesomeIcon icon={faPenToSquare} className="item-icon" />
                      <span>Edit location name</span>
                    </a>

                    <a
                      href="https://timelapse.drivebc.ca"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flyout-item"
                    >
                      <FontAwesomeIcon icon={faClock} className="item-icon" />
                      <span>Timelapse</span>
                    </a>

                    <a
                      href="https://weather.gc.ca"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flyout-item"
                    >
                      <FontAwesomeIcon icon={faCloudSun} className="item-icon" />
                      <span>Weather</span>
                    </a>

                    <a href="#electrical-outages" className="flyout-item">
                      <FontAwesomeIcon icon={faBolt} className="item-icon" />
                      <span>Electrical outages</span>
                    </a>

                    <a href="#forest-fires" className="flyout-item">
                      <FontAwesomeIcon icon={faFire} className="item-icon" />
                      <span>Forest fires</span>
                    </a>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        {isExpandedView ? (
          <div className="expanded-views-section">
            <div className="expanded-views-header">
              <h2>Showing all camera views</h2>
              <button
                type="button"
                className="btn-close-expanded"
                onClick={() => setIsExpandedView(false)}
              >
                <FontAwesomeIcon icon={faXmark} />
                Close expanded view
              </button>
            </div>

            <div className="expanded-views-grid">
              {viewsList
                .filter((view) => view.is_on ?? true)
                .map((view) => renderViewCard(view, { expanded: true }))}
            </div>
          </div>
        ) : (
          <div className="details-grid">
            <div className="media-pane">
              <div className="main-preview-card">
                <div className="preview-toolbar">
                  <span className="current-view-label">
                    {orientationLabel(currentView?.orientation) || 'Camera'}
                  </span>

                  <button
                    type="button"
                    className="btn-timelapse"
                    onClick={() => setIsTimelapseModalOpen(true)}
                  >
                    <FontAwesomeIcon icon={faClock} />
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

              <div className="views-section">
                <div className="views-header">
                  <h2>Camera views</h2>
                  <button
                    type="button"
                    className="btn-expand"
                    onClick={() => setIsExpandedView(true)}
                  >
                    <FontAwesomeIcon icon={faExpand} />
                    Expand all views
                  </button>
                </div>

                <div className="views-grid">
                  {viewsList
                    .filter((view) => view.is_on ?? true)
                    .map((view) => renderViewCard(view))}
                </div>
              </div>
            </div>

            <div className="form-pane">
              <h2 className="form-pane-title">Camera location settings</h2>

              <nav className="details-tabs">
                {['Basics', 'Setup', 'Views', 'Notes', 'Logs', 'History'].map((tab) => (
                  <button
                    key={tab}
                    type="button"
                    className={`tab-btn ${activeTab === tab ? 'active' : ''}`}
                    onClick={() => setActiveTab(tab)}
                  >
                    {tab}
                  </button>
                ))}
              </nav>

              {activeTab === 'Basics' && (
                <BasicsTab basicsData={basicsData} onChange={handleBasicsChange} />
              )}

              {activeTab === 'Setup' && (
                <SetupTab setupData={setupData} onChange={handleSetupChange} />
              )}

              {activeTab === 'Views' && (
                <ViewsTab
                  views={viewsData}
                  onChange={setViewsData}
                  onSetDefault={handleSetDefaultView}
                />
              )}

              {activeTab === 'Notes' && <NotesTab cameraId={camera?.id} />}
              {activeTab === 'Logs' && <LogsTab cameraId={camera?.id} />}
              {activeTab === 'History' && <HistoryTab cameraId={camera?.id} />}

              {/* <footer className="form-footer">
                <button type="button" className="btn-save" onClick={handleSave}>
                  <FontAwesomeIcon icon={faFloppyDisk} />
                  <span>Save all changes</span>
                </button>
              </footer> */}

              <footer className="form-footer">
                <button
                  type="button"
                  className="btn-save"
                  onClick={handleSave}
                  disabled={!isDirty}
                >
                  <FontAwesomeIcon icon={faFloppyDisk} />
                  <span>Save all changes</span>
                </button>

                <button
                  type="button"
                  className="btn-undo"
                  onClick={handleUndoChanges}
                  disabled={!isDirty}
                >
                  Undo changes
                </button>
              </footer>
            </div>
          </div>
        )}
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

      {isServiceRequestModalOpen && (
        <ServiceRequestModal
          camera={serviceRequestCamera}
          onClose={() => {
            setIsServiceRequestModalOpen(false);
            setServiceRequestCamera(null);
          }}
          onSuccess={() => {
            setToast({ message: 'Service request sent successfully', variant: 'success' });
          }}
        />
      )}
    </div>
  );
}
