import { useEffect, useMemo, useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faPenToSquare,
  faXmark,
  faCheck,
  faCircleCheck,
} from '@fortawesome/pro-regular-svg-icons';
import { faChevronDown as faChevronDownSolid, faGripDots } from '@fortawesome/pro-solid-svg-icons';
import { useSearchParams } from 'react-router';
import { getCookie } from '../shared/helpers.js';
import Button from '../components/shared/Button.jsx';
import SkeletonList from '../components/shared/SkeletonList.jsx';
import useDragReorder from './useDragReorder.js';
import Sidebar, {
  SidebarAccordion,
  SidebarItem,
  SidebarLayout,
  SidebarLink,
  SidebarMessage,
  SidebarNav,
  SidebarSearch,
} from '../components/shared/Sidebar.jsx';
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

// const SPECIAL_KEYS = ['report-fields', 'service-request-ccs', 'default-messaging', 'camera-order'];
const SPECIAL_KEYS = new Set(['report-fields', 'service-request-ccs', 'default-messaging', 'camera-order']);

/* ------------------------------------------------------------------ *
 * Data hooks — one per settings section. Each owns its own state and
 * fetch effect, gated by a single `isActive` flag, so each function
 * carries its own (small) cognitive-complexity score instead of all
 * of them stacking onto one giant component.
 * ------------------------------------------------------------------ */

function useDbLookupSettings(selectedSetting) {
  const [items, setItems] = useState([]);
  const [originalItems, setOriginalItems] = useState([]);
  const [newItemName, setNewItemName] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editingName, setEditingName] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const isActive = !SPECIAL_KEYS.has(selectedSetting.key) && !!selectedSetting.endpoint;

  useEffect(() => {
    if (!isActive) {
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedSetting, isActive]);

  const handleAdd = () => {
    const trimmedName = newItemName.trim();
    if (!trimmedName) return;
    if (items.some((item) => item.name.toLowerCase() === trimmedName.toLowerCase())) return;

    setItems((prev) => [...prev, { id: null, name: trimmedName, display_order: prev.length, isNew: true }]);
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

    setItems((prev) => prev.map((item) => (item.id === itemId ? { ...item, name: trimmedName } : item)));
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

  const moveItem = (from, to) => {
    setItems((prev) => {
      const next = [...prev];
      const [movedItem] = next.splice(from, 1);
      next.splice(to, 0, movedItem);
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

  const hasChanges = useMemo(() => JSON.stringify(items) !== JSON.stringify(originalItems), [items, originalItems]);

  return {
    items,
    newItemName,
    setNewItemName,
    editingId,
    editingName,
    setEditingName,
    loading,
    saving,
    error,
    hasChanges,
    handleAdd,
    handleNewItemKeyDown,
    startEditing,
    cancelEditing,
    saveEditing,
    handleEditingKeyDown,
    handleDelete,
    moveItem,
    handleSave,
  };
}

function useReportFieldsSettings(isActive) {
  const [selectedReportFields, setSelectedReportFields] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!isActive) return;

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
  }, [isActive]);

  const toggleReportField = (fieldId) => {
    setSelectedReportFields((prev) =>
      prev.includes(fieldId) ? prev.filter((id) => id !== fieldId) : [...prev, fieldId]
    );
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);

    try {
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
      setSelectedReportFields(data.selected_fields ?? []);
    } catch (err) {
      console.error('Failed to save report fields:', err);
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return { selectedReportFields, loading, saving, error, toggleReportField, handleSave };
}

function useServiceRequestCcsSettings(isActive) {
  const [serviceRequestCcs, setServiceRequestCcs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [newCcName, setNewCcName] = useState('');
  const [newCcEmail, setNewCcEmail] = useState('');
  const [editingCcIndex, setEditingCcIndex] = useState(null);
  const [editingCcName, setEditingCcName] = useState('');
  const [editingCcEmail, setEditingCcEmail] = useState('');

  useEffect(() => {
    if (!isActive) return;

    const loadServiceRequestCcs = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await fetch(`${API_HOST}/api/service-request-ccs/`, { credentials: 'include' });
        if (!response.ok) {
          throw new Error(`Failed to load Service Request CCs: ${response.status}`);
        }
        const data = await response.json();
        const withIds = (data.service_request_ccs ?? []).map((cc) => ({
          ...cc,
          id: cc.id ?? crypto.randomUUID(),
        }));
        setServiceRequestCcs(withIds);
      } catch (err) {
        console.error('Failed to load Service Request CCs:', err);
        setError(err.message);
        setServiceRequestCcs([]);
      } finally {
        setLoading(false);
      }
    };

    loadServiceRequestCcs();
  }, [isActive]);

  const startEditingCc = (index, cc) => {
    setEditingCcIndex(index);
    setEditingCcName(cc.name);
    setEditingCcEmail(cc.email);
  };

  const cancelEditingCc = () => setEditingCcIndex(null);

  const saveEditingCc = (index) => {
    setServiceRequestCcs((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], name: editingCcName.trim(), email: editingCcEmail.trim() };
      return updated;
    });
    setEditingCcIndex(null);
  };

  const deleteCc = (index) => {
    setServiceRequestCcs((prev) => prev.filter((_, i) => i !== index));
  };

  const addCc = () => {
    const name = newCcName.trim();
    const email = newCcEmail.trim();
    if (!name || !email) return;

    setServiceRequestCcs((prev) => [...prev, { id: crypto.randomUUID(), name, email }]);
    setNewCcName('');
    setNewCcEmail('');
  };

  const handleSave = async () => {
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
      const withIds = (data.service_request_ccs ?? []).map((cc) => ({
        ...cc,
        id: cc.id ?? crypto.randomUUID(),
      }));
      setServiceRequestCcs(withIds);
    } catch (err) {
      console.error('Failed to save Service Request CCs:', err);
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return {
    serviceRequestCcs,
    loading,
    saving,
    error,
    newCcName,
    setNewCcName,
    newCcEmail,
    setNewCcEmail,
    editingCcIndex,
    editingCcName,
    setEditingCcName,
    editingCcEmail,
    setEditingCcEmail,
    startEditingCc,
    cancelEditingCc,
    saveEditingCc,
    deleteCc,
    addCc,
    handleSave,
  };
}

