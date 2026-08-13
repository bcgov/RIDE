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
    ccp_camera_title: camera
      ? camera.ccp_camera_title || ''
      : '',
    ccp_camera_description: camera
      ? camera.ccp_camera_description || ''
      : '',
    ccp_camera_highway: camera
      ? camera.ccp_camera_highway || ''
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
      ? camera.ccp_camera_title || ''
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
        ccp_camera_title: formData.ccp_camera_title,
        ccp_camera_description: formData.ccp_camera_description,
        ccp_camera_highway: formData.ccp_camera_highway,

        // ccp_camera_title: formData.cameraName,
        internet_caption: formData.locationDescription,
        locations_description: formData.locationDescription,
        locations_region: formData.region,
        locations_business_area: formData.businessArea,
        locations_highway: formData.highway,
        // locations_geo_latitude: formData.latitude,
        // locations_geo_longitude: formData.longitude,

        // Pass null instead of empty string "" for numeric fields
        locations_geo_latitude: formData.latitude ? Number(formData.latitude) : null,
        locations_geo_longitude: formData.longitude ? Number(formData.longitude) : null,

        // Pass nested views list to backend
        views: viewsData.map((v, index) => ({
          // id: v.id && !isNaN(v.id) ? Number(v.id) : undefined, // Keep ID so Django updates existing rows
          // orientation: v.orientation ? v.orientation.toUpperCase() : '',
          
          // Only send integer IDs for existing rows; send undefined for new rows
          id: v.id && !isNaN(Number(v.id)) && !String(v.id).startsWith('new-') ? Number(v.id) : undefined,
          
          orientation: v.orientation ? v.orientation.toUpperCase() : '',
          image_url: v.image_url,
          description: v.description,
          is_on: v.is_on,
          is_default: v.is_default,
          display_order: index,
        })),
      };

      const url = camera ? `/api/cameras/${camera.id}/` : '/api/cameras/';
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
        throw new Error(`Failed to save camera: ${response.status}`);
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

  // Default template for a brand-new camera
  const DEFAULT_VIEWS = [
    { id: 'new-1', orientation: 'NORTH', description: '', image_url: '', is_on: false, is_default: false },
    { id: 'new-2', orientation: 'SOUTH', description: '', image_url: '', is_on: false, is_default: false },
    { id: 'new-3', orientation: 'EAST', description: '', image_url: '', is_on: false, is_default: false },
    { id: 'new-4', orientation: 'WEST', description: '', image_url: '', is_on: false, is_default: false },
    { id: 'new-5', orientation: 'NORTHEAST', description: '', image_url: '', is_on: false, is_default: false },
    { id: 'new-6', orientation: 'NORTHWEST', description: '', image_url: '', is_on: false, is_default: false },
    { id: 'new-7', orientation: 'SOUTHEAST', description: '', image_url: '', is_on: false, is_default: false },
    { id: 'new-8', orientation: 'SOUTHWEST', description: '', image_url: '', is_on: false, is_default: false },
  ];

  const viewsList = [...(camera?.views || [])].sort(
      (a, b) => a.display_order - b.display_order
  );

  const [viewsData, setViewsData] = useState(() => {
    if (!camera?.views?.length) {
      return DEFAULT_VIEWS;
    }
    const viewsList = [...(camera?.views || [])].sort(
      (a, b) => (a.display_order ?? 0) - (b.display_order ?? 0)
    );

    return viewsList.map((view) => ({
      id: String(view.id),
      orientation: view.orientation || '',
      image_url: view.image_url || '',
      description: view.description || '',
      is_on: view.is_on ?? true,
      is_default: view.is_default ?? false,
    }));
  });

  const handleSetDefaultView = (selectedId) => {
    setViewsData((prev) =>
      prev.map((view) => ({
        ...view,
        is_default: view.id === selectedId,
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

  // const mainImageUrl = camera?.locations_thumbnail_map_url || camera?.url || '';
  const getMainImageUrl = (camera) => {
    const views = camera?.views;
    if (!views || views.length === 0) return '';

    // 1. Look for the view marked as default
    const defaultView = views.find((v) => v.is_default);
    if (defaultView?.image_url) return defaultView.image_url;

    // 2. Fallback to the first active (is_on) view
    const activeView = views.find((v) => v.is_on);
    if (activeView?.image_url) return activeView.image_url;

    // 3. Fallback to the first view in the array
    return views[0]?.image_url || '';
  };

  // Usage:
  const mainImageUrl = getMainImageUrl(camera);

  const getViewImageUrl = (view) => {
    return view?.image_url || '';
  };

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

      // Populate form data immediately from backend response
      setFormData({
        ccp_camera_title: data.ccp_camera_title || data.internet_caption || '',
        ccp_camera_description: data.ccp_camera_description || '',
        ccp_camera_highway: data.ccp_camera_highway || '',
        cameraName: data.ccp_camera_title || '',
        locationDescription: data.locations_description || data.internet_caption || '',
        businessArea: data.business_area || data.locations_business_area || '',
        region: data.locations_region || '',
        highway: data.locations_highway || '',
        maintenanceContractor: data.maintenance_contractor || '',
        electricalContractor: data.maintenance_electrical_contractor || '',
        latitude: data.locations_geo_latitude ?? '',
        longitude: data.locations_geo_longitude ?? '',
        elevation: data.locations_elevation || '',
        imageWatermark: data.image_watermark || '',
        cameraCredit: data.cam_internet_credit || '',
        cameraCreditUrl: data.cam_internet_website_url || '',
      });
    } catch (error) {
      console.error("Failed to load camera:", error);
    }
  };

  if (id) {
    loadCamera();
  }
}, [id]);

  // Update viewsData whenever camera.views arrives or updates
  useEffect(() => {
    if (camera?.views?.length) {
      const viewsList = [...camera.views].sort(
        (a, b) => (a.display_order ?? 0) - (b.display_order ?? 0)
      );

      const formattedViews = viewsList.map((view) => ({
        id: String(view.id),
        orientation: view.orientation || '',
        image_url: view.image_url || '',
        description: view.description || '',
        is_on: view.is_on ?? true,
        is_default: view.is_default ?? false,
      }));

      setViewsData(formattedViews);
    }
  }, [camera?.views]);

  const handleSaveCameraName = async () => {
    const trimmedName = cameraName.trim();

    if (!trimmedName) {
      return;
    }

    if (trimmedName === camera?.ccp_camera_title) {
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
          ccp_camera_title: trimmedName,
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
    ccp_camera_title: camera.ccp_camera_title || '',
    ccp_camera_description: camera.ccp_camera_description || '',
    ccp_camera_highway: camera.ccp_camera_highway || '',
    cameraName: camera.ccp_camera_title || '',
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

    {/* <div className="title-section">
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
          <h1>{formData.ccp_camera_title || 'New Camera'}</h1>

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
    </div> */}


    <div className="title-section">
      {isEditingName ? (
        <input
          type="text"
          className="camera-name-input"
          value={formData.ccp_camera_title}
          onChange={(event) =>
            setFormData((prev) => ({
              ...prev,
              ccp_camera_title: event.target.value,
              cameraName: event.target.value,
            }))
          }
          onKeyDown={handleCameraNameKeyDown}
          onBlur={() => setIsEditingName(false)}
          autoFocus
        />
      ) : (
        <>
          <h1>
            {formData.ccp_camera_title || camera?.ccp_camera_title || 'New Camera'}
          </h1>

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
                <img src={mainImageUrl} alt={camera?.ccp_camera_title} />
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

            {/* <div className="views-grid">
              {viewsList.map((view) => (
                <div key={view.id} className={`view-card ${view.active ? 'selected' : ''}`}>
                  <div className="view-card-top">
                    <span className="direction-label">{view.orientation}</span>
                    <label className="toggle-switch">
                      <input type="checkbox" defaultChecked={view.is_on ?? true} />
                      <span className="slider round" />
                    </label>
                  </div>
                  <div className="view-card-image">
                    {mainImageUrl ? (
                      <img src={getViewImageUrl(view)} alt={view.orientation} />
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
            </div> */}

            <div className="views-grid">
              {viewsList
                .filter((view) => view.is_on ?? true)
                .map((view) => (
                  <div key={view.id} className={`view-card ${view.active ? 'selected' : ''}`}>
                    <div className="view-card-top">
                      <span className="direction-label">{view.orientation}</span>
                      <label className="toggle-switch">
                        <input type="checkbox" defaultChecked={view.is_on ?? true} />
                        <span className="slider round" />
                      </label>
                    </div>
                    <div className="view-card-image">
                      {mainImageUrl ? (
                        <img src={getViewImageUrl(view)} alt={view.orientation} />
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