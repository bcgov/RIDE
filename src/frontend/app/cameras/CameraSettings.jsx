import React, { useEffect, useMemo, useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faGripVertical,
  faPenToSquare,
  faXmark,
  faCheck,
  faChevronDown,
  faMagnifyingGlass,
} from '@fortawesome/pro-regular-svg-icons';
import { useSearchParams } from 'react-router';
import { getCookie } from '../shared/helpers.js';
import './CameraSettings.scss';
import { API_HOST } from '../env.js';

const SETTINGS = [
  { key: 'antennaes', label: 'Antennaes', endpoint: 'antennaes' },
  { key: 'business-areas', label: 'Business areas', endpoint: 'business-areas' },
  { key: 'camera-types', label: 'Camera types', endpoint: 'camera-types' },
  { key: 'camera-makes', label: 'Camera makes', endpoint: 'camera-makes' },
  { key: 'communication-type', label: 'Communication type', endpoint: 'communication-types' },
  { key: 'communication-devices', label: 'Communication devices', endpoint: 'communication-devices' },
  { key: 'connection-type', label: 'Connection type', endpoint: 'connection-types' },
  { key: 'connection-protocols', label: 'Connection protocols', endpoint: 'connection-protocols' },
  { key: 'electrical-contractors', label: 'Electrical contractors', endpoint: 'electrical-contractors' },
  { key: 'regions', label: 'Regions', endpoint: 'regions' },
  { key: 'roads-and-highways', label: 'Roads and highways', endpoint: 'roads-and-highways' },
  { key: 'road-maintenance-contractors', label: 'Road maintenance contractors', endpoint: 'road-maintenance-contractors' },
  { key: 'service-providers', label: 'Service providers', endpoint: 'service-providers' },
  { key: 'power-sources', label: 'Power sources', endpoint: 'power-sources' },
  { key: 'service-request-ccs', label: 'Service request CCs', endpoint: 'service-request-ccs' },
];

const OTHER_SETTINGS = [
  { key: 'camera-order', label: 'Camera order' },
  { key: 'report-fields', label: 'Report fields' },
  { key: 'default-messaging', label: 'Default messaging', endpoint: 'camera-default-messaging' },
];

const REPORT_FIELD_GROUPS = [
  {
    category: 'Basics',
    fields: [
      { id: 'location_description', label: 'Location description', defaultChecked: true },
      { id: 'business_area', label: 'Business area', defaultChecked: true },
      { id: 'region', label: 'Region', defaultChecked: true },
      { id: 'road', label: 'Road or highway', defaultChecked: true },
      { id: 'elevation', label: 'Elevation', defaultChecked: true },
      { id: 'latitude', label: 'Latitude', defaultChecked: true },
      { id: 'longitude', label: 'Longitude', defaultChecked: true },
      { id: 'image_watermark', label: 'Image watermark', defaultChecked: false },
      { id: 'camera_credit', label: 'Camera credit', defaultChecked: false },
      { id: 'camera_url', label: 'Camera URL', defaultChecked: false },
      { id: 'notes', label: 'Notes', defaultChecked: false },
    ],
  },
  {
    category: 'Views',
    fields: [
      { id: 'camera_views', label: 'Camera views', defaultChecked: false },
      { id: 'view_descriptions', label: 'View descriptions', defaultChecked: false },
    ],
  },
  {
    category: 'Maintenance',
    fields: [
      { id: 'camera_type', label: 'Camera type', defaultChecked: true },
      { id: 'camera_make', label: 'Camera make', defaultChecked: true },
      { id: 'installed_date', label: 'Installed date', defaultChecked: false },
      { id: 'last_inspected', label: 'Last inspected', defaultChecked: false },
    ],
  },
  {
    category: 'Additional options',
    fields: [
      { id: 'closeby_weather_stations', label: 'Close-by weather stations', defaultChecked: true },
      { id: 'closeby_geotechnical_sensors', label: 'Close-by geotechnical sensors', defaultChecked: true },
    ],
  },
];

const ALL_SETTINGS = [...SETTINGS, ...OTHER_SETTINGS];

