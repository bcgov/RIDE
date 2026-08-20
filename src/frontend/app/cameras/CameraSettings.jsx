import React, { useEffect, useMemo, useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faGripVertical,
  faPenToSquare,
  faXmark,
  faCheck,
  faChevronDown,
} from '@fortawesome/pro-regular-svg-icons';
import { useNavigate, useSearchParams } from 'react-router';
import { getCookie } from '../shared/helpers.js';
import './CameraSettings.scss';

const SETTINGS = [
  {
    key: 'antennaes',
    label: 'Antennaes',
    endpoint: 'antennaes',
  },
  {
    key: 'business-areas',
    label: 'Business areas',
    endpoint: 'business-areas',
  },
  {
    key: 'camera-types',
    label: 'Camera types',
    endpoint: 'camera-types',
  },
  {
    key: 'camera-makes',
    label: 'Camera makes',
    endpoint: 'camera-makes',
  },
  {
    key: 'communication-type',
    label: 'Communication type',
    endpoint: 'communication-types',
  },
  {
    key: 'communication-devices',
    label: 'Communication devices',
    endpoint: 'communication-devices',
  },
  {
    key: 'electrical-contractors',
    label: 'Electrical contractors',
    endpoint: 'electrical-contractors',
  },
  {
    key: 'regions',
    label: 'Regions',
    endpoint: 'regions',
  },
  {
    key: 'roads-and-highways',
    label: 'Roads and highways',
    endpoint: 'roads-and-highways',
  },
  {
    key: 'road-maintenance-contractors',
    label: 'Road maintenance contractors',
    endpoint: 'road-maintenance-contractors',
  },
  {
    key: 'service-providers',
    label: 'Service providers',
    endpoint: 'service-providers',
  },
  {
    key: 'service-request-ccs',
    label: 'Service request CCs',
    endpoint: 'service-request-ccs',
  },
];

const OTHER_SETTINGS = [
  {
    key: 'camera-order',
    label: 'Camera order',
  },
  {
    key: 'report-fields',
    label: 'Report fields',
  },
  {
    key: 'default-messaging',
    label: 'Default messaging',
  },
];

