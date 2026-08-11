import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPenToSquare } from '@fortawesome/pro-regular-svg-icons';

export default function ViewsTab({ views, onChange, onSetDefault }) {
  const handleFieldChange = (id, field, value) => {
    const updatedViews = views.map((view) =>
      view.id === id ? { ...view, [field]: value } : view
    );
    onChange(updatedViews);
  };

  const handleToggle = (id, enabled) => {
    const updatedViews = views.map((view) => {
      if (view.id === id) {
        // If disabling the default view, remove default status
        const isDefault = enabled ? view.isDefault : false;
        return { ...view, enabled, isDefault };
      }
      return view;
    });
    onChange(updatedViews);
  };

  return (
    <div className="tab-content views-tab">
      {views.map((view) => {
        const { id, direction, enabled, isDefault, imagePath, description } = view;

        return (
          <div
            key={id}
            className={`view-item-card ${enabled ? 'is-enabled' : 'is-disabled'}`}
          >
            {/* View Header Row */}
            <div className="view-header">
              <div className="view-title-group">
                <label className="toggle-switch">
                  <input
                    type="checkbox"
                    checked={enabled}
                    onChange={(e) => handleToggle(id, e.target.checked)}
                  />
                  <span className="slider round" />
                </label>

                <span className="direction-title">{direction}</span>

                {enabled && (
                  <button
                    type="button"
                    className="icon-edit-btn"
                    aria-label={`Edit ${direction} direction name`}
                  >
                    <FontAwesomeIcon icon={faPenToSquare} />
                  </button>
                )}
              </div>

              {/* Default View Status / Action */}
              {enabled && (
                <div className="default-action-wrapper">
                  {isDefault ? (
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
            {enabled && (
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
                    value={imagePath || ''}
                    onChange={(e) =>
                      handleFieldChange(id, 'imagePath', e.target.value)
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