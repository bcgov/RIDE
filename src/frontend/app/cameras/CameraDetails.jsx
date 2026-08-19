import React, { useState, useEffect, useMemo } from 'react';
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
  faMagnifyingGlass,
  faChevronDown,
  faChevronRight,
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


  // Navigation Panel State
  const [allCameras, setAllCameras] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedRegions, setExpandedRegions] = useState({});
  const [expandedHighways, setExpandedHighways] = useState({});

  // Details State
  const [camera, setCamera] = useState(null);
  const [activeTab, setActiveTab] = useState('Basics');

  const [basicsData, setBasicsData] = useState({
    title: '',
    description: '',
    businessArea: '',
    region: '',
    road: null,
    roadMaintenanceContractor: '',
    electricalContractor: '',
    latitude: '',
    longitude: '',
    elevation: '',
    imageWatermark: '',
    cameraCredit: '',
    cameraCreditUrl: '',
  });

  const [setupData, setSetupData] = useState({
    cameraId: '',
    cameraType: '',
    cameraMake: '',
    connectionType: '',
    connectionProtocol: '',
    communicationType: '',
    powerSource: '',
    communicationDevice: '',
    antenna: '',
    serviceProvider: '',
  });

  const [isEditingName, setIsEditingName] = useState(false);
  const [cameraName, setCameraName] = useState('');
  const [isSavingName, setIsSavingName] = useState(false);

  const handleSaveCameraName = async () => {
    const trimmedName = cameraName.trim();

    if (!trimmedName) {
      return;
    }

    if (trimmedName === camera?.title) {
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
          title: trimmedName,
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

  const handleSave = async () => {
    try {
      const payload = {
        title: basicsData.title,
        description: basicsData.description,
        business_area_id: basicsData.businessArea ? Number(basicsData.businessArea) : null,
        region_id: basicsData.region ? Number(basicsData.region) : null,
        road_id: basicsData.road ? Number(basicsData.road) : null,
              
        camera_type_id: setupData.cameraType ? Number(setupData.cameraType) : null,
        camera_make_id: setupData.cameraMake ? Number(setupData.cameraMake) : null,
        connection_type_id: setupData.connectionType ? Number(setupData.connectionType) : null,
        connection_protocol_id: setupData.connectionProtocol ? Number(setupData.connectionProtocol) : null,
        communication_type_id: setupData.communicationType ? Number(setupData.communicationType) : null,
        power_source_id: setupData.powerSource ? Number(setupData.powerSource) : null,
        communication_device_id: setupData.communicationDevice ? Number(setupData.communicationDevice) : null,
        antenna_id: setupData.antenna ? Number(setupData.antenna) : null,
        service_provider_id: setupData.serviceProvider ? Number(setupData.serviceProvider) : null,
        
        image_watermark: basicsData.imageWatermark,
        camera_credit: basicsData.cameraCredit,
        camera_credit_url: basicsData.cameraCreditUrl,
        
        road_maintenance_contractor_id: basicsData.roadMaintenanceContractor ? Number(basicsData.roadMaintenanceContractor) : null,
        electrical_contractor_id: basicsData.electricalContractor ? Number(basicsData.electricalContractor) : null,
        
        // Pass null instead of empty string "" for numeric fields
        locations_geo_latitude: basicsData.latitude ? Number(basicsData.latitude) : null,
        locations_geo_longitude: basicsData.longitude ? Number(basicsData.longitude) : null,

        locations_elevation: basicsData.elevation ? Number(basicsData.elevation) : null,

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

  // Fetch all cameras for sidebar navigation
  useEffect(() => {
    const fetchAllCameras = async () => {
      try {
        const res = await fetch('/api/cameras/');
        if (res.ok) {
          const data = await res.json();
          setAllCameras(data);
        }
      } catch (err) {
        console.error("Failed to load camera hierarchy:", err);
      }
    };
    fetchAllCameras();
  }, []);

// Fetch individual camera details when URL parameter changes
useEffect(() => {
  const loadCamera = async () => {
    try {
      const response = await fetch(`/api/cameras/${id}/`);
      if (!response.ok) {
        throw new Error(`Failed to load camera: ${response.status}`);
      }
      const data = await response.json();
      setCamera(data);

      // Auto-expand the active region and highway in the left panel
      const regName = data.region?.name || 'Other';
      const roadName = data.road?.name || 'Other';
      
      setExpandedRegions((prev) => ({ ...prev, [regName]: true }));
      setExpandedHighways((prev) => ({ ...prev, [`${regName}-${roadName}`]: true }));

      // Update Basics form state
      setBasicsData({
        title: data.title || '',
        description: data.description || '',
        road: data.road?.id ?? null,
        region: data.region?.id ?? '',
        roadMaintenanceContractor: data.road_maintenance_contractor?.id ?? null,
        electricalContractor: data.electrical_contractor?.id ?? null,
        businessArea: data.business_area?.id ?? null,
        latitude: data.locations_geo_latitude ?? '',
        longitude: data.locations_geo_longitude ?? '',
        elevation: data.locations_elevation || '',
        imageWatermark: data.image_watermark || '',
        cameraCredit: data.camera_credit || '',
        cameraCreditUrl: data.camera_credit_url || '',
      });

      // Update Setup form state
      setSetupData({
        cameraId: data.id ?? '',
        cameraType: data.camera_type?.id ?? data.camera_type_id ?? '',
        cameraMake: data.camera_make?.id ?? data.camera_make_id ?? '',
        connectionType: data.connection_type?.id ?? data.connection_type_id ?? '',
        connectionProtocol: data.connection_protocol?.id ?? data.connection_protocol_id ?? '',
        communicationType: data.communication_type?.id ?? data.communication_type_id ?? '',
        powerSource: data.power_source?.id ?? data.power_source_id ?? '',
        communicationDevice: data.communication_device?.id ?? data.communication_device_id ?? '',
        antenna: data.antenna?.id ?? data.antenna_id ?? '',
        serviceProvider: data.service_provider?.id ?? data.service_provider_id ?? '',
      });

    } catch (error) {
      console.error("Failed to load camera details:", error);
    }
  };

  if (id) {
    loadCamera();
  }
}, [id]);

  // Group all cameras by Region -> Highway
  const cameraHierarchy = useMemo(() => {
    const hierarchy = {};

    allCameras.forEach((cam) => {
      const regName = cam.region?.name || 'Unassigned';
      const hwyName = cam.road?.name || 'Other';

      if (!hierarchy[regName]) {
        hierarchy[regName] = {};
      }
      if (!hierarchy[regName][hwyName]) {
        hierarchy[regName][hwyName] = [];
      }

      if (
        !searchQuery ||
        cam.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        hwyName.toLowerCase().includes(searchQuery.toLowerCase())
      ) {
        hierarchy[regName][hwyName].push(cam);
      }
    });

    return hierarchy;
  }, [allCameras, searchQuery]);

  const toggleRegion = (regionName) => {
    setExpandedRegions((prev) => ({
      ...prev,
      [regionName]: !prev[regionName],
    }));
  };

  const toggleHighway = (key) => {
    setExpandedHighways((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const handleBasicsChange = (field, value) => {
    setBasicsData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSetupChange = (field, value) => {
    setSetupData((prev) => ({ ...prev, [field]: value }));
  };
 
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


  const getMainImageUrl = (cam) => {
    const views = cam?.views;
    if (!views || views.length === 0) return '';
    const defaultView = views.find((v) => v.is_default);
    if (defaultView?.image_url) return defaultView.image_url;
    const activeView = views.find((v) => v.is_on);
    if (activeView?.image_url) return activeView.image_url;
    return views[0]?.image_url || '';
  };

  const mainImageUrl = getMainImageUrl(camera);

  const viewsList = [...(camera?.views || [])].sort(
    (a, b) => (a.display_order ?? 0) - (b.display_order ?? 0)
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

  useEffect(() => {
    if (camera?.views?.length) {
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

  return (
    <div className="camera-details-layout">
      {/* LEFT SIDE NAVIGATION PANEL */}
      <aside className="camera-nav-panel">
        <div className="search-box">
          <FontAwesomeIcon icon={faMagnifyingGlass} className="search-icon" />
          <input
            type="text"
            placeholder="Search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="hierarchy-tree">
          {Object.entries(cameraHierarchy).map(([regionName, highways]) => {
            const isRegionExpanded = expandedRegions[regionName] ?? true;

            return (
              <div key={regionName} className="region-group">
                <div
                  className="region-header"
                  onClick={() => toggleRegion(regionName)}
                >
                  <span>{regionName}</span>
                  <FontAwesomeIcon
                    icon={isRegionExpanded ? faChevronDown : faChevronRight}
                  />
                </div>

                {isRegionExpanded && (
                  <div className="region-content">
                    {Object.entries(highways).map(([highwayName, cameras]) => {
                      if (cameras.length === 0) return null;
                      const hwyKey = `${regionName}-${highwayName}`;
                      const isHighwayExpanded = expandedHighways[hwyKey] ?? true;

                      return (
                        <div key={hwyKey} className="highway-group">
                          <div
                            className="highway-header"
                            onClick={() => toggleHighway(hwyKey)}
                          >
                            <span>{highwayName}</span>
                            <FontAwesomeIcon
                              icon={isHighwayExpanded ? faChevronDown : faChevronRight}
                            />
                          </div>

                          {isHighwayExpanded && (
                            <ul className="camera-list">
                              {cameras.map((item) => {
                                const isSelected = String(item.id) === String(id);
                                return (
                                  <li
                                    key={item.id}
                                    className={`camera-item ${isSelected ? 'selected' : ''}`}
                                    onClick={() => navigate(`/cameras/${item.id}`)}
                                  >
                                    {item.title}
                                  </li>
                                );
                              })}
                            </ul>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </aside>

      {/* RIGHT MAIN DETAILS CONTAINER */}
      <div className="camera-details-container">
        <header className="details-header">
          <div className="title-section">
          {isEditingName ? (
            <input
              type="text"
              className="camera-name-input"
              value={basicsData.title}
              onChange={(event) =>
                setBasicsData((prev) => ({
                  ...prev,
                  title: event.target.value,
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
                {basicsData.title || 'New Camera'}
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

        <div className="details-grid">
          {/* Left Media Preview Pane */}
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
                  <img src={mainImageUrl} alt={camera?.title} />
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
                {viewsList
                  .filter((view) => view.is_on ?? true)
                  .map((view) => (
                    <div key={view.id} className="view-card">
                      <div className="view-card-top">
                        <span className="direction-label">{view.orientation}</span>
                      </div>
                      <div className="view-card-image">
                        {view.image_url ? (
                          <img src={view.image_url} alt={view.orientation} />
                        ) : (
                          <div className="placeholder-thumb" />
                        )}
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          </div>

          {/* Right Form Tabs Pane */}
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

            {activeTab === 'Basics' && (
              <BasicsTab basicsData={basicsData} onChange={handleBasicsChange} />
            )}
            {activeTab === 'Setup' && (
              <SetupTab setupData={setupData} onChange={handleSetupChange} />
            )}
            {activeTab === 'Views' && (
              <ViewsTab views={viewsData} onChange={setViewsData} onSetDefault={handleSetDefaultView}/>
            )}
            {activeTab === 'Notes' && <NotesTab notes={[]} />}
            {activeTab === 'Logs' && <LogsTab logs={[]} />}
            {activeTab === 'History' && <HistoryTab history={[]} />}

            <footer className="form-footer">
              <button type="button" className="btn-save" onClick={handleSave}>
                <FontAwesomeIcon icon={faFloppyDisk} />
                <span>Save all changes</span>
              </button>
            </footer>
          </div>
        </div>
      </div>
    </div>
  );
}