import React, { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { useParams, useNavigate } from "react-router";
import {
  faPenToSquare,
  faWrench,
  faTrash,
  faEllipsisVertical,
  faInfoCircle,
  faClock,
  faExpand,
  faFloppyDisk,
  faXmark,
} from '@fortawesome/pro-regular-svg-icons';
import { getCookie } from "../shared/helpers.js";

import BasicsTab from './BasicsTab';
import SetupTab from './SetupTab';
import ViewsTab from './ViewsTab';
import NotesTab from './NotesTab';
import LogsTab from './LogsTab';
import HistoryTab from './HistoryTab';
import './CameraDetails.scss';

export default function CameraDetails({ onBack }) {
  const { id } = useParams();
  const navigate = useNavigate();

  const [camera, setCamera] = useState(null);
  const [activeTab, setActiveTab] = useState('Basics');

  const [formData, setFormData] = useState({
    cameraName: camera
      ? camera.internet_name || ''
      : '',
    locationDescription: camera
      ? camera.locations_description || ''
      : '',

    businessArea: camera
      ? camera.business_area || ''
      : '',

    region: camera
      ? camera.locations_region || ''
      : '',

    highway: camera
      ? camera.locations_highway || ''
      : '',

    maintenanceContractor: camera
      ? camera.maintenance_contractor || ''
      : '',

    electricalContractor: camera
      ? camera.electrical_contractor || ''
      : '',

    latitude: camera
      ? camera.locations_geo_latitude || ''
      : '',

    longitude: camera
      ? camera.locations_geo_longitude || ''
      : '',

    elevation: camera
      ? camera.locations_elevation || ''
      : '',

    imageWatermark: camera
      ? camera.image_watermark || ''
      : '',

    cameraCredit: camera
      ? camera.cam_internet_credit || ''
      : '',

    cameraCreditUrl: camera
      ? camera.cam_internet_website_url || ''
      : '',
  });

  const isNewCamera = !camera;

  const [setupData, setSetupData] = useState({
    cameraName: camera
      ? camera.internet_name || ''
      : '',
    locationDescription: camera
      ? camera.cam_internet_caption || ''
      : '',

    businessArea: camera
      ? camera.business_area || ''
      : '',

    region: camera
      ? camera.locations_region || ''
      : '',

    highway: camera
      ? camera.locations_highway || ''
      : '',

    maintenanceContractor: camera
      ? camera.maintenance_contractor || ''
      : '',

    electricalContractor: camera
      ? camera.electrical_contractor || ''
      : '',

    latitude: camera
      ? camera.locations_geo_latitude || ''
      : '',

    longitude: camera
      ? camera.locations_geo_longitude || ''
      : '',

    elevation: camera
      ? camera.locations_elevation || ''
      : '',

    imageWatermark: camera
      ? camera.image_watermark || ''
      : '',

    cameraCredit: camera
      ? camera.cam_internet_credit || ''
      : '',

    cameraCreditUrl: camera
      ? camera.cam_internet_website_url || ''
      : '',
  });

  const handleBasicsChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSetupChange = (field, value) => {
    setSetupData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    try {
      const payload = {
        internet_name: formData.cameraName,
        internet_caption: formData.locationDescription,
        internet_credit: formData.cameraCredit,
        internet_website_url: formData.cameraCreditUrl,

        locations_description: formData.locationDescription,
        locations_region: formData.region,
        locations_business_area: formData.businessArea,
        locations_highway: formData.highway,
        locations_geo_latitude: formData.latitude,
        locations_geo_longitude: formData.longitude,
        locations_elevation: formData.elevation,

        maintenance_contractor:
          formData.maintenanceContractor,

        maintenance_electrical_contractor:
          formData.electricalContractor,

        image_watermark: formData.imageWatermark,

        maintenance_camera_make:
          setupData.cameraMake,

        maintenance_uploads_every:
          setupData.updateFrequency,

        maintenance_comm_tech:
          setupData.commType,

      };

      const url = camera
        ? `/api/cameras/${camera.id}/`
        : '/api/cameras/';

      const method = camera ? 'PATCH' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'X-CSRFToken': getCookie('csrftoken'),
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);

        console.error('Camera save failed:', errorData);

        throw new Error(
          `Failed to save camera: ${response.status}`
        );
      }

      const savedCamera = await response.json();

      console.log('Camera saved:', savedCamera);

      if (onBack) {
        onBack(savedCamera);
      }
    } catch (error) {
      console.error(error);
      alert(error.message);
    }
    navigate('/cameras');
  };

  const handleDelete = async () => {
    if (!id) {
      return;
    }

    const confirmed = window.confirm(
      'Are you sure you want to delete this camera?'
    );

    if (!confirmed) {
      return;
    }

    try {
      const response = await fetch(`/api/cameras/${id}/`, {
        method: 'DELETE',
        headers: {
          'X-CSRFToken': getCookie('csrftoken'),
        },
      });

      if (!response.ok) {
        const errorText = await response.text();

        console.error('Camera delete failed:', {
          status: response.status,
          response: errorText,
        });

        throw new Error(`Failed to delete camera: ${response.status}`);
      }

      console.log(`Camera ${id} deleted successfully`);

      navigate('/cameras');
    } catch (error) {
      console.error('Failed to delete camera:', error);
      alert(error.message);
    }
  };

  const viewsList = camera?.location_cameras || [
    { id: 1, direction: 'North', is_on: true, time: '1:00 pm PST', active: true },
    { id: 2, direction: 'East', is_on: true, time: '1:02 pm PST' },
    { id: 3, direction: 'South', is_on: true, time: '1:04 pm PST' },
    { id: 4, direction: 'West', is_on: true, time: '1:07 pm PST' },
    { id: 5, direction: 'Southeast', is_on: true, time: '1:10 pm PST' },
    { id: 6, direction: 'Southwest', is_on: true, time: '1:12 pm PST' },
  ];

  // Views Tab State
  const [viewsData, setViewsData] = useState([
    {
      id: '893',
      direction: 'North',
      enabled: true,
      isDefault: true,
      imagePath: 'https://images.camera123.gov.bc.ca/image/north/123.jpg',
      description: 'Looking north',
    },
    {
      id: '894',
      direction: 'South',
      enabled: true,
      isDefault: false,
      imagePath: 'https://images.camera123.gov.bc.ca/image/south/125.jpg',
      description: 'Looking south',
    },
    {
      id: '895',
      direction: 'East',
      enabled: true,
      isDefault: false,
      imagePath: 'https://images.camera123.gov.bc.ca/image/east/127.jpg',
      description: 'Looking east',
    },
    { id: '896', direction: 'West', enabled: false, isDefault: false, imagePath: '', description: '' },
    { id: '897', direction: 'Northeast', enabled: false, isDefault: false, imagePath: '', description: '' },
    { id: '898', direction: 'Northwest', enabled: false, isDefault: false, imagePath: '', description: '' },
    { id: '899', direction: 'Southeast', enabled: false, isDefault: false, imagePath: '', description: '' },
  ]);

  const handleSetDefaultView = (selectedId) => {
    setViewsData((prev) =>
      prev.map((view) => ({
        ...view,
        isDefault: view.id === selectedId,
      }))
    );
  };

  // Notes Tab State
  const [notesData, setNotesData] = useState([
    {
      id: '1',
      author: 'Peter Taylor',
      updatedAt: 'Wed Jan 22, 2026',
      content: 'Camera modem replaced on Jan 21, 2026',
    },
    {
      id: '2',
      author: 'Chris Masterton',
      updatedAt: 'Wed Apr 25, 2025',
      content:
        'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Nunc nunc erat, lobortis eu velit eget, malesuada maximus ipsum. Aliquam vitae tincidunt felis. Sed scelerisque eu lorem id porta. In in viverra turpis. Vestibulum eleifend tortor eget ante malesuada viverra. Vivamus suscipit mattis ornare. Sed augue diam, mattis ut vulputate in, rutrum ac quam. Aliquam massa mauris, blandit vitae enim ut, feugiat pellentesque tortor. Praesent consequat ante non metus fringilla, et volutpat diam suscipit. Mauris vel nibh rhoncus, pulvinar dui in, accumsan risus. Vivamus lobortis condimentum elit.',
    },
  ]);

  const handleAddNote = (newNote) => {
    setNotesData((prev) => [
      { id: Date.now().toString(), ...newNote },
      ...prev,
    ]);
  };

  const handleUpdateNote = (id, newContent) => {
    setNotesData((prev) =>
      prev.map((note) =>
        note.id === id ? { ...note, content: newContent } : note
      )
    );
  };

  // Logs Tab State
  const [logsData] = useState([
    {
      id: '1',
      time: '12:35 pm',
      message: 'No image received - West',
      isError: true,
      date: '01-Aug-2026',
    },
    {
      id: '2',
      time: '12:30 pm',
      message: 'No image received - East',
      isError: true,
      date: '01-Aug-2026',
    },
    {
      id: '3',
      time: '12:15 pm',
      message: 'Image updated successfully - North',
      isError: false,
      date: '01-Aug-2026',
    },
  ]);

  // History Tab State
  const [historyData] = useState([
    {
      id: '1',
      timestamp: 'Thurs, May 22, 2026 10:00 am PST',
      user: 'David Jupp',
      sections: [
        {
          category: 'Visibility',
          actions: [
            {
              type: 'visibility-off',
              text: 'Turned off North view',
              subtext: '"Traffic accident"',
            },
          ],
        },
      ],
    },
    {
      id: '2',
      timestamp: 'Thurs, May 22, 2026 9:00 am PST',
      user: 'Peter Taylor',
      sections: [
        {
          category: 'Setup',
          actions: [
            { type: 'update', text: 'Updated connection type' },
            { type: 'update', text: 'Created new password' },
            { type: 'add', text: 'Added modem serial number' },
            { type: 'remove', text: 'Removed antennae' },
          ],
        },
        {
          category: 'Views',
          actions: [
            { type: 'add', text: 'Added view ID for north' },
            { type: 'add', text: 'Added path for north' },
          ],
        },
      ],
    },
  ]);

  const mainImageUrl = camera?.locations_thumbnail_map_url || camera?.url || '';

  const [isEditingName, setIsEditingName] = useState(false);
  const [cameraName, setCameraName] = useState('');
  const [isSavingName, setIsSavingName] = useState(false);

  useEffect(() => {
    const loadCamera = async () => {
      try {
        const response = await fetch(`/api/cameras/${id}/`);

        if (!response.ok) {
          throw new Error(`Failed to load camera: ${response.status}`);
        }

        const data = await response.json();

        console.log("Camera loaded:", data);

        setCamera(data);
        setFormData((prev) => ({
          ...prev,
          cameraName: data.internet_name || '',
          locationDescription: data.locations_description || '',
          businessArea: data.business_area || '',
          region: data.locations_region || '',
          highway: data.locations_highway || '',
          maintenanceContractor: data.maintenance_contractor || '',
          electricalContractor: data.maintenance_electrical_contractor || '',
          latitude: data.locations_geo_latitude || '',
          longitude: data.locations_geo_longitude || '',
          elevation: data.locations_elevation || '',
          imageWatermark: data.image_watermark || '',
          cameraCredit: data.cam_internet_credit || '',
          cameraCreditUrl: data.cam_internet_website_url || '',
        }));
      } catch (error) {
        console.error("Failed to load camera:", error);
      }
    };

    if (id) {
      loadCamera();
    }
  }, [id]);

  const handleSaveCameraName = async () => {
    const trimmedName = cameraName.trim();

    if (!trimmedName) {
      return;
    }

    if (trimmedName === camera?.internet_name) {
      setIsEditingName(false);
      return;
    }

    try {
      setIsSavingName(true);

      const response = await fetch(`/api/cameras/${camera.id}/`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRFToken': getCookie('csrftoken'),
        },
        body: JSON.stringify({
          internet_name: trimmedName,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);

        console.error('Failed to update camera name:', errorData);

        throw new Error(
          `Failed to update camera name: ${response.status}`
        );
      }

      const updatedCamera = await response.json();

      setCamera(updatedCamera);
      setIsEditingName(false);

    } catch (error) {
      console.error(error);
      alert(error.message);
    } finally {
      setIsSavingName(false);
    }
  };

  const handleCameraNameKeyDown = (event) => {
    if (event.key === 'Enter') {
      handleSaveCameraName();
    }

    if (event.key === 'Escape') {
      handleCancelCameraName();
    }
  };

  useEffect(() => {
    if (!camera) {
      return;
    }

  setFormData({
    cameraName: camera.internet_name || '',
    locationDescription: camera.locations_description || '',
    businessArea: camera.business_area || '',
    region: camera.locations_region || '',
    highway: camera.locations_highway || '',
    maintenanceContractor: camera.maintenance_contractor || '',
    electricalContractor: camera.maintenance_electrical_contractor || '',
    latitude: camera.locations_geo_latitude || '',
    longitude: camera.locations_geo_longitude || '',
    elevation: camera.locations_elevation || '',
    imageWatermark: camera.image_watermark || '',
    cameraCredit: camera.cam_internet_credit || '',
    cameraCreditUrl: camera.cam_internet_website_url || '',
  });
}, [camera]);

  return (
    <div className="camera-details-container">
      {/* Header Bar */}
      <header className="details-header">

    <div className="title-section">
      {isEditingName ? (
        <input
          type="text"
          className="camera-name-input"
          value={formData.cameraName}
          onChange={(event) =>
            setFormData((prev) => ({
              ...prev,
              cameraName: event.target.value,
            }))
          }
          onBlur={() => setIsEditingName(false)}
          autoFocus
        />
      ) : (
        <>
          <h1>{formData.cameraName || 'New Camera'}</h1>

          <button
            type="button"
            className="icon-edit-btn"
            aria-label="Edit title"
            onClick={() => setIsEditingName(true)}
          >
            <FontAwesomeIcon icon={faPenToSquare} />
          </button>
        </>
      )}
    </div>

        <div className="actions-toolbar">
          <button type="button" className="btn-secondary btn-service">
            <FontAwesomeIcon icon={faWrench} />
            <span>Request service</span>
          </button>
          <button type="button" className="circle-action-btn" aria-label="View link">
            <FontAwesomeIcon icon={faInfoCircle} />
          </button>
            <button
              type="button"
              className="circle-action-btn danger"
              aria-label="Delete camera"
              onClick={handleDelete}
            >
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
                <img src={mainImageUrl} alt={camera?.internet_name} />
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

          {activeTab === 'Views' && (
          <ViewsTab
            views={viewsData}
            onChange={setViewsData}
            onSetDefault={handleSetDefaultView}
          />
        )}

        {activeTab === 'Notes' && (
          <NotesTab
            notes={notesData}
            onAddNote={handleAddNote}
            onUpdateNote={handleUpdateNote}
          />
        )}

        {activeTab === 'Logs' && <LogsTab logs={logsData} />}

        {activeTab === 'History' && <HistoryTab history={historyData} />}

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