export default function CameraSettings() {
  const [searchParams, setSearchParams] = useSearchParams();
  const selectedKey = searchParams.get('setting') || 'service-providers';
  const selectedSetting = useMemo(
    () => ALL_SETTINGS.find((setting) => setting.key === selectedKey) || SETTINGS[0],
    [selectedKey]
  );
  const selectedRegion = searchParams.get('region') || '';

  // Generic DB Setup State
  const [items, setItems] = useState([]);
  const [originalItems, setOriginalItems] = useState([]);
  const [newItemName, setNewItemName] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editingName, setEditingName] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [selectedReportFields, setSelectedReportFields] = useState([]);

  const [serviceRequestCcs, setServiceRequestCcs] = useState([]);
  const [newCcName, setNewCcName] = useState('');
  const [newCcEmail, setNewCcEmail] = useState('');
  const [editingCcIndex, setEditingCcIndex] = useState(null);
  const [editingCcName, setEditingCcName] = useState('');
  const [editingCcEmail, setEditingCcEmail] = useState('');
  const [defaultMessaging, setDefaultMessaging] = useState({
    disabled_reason_default: '',
    disabled_short_description: '',
    disabled_long_description: '',
  });

  const [loadingMessaging, setLoadingMessaging] = useState(false);
  const [messagingError, setMessagingError] = useState('');

  // Camera order state
  const [cameras, setCameras] = useState([]);
  const [loadingCameras, setLoadingCameras] = useState(false);
  const [camerasError, setCamerasError] = useState(null);
  const [isCameraOrderOpen, setIsCameraOrderOpen] = useState(false);
  const [draftCameraGroups, setDraftCameraGroups] = useState([]);
  const [openCameraOrderGroups, setOpenCameraOrderGroups] = useState({});

  const [searchQuery, setSearchQuery] = useState('');
  const normalizedQuery = searchQuery.trim().toLowerCase();

  const [isDbSetupOpen, setIsDbSetupOpen] = useState(true);

  const filteredSettings = useMemo(() => {
    if (!normalizedQuery) return SETTINGS;
    return SETTINGS.filter((setting) =>
      setting.label.toLowerCase().includes(normalizedQuery)
    );
  }, [normalizedQuery]);

  const filteredOtherSettings = useMemo(() => {
    if (!normalizedQuery) return OTHER_SETTINGS;
    return OTHER_SETTINGS.filter((setting) =>
      setting.label.toLowerCase().includes(normalizedQuery)
    );
  }, [normalizedQuery]);

  const cameraRegions = useMemo(() => {
    const list = Array.isArray(cameras) ? cameras : [];
    const regions = new Set(list.map((cam) => cam.region?.name).filter(Boolean));
    return Array.from(regions).sort((a, b) => a.localeCompare(b));
  }, [cameras]);

  // Cameras for the selected region, grouped by road and sorted by display_order
  const cameraOrderGroups = useMemo(() => {
    if (selectedSetting.key !== 'camera-order' || !selectedRegion) return [];

    const list = Array.isArray(cameras) ? cameras : [];
    const regionCameras = list.filter((cam) => cam.region?.name === selectedRegion);

    const byHighway = new Map();

    regionCameras.forEach((cam) => {
      const road = cam.road?.name || 'Other';

      if (!byHighway.has(road)) {
        byHighway.set(road, []);
      }

      byHighway.get(road).push(cam);
    });

    return Array.from(byHighway.entries())
      .map(([road, camList]) => ({
        road,
        cameras: [...camList].sort(
          (a, b) => (a.display_order ?? 0) - (b.display_order ?? 0)
        ),
      }))
      .sort((a, b) =>
        a.road.localeCompare(b.road, undefined, { numeric: true })
      );
  }, [cameras, selectedRegion, selectedSetting.key]);

  const hasCameraOrderChanges = useMemo(() => {
    return JSON.stringify(draftCameraGroups) !== JSON.stringify(cameraOrderGroups);
  }, [draftCameraGroups, cameraOrderGroups]);

  const handleSaveReportFields = async () => {
    setSaving(true);
    setError(null);

    const response = await fetch(`${API_HOST}/api/camera-report-settings/fields/`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'X-CSRFToken': getCookie('csrftoken'),
      },
      body: JSON.stringify({ selected_fields: selectedReportFields }),
    });
    if (!response.ok) {
      throw new Error(`Failed to save report fields: ${response.status}`);
    }
    const data = await response.json();

    setTimeout(() => {
      try {
        setSelectedReportFields(data.selected_fields ?? []);
      } catch (err) {
        console.error('Failed to save report fields to localStorage:', err);
      } finally {
        setTimeout(() => {
          setSaving(false);
        }, 400);
      }
    }, 50);
  };

  // Load database settings (Skipped for 'report-fields', 'service-request-ccs',
  // 'default-messaging' and 'camera-order', which have their own effects below)
  useEffect(() => {
    if (selectedSetting.key === 'report-fields') {
      const loadReportFields = async () => {
        try {
          setLoading(true);
          setError(null);
          const response = await fetch(`${API_HOST}/api/camera-report-settings/fields/`);
          if (!response.ok) throw new Error(`Failed to load report fields: ${response.status}`);
          const data = await response.json();
          setSelectedReportFields(data.selected_fields ?? []);
        } catch (err) {
          console.error('Failed to load report fields:', err);
          setError(err.message);
        } finally {
          setLoading(false);
        }
      };
      loadReportFields();
      return;
    }

    if (selectedSetting.key === 'service-request-ccs') {
      const loadServiceRequestCcs = async () => {
        try {
          setLoading(true);
          setError(null);

          const response = await fetch(`${API_HOST}/api/service-request-ccs/`, {
            credentials: 'include',
          });

          if (!response.ok) {
            throw new Error(`Failed to load Service Request CCs: ${response.status}`);
          }

          const data = await response.json();
          setServiceRequestCcs(data.service_request_ccs ?? []);
        } catch (err) {
          console.error('Failed to load Service Request CCs:', err);
          setError(err.message);
          setServiceRequestCcs([]);
        } finally {
          setLoading(false);
        }
      };

      loadServiceRequestCcs();
      return;
    }

    if (selectedSetting.key === 'default-messaging') {
      const loadCameraDefaultMessaging = async () => {
        try {
          setLoadingMessaging(true);
          setMessagingError('');

          const response = await fetch(`${API_HOST}/api/camera-default-messaging/`, {
            credentials: 'include',
          });

          if (!response.ok) {
            throw new Error(`Failed to load Camera Default Messaging: ${response.status}`);
          }

          const data = await response.json();

          setDefaultMessaging({
            disabled_reason_default: data.disabled_reason_default ?? '',
            disabled_short_description: data.disabled_short_description ?? '',
            disabled_long_description: data.disabled_long_description ?? '',
          });
        } catch (err) {
          console.error('Failed to load Camera Default Messaging:', err);
          setMessagingError(err.message);
        } finally {
          setLoadingMessaging(false);
        }
      };

      loadCameraDefaultMessaging();
      return;
    }

    if (selectedSetting.key === 'camera-order') {
      // Handled by the cameras-fetching effect below
      setLoading(false);
      setError(null);
      return;
    }

    if (!selectedSetting.endpoint) {
      setLoading(false);
      setError(null);
      return;
    }

    const loadSettings = async () => {
      try {
        setLoading(true);
        setError(null);

        const response = await fetch(`/api/${selectedSetting.endpoint}/`);
        if (!response.ok) {
          throw new Error(`Failed to load ${selectedSetting.label}: ${response.status}`);
        }

        const data = await response.json();
        const formattedItems = data.map((item, index) => ({
          id: item.id,
          name: item.name,
          display_order: item.display_order ?? index,
        }));

        setItems(formattedItems);
        setOriginalItems(formattedItems);
        setNewItemName('');
        setEditingId(null);
        setEditingName('');
      } catch (err) {
        console.error('Failed to load camera settings:', err);
        setError(err.message);
        setItems([]);
        setOriginalItems([]);
      } finally {
        setLoading(false);
      }
    };

    loadSettings();
  }, [selectedSetting]);

  // Fetches the camera list and normalizes the response to a plain array,
  // regardless of whether the backend returns a bare array, a paginated
  // `{results: [...]}` payload, or a wrapped `{cameras: [...]}` payload.
  const fetchCameras = async () => {
    const response = await fetch(`${API_HOST}/api/cameras/`, {
      credentials: 'include',
    });

    if (!response.ok) {
      throw new Error(`Failed to load cameras: ${response.status}`);
    }

    const data = await response.json();

    if (Array.isArray(data)) return data;
    if (Array.isArray(data?.results)) return data.results;
    if (Array.isArray(data?.cameras)) return data.cameras;

    console.error('Unexpected /api/cameras/ response shape:', data);
    return [];
  };

  // Fetch all cameras once, the first time the Camera order section is
  // opened or navigated to directly via URL
  useEffect(() => {
    const needsCameras = isCameraOrderOpen || selectedSetting.key === 'camera-order';
    if (!needsCameras || cameras.length > 0 || loadingCameras) return;

    const loadCameras = async () => {
      try {
        setLoadingCameras(true);
        setCamerasError(null);

        const data = await fetchCameras();
        setCameras(data);
      } catch (err) {
        console.error('Failed to load cameras:', err);
        setCamerasError(err.message);
      } finally {
        setLoadingCameras(false);
      }
    };

    loadCameras();
  }, [isCameraOrderOpen, selectedSetting.key, cameras.length, loadingCameras]);

  // Once cameras are loaded, default to the first region if none is selected yet
  useEffect(() => {
    if (
      selectedSetting.key === 'camera-order' &&
      !searchParams.get('region') &&
      cameraRegions.length > 0
    ) {
      setSearchParams({ setting: 'camera-order', region: cameraRegions[0] });
    }
  }, [selectedSetting.key, searchParams, cameraRegions, setSearchParams]);

  // Keep the editable draft in sync whenever the underlying data changes
  // (region switched, cameras (re)loaded, or a save completed)
  useEffect(() => {
    setDraftCameraGroups(cameraOrderGroups);
  }, [cameraOrderGroups]);

  const selectSetting = (setting) => {
    setSearchParams({ setting: setting.key });
  };

  const selectCameraRegion = (setting, region) => {
    setSearchParams({ setting: setting.key, region });
  };

  const toggleCameraOrderGroup = (road) => {
    setOpenCameraOrderGroups((prev) => ({
      ...prev,
      [road]: prev[road] === false ? true : false,
    }));
  };

  const toggleReportField = (fieldId) => {
    setSelectedReportFields((prev) =>
      prev.includes(fieldId) ? prev.filter((id) => id !== fieldId) : [...prev, fieldId]
    );
  };

  // Standard Item Handlers
  const handleAdd = () => {
    const trimmedName = newItemName.trim();
    if (!trimmedName) return;
    if (items.some((item) => item.name.toLowerCase() === trimmedName.toLowerCase())) return;

    setItems((prev) => [
      ...prev,
      { id: null, name: trimmedName, display_order: prev.length, isNew: true },
    ]);
    setNewItemName('');
  };

  const handleNewItemKeyDown = (event) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      handleAdd();
    }
  };

  const startEditing = (item) => {
    setEditingId(item.id);
    setEditingName(item.name);
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditingName('');
  };

  const saveEditing = (itemId) => {
    const trimmedName = editingName.trim();
    if (!trimmedName) return;

    setItems((prev) =>
      prev.map((item) => (item.id === itemId ? { ...item, name: trimmedName } : item))
    );
    setEditingId(null);
    setEditingName('');
  };

  const handleEditingKeyDown = (event, itemId) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      saveEditing(itemId);
    }
    if (event.key === 'Escape') cancelEditing();
  };

  const handleDelete = (item) => {
    setItems((prev) => prev.filter((current) => current.id !== item.id || current.id === null));
  };

  const handleDragStart = (event, index) => {
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', String(index));
  };

  const handleDragOver = (event) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (event, targetIndex) => {
    event.preventDefault();
    const sourceIndex = Number(event.dataTransfer.getData('text/plain'));
    if (Number.isNaN(sourceIndex) || sourceIndex === targetIndex) return;

    setItems((prev) => {
      const next = [...prev];
      const [movedItem] = next.splice(sourceIndex, 1);
      next.splice(targetIndex, 0, movedItem);
      return next.map((item, index) => ({ ...item, display_order: index }));
    });
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setError(null);

      const payload = {
        items: items.map((item, index) => ({
          id: item.id,
          name: item.name.trim(),
          display_order: index,
        })),
      };

      const response = await fetch(`/api/${selectedSetting.endpoint}/bulk-update/`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRFToken': getCookie('csrftoken'),
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(`Failed to save changes: ${response.status}`);
      }

      const data = await response.json();
      const formattedItems = data.map((item, index) => ({
        id: item.id,
        name: item.name,
        display_order: item.display_order ?? index,
      }));

      setItems(formattedItems);
      setOriginalItems(formattedItems);
    } catch (err) {
      console.error('Failed to save camera settings:', err);
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const hasChanges = useMemo(() => {
    return JSON.stringify(items) !== JSON.stringify(originalItems);
  }, [items, originalItems]);

  const handleSaveServiceRequestCcs = async () => {
    try {
      setSaving(true);
      setError(null);

      const response = await fetch(`${API_HOST}/api/service-request-ccs/`, {
        method: 'PUT',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRFToken': getCookie('csrftoken'),
        },
        body: JSON.stringify({ service_request_ccs: serviceRequestCcs }),
      });

      if (!response.ok) {
        throw new Error(`Failed to save Service Request CCs: ${response.status}`);
      }

      const data = await response.json();
      setServiceRequestCcs(data.service_request_ccs ?? []);
    } catch (err) {
      console.error('Failed to save Service Request CCs:', err);
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleSaveDefaultMessaging = async () => {
    setSaving(true);
    setMessagingError('');

    try {
      const response = await fetch(`/api/camera-default-messaging/`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRFToken': getCookie('csrftoken'),
        },
        body: JSON.stringify(defaultMessaging),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(errorData ? JSON.stringify(errorData) : `Failed to save: ${response.status}`);
      }

      const data = await response.json();

      setDefaultMessaging({
        disabled_reason_default: data.disabled_reason_default ?? '',
        disabled_short_description: data.disabled_short_description ?? '',
        disabled_long_description: data.disabled_long_description ?? '',
      });
    } catch (error) {
      console.error('Failed to save default messaging:', error);
      setMessagingError(error.message);
    } finally {
      setSaving(false);
    }
  };

  // Camera order drag handlers — reordering is scoped to within a single
  // road group, matching how the list is grouped visually
  const handleCameraDragStart = (event, groupIndex, camIndex) => {
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', JSON.stringify({ groupIndex, camIndex }));
  };

  const handleCameraDragOver = (event) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  };

  const handleCameraDrop = (event, targetGroupIndex, targetCamIndex) => {
    event.preventDefault();

    let source;
    try {
      source = JSON.parse(event.dataTransfer.getData('text/plain'));
    } catch {
      return;
    }

    if (!source || source.groupIndex !== targetGroupIndex) return;
    if (source.camIndex === targetCamIndex) return;

    setDraftCameraGroups((prev) => {
      const next = prev.map((group) => ({ ...group, cameras: [...group.cameras] }));
      const groupCams = next[targetGroupIndex].cameras;
      const [moved] = groupCams.splice(source.camIndex, 1);
      groupCams.splice(targetCamIndex, 0, moved);
      return next;
    });
  };

  const handleSaveCameraOrder = async () => {
    try {
      setSaving(true);
      setCamerasError(null);

      let order = 0;
      const payload = {
        cameras: draftCameraGroups.flatMap((group) =>
          group.cameras.map((cam) => ({
            id: cam.id,
            display_order: order++,
          }))
        ),
      };

      const response = await fetch(`${API_HOST}/api/cameras-order/`, {
        method: 'PUT',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRFToken': getCookie('csrftoken'),
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(`Failed to save camera order: ${response.status}`);
      }

      // Don't trust the shape of the order-save response (it may be a
      // wrapped object rather than a bare camera array) — just re-fetch
      // the canonical camera list from GET /api/cameras/ instead.
      const refreshed = await fetchCameras();
      setCameras(refreshed);
    } catch (err) {
      console.error('Failed to save camera order:', err);
      setCamerasError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="camera-settings-page">
      {/* Sidebar */}
      <aside className="camera-settings-sidebar">
        <div className="settings-sidebar-title">Manage camera settings</div>

        <div className="settings-search">
          <input
            type="text"
            placeholder="Search"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            aria-label="Search camera settings"
          />
          <FontAwesomeIcon icon={faMagnifyingGlass} className="settings-search-icon" />
        </div>

        {filteredSettings.length > 0 && (
          <>
            <button
              type="button"
              className="settings-section-header"
              onClick={() => setIsDbSetupOpen((prev) => !prev)}
              aria-expanded={isDbSetupOpen}
            >
              <span>Database setup</span>
              <FontAwesomeIcon
                icon={faChevronDown}
                className={isDbSetupOpen ? 'rotated' : ''}
              />
            </button>

            {isDbSetupOpen && (
              <nav className="settings-navigation">
                {filteredSettings.map((setting) => (
                  <button
                    key={setting.key}
                    type="button"
                    className={`settings-nav-item ${selectedSetting.key === setting.key ? 'active' : ''}`}
                    onClick={() => selectSetting(setting)}
                  >
                    {setting.label}
                  </button>
                ))}
              </nav>
            )}
          </>
        )}

        {filteredOtherSettings.map((setting) => {
          if (setting.key === 'camera-order') {
            return (
              <div key={setting.key} className="settings-section-group">
                <button
                  type="button"
                  className={`settings-section-header ${
                    selectedSetting.key === setting.key ? 'active' : 'collapsed'
                  }`}
                  onClick={() => {
                    setIsCameraOrderOpen((prev) => !prev);
                    selectSetting(setting);
                  }}
                  aria-expanded={isCameraOrderOpen}
                >
                  <span>{setting.label}</span>
                  <FontAwesomeIcon
                    icon={faChevronDown}
                    className={isCameraOrderOpen ? 'rotated' : ''}
                  />
                </button>

                {isCameraOrderOpen && (
                  <nav className="settings-navigation settings-navigation-nested">
                    {loadingCameras && (
                      <div className="settings-message settings-message-small">Loading...</div>
                    )}
                    {!loadingCameras && camerasError && (
                      <div className="settings-error settings-error-small">{camerasError}</div>
                    )}
                    {!loadingCameras &&
                      !camerasError &&
                      cameraRegions.map((region) => (
                        <button
                          key={region}
                          type="button"
                          className={`settings-nav-item ${
                            selectedSetting.key === 'camera-order' && selectedRegion === region
                              ? 'active'
                              : ''
                          }`}
                          onClick={() => selectCameraRegion(setting, region)}
                        >
                          {region}
                        </button>
                      ))}
                  </nav>
                )}
              </div>
            );
          }

          return (
            <button
              key={setting.key}
              type="button"
              className={`settings-section-header ${
                selectedSetting.key === setting.key ? 'active' : 'collapsed'
              }`}
              onClick={() => selectSetting(setting)}
            >
              <span>{setting.label}</span>
              <FontAwesomeIcon icon={faChevronDown} />
            </button>
          );
        })}

        {normalizedQuery &&
          filteredSettings.length === 0 &&
          filteredOtherSettings.length === 0 && (
            <div className="settings-no-results">No matching settings</div>
          )}
      </aside>

      {/* Main Content */}
      <main className="camera-settings-content">
        <header className="camera-settings-header">
          <h1>
            {selectedSetting.key === 'camera-order' && selectedRegion
              ? `${selectedRegion} cameras`
              : selectedSetting.label}
          </h1>
        </header>

        {selectedSetting.key === 'report-fields' ? (
          <div className="report-fields-container">
            <p className="report-fields-description">
              Selected fields are included in the camera report
            </p>

            <div className="report-fields-scroll-body">
              <div className="report-fields-groups">
                {REPORT_FIELD_GROUPS.map((group) => (
                  <div key={group.category} className="report-field-row">
                    <div className="report-field-category">{group.category}</div>
                    <div className="report-field-options">
                      {group.fields.map((field) => {
                        const isChecked = selectedReportFields.includes(field.id);
                        return (
                          <label
                            key={field.id}
                            className={`report-field-pill ${isChecked ? 'active' : ''}`}
                          >
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => toggleReportField(field.id)}
                            />
                            <span>{field.label}</span>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <footer className="camera-settings-footer">
              <button
                type="button"
                className="settings-save-btn"
                onClick={handleSaveReportFields}
                disabled={saving}
              >
                <FontAwesomeIcon icon={faCheck} />
                <span>{saving ? 'Saving...' : 'Save changes'}</span>
              </button>
            </footer>
          </div>
        ) : selectedSetting.key === 'service-request-ccs' ? (
          <>
            <section className="settings-list">
              {loading && <div className="settings-message">Loading...</div>}
              {!loading && error && <div className="settings-error">{error}</div>}

              {!loading &&
                !error &&
                serviceRequestCcs.map((cc, index) => (
                  <div key={index} className="settings-row">
                    <div className="settings-drag-handle" title="Drag to reorder">
                      <FontAwesomeIcon icon={faGripVertical} />
                    </div>

                    {editingCcIndex === index ? (
                      <>
                        <div className="settings-name">
                          <input
                            type="text"
                            value={editingCcName}
                            onChange={(event) => setEditingCcName(event.target.value)}
                          />
                        </div>

                        <div className="settings-email">
                          <input
                            type="email"
                            value={editingCcEmail}
                            onChange={(event) => setEditingCcEmail(event.target.value)}
                          />
                        </div>

                        <div className="settings-actions">
                          <button
                            type="button"
                            className="settings-action-btn"
                            aria-label="Save"
                            onClick={() => {
                              const updated = [...serviceRequestCcs];
                              updated[index] = {
                                ...updated[index],
                                name: editingCcName.trim(),
                                email: editingCcEmail.trim(),
                              };
                              setServiceRequestCcs(updated);
                              setEditingCcIndex(null);
                            }}
                          >
                            <FontAwesomeIcon icon={faCheck} />
                          </button>

                          <button
                            type="button"
                            className="settings-action-btn"
                            aria-label="Cancel"
                            onClick={() => setEditingCcIndex(null)}
                          >
                            <FontAwesomeIcon icon={faXmark} />
                          </button>
                        </div>
                      </>
                    ) : (
                      <div className="cc-row">
                        <div className="settings-name">
                          <span>{cc.name}</span>
                          <span className="settings-email">({cc.email})</span>
                        </div>

                        <div className="settings-actions">
                          <button
                            type="button"
                            className="settings-action-btn"
                            aria-label={`Edit ${cc.name}`}
                            onClick={() => {
                              setEditingCcIndex(index);
                              setEditingCcName(cc.name);
                              setEditingCcEmail(cc.email);
                            }}
                          >
                            <FontAwesomeIcon icon={faPenToSquare} />
                          </button>

                          <button
                            type="button"
                            className="settings-action-btn"
                            aria-label={`Delete ${cc.name}`}
                            onClick={() => {
                              setServiceRequestCcs((prev) => prev.filter((_, i) => i !== index));
                            }}
                          >
                            <FontAwesomeIcon icon={faXmark} />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}

              {!loading && !error && (
                <div className="settings-add-row">
                  <div className="settings-drag-handle">
                    <FontAwesomeIcon icon={faGripVertical} />
                  </div>

                  <div className="settings-add-input">
                    <input
                      type="text"
                      placeholder="Name"
                      value={newCcName}
                      onChange={(event) => setNewCcName(event.target.value)}
                    />
                  </div>

                  <div className="settings-add-input">
                    <input
                      type="email"
                      placeholder="Email"
                      value={newCcEmail}
                      onChange={(event) => setNewCcEmail(event.target.value)}
                    />
                  </div>

                  <button
                    type="button"
                    className="settings-add-btn"
                    onClick={() => {
                      const name = newCcName.trim();
                      const email = newCcEmail.trim();
                      if (!name || !email) return;

                      setServiceRequestCcs((prev) => [...prev, { name, email }]);
                      setNewCcName('');
                      setNewCcEmail('');
                    }}
                    disabled={!newCcName.trim() || !newCcEmail.trim()}
                  >
                    <FontAwesomeIcon icon={faCheck} />
                    <span>Add</span>
                  </button>
                </div>
              )}
            </section>

            <footer className="camera-settings-footer">
              <button
                type="button"
                className="settings-save-btn"
                disabled={saving}
                onClick={handleSaveServiceRequestCcs}
              >
                <FontAwesomeIcon icon={faCheck} />
                <span>{saving ? 'Saving...' : 'Save changes'}</span>
              </button>
            </footer>
          </>
        ) : selectedSetting.key === 'default-messaging' ? (
          <div className="default-messaging-container">
            <p className="default-messaging-description">
              Configure the default messaging displayed when a camera view is disabled.
            </p>

            {loadingMessaging ? (
              <div className="settings-message">Loading...</div>
            ) : (
              <>
                {messagingError && <div className="settings-error">{messagingError}</div>}

                <div className="default-messaging-form">
                  <div className="default-messaging-field">
                    <label htmlFor="disabled-reason-default">Reason for disabling view</label>
                    <input
                      id="disabled-reason-default"
                      type="text"
                      value={defaultMessaging.disabled_reason_default}
                      onChange={(event) =>
                        setDefaultMessaging((prev) => ({
                          ...prev,
                          disabled_reason_default: event.target.value,
                        }))
                      }
                      placeholder="Enter default disabled reason"
                      maxLength={255}
                    />
                  </div>

                  <div className="default-messaging-field">
                    <label htmlFor="disabled-short-description">
                      Short description for disabled view
                    </label>
                    <input
                      id="disabled-short-description"
                      type="text"
                      value={defaultMessaging.disabled_short_description}
                      onChange={(event) =>
                        setDefaultMessaging((prev) => ({
                          ...prev,
                          disabled_short_description: event.target.value,
                        }))
                      }
                      placeholder="Enter short description"
                      maxLength={255}
                    />
                  </div>

                  <div className="default-messaging-field">
                    <label htmlFor="disabled-long-description">
                      Long description for disabled view
                    </label>
                    <textarea
                      id="disabled-long-description"
                      value={defaultMessaging.disabled_long_description}
                      onChange={(event) =>
                        setDefaultMessaging((prev) => ({
                          ...prev,
                          disabled_long_description: event.target.value,
                        }))
                      }
                      placeholder="Enter long description"
                      rows={5}
                    />
                  </div>
                </div>
              </>
            )}

            <footer className="camera-settings-footer">
              <button
                type="button"
                className="settings-save-btn"
                onClick={handleSaveDefaultMessaging}
                disabled={saving || loadingMessaging || !!messagingError}
              >
                <FontAwesomeIcon icon={faCheck} />
                <span>{saving ? 'Saving...' : 'Save changes'}</span>
              </button>
            </footer>
          </div>
        ) : selectedSetting.key === 'camera-order' ? (
          <div className="camera-order-container">
            {loadingCameras && <div className="settings-message">Loading...</div>}
            {!loadingCameras && camerasError && (
              <div className="settings-error">{camerasError}</div>
            )}

            {!loadingCameras && !camerasError && (
              <div className="camera-order-scroll-body">
                {draftCameraGroups.length === 0 && selectedRegion && (
                  <div className="settings-message">No cameras found for {selectedRegion}.</div>
                )}

                {draftCameraGroups.map((group, groupIndex) => (
                  <div key={group.road} className="camera-order-group">
                    <button
                      type="button"
                      className="camera-order-group-header"
                      onClick={() => toggleCameraOrderGroup(group.road)}
                      aria-expanded={openCameraOrderGroups[group.road] !== false}
                    >
                      <FontAwesomeIcon
                        icon={faChevronDown}
                        className={
                          openCameraOrderGroups[group.road] === false ? '' : 'rotated'
                        }
                      />
                      <span>{group.road}</span>
                    </button>

                    {openCameraOrderGroups[group.road] !== false && (
                      <div className="camera-order-list">
                        {group.cameras.map((cam, camIndex) => (
                          <div
                            key={cam.id}
                            className="settings-row"
                            draggable
                            onDragStart={(event) =>
                              handleCameraDragStart(event, groupIndex, camIndex)
                            }
                            onDragOver={handleCameraDragOver}
                            onDrop={(event) => handleCameraDrop(event, groupIndex, camIndex)}
                          >
                            <div className="settings-drag-handle" title="Drag to reorder">
                              <FontAwesomeIcon icon={faGripVertical} />
                            </div>
                            <div className="settings-name">
                              <span>{cam.title}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            <footer className="camera-settings-footer">
              <button
                type="button"
                className="settings-save-btn"
                disabled={saving || !hasCameraOrderChanges}
                onClick={handleSaveCameraOrder}
              >
                <FontAwesomeIcon icon={faCheck} />
                <span>{saving ? 'Saving...' : 'Save changes'}</span>
              </button>
            </footer>
          </div>
        ) : (
          /* Standard Lookup Table View */
          <>
            <section className="settings-list">
              {loading && <div className="settings-message">Loading...</div>}
              {!loading && error && <div className="settings-error">{error}</div>}

              {!loading &&
                !error &&
                items.map((item, index) => (
                  <div
                    key={item.id ?? `new-${index}`}
                    className="settings-row"
                    draggable
                    onDragStart={(event) => handleDragStart(event, index)}
                    onDragOver={handleDragOver}
                    onDrop={(event) => handleDrop(event, index)}
                  >
                    <div className="settings-drag-handle" title="Drag to reorder">
                      <FontAwesomeIcon icon={faGripVertical} />
                    </div>

                    <div className="settings-name">
                      {editingId !== null && editingId === item.id ? (
                        <input
                          type="text"
                          value={editingName}
                          onChange={(event) => setEditingName(event.target.value)}
                          onKeyDown={(event) => handleEditingKeyDown(event, item.id)}
                        />
                      ) : (
                        <span>{item.name}</span>
                      )}
                    </div>

                    <div className="settings-actions">
                      {editingId !== null && editingId === item.id ? (
                        <button
                          type="button"
                          className="settings-action-btn"
                          aria-label="Save item"
                          onClick={() => saveEditing(item.id)}
                        >
                          <FontAwesomeIcon icon={faCheck} />
                        </button>
                      ) : (
                        <button
                          type="button"
                          className="settings-action-btn"
                          aria-label={`Edit ${item.name}`}
                          onClick={() => startEditing(item)}
                        >
                          <FontAwesomeIcon icon={faPenToSquare} />
                        </button>
                      )}

                      <button
                        type="button"
                        className="settings-action-btn"
                        aria-label={`Delete ${item.name}`}
                        onClick={() => handleDelete(item)}
                      >
                        <FontAwesomeIcon icon={faXmark} />
                      </button>
                    </div>
                  </div>
                ))}

              {!loading && !error && (
                <div className="settings-add-row">
                  <div className="settings-drag-handle">
                    <FontAwesomeIcon icon={faGripVertical} />
                  </div>

                  <div className="settings-add-input">
                    <input
                      type="text"
                      value={newItemName}
                      onChange={(event) => setNewItemName(event.target.value)}
                      onKeyDown={handleNewItemKeyDown}
                    />
                  </div>

                  <button
                    type="button"
                    className="settings-add-btn"
                    onClick={handleAdd}
                    disabled={!newItemName.trim()}
                  >
                    <FontAwesomeIcon icon={faCheck} />
                    <span>Add</span>
                  </button>
                </div>
              )}
            </section>

            <footer className="camera-settings-footer">
              <button
                type="button"
                className="settings-save-btn"
                disabled={saving || !hasChanges}
                onClick={handleSave}
              >
                <FontAwesomeIcon icon={faCheck} />
                <span>{saving ? 'Saving...' : 'Save changes'}</span>
              </button>
            </footer>
          </>
        )}
      </main>
    </div>
  );
}

