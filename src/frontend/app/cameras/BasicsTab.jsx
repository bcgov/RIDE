import React from 'react';

export default function BasicsTab({ formData, onChange }) {
  return (
    <div className="tab-content basics-tab">
      {/* Required Details */}
      <div className="form-section">
        <span className="section-title">Required details</span>

        <div className="form-group">
          <label htmlFor="locationDescription">Location description</label>
          <textarea
            id="locationDescription"
            rows={3}
            value={formData.locationDescription}
            onChange={(e) => onChange('locationDescription', e.target.value)}
          />
        </div>

        <div className="form-group">
          <label htmlFor="businessArea">Business area</label>
          <select
            id="businessArea"
            value={formData.businessArea}
            onChange={(e) => onChange('businessArea', e.target.value)}
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
              onChange={(e) => onChange('region', e.target.value)}
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
              onChange={(e) => onChange('highway', e.target.value)}
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
                onChange('maintenanceContractor', e.target.value)
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
                onChange('electricalContractor', e.target.value)
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
              onChange={(e) => onChange('latitude', e.target.value)}
            />
          </div>

          <div className="form-group">
            <label htmlFor="longitude">Longitude</label>
            <input
              type="text"
              id="longitude"
              value={formData.longitude}
              onChange={(e) => onChange('longitude', e.target.value)}
            />
          </div>

          <div className="form-group">
            <label htmlFor="elevation">Elevation (metres)</label>
            <input
              type="text"
              id="elevation"
              value={formData.elevation}
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
            value={formData.imageWatermark}
            onChange={(e) => onChange('imageWatermark', e.target.value)}
          />
        </div>

        <div className="form-group">
          <label htmlFor="cameraCredit">Camera credit</label>
          <input
            type="text"
            id="cameraCredit"
            value={formData.cameraCredit}
            onChange={(e) => onChange('cameraCredit', e.target.value)}
          />
        </div>

        <div className="form-group">
          <label htmlFor="cameraCreditUrl">Camera credit URL</label>
          <input
            type="text"
            id="cameraCreditUrl"
            value={formData.cameraCreditUrl}
            onChange={(e) => onChange('cameraCreditUrl', e.target.value)}
          />
        </div>
      </div>
    </div>
  );
}