function useDefaultMessagingSettings(isActive) {
  const [defaultMessaging, setDefaultMessaging] = useState({
    disabled_reason_default: '',
    disabled_short_description: '',
    disabled_long_description: '',
  });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isActive) return;

    const loadCameraDefaultMessaging = async () => {
      try {
        setLoading(true);
        setError('');
        const response = await fetch(`${API_HOST}/api/camera-default-messaging/`, { credentials: 'include' });
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
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    loadCameraDefaultMessaging();
  }, [isActive]);

  const updateField = (field, value) => {
    setDefaultMessaging((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    setSaving(true);
    setError('');

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
    } catch (err) {
      console.error('Failed to save default messaging:', err);
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return { defaultMessaging, loading, saving, error, updateField, handleSave };
}

// Normalizes /api/cameras/ responses regardless of whether the backend
// returns a bare array, a paginated `{results: [...]}`, or `{cameras: [...]}`.
async function fetchCameras() {
  const response = await fetch(`${API_HOST}/api/cameras/`, { credentials: 'include' });

  if (!response.ok) {
    throw new Error(`Failed to load cameras: ${response.status}`);
  }

  const data = await response.json();

  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.results)) return data.results;
  if (Array.isArray(data?.cameras)) return data.cameras;

  console.error('Unexpected /api/cameras/ response shape:', data);
  return [];
}

