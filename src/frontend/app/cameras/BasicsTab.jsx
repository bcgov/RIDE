import React from 'react';
import { useEffect, useState } from 'react';

export default function BasicsTab({ basicsData, onChange }) {
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
      const response = await fetch('/api/roads/');
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
    <div className="tab-content basics-tab">
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
                Select a business area
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
                Select a region
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
                Select a road
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
                Select a road maintenance contractor
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
                Select an electrical contractor
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