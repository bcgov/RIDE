import Select from 'react-select';

import { IncidentsList } from "./references";
import { selectStyle } from '../components/Map/helpers';

export default function Details({ errors, severity, setSeverity }) {
  return <>
    <div className="title">
      <p><strong>Details</strong></p>
    </div>
    <div className="row">
      <div className={`input ${errors.direction ? 'error' : ''}`}>
        <label>Direction</label>
        <select name="direction">
          <option>Both</option>
          <option>North</option>
          <option>East</option>
          <option>South</option>
          <option>West</option>
        </select>
      </div>

      <div className={`input ${errors.severity ? 'error' : ''}`}>
        <label>Severity</label>
        <select name="severity" defaultValue={severity} onChange={(e) => setSeverity(e.target.value)}>
          <option>Minor (30- minute delay)</option>
          <option>Major (30+ minute delay)</option>
          <option>Closed</option>
        </select>
      </div>
    </div>
    <div className={`input ${errors.situation ? 'error' : ''}`}>
      <label>Situation</label>
      <Select
        name="situation"
        options={ IncidentsList.map((item, ii) => (
          { value: item.id, label: item.label }
        ))}
        styles={selectStyle}
      />
    </div>
  </>;
}