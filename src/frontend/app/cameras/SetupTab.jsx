import React, { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faCalendarDays,
  faEye,
  faEyeSlash,
} from '@fortawesome/pro-regular-svg-icons';

export default function SetupTab({ setupData, onChange }) {
  const [showPassword, setShowPassword] = useState(false);
  const [cameraTypes, setCameraTypes] = useState([]);
  const [cameraMakes, setCameraMakes] = useState([]);

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

  return (
    <div className="tab-content setup-tab">
      {/* Header: Camera ID + On-demand toggle */}
      <div className="setup-header-row">
        <div className="camera-id-group">
          <span className="field-label-sm">Camera ID</span>
          <div className="camera-id-value">{setupData.cameraId}</div>
        </div>
        <label className="toggle-label-group">
          <input
            type="checkbox"
            checked={setupData.isOnDemand}
            onChange={(e) => onChange('isOnDemand', e.target.checked)}
          />
          <span className="toggle-switch-ui" />
          <span className="toggle-text">On-demand camera</span>
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
              <option value="">Select a camera make</option>

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
            <label htmlFor="installedDate">Installed</label>
            <div className="input-with-icon">
              <input
                type="text"
                id="installedDate"
                value={setupData.installedDate}
                onChange={(e) => onChange('installedDate', e.target.value)}
              />
              <FontAwesomeIcon icon={faCalendarDays} className="input-icon" />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="lastInspectedDate">Last inspected</label>
            <div className="input-with-icon">
              <input
                type="text"
                id="lastInspectedDate"
                value={setupData.lastInspectedDate}
                onChange={(e) => onChange('lastInspectedDate', e.target.value)}
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
            <option value="Images are pulled">Images are pulled</option>
            <option value="Images are pushed">Images are pushed</option>
          </select>
        </div>

        <div className="form-group">
          <label htmlFor="connectionProtocol">Connection protocol</label>
          <select
            id="connectionProtocol"
            value={setupData.connectionProtocol}
            onChange={(e) => onChange('connectionProtocol', e.target.value)}
          >
            <option value="File share">File share</option>
            <option value="HTTP/HTTPS">HTTP/HTTPS</option>
          </select>
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
      </div>

      {/* Section: Communication */}
      <div className="form-section">
        <span className="section-title">Communication</span>

        <div className="form-row two-col">
          <div className="form-group">
            <label htmlFor="commType">Communication type</label>
            <select
              id="commType"
              value={setupData.commType}
              onChange={(e) => onChange('commType', e.target.value)}
            >
              <option value="Cellular">Cellular</option>
              <option value="Fiber">Fiber</option>
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="commDevice">Communication device</label>
            <select
              id="commDevice"
              value={setupData.commDevice}
              onChange={(e) => onChange('commDevice', e.target.value)}
            >
              <option value="RV50X">RV50X</option>
            </select>
          </div>
        </div>

        <div className="form-row two-col">
          <div className="form-group">
            <label htmlFor="antennae">Antennae</label>
            <select
              id="antennae"
              value={setupData.antennae}
              onChange={(e) => onChange('antennae', e.target.value)}
            >
              <option value="">Select antennae...</option>
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="serviceProvider">Service provider</label>
            <select
              id="serviceProvider"
              value={setupData.serviceProvider}
              onChange={(e) => onChange('serviceProvider', e.target.value)}
            >
              <option value="Telus">Telus</option>
              <option value="Rogers">Rogers</option>
              <option value="Bell">Bell</option>
            </select>
          </div>
        </div>
      </div>

      {/* Section: Modem */}
      <div className="form-section">
        <span className="section-title">Modem</span>

        <div className="form-row two-col">
          <div className="form-group">
            <label htmlFor="modemSerial">Serial number</label>
            <input
              type="text"
              id="modemSerial"
              value={setupData.modemSerial}
              onChange={(e) => onChange('modemSerial', e.target.value)}
            />
          </div>

          <div className="form-group">
            <label htmlFor="modemPhone">Phone number</label>
            <input
              type="text"
              id="modemPhone"
              value={setupData.modemPhone}
              onChange={(e) => onChange('modemPhone', e.target.value)}
            />
          </div>
        </div>

        <div className="form-row two-col">
          <div className="form-group">
            <label htmlFor="modemBaudRate">Baud rate</label>
            <input
              type="text"
              id="modemBaudRate"
              value={setupData.modemBaudRate}
              onChange={(e) => onChange('modemBaudRate', e.target.value)}
            />
          </div>

          <div className="form-group">
            <label htmlFor="modemInstalledDate">Installed</label>
            <div className="input-with-icon">
              <input
                type="text"
                id="modemInstalledDate"
                value={setupData.modemInstalledDate}
                onChange={(e) => onChange('modemInstalledDate', e.target.value)}
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
              <option value="Wired">Wired</option>
              <option value="Solar">Solar</option>
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="powerSupplyType">Supply type</label>
            <input
              type="text"
              id="powerSupplyType"
              value={setupData.powerSupplyType}
              onChange={(e) => onChange('powerSupplyType', e.target.value)}
            />
          </div>

          <div className="form-group">
            <label htmlFor="powerSupplySerial">Supply serial #</label>
            <input
              type="text"
              id="powerSupplySerial"
              value={setupData.powerSupplySerial}
              onChange={(e) => onChange('powerSupplySerial', e.target.value)}
            />
          </div>
        </div>
      </div>
    </div>
  );
}