export default function CameraSettings() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const selectedKey =
    searchParams.get('setting') || 'service-providers';

  const selectedSetting = useMemo(
    () =>
      SETTINGS.find(
        (setting) => setting.key === selectedKey
      ) || SETTINGS[0],
    [selectedKey]
  );

  const [items, setItems] = useState([]);
  const [originalItems, setOriginalItems] = useState([]);

  const [newItemName, setNewItemName] = useState('');

  const [editingId, setEditingId] = useState(null);
  const [editingName, setEditingName] = useState('');

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  // ---------------------------------------------------------
  // Load settings
  // ---------------------------------------------------------

  useEffect(() => {
    const loadSettings = async () => {
      try {
        setLoading(true);
        setError(null);

        const response = await fetch(
          `/api/${selectedSetting.endpoint}/`
        );

        if (!response.ok) {
          throw new Error(
            `Failed to load ${selectedSetting.label}: ${response.status}`
          );
        }

        const data = await response.json();

        const formattedItems = data.map((item, index) => ({
          id: item.id,
          name: item.name,
          display_order:
            item.display_order ?? index,
        }));

        setItems(formattedItems);
        setOriginalItems(formattedItems);

        setNewItemName('');
        setEditingId(null);
        setEditingName('');

      } catch (err) {
        console.error(
          'Failed to load camera settings:',
          err
        );

        setError(err.message);
        setItems([]);
        setOriginalItems([]);

      } finally {
        setLoading(false);
      }
    };

    loadSettings();
  }, [selectedSetting]);

  // ---------------------------------------------------------
  // Select setting
  // ---------------------------------------------------------

  const selectSetting = (setting) => {
    setSearchParams({
      setting: setting.key,
    });
  };

  // ---------------------------------------------------------
  // Add item
  // ---------------------------------------------------------

  const handleAdd = () => {
    const trimmedName = newItemName.trim();

    if (!trimmedName) {
      return;
    }

    // Prevent duplicate names in the current list
    const alreadyExists = items.some(
      (item) =>
        item.name.toLowerCase() ===
        trimmedName.toLowerCase()
    );

    if (alreadyExists) {
      return;
    }

    setItems((prev) => [
      ...prev,
      {
        id: null,
        name: trimmedName,
        display_order: prev.length,
        isNew: true,
      },
    ]);

    setNewItemName('');
  };

  // ---------------------------------------------------------
  // Add item with Enter
  // ---------------------------------------------------------

  const handleNewItemKeyDown = (event) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      handleAdd();
    }
  };

  // ---------------------------------------------------------
  // Edit item
  // ---------------------------------------------------------

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

    if (!trimmedName) {
      return;
    }

    setItems((prev) =>
      prev.map((item) =>
        item.id === itemId
          ? {
              ...item,
              name: trimmedName,
            }
          : item
      )
    );

    setEditingId(null);
    setEditingName('');
  };

  const handleEditingKeyDown = (
    event,
    itemId
  ) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      saveEditing(itemId);
    }

    if (event.key === 'Escape') {
      cancelEditing();
    }
  };

  // ---------------------------------------------------------
  // Delete item
  // ---------------------------------------------------------

  const handleDelete = (item) => {
    setItems((prev) =>
      prev.filter(
        (current) =>
          current.id !== item.id ||
          current.id === null
      )
    );
  };

  // ---------------------------------------------------------
  // Drag and drop
  // ---------------------------------------------------------

  const handleDragStart = (
    event,
    index
  ) => {
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData(
      'text/plain',
      String(index)
    );
  };

  const handleDragOver = (event) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (
    event,
    targetIndex
  ) => {
    event.preventDefault();

    const sourceIndex = Number(
      event.dataTransfer.getData('text/plain')
    );

    if (
      Number.isNaN(sourceIndex) ||
      sourceIndex === targetIndex
    ) {
      return;
    }

    setItems((prev) => {
      const next = [...prev];

      const [movedItem] =
        next.splice(sourceIndex, 1);

      next.splice(
        targetIndex,
        0,
        movedItem
      );

      return next.map((item, index) => ({
        ...item,
        display_order: index,
      }));
    });
  };

  // ---------------------------------------------------------
  // Save changes
  // ---------------------------------------------------------

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

      const response = await fetch(
        `/api/${selectedSetting.endpoint}/bulk-update/`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'X-CSRFToken': getCookie('csrftoken'),
          },
          body: JSON.stringify(payload),
        }
      );

      if (!response.ok) {
        const errorData =
          await response
            .json()
            .catch(() => null);

        console.error(
          'Failed to save settings:',
          errorData
        );

        throw new Error(
          `Failed to save changes: ${response.status}`
        );
      }

      const data = await response.json();

      const formattedItems = data.map(
        (item, index) => ({
          id: item.id,
          name: item.name,
          display_order:
            item.display_order ?? index,
        })
      );

      setItems(formattedItems);
      setOriginalItems(formattedItems);

    } catch (err) {
      console.error(
        'Failed to save camera settings:',
        err
      );

      setError(err.message);

    } finally {
      setSaving(false);
    }
  };

  // ---------------------------------------------------------
  // Check if there are unsaved changes
  // ---------------------------------------------------------

  const hasChanges = useMemo(() => {
    return (
      JSON.stringify(items) !==
      JSON.stringify(originalItems)
    );
  }, [items, originalItems]);

  // ---------------------------------------------------------
  // Render
  // ---------------------------------------------------------

  return (
    <div className="camera-settings-page">

      {/* ---------------------------------------------------
          Sidebar
      --------------------------------------------------- */}

      <aside className="camera-settings-sidebar">

        <div className="settings-sidebar-title">
          MANAGE CAMERA SETTINGS
        </div>

        <button
          type="button"
          className="settings-section-header"
        >
          <span>Database setup</span>

          <FontAwesomeIcon
            icon={faChevronDown}
          />
        </button>

        <nav className="settings-navigation">

          {SETTINGS.map((setting) => (
            <button
              key={setting.key}
              type="button"
              className={`settings-nav-item ${
                selectedSetting.key ===
                setting.key
                  ? 'active'
                  : ''
              }`}
              onClick={() =>
                selectSetting(setting)
              }
            >
              {setting.label}
            </button>
          ))}

        </nav>

        <button
          type="button"
          className="settings-section-header collapsed"
        >
          <span>Camera order</span>

          <FontAwesomeIcon
            icon={faChevronDown}
          />
        </button>

        <button
          type="button"
          className="settings-section-header collapsed"
        >
          <span>Report fields</span>

          <FontAwesomeIcon
            icon={faChevronDown}
          />
        </button>

        <button
          type="button"
          className="settings-section-header collapsed"
        >
          <span>Default messaging</span>

          <FontAwesomeIcon
            icon={faChevronDown}
          />
        </button>

      </aside>

      {/* ---------------------------------------------------
          Main Content
      --------------------------------------------------- */}

      <main className="camera-settings-content">

        <header className="camera-settings-header">
          <h1>
            {selectedSetting.label}
          </h1>
        </header>

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
            items.map((item, index) => (

              <div
                key={
                  item.id ??
                  `new-${index}`
                }
                className="settings-row"
                draggable
                onDragStart={(event) =>
                  handleDragStart(
                    event,
                    index
                  )
                }
                onDragOver={
                  handleDragOver
                }
                onDrop={(event) =>
                  handleDrop(
                    event,
                    index
                  )
                }
              >

                {/* Drag handle */}

                <div
                  className="settings-drag-handle"
                  title="Drag to reorder"
                >
                  <FontAwesomeIcon
                    icon={faGripVertical}
                  />
                </div>

                {/* Name */}

                <div className="settings-name">

                  {/* {editingId ===
                  item.id ? ( */}
                  {editingId !== null && editingId === item.id ? (

                    <input
                      type="text"
                      value={
                        editingName
                      }
                      autoFocus
                      onChange={(event) =>
                        setEditingName(
                          event.target
                            .value
                        )
                      }
                      onKeyDown={(event) =>
                        handleEditingKeyDown(
                          event,
                          item.id
                        )
                      }
                    />

                  ) : (

                    <span>
                      {item.name}
                    </span>

                  )}

                </div>

                {/* Actions */}

                <div className="settings-actions">

                  {/* {editingId ===
                  item.id ? ( */}

                  {editingId !== null && editingId === item.id ? (

                    <button
                      type="button"
                      className="settings-action-btn"
                      aria-label="Save item"
                      onClick={() =>
                        saveEditing(
                          item.id
                        )
                      }
                    >
                      <FontAwesomeIcon
                        icon={faCheck}
                      />
                    </button>

                  ) : (

                    <button
                      type="button"
                      className="settings-action-btn"
                      aria-label={`Edit ${item.name}`}
                      onClick={() =>
                        startEditing(
                          item
                        )
                      }
                    >
                      <FontAwesomeIcon
                        icon={faPenToSquare}
                      />
                    </button>

                  )}

                  <button
                    type="button"
                    className="settings-action-btn"
                    aria-label={`Delete ${item.name}`}
                    onClick={() =>
                      handleDelete(
                        item
                      )
                    }
                  >
                    <FontAwesomeIcon
                      icon={faXmark}
                    />
                  </button>

                </div>

              </div>

            ))}

          {/* Add row */}

          {!loading && !error && (
            <div className="settings-add-row">

              <div className="settings-drag-handle">
                <FontAwesomeIcon
                  icon={faGripVertical}
                />
              </div>

              <div className="settings-add-input">

                <input
                  type="text"
                  value={newItemName}
                  onChange={(event) =>
                    setNewItemName(
                      event.target.value
                    )
                  }
                  onKeyDown={
                    handleNewItemKeyDown
                  }
                />

              </div>

              <button
                type="button"
                className="settings-add-btn"
                onClick={handleAdd}
                disabled={
                  !newItemName.trim()
                }
              >
                <FontAwesomeIcon
                  icon={faCheck}
                />
                <span>Add</span>
              </button>

            </div>
          )}

        </section>

        {/* Save */}

        <footer className="camera-settings-footer">

          <button
            type="button"
            className="settings-save-btn"
            disabled={
              saving || !hasChanges
            }
            onClick={handleSave}
          >
            <FontAwesomeIcon
              icon={faCheck}
            />

            <span>
              {saving
                ? 'Saving...'
                : 'Save changes'}
            </span>
          </button>

        </footer>

      </main>
    </div>
  );
}