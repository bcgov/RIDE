// import React from 'react';
// import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
// import { faArrowLeft } from '@fortawesome/pro-regular-svg-icons';

// export default function CameraDetails({ camera, onBack }) {
//   if (!camera) {
//     return (
//       <div className="camera-details-container">
//         <p>No camera selected.</p>
//         <button type="button" onClick={onBack}>
//           Back to list
//         </button>
//       </div>
//     );
//   }

//   return (
//     <div className="camera-details-page" style={{ padding: '24px' }}>
//       <button
//         type="button"
//         onClick={onBack}
//         style={{
//           display: 'inline-flex',
//           alignItems: 'center',
//           gap: '8px',
//           marginBottom: '16px',
//           cursor: 'pointer',
//           padding: '8px 16px',
//           borderRadius: '4px',
//           border: '1px solid #ccc',
//           background: '#fff',
//         }}
//       >
//         <FontAwesomeIcon icon={faArrowLeft} />
//         Back to Cameras
//       </button>

//       <div
//         style={{
//           border: '1px solid #e2e8f0',
//           borderRadius: '8px',
//           padding: '24px',
//           background: '#fff',
//           maxWidth: '800px',
//         }}
//       >
//         <h1 style={{ marginTop: 0 }}>Camera Details Test Page</h1>

//         <div style={{ marginBottom: '16px' }}>
//           <strong>ID:</strong> {camera.id}
//         </div>
//         <div style={{ marginBottom: '16px' }}>
//           <strong>Highway / Group:</strong> {camera.locations_highway || camera.highway_group || 'N/A'}
//         </div>
//         <div style={{ marginBottom: '16px' }}>
//           <strong>Orientation:</strong> {camera.locations_orientation || 'N/A'}
//         </div>
//         <div style={{ marginBottom: '16px' }}>
//           <strong>Landmark:</strong> {camera.locations_landmark || 'N/A'}
//         </div>

//         {camera.locations_thumbnail_map_url && (
//           <div style={{ marginTop: '16px' }}>
//             <img
//               src={camera.locations_thumbnail_map_url}
//               alt={camera.locations_highway || 'Camera thumbnail'}
//               style={{ maxWidth: '100%', borderRadius: '4px', border: '1px solid #ccc' }}
//             />
//           </div>
//         )}
//       </div>
//     </div>
//   );
// }


import React, { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faPenToSquare,
  faWrench,
  faTrash,
  faEllipsisVertical,
  faInfoCircle,
  faClock,
  faExpand,
  faFloppyDisk,
  faChevronDown,
  faPlus,
} from '@fortawesome/pro-regular-svg-icons';
import './CameraDetails.scss';

