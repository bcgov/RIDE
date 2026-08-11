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
} from '@fortawesome/pro-regular-svg-icons';

import BasicsTab from './BasicsTab';
import SetupTab from './SetupTab';
import './CameraDetails.scss';

export default function CameraDetails({ camera, onBack }) {
  const [activeTab, setActiveTab] = useState('Basics');

  // Basics Form State
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

  // Setup Form State
  const [setupData, setSetupData] = useState({
    cameraId: camera?.id || '1234567890',
    isOnDemand: camera?.is_ondemand ?? true,
    cameraType: camera?.type || 'AXIS',
    cameraMake: camera?.make || 'P5515',
    installedDate: camera?.installed_at || '2018-08-27',
    lastInspectedDate: camera?.inspected_at || '2026-01-12',
    updateFrequency: camera?.update_frequency || '15',
    macAddress: camera?.mac_address || '00:e0:4d:91:12:13',
    connectionType: camera?.connection_type || 'Images are pulled',
    connectionProtocol: camera?.connection_protocol || 'File share',
    username: camera?.username || 'admin',
    password: camera?.password || 'password123',
    commType: camera?.comm_type || 'Cellular',
    commDevice: camera?.comm_device || 'RV50X',
    antennae: camera?.antennae || '',
    serviceProvider: camera?.service_provider || 'Telus',
    modemSerial: camera?.modem_serial || '12312412467-21',
    modemPhone: camera?.modem_phone || '250-576-2481',
    modemBaudRate: camera?.modem_baud || '',
    modemInstalledDate: camera?.modem_installed_at || '2018-08-27',
    powerSource: camera?.power_source || 'Wired',
    powerSupplyType: camera?.power_supply_type || '',
    powerSupplySerial: camera?.power_supply_serial || '',
  });

  const handleBasicsChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSetupChange = (field, value) => {
    setSetupData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = () => {
    console.log('Saving all changes:', { formData, setupData });
  };

  const viewsList = camera?.location_cameras || [
    { id: 1, direction: 'North', is_on: true, time: '1:00 pm PST', active: true },
    { id: 2, direction: 'East', is_on: true, time: '1:02 pm PST' },
    { id: 3, direction: 'South', is_on: true, time: '1:04 pm PST' },
    { id: 4, direction: 'West', is_on: true, time: '1:07 pm PST' },
    { id: 5, direction: 'Southeast', is_on: true, time: '1:10 pm PST' },
    { id: 6, direction: 'Southwest', is_on: true, time: '1:12 pm PST' },
  ];

  const mainImageUrl = camera?.locations_thumbnail_map_url || camera?.url || '';

  return (
    <div className="camera-details-container">
      {/* Header Bar */}
      <header className="details-header">
        <div className="title-section">
          <h1>{camera?.locations_landmark || camera?.name || 'Hwy 16 at Toronto Street'}</h1>
          <button type="button" className="icon-edit-btn" aria-label="Edit title">
            <FontAwesomeIcon icon={faPenToSquare} />
          </button>
        </div>

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

      {/* Main Grid Pane */}
      <div className="details-grid">
        {/* Left Side: Media & Views */}
        <div className="media-pane">
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
                <img src={mainImageUrl} alt={camera?.locations_landmark || 'Camera view'} />
              ) : (
                <div className="image-placeholder">No image preview available</div>
              )}
            </div>
          </div>

          <div className="views-section">
            <div className="views-header">
              <h2>Views</h2>
              <button type="button" className="btn-expand">
                <FontAwesomeIcon icon={faExpand} /> Expand all
              </button>
            </div>

            <div className="views-grid">
              {viewsList.map((view) => (
                <div key={view.id} className={`view-card ${view.active ? 'selected' : ''}`}>
                  <div className="view-card-top">
                    <span className="direction-label">{view.direction}</span>
                    <label className="toggle-switch">
                      <input type="checkbox" defaultChecked={view.is_on ?? true} />
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

        {/* Right Side: Tabbed Form Panels */}
        <div className="form-pane">
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

          {/* Dynamic Tab Render */}
          {activeTab === 'Basics' && (
            <BasicsTab formData={formData} onChange={handleBasicsChange} />
          )}

          {activeTab === 'Setup' && (
            <SetupTab setupData={setupData} onChange={handleSetupChange} />
          )}

          {/* Save Button Footer */}
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