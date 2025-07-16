import Select from 'react-select';

import { IncidentsList } from "./references";

export default function Details() {
  return <>
    <div className="title">
      <p><strong>Details</strong></p>
    </div>
    <div className="row">
      <div className="input">
        <label>Direction</label>
        <select>
          <option></option>
          <option>North</option>
          <option>East</option>
          <option>South</option>
          <option>West</option>
        </select>
      </div>

      <div className="input">
        <label>Severity</label>
        <select>
          <option></option>
          <option>Major (30+ minute delay)</option>
          <option>Minor (30- minute delay)</option>
        </select>
      </div>
    </div>
    <div className="input">
      <label>Situation</label>
      <Select
        name="situation"
        options={ IncidentsList.map((item, ii) => (
          { value: item.id, label: item.label }
        ))}
        styles={{
          control: (css) => ({ ...css, width: '100%', }),
          container: (css) => ({ ...css, flex: 1, }),
        }}
      />
    </div>
  </>;
}