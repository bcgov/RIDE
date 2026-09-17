import React, { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPenToSquare, faCheck, faXmark } from '@fortawesome/pro-regular-svg-icons';
import './ViewsTab.scss';
import { getCookie } from "../shared/helpers.js";

// Helper to format "NORTHWEST" or "north" -> "Northwest" / "North"
const formatDirection = (str) => {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
};

export default function ViewsTab({ views = [], onChange, onSetDefault }) {
  // Track which view is currently in "editing name" mode, and its draft value.
  // Kept separate from `views` so Cancel can discard without touching real data.
  const [editingId, setEditingId] = useState(null);
  const [draftName, setDraftName] = useState('');

  const [savingId, setSavingId] = useState(null);
  const [saveError, setSaveError] = useState(null);

  const handleFieldChange = (id, field, value) => {
    const updatedViews = views.map((view) =>
      view.id === id ? { ...view, [field]: value } : view
    );
    onChange(updatedViews);
  };

  const handleToggle = (id, is_on) => {
    const updatedViews = views.map((view) => {
      if (view.id === id) {
        // If disabling the default view, remove default status
        const is_default = is_on ? view.is_default : false;
        return { ...view, is_on, is_default };
      }
      return view;
    });
    onChange(updatedViews);
    // If the view being toggled off was mid-edit, exit edit mode too
    if (!is_on && editingId === id) {
      setEditingId(null);
    }
  };

  const startEditing = (view) => {
    setEditingId(view.id);
    // Seed the draft with whatever is currently displayed as the title
    setDraftName(formatDirection(view.orientation || view.direction) || `View ${view.id}`);
  };

  const cancelEditing = () => {
    setEditingId(null);
    setDraftName('');
  };

  const saveEditing = async (viewId, cameraId) => {
    const trimmed = draftName.trim();
    if (!trimmed) return;

    setSavingId(viewId);
    setSaveError(null);

    try {
      const response = await fetch(`/api/cameras/${cameraId}/`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRFToken': getCookie('csrftoken'),
        },
        body: JSON.stringify({
          views: [
            { id: viewId, orientation: trimmed.toUpperCase() },
          ],
        }),
      });

      if (!response.ok) {
        const errorBody = await response.json().catch(() => null);
        console.log('Save failed:', response.status, errorBody);
        throw new Error(`Save failed: ${response.status}`);
      }

      if (!response.ok) {
        throw new Error(`Save failed: ${response.status}`);
      }

      const updatedCamera = await response.json();
      const updatedView = updatedCamera.views.find((v) => v.id.toString() === viewId);

      const updatedViews = views.map((view) =>
        view.id === viewId ? { ...view, orientation: updatedView.orientation } : view
      );
      onChange(updatedViews);

      setEditingId(null);
      setDraftName('');
    } catch (err) {
      setSaveError('Could not save. Please try again.');
    } finally {
      setSavingId(null);
    }
  };


  return (
    <div className="tab-content views-tab">
      {views.map((view) => {
        const { id, orientation, direction, is_on, is_default, image_url, description, camera_id } = view;
        const isEditing = editingId === id;

        // Resolve title string safely
        const displayTitle = formatDirection(orientation || direction) || `View ${id}`;

        return (
          <div
            key={id}
            className={`view-item-card ${is_on ? 'is-enabled' : 'is-disabled'}`}
          >
            {/* View Header Row */}
            <div className="view-header">
              <div className="view-header-left">
                <label className="toggle-switch">
                  <input
                    type="checkbox"
                    checked={is_on}
                    onChange={(e) => handleToggle(id, e.target.checked)}
                    aria-label={`Toggle ${view.name}`}
                  />
                  <span className="slider round" />
                </label>

                {isEditing ? (
                  <input
                    type="text"
                    className="direction-title-input"
                    value={draftName}
                    onChange={(e) => setDraftName(e.target.value)}
                    autoFocus
                    aria-label={`Edit ${displayTitle} direction name`}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') saveEditing(id, camera_id);
                      if (e.key === 'Escape') cancelEditing();
                    }}
                  />
                ) : (
                  <h3 className="direction-title">{displayTitle}</h3>
                )}

                {is_on && !isEditing && (
                  <button
                    type="button"
                    className="icon-edit-btn"
                    aria-label={`Edit ${displayTitle} direction name`}
                    onClick={() => startEditing(view)}
                  >
                    <FontAwesomeIcon icon={faPenToSquare} />
                  </button>
                )}
              </div>

              {is_on && (
                <div className="view-header-right">
                  {isEditing ? (
                    <div className="edit-actions">
                      <button
                        type="button"
                        className="btn-save-name"
                        onClick={() => saveEditing(id, camera_id)}
                        disabled={!draftName.trim() || savingId === id}
                      >
                        {savingId === id ? 'Saving…' : 'Save'}
                        <FontAwesomeIcon icon={faCheck} />
                      </button>
                      <button type="button" className="btn-cancel-name" onClick={cancelEditing} title="Cancel">
                        
                        <span className="btn-label">Cancel</span>
                        <FontAwesomeIcon icon={faXmark} />
                      </button>
                    </div>
                  ) : is_default ? (
                    <span className="badge-default">Default view</span>
                  ) : (
                    <button
                      type="button"
                      className="btn-make-default"
                      onClick={() => onSetDefault(id)}
                    >
                      Make default
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* View Form Details (only shown if enabled) */}
            {is_on && (
              <div className="view-body-form">
                <div className="form-group">
                  <label htmlFor={`view-id-${id}`}>View ID #</label>
                  <input
                    type="text"
                    id={`view-id-${id}`}
                    value={id}
                    readOnly
                    className="input-readonly"
                  />
                </div>

                <div className="form-group">
                  <label htmlFor={`view-path-${id}`}>
                    Path to this view's image
                  </label>
                  <input
                    type="text"
                    id={`view-path-${id}`}
                    value={image_url || ''}
                    onChange={(e) =>
                      handleFieldChange(id, 'image_url', e.target.value)
                    }
                  />
                </div>

                <div className="form-group">
                  <label htmlFor={`view-desc-${id}`}>Description</label>
                  <textarea
                    id={`view-desc-${id}`}
                    rows={3}
                    value={description || ''}
                    onChange={(e) =>
                      handleFieldChange(id, 'description', e.target.value)
                    }
                  />
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}