export default function CameraDetails({ camera, onBack }) {
  const [activeTab, setActiveTab] = useState('Basics');
  const [selectedViewId, setSelectedViewId] = useState(camera?.id || null);

  // Form field state pre-populated with camera data
  const [formData, setFormData] = useState({
    locationDescription:
      camera?.cam_internet_caption ||
      camera?.caption ||
      'Highway 16 at Toronto Street in Smithers',
    businessArea: camera?.business_area || 'MoTT Electrical',
    region: camera?.region_name || camera?.region || 'Northern',
    highway: camera?.highway || camera?.locations_highway || 'Highway 16',
    maintenanceContractor:
      camera?.maintenance_contractor || 'Dawson Road Maintenance',
    electricalContractor:
      camera?.electrical_contractor || 'Westcana Electric',
    latitude: camera?.latitude || '52.108937',
    longitude: camera?.longitude || '-119.309045',
    elevation: camera?.elevation || '686',
    imageWatermark: camera?.image_watermark || 'DriveBC.ca',
    cameraCredit:
      camera?.credit || 'Ministry of Transportation and Transit',
    cameraCreditUrl:
      camera?.credit_url ||
      'https://www2.gov.bc.ca/gov/content/governments/...',
  });

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = () => {
    // Implement API submit call here
    console.log('Saving changes:', formData);
  };

  const viewsList = camera?.location_cameras || [
    { id: 1, direction: 'North', is_on: true, time: '1:00 pm PST', active: true },
    { id: 2, direction: 'East', is_on: true, time: '1:02 pm PST' },
    { id: 3, direction: 'South', is_on: true, time: '1:04 pm PST' },
    { id: 4, direction: 'West', is_on: true, time: '1:07 pm PST' },
    { id: 5, direction: 'Southeast', is_on: true, time: '1:10 pm PST' },
    { id: 6, direction: 'Southwest', is_on: true, time: '1:12 pm PST' },
  ];

  const mainImageUrl =
    camera?.locations_thumbnail_map_url || camera?.url || '';

  return (
    <div className="camera-details-container">
      {/* 2. Top Title Header & Action Toolbar */}
      <header className="details-header">
        <div className="title-section">
          <h1>{camera?.locations_landmark || camera?.name || 'Hwy 16 at Toronto Street'}</h1>
          <button type="button" className="icon-edit-btn" aria-label="Edit title">
            <FontAwesomeIcon icon={faPenToSquare} />
          </button>
        </div>

        {/* 3. Action Buttons */}
        <div className="actions-toolbar">
          <button type="button" className="btn-secondary btn-service">
            <FontAwesomeIcon icon={faWrench} />
            <span>Request service</span>
          </button>
          <button type="button" className="circle-action-btn" aria-label="View link">
            <FontAwesomeIcon icon={faInfoCircle} />
          </button>
          <button type="button" className="circle-action-btn danger" aria-label="Delete camera">
            <FontAwesomeIcon icon={faTrash} />
          </button>
          <button type="button" className="circle-action-btn" aria-label="More options">
            <FontAwesomeIcon icon={faEllipsisVertical} />
          </button>
        </div>
      </header>

      {/* Main Grid: Left Media Pane + Right Form Tabs Pane */}
      <div className="details-grid">
        {/* Left Media Pane */}
        <div className="media-pane">
          {/* 10. Main Preview Player */}
          <div className="main-preview-card">
            <div className="preview-toolbar">
              <span className="badge-ondemand">
                <FontAwesomeIcon icon={faInfoCircle} /> On-demand
              </span>
              <button type="button" className="btn-timelapse">
                <FontAwesomeIcon icon={faClock} /> View timelapse
              </button>
            </div>

            <div className="main-image-wrapper">
              {mainImageUrl ? (
                <img
                  src={mainImageUrl}
                  alt={camera?.locations_landmark || 'Camera view'}
                />
              ) : (
                <div className="image-placeholder">No image preview available</div>
              )}
            </div>
          </div>

          {/* 5. Camera Views Grid */}
          <div className="views-section">
            <div className="views-header">
              <h2>Views</h2>
              <button type="button" className="btn-expand">
                <FontAwesomeIcon icon={faExpand} /> Expand all
              </button>
            </div>

            <div className="views-grid">
              {viewsList.map((view) => (
                <div
                  key={view.id}
                  className={`view-card ${
                    selectedViewId === view.id || view.active ? 'selected' : ''
                  }`}
                  onClick={() => setSelectedViewId(view.id)}
                >
                  <div className="view-card-top">
                    <span className="direction-label">{view.direction}</span>
                    <label className="toggle-switch">
                      <input
                        type="checkbox"
                        defaultChecked={view.is_on ?? true}
                      />
                      <span className="slider round" />
                    </label>
                  </div>
                  <div className="view-card-image">
                    {mainImageUrl ? (
                      <img src={mainImageUrl} alt={view.direction} />
                    ) : (
                      <div className="placeholder-thumb" />
                    )}
                  </div>
                  <div className="view-card-footer">
                    <FontAwesomeIcon icon={faClock} />
                    <span>{view.time || '1:00 pm PST'}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Form & Configuration Pane */}
        <div className="form-pane">
          {/* 6. Navigation Tabs */}
          <nav className="details-tabs">
            {['Basics', 'Setup', 'Views', 'Notes', 'Logs', 'History'].map(
              (tab) => (
                <button
                  key={tab}
                  type="button"
                  className={`tab-btn ${activeTab === tab ? 'active' : ''}`}
                  onClick={() => setActiveTab(tab)}
                >
                  {tab}
                </button>
              )
            )}
          </nav>

          {/* 7. Tab Content - Required & Optional Details */}
          {activeTab === 'Basics' && (
            <div className="tab-content">
              <div className="form-section">
                <span className="section-title">Required details</span>

                <div className="form-group">
                  <label htmlFor="locationDescription">Location description</label>
                  <textarea
                    id="locationDescription"
                    rows={3}
                    value={formData.locationDescription}
                    onChange={(e) =>
                      handleChange('locationDescription', e.target.value)
                    }
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="businessArea">Business area</label>
                  <select
                    id="businessArea"
                    value={formData.businessArea}
                    onChange={(e) => handleChange('businessArea', e.target.value)}
                  >
                    <option value="MoTT Electrical">MoTT Electrical</option>
                    <option value="Maintenance">Maintenance</option>
                  </select>
                </div>

                <div className="form-row two-col">
                  <div className="form-group">
                    <label htmlFor="region">Region</label>
                    <select
                      id="region"
                      value={formData.region}
                      onChange={(e) => handleChange('region', e.target.value)}
                    >
                      <option value="Northern">Northern</option>
                      <option value="South Coast">South Coast</option>
                      <option value="Southern Interior">Southern Interior</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label htmlFor="highway">Road or highway</label>
                    <select
                      id="highway"
                      value={formData.highway}
                      onChange={(e) => handleChange('highway', e.target.value)}
                    >
                      <option value="Highway 16">Highway 16</option>
                      <option value="Highway 1">Highway 1</option>
                      <option value="Highway 99">Highway 99</option>
                    </select>
                  </div>
                </div>

                <div className="form-row two-col">
                  <div className="form-group">
                    <label htmlFor="maintenanceContractor">
                      Road maintenance contractor
                    </label>
                    <select
                      id="maintenanceContractor"
                      value={formData.maintenanceContractor}
                      onChange={(e) =>
                        handleChange('maintenanceContractor', e.target.value)
                      }
                    >
                      <option value="Dawson Road Maintenance">
                        Dawson Road Maintenance
                      </option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label htmlFor="electricalContractor">
                      Electrical contractor
                    </label>
                    <select
                      id="electricalContractor"
                      value={formData.electricalContractor}
                      onChange={(e) =>
                        handleChange('electricalContractor', e.target.value)
                      }
                    >
                      <option value="Westcana Electric">Westcana Electric</option>
                    </select>
                  </div>
                </div>

                <div className="form-row three-col">
                  <div className="form-group">
                    <label htmlFor="latitude">Latitude</label>
                    <input
                      type="text"
                      id="latitude"
                      value={formData.latitude}
                      onChange={(e) => handleChange('latitude', e.target.value)}
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="longitude">Longitude</label>
                    <input
                      type="text"
                      id="longitude"
                      value={formData.longitude}
                      onChange={(e) => handleChange('longitude', e.target.value)}
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="elevation">Elevation (metres)</label>
                    <input
                      type="text"
                      id="elevation"
                      value={formData.elevation}
                      onChange={(e) => handleChange('elevation', e.target.value)}
                    />
                  </div>
                </div>
              </div>

              <div className="form-section">
                <span className="section-title">Optional</span>

                <div className="form-group">
                  <label htmlFor="imageWatermark">Image watermark</label>
                  <input
                    type="text"
                    id="imageWatermark"
                    value={formData.imageWatermark}
                    onChange={(e) =>
                      handleChange('imageWatermark', e.target.value)
                    }
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="cameraCredit">Camera credit</label>
                  <input
                    type="text"
                    id="cameraCredit"
                    value={formData.cameraCredit}
                    onChange={(e) =>
                      handleChange('cameraCredit', e.target.value)
                    }
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="cameraCreditUrl">Camera credit URL</label>
                  <input
                    type="text"
                    id="cameraCreditUrl"
                    value={formData.cameraCreditUrl}
                    onChange={(e) =>
                      handleChange('cameraCreditUrl', e.target.value)
                    }
                  />
                </div>
              </div>
            </div>
          )}

          {/* 8. Save Action Footer */}
          <footer className="form-footer">
            <button type="button" className="btn-save" onClick={handleSave}>
              <FontAwesomeIcon icon={faFloppyDisk} />
              <span>Save all changes</span>
            </button>
          </footer>
        </div>
      </div>
    </div>
  );
}