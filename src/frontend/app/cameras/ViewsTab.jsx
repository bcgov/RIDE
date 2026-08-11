import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPenToSquare } from '@fortawesome/pro-regular-svg-icons';
import './ViewsTab.scss';

// Helper to format "NORTHWEST" or "north" -> "Northwest" / "North"
const formatDirection = (str) => {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
};

export default function ViewsTab({ views = [], onChange, onSetDefault }) {
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
  };

  return (
    <div className="tab-content views-tab">
      {views.map((view) => {
        const { id, orientation, direction, is_on, is_default, image_url, description } = view;

        // Resolve title string safely
        const displayTitle = formatDirection(orientation || direction) || `View ${id}`;
        

        return (
          <div
            key={id}
            className={`view-item-card ${is_on ? 'is-enabled' : 'is-disabled'}`}
          >
            {/* View Header Row */}
            <div className="view-header">
              {/* Left Group: Switch + Label + Edit Icon */}
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

                <h3 className="direction-title">{displayTitle}</h3>

                {is_on && (
                  <button
                    type="button"
                    className="icon-edit-btn"
                    aria-label={`Edit ${displayTitle} direction name`}
                  >
                    <FontAwesomeIcon icon={faPenToSquare} />
                  </button>
                )}
              </div>

              {/* Right Group: Default View Status / Action */}
              {is_on && (
                <div className="view-header-right">
                  {is_default ? (
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
                  <label htmlFor={`view-id-${id}`}>{view.orientation}</label>
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