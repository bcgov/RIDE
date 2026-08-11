import React, { useEffect, useMemo, useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faGripVertical,
  faPenToSquare,
  faXmark,
  faCheck,
  faChevronDown,
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
  { key: 'camera-order', label: 'Camera order', endpoint: 'camera-order' },
  { key: 'report-fields', label: 'Report fields' },
  { key: 'default-messaging', label: 'Default messaging', endpoint: 'default-messaging' },
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

// Initialize default selected fields from the structure
const INITIAL_SELECTED_FIELDS = REPORT_FIELD_GROUPS.flatMap((g) => g.fields)
  .filter((f) => f.defaultChecked)
  .map((f) => f.id);

const ALL_SETTINGS = [...SETTINGS, ...OTHER_SETTINGS];

// Load initial state from localStorage if available, otherwise use defaults
const getInitialReportFields = () => {
  const saved = localStorage.getItem(REPORT_FIELDS_STORAGE_KEY);
  if (saved) {
    try {
      return JSON.parse(saved);
    } catch (e) {
      console.error('Failed to parse saved report fields', e);
    }
  }
  return REPORT_FIELD_GROUPS.flatMap((g) => g.fields)
    .filter((f) => f.defaultChecked)
    .map((f) => f.id);
};

export default function CameraSettings() {
  const [searchParams, setSearchParams] = useSearchParams();
  const selectedKey = searchParams.get('setting') || 'service-providers';
  const selectedSetting = useMemo(
    () => ALL_SETTINGS.find((setting) => setting.key === selectedKey) || SETTINGS[0],
    [selectedKey]
  );

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

    // Give React a frame to re-render the button with disabled=true
    setTimeout(() => {
      try {
        setSelectedReportFields(data.selected_fields ?? []);
      } catch (err) {
        console.error('Failed to save report fields to localStorage:', err);
      } finally {
        // Keep the visual feedback visible briefly (e.g. 400ms)
        setTimeout(() => {
          setSaving(false);
        }, 400);
      }
    }, 50);
  };

  // Load database settings (Skipped for 'report-fields')
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

          const response = await fetch(
            `${API_HOST}/api/service-request-ccs/`,
            {
              credentials: 'include',
            }
          );

          if (!response.ok) {
            throw new Error(
              `Failed to load Service Request CCs: ${response.status}`
            );
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

  const selectSetting = (setting) => {
    setSearchParams({ setting: setting.key });
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

      const response = await fetch(
        `${API_HOST}/api/service-request-ccs/`,
        {
          method: 'PUT',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
            'X-CSRFToken': getCookie('csrftoken'),
          },
          body: JSON.stringify({
            service_request_ccs: serviceRequestCcs,
          }),
        }
      );

      if (!response.ok) {
        throw new Error(
          `Failed to save Service Request CCs: ${response.status}`
        );
      }

      const data = await response.json();

      setServiceRequestCcs(
        data.service_request_ccs ?? []
      );
    } catch (err) {
      console.error(
        'Failed to save Service Request CCs:',
        err
      );
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="camera-settings-page">
      {/* Sidebar */}
      <aside className="camera-settings-sidebar">
        <div className="settings-sidebar-title">MANAGE CAMERA SETTINGS</div>

        <button type="button" className="settings-section-header">
          <span>Database setup</span>
          <FontAwesomeIcon icon={faChevronDown} />
        </button>

        <nav className="settings-navigation">
          {SETTINGS.map((setting) => (
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

        {OTHER_SETTINGS.map((setting) => (
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
        ))}
      </aside>

      {/* Main Content */}
      <main className="camera-settings-content">
        <header className="camera-settings-header">
          <h1>{selectedSetting.label}</h1>
        </header>

        {selectedSetting.key === 'report-fields' ? (
          <div className="report-fields-container">
            <p className="report-fields-description">
              Selected fields are included in the camera report
            </p>

            {/* Scrollable area for the options */}
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

            {/* Sticky/Fixed Footer */}
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
          // console.log('test')
          <> 
            <section className="settings-list">
              {loading && (
                <div className="settings-message">
                  Loading...
                </div>
              )}

              {!loading && error && (
                <div className="settings-error">
                  {error}
                </div>
              )}

              {!loading &&
                !error &&
                serviceRequestCcs.map((cc, index) => (
                  <div
                    key={index}
                    className="settings-row"
                  >
                    <div
                      className="settings-drag-handle"
                      title="Drag to reorder"
                    >
                      <FontAwesomeIcon icon={faGripVertical} />
                    </div>

                    {editingCcIndex === index ? (
                      <>
                        <div className="settings-name">
                          <input
                            type="text"
                            value={editingCcName}
                            autoFocus
                            onChange={(event) =>
                              setEditingCcName(event.target.value)
                            }
                          />
                        </div>

                        <div className="settings-email">
                          <input
                            type="email"
                            value={editingCcEmail}
                            onChange={(event) =>
                              setEditingCcEmail(event.target.value)
                            }
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
                      <>
                      <div className="cc-row">
                        <div className="settings-name">
                          <span>{cc.name}</span>
                          <span className="settings-email">
                            ({cc.email})
                          </span>
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
                              setServiceRequestCcs((prev) =>
                                prev.filter((_, i) => i !== index)
                              );
                            }}
                          >
                            <FontAwesomeIcon icon={faXmark} />
                          </button>
                        </div>

                      </div>
                        
                      </>
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
                      onChange={(event) =>
                        setNewCcName(event.target.value)
                      }
                    />
                  </div>

                  <div className="settings-add-input">
                    <input
                      type="email"
                      placeholder="Email"
                      value={newCcEmail}
                      onChange={(event) =>
                        setNewCcEmail(event.target.value)
                      }
                    />
                  </div>

                  <button
                    type="button"
                    className="settings-add-btn"
                    onClick={() => {
                      const name = newCcName.trim();
                      const email = newCcEmail.trim();

                      if (!name || !email) return;

                      setServiceRequestCcs((prev) => [
                        ...prev,
                        {
                          name,
                          email,
                        },
                      ]);

                      setNewCcName('');
                      setNewCcEmail('');
                    }}
                    disabled={
                      !newCcName.trim() ||
                      !newCcEmail.trim()
                    }
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
                <span>
                  {saving ? 'Saving...' : 'Save changes'}
                </span>
              </button>
            </footer>
          </>
          
          
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
                          autoFocus
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


