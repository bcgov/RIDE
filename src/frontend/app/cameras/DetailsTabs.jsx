import { useEffect, useState, useMemo } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faCalendarDays,
  faEye,
  faEyeSlash,
  faPenToSquare,
  faCheck,
  faXmark,
  faPlus,
  faWifiExclamation,
  faCircleCheck,
  faChevronUp,
  faRotate,
  faMinus,
  faUser,
} from '@fortawesome/pro-regular-svg-icons';
import DatePicker from 'react-datepicker';
import Switch from '../components/shared/Switch.jsx';
import Button from '../components/shared/Button.jsx';
import { orientationLabel } from './helpers.js';
import { getCookie } from '../shared/helpers.js';
import SkeletonList from '../components/shared/SkeletonList.jsx';
import { API_HOST } from '../env.js';
import Collapse from '../components/shared/Collapse.jsx';
import 'react-datepicker/dist/react-datepicker.css';

import './DetailsTabs.scss';

// =========================================================
// Basics
// =========================================================

export function BasicsTab({ basicsData, onChange }) {
  const [regions, setRegions] = useState([]);
  const [roads, setRoads] = useState([]);
  const [businessAreas, setBusinessAreas] = useState([]);
  const [roadMaintenanceContractors, setRoadMaintenanceContractors] = useState([]);
  const [electricalContractors, setElectricalContractors] = useState([]);

  useEffect(() => {
    const loadRegions = async () => {
      try {
        const response = await fetch('/api/regions/');
        if (!response.ok) throw new Error('Failed to load regions');
        const data = await response.json();
        setRegions(data);
      } catch (err) {
        console.error(err);
      }
    };

    loadRegions();
  }, []);

useEffect(() => {
  const loadRoads = async () => {
    try {
      const response = await fetch('/api/roads-and-highways/');
      if (!response.ok) throw new Error('Failed to load roads');
      const data = await response.json();
      setRoads(data);
    } catch (err) {
      console.error(err);
    }
  };

  loadRoads();
}, []);

useEffect(() => {
  const loadRoadMaintenanceContractors = async () => {
    try {
      const response = await fetch('/api/road-maintenance-contractors/');
      if (!response.ok) throw new Error('Failed to load road maintenance contractors');
      const data = await response.json();
      setRoadMaintenanceContractors(data);
    } catch (err) {
      console.error(err);
    }
  };

  loadRoadMaintenanceContractors();
}, []);

useEffect(() => {
  const loadElectricalContractors = async () => {
    try {
      const response = await fetch('/api/electrical-contractors/');
      if (!response.ok) throw new Error('Failed to load electrical contractors');
      const data = await response.json();
      setElectricalContractors(data);
    } catch (err) {
      console.error(err);
    }
  };

  loadElectricalContractors();
}, []);

useEffect(() => {
  const loadBusinessAreas = async () => {
    try {
      const response = await fetch('/api/business-areas/');
      if (!response.ok) throw new Error('Failed to load business areas');
      const data = await response.json();
      setBusinessAreas(data);
    } catch (err) {
      console.error(err);
    }
  };

  loadBusinessAreas();
}, []);

  return (
    <div className="tab-content">
      {/* Required Details */}
      <div className="form-section">
        <span className="section-title">Required details</span>

        <div className="form-group">
          <label htmlFor="description">Location description</label>
          <textarea
            id="description"
            rows={3}
            value={basicsData.description}
            onChange={(e) => onChange('description', e.target.value)}
          />
        </div>

        <div className="form-group">
          <label htmlFor="businessArea">Business area</label>
          <select
              id="businessArea"
              value={basicsData.businessArea ?? ''}
              onChange={(e) => onChange('businessArea', e.target.value)}
            >
              <option value="" disabled>
                Select business area
              </option>
              {businessAreas.map((area) => (
                <option key={area.id} value={area.id}>
                  {area.name}
                </option>
              ))}
            </select>
        </div>

        <div className="form-row two-col">
          <div className="form-group">
            <label htmlFor="region">Region</label>
            <select
              id="region"
              value={basicsData.region ?? ''}
              onChange={(e) => onChange('region', e.target.value)}
            >
              <option value="" disabled>
                Select region
              </option>
              {regions.map((region) => (
                <option key={region.id} value={region.id}>
                  {region.name}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="highway">Road or highway</label>
            <select
              id="road"
              value={basicsData.road ?? ''}
              onChange={(e) => onChange('road', e.target.value)}
            >
              <option value="" disabled>
                Select road
              </option>
              {roads.map((road) => (
                <option key={road.id} value={road.id}>
                  {road.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="form-row two-col">
          <div className="form-group">
            <label htmlFor="maintenanceContractor">
              Road maintenance contractor
            </label>
            <select
              id="roadMaintenanceContractor"
              value={basicsData.roadMaintenanceContractor ?? ''}
              onChange={(e) => onChange('roadMaintenanceContractor', e.target.value)}
            >
              <option value="" disabled>
                Select contractor
              </option>
              {roadMaintenanceContractors.map((contractor) => (
                <option key={contractor.id} value={contractor.id}>
                  {contractor.name}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="electricalContractor">
              Electrical contractor
            </label>
            <select
              id="electricalContractor"
              value={basicsData.electricalContractor ?? ''}
              onChange={(e) => onChange('electricalContractor', e.target.value)}
            >
              <option value="" disabled>
                Select contractor
              </option>
              {electricalContractors.map((contractor) => (
                <option key={contractor.id} value={contractor.id}>
                  {contractor.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="form-row three-col">
          <div className="form-group">
            <label htmlFor="latitude">Latitude</label>
            <input
              type="text"
              id="latitude"
              value={basicsData.latitude}
              onChange={(e) => onChange('latitude', e.target.value)}
            />
          </div>

          <div className="form-group">
            <label htmlFor="longitude">Longitude</label>
            <input
              type="text"
              id="longitude"
              value={basicsData.longitude}
              onChange={(e) => onChange('longitude', e.target.value)}
            />
          </div>

          <div className="form-group">
            <label htmlFor="elevation">Elevation (metres)</label>
            <input
              type="text"
              id="elevation"
              value={basicsData.elevation}
              onChange={(e) => onChange('elevation', e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Optional Details */}
      <div className="form-section">
        <span className="section-title">Optional</span>

        <div className="form-group">
          <label htmlFor="imageWatermark">Image watermark</label>
          <input
            type="text"
            id="imageWatermark"
            value={basicsData.imageWatermark}
            onChange={(e) => onChange('imageWatermark', e.target.value)}
          />
        </div>

        <div className="form-group">
          <label htmlFor="cameraCredit">Camera credit</label>
          <input
            type="text"
            id="cameraCredit"
            value={basicsData.cameraCredit}
            onChange={(e) => onChange('cameraCredit', e.target.value)}
          />
        </div>

        <div className="form-group">
          <label htmlFor="cameraCreditUrl">Camera credit URL</label>
          <input
            type="text"
            id="cameraCreditUrl"
            value={basicsData.cameraCreditUrl}
            onChange={(e) => onChange('cameraCreditUrl', e.target.value)}
          />
        </div>
      </div>
    </div>
  );
}

// =========================================================
// Setup
// =========================================================

export function SetupTab({ setupData, onChange }) {
  const [showPassword, setShowPassword] = useState(false);
  const [cameraTypes, setCameraTypes] = useState([]);
  const [cameraMakes, setCameraMakes] = useState([]);
  const [connectionTypes, setConnectionTypes] = useState([]);
  const [connectionProtocols, setConnectionProtocols] = useState([]);
  const [communicationTypes, setCommunicationTypes] = useState([]);
  const [powerSources, setPowerSources] = useState([]);
  const [communicationDevices, setCommunicationDevices] = useState([]);
  const [antennaes, setAntennaes] = useState([]);
  const [serviceProviders, setServiceProviders] = useState([]);

  useEffect(() => {
      const loadCameraTypes = async () => {
        try {
          const response = await fetch('/api/camera-types/');
          if (!response.ok) throw new Error('Failed to load camera types');
          const data = await response.json();
          setCameraTypes(data);
        } catch (err) {
          console.error(err);
        }
      };
  
      loadCameraTypes();
    }, []);

  useEffect(() => {
      const loadCameraMakes = async () => {
        try {
          const response = await fetch('/api/camera-makes/');
          if (!response.ok) throw new Error('Failed to load camera makes');
          const data = await response.json();
          setCameraMakes(data);
        } catch (err) {
          console.error(err);
        }
      };
  
      loadCameraMakes();
    }, []);

  useEffect(() => {
      const loadConnectionTypes = async () => {
        try {
          const response = await fetch('/api/connection-types/');
          if (!response.ok) throw new Error('Failed to load connection types');
          const data = await response.json();
          setConnectionTypes(data);
        } catch (err) {
          console.error(err);
        }
      };
  
      loadConnectionTypes();
    }, []);

  useEffect(() => {
      const loadConnectionProtocols = async () => {
        try {
          const response = await fetch('/api/connection-protocols/');
          if (!response.ok) throw new Error('Failed to load connection protocols');
          const data = await response.json();
          setConnectionProtocols(data);
        } catch (err) {
          console.error(err);
        }
      };
  
      loadConnectionProtocols();
    }, []);

  useEffect(() => {
      const loadCommunicationTypes = async () => {
        try {
          const response = await fetch('/api/communication-types/');
          if (!response.ok) throw new Error('Failed to load communication types');
          const data = await response.json();
          setCommunicationTypes(data);
        } catch (err) {
          console.error(err);
        }
      };
  
      loadCommunicationTypes();
    }, []);

  useEffect(() => {
      const loadPowerSources = async () => {
        try {
          const response = await fetch('/api/power-sources/');
          if (!response.ok) throw new Error('Failed to load power sources');
          const data = await response.json();
          setPowerSources(data);
        } catch (err) {
          console.error(err);
        }
      };
  
      loadPowerSources();
    }, []);

  useEffect(() => {
      const loadCommunicationDevices = async () => {
        try {
          const response = await fetch('/api/communication-devices/');
          if (!response.ok) throw new Error('Failed to load communication devices');
          const data = await response.json();
          setCommunicationDevices(data);
        } catch (err) {
          console.error(err);
        }
      };
  
      loadCommunicationDevices();
    }, []);

  useEffect(() => {
      const loadAntennaes = async () => {
        try {
          const response = await fetch('/api/antennaes/');
          if (!response.ok) throw new Error('Failed to load antennaes');
          const data = await response.json();
          setAntennaes(data);
        } catch (err) {
          console.error(err);
        }
      };
  
      loadAntennaes();
    }, []);

  useEffect(() => {
      const loadServiceProviders = async () => {
        try {
          const response = await fetch('/api/service-providers/');
          if (!response.ok) throw new Error('Failed to load service providers');
          const data = await response.json();
          setServiceProviders(data);
        } catch (err) {
          console.error(err);
        }
      };
  
      loadServiceProviders();
    }, []);

  return (
    <div className="tab-content setup-tab">
      {/* Header: Camera ID + On-demand toggle */}
      <div className="setup-header-row">
        <div className="camera-id-group">
          <span className="field-label-sm">Camera ID</span>
          <div className="camera-id-value">{setupData.cameraId}</div>
        </div>
        <label className="toggle-label-group">
          <Switch
            checked={setupData.onDemand}
            onChange={(next) => onChange('onDemand', next)}
          />
          <span>On-demand camera</span>
        </label>
      </div>

      {/* Section: Camera */}
      <div className="form-section">
        <span className="section-title">Camera</span>

        <div className="form-row two-col">
          <div className="form-group">
            <label htmlFor="cameraType">Camera type</label>      
            <select
              id="cameraType"
              value={setupData.cameraType}
              onChange={(e) => onChange('cameraType', e.target.value)}
            >
              <option value="">Select camera type...</option>

              {cameraTypes.map((type) => (
                <option key={type.id} value={type.id}>
                  {type.name}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="cameraMake">Camera make</label>
            <select
              id="cameraMake"
              value={setupData.cameraMake}
              onChange={(e) => onChange('cameraMake', e.target.value)}
            >
              <option value="">Select camera make</option>

              {cameraMakes.map((make) => (
                <option key={make.id} value={make.id}>
                  {make.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="form-row two-col">
          <div className="form-group">
            <label htmlFor="cameraInstalled">Installed</label>
            <div className="input-with-icon">
              <DatePicker
                id="cameraInstalled"
                selected={
                  setupData.cameraInstalled
                    ? new Date(setupData.cameraInstalled)
                    : null
                }
                onChange={(date) => {
                  onChange(
                    'cameraInstalled',
                    date ? date.toISOString() : ''
                  );
                }}
                dateFormat="dd-MMM-yyyy"
                placeholderText="dd-MMM-yyyy"
              />

              <FontAwesomeIcon
                icon={faCalendarDays}
                className="input-icon"
              />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="lastInspectedDate">Last inspected</label>
            <div className="input-with-icon">
              <DatePicker
                id="cameraLastInspected"
                selected={
                  setupData.cameraLastInspected
                    ? new Date(setupData.cameraLastInspected)
                    : null
                }
                onChange={(date) => {
                  onChange(
                    'cameraLastInspected',
                    date ? date.toISOString() : ''
                  );
                }}
                dateFormat="dd-MMM-yyyy"
                placeholderText="dd-MMM-yyyy"
              />
              <FontAwesomeIcon icon={faCalendarDays} className="input-icon" />
            </div>
          </div>
        </div>

        <div className="form-row two-col">
          <div className="form-group">
            <label htmlFor="updateFrequency">
              Update frequency (minutes)
            </label>
            <input
              type="text"
              id="updateFrequency"
              value={setupData.updateFrequency}
              onChange={(e) => onChange('updateFrequency', e.target.value)}
            />
          </div>

          <div className="form-group">
            <label htmlFor="macAddress">MAC address</label>
            <input
              type="text"
              id="macAddress"
              value={setupData.macAddress}
              onChange={(e) => onChange('macAddress', e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Section: Connection */}
      <div className="form-section">
        <span className="section-title">Connection</span>

        <div className="form-group">
          <label htmlFor="connectionType">Connection type</label>
          <select
            id="connectionType"
            value={setupData.connectionType}
            onChange={(e) => onChange('connectionType', e.target.value)}
          >
            <option value="">Select connection type</option>
            {connectionTypes.map((connectionType) => (
              <option key={connectionType.id} value={connectionType.id}>
                {connectionType.name}
              </option>
            ))}
          </select>
        </div>

        {(() => {
          const selectedType = connectionTypes.find(
            (t) => String(t.id) === String(setupData.connectionType)
          );
          const selectedProtocol = connectionProtocols.find(
            (p) => String(p.id) === String(setupData.connectionProtocol)
          );

          const isPulled = selectedType?.name === 'Images are pulled';
          const isPushed = selectedType?.name === 'Images are pushed';
          const isFtp = selectedProtocol?.name === 'FTP';

          return (
            <>
              {/* Protocol only applies to Pull — hidden entirely for Push */}
              {isPulled && (
                <div className="form-group">
                  <label htmlFor="connectionProtocol">Connection protocol</label>
                  <select
                    id="connectionProtocol"
                    value={setupData.connectionProtocol}
                    onChange={(e) => onChange('connectionProtocol', e.target.value)}
                  >
                    <option value="">Select connection protocol</option>
                    {connectionProtocols.map((connectionProtocol) => (
                      <option key={connectionProtocol.id} value={connectionProtocol.id}>
                        {connectionProtocol.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {isPulled && isFtp && (
                <>
                  <div className="form-row two-col">
                    <div className="form-group">
                      <label htmlFor="connectionIpAddress">IP address</label>
                      <input
                        type="text"
                        id="connectionIpAddress"
                        value={setupData.connectionIpAddress}
                        onChange={(e) => onChange('connectionIpAddress', e.target.value)}
                      />
                    </div>
                    <div className="form-group">
                      <label htmlFor="connectionPort">Port</label>
                      <input
                        type="text"
                        id="connectionPort"
                        value={setupData.connectionPort}
                        onChange={(e) => onChange('connectionPort', e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="form-row two-col">
                    <div className="form-group">
                      <label htmlFor="username">Username</label>
                      <input
                        type="text"
                        id="username"
                        value={setupData.username}
                        onChange={(e) => onChange('username', e.target.value)}
                      />
                    </div>
                    <div className="form-group">
                      <label htmlFor="password">Password</label>
                      <div className="input-with-icon">
                        <input
                          type={showPassword ? 'text' : 'password'}
                          id="password"
                          value={setupData.password}
                          onChange={(e) => onChange('password', e.target.value)}
                        />
                        <button
                          type="button"
                          className="icon-btn-toggle"
                          onClick={() => setShowPassword(!showPassword)}
                          aria-label="Toggle password visibility"
                        >
                          <FontAwesomeIcon icon={showPassword ? faEye : faEyeSlash} />
                        </button>
                      </div>
                    </div>
                  </div>
                </>
              )}

              {isPulled && !isFtp && (
                <div className="form-row two-col">
                  <div className="form-group">
                    <label htmlFor="username">Username</label>
                    <input
                      type="text"
                      id="username"
                      value={setupData.username}
                      onChange={(e) => onChange('username', e.target.value)}
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="password">Password</label>
                    <div className="input-with-icon">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        id="password"
                        value={setupData.password}
                        onChange={(e) => onChange('password', e.target.value)}
                      />
                      <button
                        type="button"
                        className="icon-btn-toggle"
                        onClick={() => setShowPassword(!showPassword)}
                        aria-label="Toggle password visibility"
                      >
                        <FontAwesomeIcon icon={showPassword ? faEye : faEyeSlash} />
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {isPushed && (
                <div className="form-row two-col">
                  <div className="form-group">
                    <label htmlFor="username">Username</label>
                    <input
                      type="text"
                      id="username"
                      value={setupData.username}
                      onChange={(e) => onChange('username', e.target.value)}
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="password">Password</label>
                    <div className="input-with-icon">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        id="password"
                        value={setupData.password}
                        onChange={(e) => onChange('password', e.target.value)}
                      />
                      <button
                        type="button"
                        className="icon-btn-toggle"
                        onClick={() => setShowPassword(!showPassword)}
                        aria-label="Toggle password visibility"
                      >
                        <FontAwesomeIcon icon={showPassword ? faEye : faEyeSlash} />
                      </button>
                    </div>
                    <button
                      type="button"
                      onClick={() => {/* trigger password-reset flow */}}
                    >
                      <span className="link-style">New password</span>
                    </button>
                  </div>
                </div>
              )}
            </>
          );
        })()}
      </div>



      {/* Section: Communication */}
      <div className="form-section">
        <span className="section-title">Communication</span>

        <div className="form-row two-col">
          <div className="form-group">
            <label htmlFor="commType">Communication type</label>
            <select
              id="communicationType"
              value={setupData.communicationType}
              onChange={(e) => onChange('communicationType', e.target.value)}
            >
              <option value="">Select type</option>

              {communicationTypes.map((communicationType) => (
                <option key={communicationType.id} value={communicationType.id}>
                  {communicationType.name}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="commDevice">Communication device</label>
            <select
              id="communicationDevice"
              value={setupData.communicationDevice}
              onChange={(e) => onChange('communicationDevice', e.target.value)}
            >
              <option value="">Select device</option>

              {communicationDevices.map((communicationDevice) => (
                <option key={communicationDevice.id} value={communicationDevice.id}>
                  {communicationDevice.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="form-row two-col">
          <div className="form-group">
            <label htmlFor="antennae">Antennae</label>
            <select
              id="antenna"
              value={setupData.antenna}
              onChange={(e) => onChange('antenna', e.target.value)}
            >
              <option value="">Select antenna</option>

              {antennaes.map((antenna) => (
                <option key={antenna.id} value={antenna.id}>
                  {antenna.name}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="serviceProvider">Service provider</label>
            <select
              id="serviceProvider"
              value={setupData.serviceProvider}
              onChange={(e) => onChange('serviceProvider', e.target.value)}
            >
              <option value="">Select provider</option>

              {serviceProviders.map((serviceProvider) => (
                <option key={serviceProvider.id} value={serviceProvider.id}>
                  {serviceProvider.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Section: Modem */}
      <div className="form-section">
        <span className="section-title">Modem</span>

        <div className="form-row two-col">
          <div className="form-group">
            <label htmlFor="serialNumber">Serial number</label>
            <input
              type="text"
              id="serialNumber"
              value={setupData.serialNumber}
              onChange={(e) => onChange('serialNumber', e.target.value)}
            />
          </div>

          <div className="form-group">
            <label htmlFor="phoneNumber">Phone number</label>
            <input
              type="text"
              id="phoneNumber"
              value={setupData.phoneNumber}
              onChange={(e) => onChange('phoneNumber', e.target.value)}
            />
          </div>
        </div>

        <div className="form-row two-col">
          <div className="form-group">
            <label htmlFor="baudRate">Baud rate</label>
            <input
              type="text"
              id="baudRate"
              value={setupData.baudRate}
              onChange={(e) => onChange('baudRate', e.target.value)}
            />
          </div>

          <div className="form-group">
            <label htmlFor="modemInstalled">Installed</label>
            <div className="input-with-icon">
              <DatePicker
                id="modemInstalled"
                selected={
                  setupData.modemInstalled
                    ? new Date(setupData.modemInstalled)
                    : null
                }
                onChange={(date) => {
                  onChange(
                    'modemInstalled',
                    date ? date.toISOString() : ''
                  );
                }}
                dateFormat="dd-MMM-yyyy"
                placeholderText="dd-MMM-yyyy"
              />
              <FontAwesomeIcon icon={faCalendarDays} className="input-icon" />
            </div>
          </div>
        </div>
      </div>

      {/* Section: Power */}
      <div className="form-section">
        <span className="section-title">Power</span>

        <div className="form-row three-col">
          <div className="form-group">
            <label htmlFor="powerSource">Source</label>
            <select
              id="powerSource"
              value={setupData.powerSource}
              onChange={(e) => onChange('powerSource', e.target.value)}
            >
              <option value="">Select source</option>

              {powerSources.map((powerSource) => (
                <option key={powerSource.id} value={powerSource.id}>
                  {powerSource.name}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="powerSupplyType">Supply type</label>
            <input
              type="text"
              id="supplyType"
              value={setupData.supplyType}
              onChange={(e) => onChange('supplyType', e.target.value)}
            />
          </div>

          <div className="form-group">
            <label htmlFor="supplySerial">Supply serial #</label>
            <input
              type="text"
              id="supplySerial"
              value={setupData.supplySerial}
              onChange={(e) => onChange('supplySerial', e.target.value)}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

// =========================================================
// Views
// =========================================================

export function ViewsTab({ views = [], onChange, onSetDefault }) {
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

// =========================================================
// Notes
// =========================================================

export function NotesTab({ cameraId }) {
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [editContent, setEditContent] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [newNoteContent, setNewNoteContent] = useState('');

  useEffect(() => {
    fetch(`${API_HOST}/session`, {
      credentials: 'include',
    })
      .then((res) => {
        if (!res.ok) {
          throw new Error(`Session fetch failed: ${res.status}`);
        }
        return res.json();
      })
      .then((data) => {
        setCurrentUserId(data.id);
      })
      .catch((err) => console.error('Failed to load session user:', err));
  }, []);


  const loadNotes = async () => {
    if (!cameraId) return;

    try {
      setLoading(true);
      const response = await fetch(`/api/cameras/${cameraId}/notes/`);
      if (!response.ok) {
        throw new Error(`Failed to load notes: ${response.status}`);
      }
      const data = await response.json();
      setNotes(data);
    } catch (error) {
      console.error('Failed to load notes:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadNotes();
  }, [cameraId]);

  const handleStartEdit = (note) => {
    setEditingId(note.id);
    setEditContent(note.content);
  };

  const handleSaveEdit = async (id) => {
    try {
      const response = await fetch(`/api/cameras/${cameraId}/notes/${id}/`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRFToken': getCookie('csrftoken'),
        },
        body: JSON.stringify({ content: editContent }),
      });

      if (!response.ok) {
        throw new Error(`Failed to update note: ${response.status}`);
      }

      await loadNotes();
      setEditingId(null);
    } catch (error) {
      console.error('Failed to update note:', error);
      alert(error.message);
    }
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditContent('');
  };

  const handleAddSubmit = async () => {
    if (!newNoteContent.trim()) return;

    try {
      const response = await fetch(`/api/cameras/${cameraId}/notes/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRFToken': getCookie('csrftoken'),
        },
        body: JSON.stringify({ content: newNoteContent }),
      });

      if (!response.ok) {
        throw new Error(`Failed to add note: ${response.status}`);
      }

      await loadNotes();
      setNewNoteContent('');
      setIsAdding(false);
    } catch (error) {
      console.error('Failed to add note:', error);
      alert(error.message);
    }
  };

  const formatDate = (isoString) => {
    if (!isoString) return '';
    const date = new Date(isoString);
    const weekday = date.toLocaleDateString('en-US', { weekday: 'short' });
    const rest = date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
    return `${weekday} ${rest}`;
  };

  return (
    <div className="tab-content">
      <div className="notes-card">
        {/* Card Header */}
        <div className="notes-card-header">
          <h2 className="notes-title">Entries</h2>
          <Button variant="secondary" size="sm" onClick={() => setIsAdding(!isAdding)}>
            <FontAwesomeIcon icon={faPlus} />
            Add entry
          </Button>
        </div>

        {/* Inline Form to Add Entry */}
        {isAdding && (
          <div className="add-note-form">
            <textarea
              rows={3}
              placeholder="Enter note details..."
              value={newNoteContent}
              onChange={(e) => setNewNoteContent(e.target.value)}
            />
            <div className="form-actions">
              <Button variant="secondary" onClick={() => setIsAdding(false)}>
                Cancel
              </Button>
              <Button onClick={handleAddSubmit}>
                Save entry
              </Button>
            </div>
          </div>
        )}

        {/* Notes List */}
        <div className="notes-list">
          {loading && <SkeletonList count={3} height={72} />}

          {!loading && notes.length === 0 && (
            <p className="notes-empty">No notes yet.</p>
          )}

          {notes.map((note) => {
            const isEditing = editingId === note.id;

            return (
              <div key={note.id} className="note-item">
                <div className="note-item-header">
                  <div>
                    <span className="author-name">
                      {note.author_name || 'Unknown'}
                    </span>
                  </div>
                  <span className="updated-time">
                    {note.updated
                      ? `Updated ${formatDate(note.updated)}`
                      : `Posted ${formatDate(note.created)}`}
                  </span>
                </div>

                {isEditing ? (
                  <div className="edit-note-form">
                    <textarea
                      rows={4}
                      value={editContent}
                      onChange={(e) => setEditContent(e.target.value)}
                    />
                    <div className="form-actions">
                      <Button variant="secondary" onClick={handleCancelEdit}>
                        Cancel
                      </Button>
                      <Button onClick={() => handleSaveEdit(note.id)}>
                        Save
                      </Button>
                    </div>
                  </div>
                ) : (
                    <div className="note-comment">
                      <p className="note-content">{note.content}</p>
                      {note.author === currentUserId && (
                        <Button variant="link" onClick={() => handleStartEdit(note)}>
                          <FontAwesomeIcon icon={faPenToSquare} />
                          Edit note
                        </Button>
                      )}
                    </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// =========================================================
// Logs
// =========================================================

export function LogsTab({ cameraId, refreshKey }) {
  const [logs, setLogs] = useState([]);
  const [selectedDate, setSelectedDate] = useState(null); // Date | null
  const [errorsOnly, setErrorsOnly] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!cameraId) {
      setLogs([]);
      return;
    }

    const fetchLogs = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const response = await fetch(`/api/cameras/${cameraId}/logs/`);

        if (!response.ok) {
          throw new Error(`Failed to load logs: ${response.status}`);
        }

        const data = await response.json();
        setLogs(data);
      } catch (err) {
        console.error('Failed to load camera logs:', err);
        setError(err.message);
        setLogs([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchLogs();
  }, [cameraId, refreshKey]);

  const formatTime = (timestamp) => {
    if (!timestamp) return '';
    return new Date(timestamp).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  const isSameDay = (dateA, dateB) =>
    dateA.getFullYear() === dateB.getFullYear() &&
    dateA.getMonth() === dateB.getMonth() &&
    dateA.getDate() === dateB.getDate();

  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      if (errorsOnly && !log.is_error) {
        return false;
      }

      if (selectedDate) {
        const logDate = new Date(log.timestamp);
        if (!isSameDay(logDate, selectedDate)) {
          return false;
        }
      }

      return true;
    });
  }, [logs, errorsOnly, selectedDate]);

  return (
    <div className="tab-content logs-tab">
      <div className="form-group">
        <label htmlFor="logDate">Date</label>

        <div className="input-with-icon">
          <DatePicker
            id="logDate"
            selected={selectedDate}
            onChange={(date) => setSelectedDate(date)}
            dateFormat="dd-MMM-yyyy"
            placeholderText="dd-MMM-yyyy"
          />
          <FontAwesomeIcon icon={faCalendarDays} className="input-icon" />
        </div>
      </div>

      <div className="filter-actions">
        <button
          type="button"
          className={`btn-pill ${errorsOnly ? 'active' : ''}`}
          onClick={() => setErrorsOnly((prev) => !prev)}
        >
          Errors only
        </button>
      </div>

      {isLoading && (
        <div className="logs-skeleton">
          <SkeletonList count={6} height={45} gap={4} />
        </div>
      )}

      {!isLoading && error && <div className="no-logs">Failed to load logs.</div>}

      {!isLoading && !error && filteredLogs.length > 0 && (
        <div className="logs-list">
          {filteredLogs.map((log) => (
            <div
              key={log.id}
              className={`log-item ${log.is_error ? 'log-item--error' : ''}`}
            >
              <span className="log-time">{formatTime(log.timestamp)}</span>

              <div className="log-details">
                <FontAwesomeIcon
                  icon={log.is_error ? faWifiExclamation : faCircleCheck}
                  className={log.is_error ? 'error-icon' : 'success-icon'}
                />
                <span className="log-message">{log.message}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {!isLoading && !error && filteredLogs.length === 0 && (
        <div className="no-logs">No logs found for this filter.</div>
      )}
    </div>
  );
}

// =========================================================
// History
// =========================================================

export function HistoryTab({ cameraId }) {
  const [history, setHistory] = useState([]);
  const [collapsedIds, setCollapsedIds] = useState([]);
  const toggleCollapse = (id) => {
    setCollapsedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  // Helper to resolve action type icons
  const getActionIcon = (type) => {
    switch (type) {
      case 'visibility-off':
        return faEyeSlash;
      case 'update':
        return faRotate;
      case 'add':
        return faPlus;
      case 'remove':
        return faMinus;
      default:
        return faRotate;
    }
  };

  const formatTimestamp = (iso) => {
    const date = new Date(iso);
    return new Intl.DateTimeFormat('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
      timeZoneName: 'short',
    }).format(date);
  };

  const renderSubtext = (subtext) => {
    if (!subtext) return null;
    const [oldVal, newVal] = subtext.split(' → ');
    return (
      <div className="value-chips">
        {newVal && <span className="chip chip-new">{newVal}</span>}
        {oldVal && oldVal !== newVal && (
          <span className="chip chip-old">{oldVal}</span>
        )}
      </div>
    );
  };

  useEffect(() => {
    if (!cameraId) {
      return;
    }

    const loadHistory = async () => {
      try {


        const response = await fetch(
          `/api/cameras/${cameraId}/history/`
        );

        if (!response.ok) {
          if (!response.ok) {
            let errorDetail;
            try {
              errorDetail = await response.json();
            } catch {
              errorDetail = await response.text().catch(() => '<no body>');
            }

            console.log('History request failed:', {
              status: response.status,
              statusText: response.statusText,
              url: response.url,
              detail: errorDetail,
            });
          }


          throw new Error(
            `Failed to load history: ${response.status}`
          );
        }

        const data = await response.json();

        setHistory(
          Array.isArray(data) ? data : []
        );

      } catch (err) {
        console.error(
          'Failed to load camera history:',
          err
        );
      }
    };

    loadHistory();
  }, [cameraId]);

  return (
    <div className="tab-content history-tab">
      {Array.isArray(history) &&
        history.map((entry) => {
        const isCollapsed = collapsedIds.includes(entry.id);

        return (
          <div key={entry.id} className="history-card">
            {/* Entry Header */}
            <div className="history-card-header">
              <span className="timestamp-title">{formatTimestamp(entry.timestamp)}</span>
              <Button
                variant="icon"
                size="sm"
                outlined
                onClick={() => toggleCollapse(entry.id)}
                aria-label={isCollapsed ? 'Expand history entry' : 'Collapse history entry'}
                aria-expanded={!isCollapsed}
              >
                <FontAwesomeIcon icon={faChevronUp} />
              </Button>
            </div>

            {/* Entry Content (Animates open and closed) */}
            <Collapse open={!isCollapsed}>
              <div className="history-card-body">
                {entry.sections?.map((section) => (
                  <div key={`section-${section.actions[0].type}-${section.actions[0].text}-${section.actions[0].subtext}`} className={`history-section history-section--${String(section.category).toLowerCase()}`}>
                    <span className="category-label">{section.category}</span>

                    <ul className="actions-list">
                      {section.actions?.map((action) => (
                        <li key={`${action.type}-${action.text}-${action.subtext}`} className="action-item">
                          <div className="action-row">
                            <FontAwesomeIcon
                              icon={getActionIcon(action.type)}
                              className={`action-icon ${action.type}`}
                            />
                            <span>{action.text}</span>
                          </div>
                          {/* {action.subtext && (
                            <p>{action.subtext}</p>
                          )} */}
                          {action.subtext && renderSubtext(action.subtext)}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}

                {/* Footer User Attribution */}
                <div className="history-footer">
                  <FontAwesomeIcon icon={faUser} />
                  <span className="author-name">{entry.user}</span>
                </div>
              </div>
            </Collapse>
          </div>
        );
      })}
    </div>
  );
}