function useCameraOrderSettings({ selectedSetting, selectedRegion, isCameraOrderOpen, searchParams, setSearchParams }) {
  const [cameras, setCameras] = useState([]);
  const [loadingCameras, setLoadingCameras] = useState(false);
  const [camerasError, setCamerasError] = useState(null);
  const [saving, setSaving] = useState(false);
  const [draftCameraGroups, setDraftCameraGroups] = useState([]);
  const [openCameraOrderGroups, setOpenCameraOrderGroups] = useState({});

  const cameraRegions = useMemo(() => {
    const list = Array.isArray(cameras) ? cameras : [];
    const regions = new Set(list.map((cam) => cam.region?.name).filter(Boolean));
    return Array.from(regions).sort((a, b) => a.localeCompare(b));
  }, [cameras]);

  const cameraOrderGroups = useMemo(() => {
    if (selectedSetting.key !== 'camera-order' || !selectedRegion) return [];

    const list = Array.isArray(cameras) ? cameras : [];
    const regionCameras = list.filter((cam) => cam.region?.name === selectedRegion);
    const byHighway = new Map();

    regionCameras.forEach((cam) => {
      const road = cam.road?.name || 'Other';
      if (!byHighway.has(road)) byHighway.set(road, []);
      byHighway.get(road).push(cam);
    });

    return Array.from(byHighway.entries())
      .map(([road, camList]) => ({
        road,
        cameras: [...camList].sort((a, b) => (a.display_order ?? 0) - (b.display_order ?? 0)),
      }))
      .sort((a, b) => a.road.localeCompare(b.road, undefined, { numeric: true }));
  }, [cameras, selectedRegion, selectedSetting.key]);

  const hasCameraOrderChanges = useMemo(
    () => JSON.stringify(draftCameraGroups) !== JSON.stringify(cameraOrderGroups),
    [draftCameraGroups, cameraOrderGroups]
  );

  // Fetch all cameras once, the first time the Camera order section is
  // opened or navigated to directly via URL.
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

  // Once cameras are loaded, default to the first region if none is selected yet.
  useEffect(() => {
    if (selectedSetting.key !== 'camera-order' || searchParams.get('region') || cameraRegions.length === 0) return;
    setSearchParams({ setting: 'camera-order', region: cameraRegions[0] });
  }, [selectedSetting.key, searchParams, cameraRegions, setSearchParams]);

  // Keep the editable draft in sync whenever the underlying data changes.
  useEffect(() => {
    setDraftCameraGroups(cameraOrderGroups);
  }, [cameraOrderGroups]);

  const toggleCameraOrderGroup = (road) => {
    setOpenCameraOrderGroups((prev) => {
      const isOpen = prev[road] !== false;
      return { ...prev, [road]: !isOpen };
    });
  };

  const moveCamera = (groupIndex, from, to) => {
    setDraftCameraGroups((prev) => {
      const next = prev.map((group) => ({ ...group, cameras: [...group.cameras] }));
      const groupCams = next[groupIndex].cameras;
      const [moved] = groupCams.splice(from, 1);
      groupCams.splice(to, 0, moved);
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
          group.cameras.map((cam) => ({ id: cam.id, display_order: order++ }))
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

      // Don't trust the shape of the order-save response — just re-fetch
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

  return {
    cameras,
    loadingCameras,
    camerasError,
    cameraRegions,
    draftCameraGroups,
    hasCameraOrderChanges,
    openCameraOrderGroups,
    saving,
    toggleCameraOrderGroup,
    moveCamera,
    handleSaveCameraOrder,
  };
}

/* ------------------------------------------------------------------ *
 * Presentational pieces — one component per settings section, plus the
 * sidebar. Each renders only the branch it owns, so none of them carry
 * the combined weight of the old 5-way ternary.
 * ------------------------------------------------------------------ */

function SettingsSidebar({
  searchQuery,
  setSearchQuery,
  normalizedQuery,
  filteredSettings,
  filteredOtherSettings,
  selectedSetting,
  selectedRegion,
  selectSetting,
  selectCameraRegion,
  isDbSetupOpen,
  setIsDbSetupOpen,
  isCameraOrderOpen,
  setIsCameraOrderOpen,
  cameraRegions,
  loadingCameras,
  camerasError,
}) {
  return (
    <Sidebar backTo="/cameras/">
      <SidebarSearch
        value={searchQuery}
        onChange={setSearchQuery}
        label="Search camera settings" />

      <SidebarNav>
        {filteredSettings.length > 0 && (
          <SidebarAccordion
            title="Database setup"
            open={isDbSetupOpen}
            onToggle={setIsDbSetupOpen}>
            {filteredSettings.map((setting) => (
              <SidebarItem
                key={setting.key}
                selected={selectedSetting.key === setting.key}
                onClick={() => selectSetting(setting)}>
                {setting.label}
              </SidebarItem>
            ))}
          </SidebarAccordion>
        )}

        {filteredOtherSettings.map((setting) =>
          setting.key === 'camera-order' ? (
            <SidebarAccordion
              key={setting.key}
              title={setting.label}
              open={isCameraOrderOpen}
              onToggle={(open) => {
                setIsCameraOrderOpen(open);
                selectSetting(setting);
              }}>
              {loadingCameras && <SkeletonList count={3} height={32} gap={4} />}
              {!loadingCameras && camerasError && <SidebarMessage error>{camerasError}</SidebarMessage>}
              {!loadingCameras &&
                !camerasError &&
                cameraRegions.map((region) => (
                  <SidebarItem
                    key={region}
                    selected={selectedSetting.key === 'camera-order' && selectedRegion === region}
                    onClick={() => selectCameraRegion(setting, region)}>
                    {region}
                  </SidebarItem>
                ))}
            </SidebarAccordion>
          ) : (
            <SidebarLink
              key={setting.key}
              selected={selectedSetting.key === setting.key}
              onClick={() => selectSetting(setting)}>
              {setting.label}
            </SidebarLink>
          )
        )}

        {normalizedQuery && filteredSettings.length === 0 && filteredOtherSettings.length === 0 && (
          <SidebarMessage>No matching settings</SidebarMessage>
        )}
      </SidebarNav>
    </Sidebar>
  );
}

function SaveFooter({ saving, disabled, onSave }) {
  return (
    <footer className="camera-settings-footer">
      <Button size="lg" onClick={onSave} disabled={disabled}>
        <FontAwesomeIcon icon={faCircleCheck} />
        {saving ? 'Saving...' : 'Save changes'}
      </Button>
    </footer>
  );
}

function ReportFieldsView({ reportFields }) {
  const { selectedReportFields, saving, toggleReportField, handleSave } = reportFields;

  return (
    <>
      <div className="settings-body">
        <div className="report-fields">
          <p className="settings-description">Selected fields are included in the camera report</p>

          {REPORT_FIELD_GROUPS.map((group) => (
            <div key={group.category} className="report-field-group">
              <div className="report-field-category">{group.category}</div>
              <div className="report-field-options">
                {group.fields.map((field) => {
                  const isChecked = selectedReportFields.includes(field.id);
                  return (
                    <label
                      key={field.id}
                      className={`report-field-item${isChecked ? ' report-field-item--selected' : ''}`}
                    >
                      <input type="checkbox" checked={isChecked} onChange={() => toggleReportField(field.id)} />
                      {field.label}
                    </label>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      <SaveFooter saving={saving} disabled={saving} onSave={handleSave} />
    </>
  );
}

function RowActions({ children }) {
  return <div className="settings-actions">{children}</div>;
}

function RowActionButton({ icon, label, onClick }) {
  return (
    <Button variant="tertiary" extraClasses="settings-action-btn" aria-label={label} onClick={onClick}>
      <FontAwesomeIcon icon={icon} />
    </Button>
  );
}

function ServiceRequestCcsRow({ cc, index, ccs }) {
  const { editingCcIndex, editingCcName, setEditingCcName, editingCcEmail, setEditingCcEmail } = ccs;

  if (editingCcIndex === index) {
    return (
      <div className="settings-row">
        <div className="settings-row__main">
          <div className="settings-grip" title="Drag to reorder">
            <FontAwesomeIcon icon={faGripDots} />
          </div>
          <input
            type="text"
            className="settings-input"
            aria-label="Name"
            value={editingCcName}
            onChange={(event) => setEditingCcName(event.target.value)}
          />
          <input
            type="email"
            className="settings-input"
            aria-label="Email"
            value={editingCcEmail}
            onChange={(event) => setEditingCcEmail(event.target.value)}
          />
        </div>

        <RowActions>
          <RowActionButton icon={faCheck} label="Save" onClick={() => ccs.saveEditingCc(index)} />
          <RowActionButton icon={faXmark} label="Cancel" onClick={ccs.cancelEditingCc} />
        </RowActions>
      </div>
    );
  }

  return (
    <div className="settings-row">
      <div className="settings-row__main">
        <div className="settings-grip" title="Drag to reorder">
          <FontAwesomeIcon icon={faGripDots} />
        </div>
        <span className="settings-name">{cc.name}</span>
        <span className="settings-email">({cc.email})</span>
      </div>

      <RowActions>
        <RowActionButton icon={faPenToSquare} label={`Edit ${cc.name}`} onClick={() => ccs.startEditingCc(index, cc)} />
        <RowActionButton icon={faXmark} label={`Delete ${cc.name}`} onClick={() => ccs.deleteCc(index)} />
      </RowActions>
    </div>
  );
}

function ServiceRequestCcsView({ ccs }) {
  const { serviceRequestCcs, loading, error, newCcName, setNewCcName, newCcEmail, setNewCcEmail, saving } = ccs;

  return (
    <>
      <section className="settings-body">
        {loading && <SkeletonList count={4} height={44} />}
        {!loading && error && <p className="settings-error">{error}</p>}

        {!loading && !error && (
          <div className="settings-list">
            {serviceRequestCcs.map((cc, index) => (
              <ServiceRequestCcsRow key={cc.id} cc={cc} index={index} ccs={ccs} />
            ))}

            <div className="settings-add-fields">
              <input
                type="text"
                className="settings-input"
                aria-label="Name"
                value={newCcName}
                onChange={(event) => setNewCcName(event.target.value)}
              />
              <input
                type="email"
                className="settings-input"
                aria-label="Email"
                value={newCcEmail}
                onChange={(event) => setNewCcEmail(event.target.value)}
              />

              <Button variant="secondary" onClick={ccs.addCc} disabled={!newCcName.trim() || !newCcEmail.trim()}>
                <FontAwesomeIcon icon={faCheck} />
                Add
              </Button>
            </div>
          </div>
        )}
      </section>

      <SaveFooter saving={saving} disabled={saving} onSave={ccs.handleSave} />
    </>
  );
}

function DefaultMessagingView({ messaging }) {
  const { defaultMessaging, loading, error, saving, updateField, handleSave } = messaging;

  return (
    <>
      <div className="settings-body">
        <div className="default-messaging">
          <p className="settings-description">Default messages shown in the following fields</p>

          {loading ? (
            <SkeletonList count={3} height={40} />
          ) : (
            <>
              {error && <p className="settings-error">{error}</p>}

              <div className="default-messaging__row">
                <label className="default-messaging__label" htmlFor="disabled-reason-default">
                  Reason for disabling view
                </label>
                <input
                  id="disabled-reason-default"
                  type="text"
                  className="default-messaging__field"
                  value={defaultMessaging.disabled_reason_default}
                  onChange={(event) => updateField('disabled_reason_default', event.target.value)}
                  maxLength={255}
                />
              </div>

              <div className="default-messaging__row">
                <label className="default-messaging__label" htmlFor="disabled-short-description">
                  Short description for disabled view
                </label>
                <input
                  id="disabled-short-description"
                  type="text"
                  className="default-messaging__field"
                  value={defaultMessaging.disabled_short_description}
                  onChange={(event) => updateField('disabled_short_description', event.target.value)}
                  maxLength={255}
                />
              </div>

              <div className="default-messaging__row">
                <label className="default-messaging__label" htmlFor="disabled-long-description">
                  Long description for disabled view
                </label>
                <textarea
                  id="disabled-long-description"
                  className="default-messaging__field"
                  value={defaultMessaging.disabled_long_description}
                  onChange={(event) => updateField('disabled_long_description', event.target.value)}
                />
              </div>
            </>
          )}
        </div>
      </div>

      <SaveFooter saving={saving} disabled={saving || loading || !!error} onSave={handleSave} />
    </>
  );
}

function CameraOrderGroup({ group, groupIndex, cameraOrder }) {
  const { openCameraOrderGroups, toggleCameraOrderGroup, moveCamera } = cameraOrder;
  const { rowProps, listProps } = useDragReorder((from, to) => moveCamera(groupIndex, from, to));
  const isOpen = openCameraOrderGroups[group.road] !== false;

  return (
    <div className={`camera-order-group${isOpen ? ' camera-order-group--open' : ''}`} {...listProps}>
      <button
        type="button"
        className="camera-order-group-header"
        onClick={() => toggleCameraOrderGroup(group.road)}
        aria-expanded={isOpen}
      >
        <FontAwesomeIcon icon={faChevronDownSolid} />
        <span>{group.road}</span>
      </button>

      {isOpen && (
        <div className="camera-order-list">
          {group.cameras.map((cam, camIndex) => (
            <div key={cam.id} {...rowProps(camIndex, 'camera-order-item')}>
              <div className="settings-grip" title="Drag to reorder">
                <FontAwesomeIcon icon={faGripDots} />
              </div>
              <span className="settings-name">{cam.title}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function CameraOrderView({ selectedRegion, cameraOrder }) {
  const { loadingCameras, camerasError, draftCameraGroups, hasCameraOrderChanges, saving, handleSaveCameraOrder } =
    cameraOrder;

  return (
    <>
      <div className="settings-body">
        {loadingCameras && <SkeletonList count={3} height={44} />}
        {!loadingCameras && camerasError && <p className="settings-error">{camerasError}</p>}

        {!loadingCameras && !camerasError && (
          <div className="settings-list">
            {draftCameraGroups.length === 0 && selectedRegion && (
              <p className="settings-message">No cameras found for {selectedRegion}.</p>
            )}

            {draftCameraGroups.map((group, groupIndex) => (
              <CameraOrderGroup key={group.road} group={group} groupIndex={groupIndex} cameraOrder={cameraOrder} />
            ))}
          </div>
        )}
      </div>

      <SaveFooter saving={saving} disabled={saving || !hasCameraOrderChanges} onSave={handleSaveCameraOrder} />
    </>
  );
}

function LookupTableView({ lookup }) {
  const {
    items,
    newItemName,
    setNewItemName,
    editingId,
    editingName,
    setEditingName,
    loading,
    saving,
    error,
    hasChanges,
    handleAdd,
    handleNewItemKeyDown,
    startEditing,
    saveEditing,
    handleEditingKeyDown,
    handleDelete,
    moveItem,
    handleSave,
  } = lookup;
  const { rowProps, listProps } = useDragReorder(moveItem);

  return (
    <>
      <section className="settings-body" {...listProps}>
        {loading && <SkeletonList count={4} height={44} />}
        {!loading && error && <p className="settings-error">{error}</p>}

        {!loading && !error && (
          <div className="settings-list">
            {items.map((item, index) => {
              const isEditing = editingId !== null && editingId === item.id;

              return (
                <div key={item.id ?? `new-${index}`} {...rowProps(index, 'settings-row')}>
                  <div className="settings-row__main">
                    <div className="settings-grip" title="Drag to reorder">
                      <FontAwesomeIcon icon={faGripDots} />
                    </div>

                    {isEditing ? (
                      <input
                        type="text"
                        className="settings-input"
                        aria-label="Name"
                        value={editingName}
                        onChange={(event) => setEditingName(event.target.value)}
                        onKeyDown={(event) => handleEditingKeyDown(event, item.id)}
                      />
                    ) : (
                      <span className="settings-name">{item.name}</span>
                    )}
                  </div>

                  <RowActions>
                    {isEditing ? (
                      <RowActionButton icon={faCheck} label="Save item" onClick={() => saveEditing(item.id)} />
                    ) : (
                      <RowActionButton icon={faPenToSquare} label={`Edit ${item.name}`} onClick={() => startEditing(item)} />
                    )}
                    <RowActionButton icon={faXmark} label={`Delete ${item.name}`} onClick={() => handleDelete(item)} />
                  </RowActions>
                </div>
              );
            })}

            <div className="settings-add-fields">
              <input
                type="text"
                className="settings-input"
                aria-label="New item name"
                value={newItemName}
                onChange={(event) => setNewItemName(event.target.value)}
                onKeyDown={handleNewItemKeyDown}
              />

              <Button variant="secondary" onClick={handleAdd} disabled={!newItemName.trim()}>
                <FontAwesomeIcon icon={faCheck} />
                Add
              </Button>
            </div>
          </div>
        )}
      </section>

      <SaveFooter saving={saving} disabled={saving || !hasChanges} onSave={handleSave} />
    </>
  );
}

const VIEW_COMPONENTS = {
  'report-fields': (props) => <ReportFieldsView reportFields={props.reportFields} />,
  'service-request-ccs': (props) => <ServiceRequestCcsView ccs={props.ccs} />,
  'default-messaging': (props) => <DefaultMessagingView messaging={props.messaging} />,
  'camera-order': (props) => <CameraOrderView selectedRegion={props.selectedRegion} cameraOrder={props.cameraOrder} />,
};

/* ------------------------------------------------------------------ *
 * Top-level component — now just wiring: pick the hooks, pick the
 * view, render it. No branching logic of its own left to score.
 * ------------------------------------------------------------------ */

export default function CameraSettings() {
  const [searchParams, setSearchParams] = useSearchParams();
  const selectedKey = searchParams.get('setting') || 'service-providers';
  const selectedSetting = useMemo(
    () => ALL_SETTINGS.find((setting) => setting.key === selectedKey) || SETTINGS[0],
    [selectedKey]
  );
  const selectedRegion = searchParams.get('region') || '';

  const [isCameraOrderOpen, setIsCameraOrderOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isDbSetupOpen, setIsDbSetupOpen] = useState(true);
  const normalizedQuery = searchQuery.trim().toLowerCase();

  const lookup = useDbLookupSettings(selectedSetting);
  const reportFields = useReportFieldsSettings(selectedSetting.key === 'report-fields');
  const ccs = useServiceRequestCcsSettings(selectedSetting.key === 'service-request-ccs');
  const messaging = useDefaultMessagingSettings(selectedSetting.key === 'default-messaging');
  const cameraOrder = useCameraOrderSettings({
    selectedSetting,
    selectedRegion,
    isCameraOrderOpen,
    searchParams,
    setSearchParams,
  });

  const filteredSettings = useMemo(() => {
    if (!normalizedQuery) return SETTINGS;
    return SETTINGS.filter((setting) => setting.label.toLowerCase().includes(normalizedQuery));
  }, [normalizedQuery]);

  const filteredOtherSettings = useMemo(() => {
    if (!normalizedQuery) return OTHER_SETTINGS;
    return OTHER_SETTINGS.filter((setting) => setting.label.toLowerCase().includes(normalizedQuery));
  }, [normalizedQuery]);

  const selectSetting = (setting) => setSearchParams({ setting: setting.key });
  const selectCameraRegion = (setting, region) => setSearchParams({ setting: setting.key, region });

  const renderView = VIEW_COMPONENTS[selectedSetting.key];

  return (
    <SidebarLayout
      sidebar={
        <SettingsSidebar
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          normalizedQuery={normalizedQuery}
          filteredSettings={filteredSettings}
          filteredOtherSettings={filteredOtherSettings}
          selectedSetting={selectedSetting}
          selectedRegion={selectedRegion}
          selectSetting={selectSetting}
          selectCameraRegion={selectCameraRegion}
          isDbSetupOpen={isDbSetupOpen}
          setIsDbSetupOpen={setIsDbSetupOpen}
          isCameraOrderOpen={isCameraOrderOpen}
          setIsCameraOrderOpen={setIsCameraOrderOpen}
          cameraRegions={cameraOrder.cameraRegions}
          loadingCameras={cameraOrder.loadingCameras}
          camerasError={cameraOrder.camerasError}
        />
      }
    >
      <main className="camera-settings-content">
        <header className="camera-settings-header">
          <p className="camera-settings-eyebrow">Manage Camera Settings</p>
          <h1>
            {selectedSetting.key === 'camera-order' && selectedRegion ? `${selectedRegion} cameras` : selectedSetting.label}
          </h1>
        </header>

        {renderView ? renderView({ reportFields, ccs, messaging, selectedRegion, cameraOrder }) : (
          <LookupTableView lookup={lookup} />
        )}
      </main>
    </SidebarLayout>
  );
}
