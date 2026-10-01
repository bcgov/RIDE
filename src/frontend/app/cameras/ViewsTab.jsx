import { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPenToSquare, faCheck, faXmark } from '@fortawesome/pro-regular-svg-icons';
import Button from '../components/shared/Button.jsx';
import { orientationLabel } from './helpers.js';
import Switch from '../components/shared/Switch.jsx';
import './ViewsTab.scss';
import { getCookie } from "../shared/helpers.js";

export default function ViewsTab({ views = [], onChange, onSetDefault }) {
  // Track which view is currently in "editing name" mode, and its draft value.
  // Kept separate from `views` so Cancel can discard without touching real data.
  const [editingId, setEditingId] = useState(null);
  const [draftName, setDraftName] = useState('');

  const [savingId, setSavingId] = useState(null);

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
    setDraftName(orientationLabel(view.orientation || view.direction) || `View ${view.id}`);
  };

  const cancelEditing = () => {
    setEditingId(null);
    setDraftName('');
  };

  const saveEditing = async (viewId, cameraId) => {
    const trimmed = draftName.trim();
    if (!trimmed) return;

    setSavingId(viewId);

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
        throw new Error(errorBody?.detail || `Save failed: ${response.status}`);
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
      // Save failures are logged for debugging only; this UI has no
      // error display, so there's nothing further to surface to the user.
      console.error('Failed to save view name:', err);
    } finally {
      setSavingId(null);
    }
  };

  // Picks what to show on the right side of a view header. Uses early returns
  // instead of a nested ternary (SonarCloud: extract nested ternary into a statement).
  const renderHeaderActions = ({ id, is_default, camera_id }, isEditing) => {
    if (isEditing) {
      return (
        <div className="edit-actions">
          <Button
            onClick={() => saveEditing(id, camera_id)}
            disabled={!draftName.trim() || savingId === id}
          >
            {savingId === id ? 'Saving…' : 'Save'}
            <FontAwesomeIcon icon={faCheck} />
          </Button>
          <Button variant="tertiary" onClick={cancelEditing} title="Cancel">
            Cancel
            <FontAwesomeIcon icon={faXmark} />
          </Button>
        </div>
      );
    }

    if (is_default) {
      return <span className="badge-default">Default view</span>;
    }

    return (
      <Button variant="tertiary" size="sm" extraClasses="btn-make-default" onClick={() => onSetDefault(id)}>
        Make default
      </Button>
    );
  };

  return (
    <div className="tab-content views-tab">
      {views.map((view) => {
        const { id, orientation, direction, is_on, image_url, description } = view;
        const isEditing = editingId === id;

        // Resolve title string safely
        const displayTitle = orientationLabel(orientation || direction) || `View ${id}`;

        return (
          <div
            key={id}
            className={is_on ? 'is-enabled' : 'is-disabled'}
          >
            {/* View Header Row */}
            <div className="view-header">
              <div className="view-header-left">
                <Switch
                  checked={is_on}
                  onChange={(next) => handleToggle(id, next)}
                  aria-label={`${displayTitle} view`}
                />

                {isEditing ? (
                  <input
                    type="text"
                    className="direction-title-input"
                    value={draftName}
                    onChange={(e) => setDraftName(e.target.value)}
                    aria-label={`Edit ${displayTitle} direction name`}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') saveEditing(id, view.camera_id);
                      if (e.key === 'Escape') cancelEditing();
                    }}
                  />
                ) : (
                  <h3 className="direction-title">{displayTitle}</h3>
                )}

                {is_on && !isEditing && (
                  <Button
                    variant="icon"
                    size="sm"
                    aria-label={`Edit ${displayTitle} direction name`}
                    onClick={() => startEditing(view)}
                  >
                    <FontAwesomeIcon icon={faPenToSquare} />
                  </Button>
                )}
              </div>

              {is_on && (
                <div className="view-header-right">
                  {renderHeaderActions(view, isEditing)}
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
                  />
                </div>

                <div className="form-group">
                  <label htmlFor={`view-path-${id}`}>
                    Path to this view&apos;s image
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
