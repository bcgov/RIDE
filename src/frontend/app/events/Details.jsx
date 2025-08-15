import { useState, useRef } from 'react';

import Select from 'react-select';

import { FORM_CATEGORIES, FORM_CATEGORY_PHRASE, FORM_PHRASES, FORM_PHRASE_CATEGORY } from "./references";
import { selectStyle } from '../components/Map/helpers';

export default function Details({ formType, errors, severity, setSeverity }) {
  const [category, setCategory] = useState('');
  const [situation, setSituation] = useState('');
  const sitRef = useRef();
  const catRef = useRef();

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

    <div className={`input ${errors.category ? 'error' : ''}`}>
      <label>Category</label>
      <Select
        name="category"
        ref={catRef}
        onChange={(changed, { action }) => {
          if (category !== changed.value && action === 'select-option') {
            sitRef.current.setValue('');
          }
          setCategory(changed.value);
        }}
        options={FORM_CATEGORIES[formType].map((cat) => ({
          value: cat, label: cat,
        }))}
        styles={selectStyle}
      />
    </div>

    <div className={`input ${errors.situation ? 'error' : ''}`}>
      <label>Situation</label>
      <Select
        ref={sitRef}
        name="situation"
        onChange={(changed) => {
          setSituation(changed.value);
          if (!category) {
            const cat = FORM_PHRASE_CATEGORY[formType][changed.value];
            catRef.current.setValue({ id: cat, label: cat}, 'set-value')
          }
        }}
        options={(FORM_CATEGORY_PHRASE[formType][category] || FORM_PHRASES[formType]).map((item, ii) => (
          { value: item.id, label: item.phrase }
        ))}
        styles={selectStyle}
      />
    </div>
  </>;
}