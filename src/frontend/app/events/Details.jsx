import { useState, useRef } from 'react';

import Select from 'react-select';

import { FORM_CATEGORIES, FORM_CATEGORY_PHRASE, FORM_PHRASES, FORM_PHRASE_CATEGORY, PHRASES_LOOKUP } from "./references";
import { selectStyle } from '../components/Map/helpers';

export default function Details({ errors, event, dispatch }) {
  const catRef = useRef();
  const sitRef = useRef();

  return <>
    <div className="title">
      <p><strong>Details</strong></p>
    </div>

    <div className="row">
        <select
          value={event.status}
         onChange={(e) => dispatch({ type: 'set', value: { status: e.target.value }})}
        >
          <option>Active</option>
          <option>Inactive</option>
          <option>Cleared</option>
        </select>
    </div>

    <div className="row">
      <div className={`input ${errors.direction ? 'error' : ''}`}>
        <label>Direction</label>
        <select
         name="direction"
         onChange={(e) => dispatch({ type: 'set', value: { section: 'details', direction: e.target.value }})}
        >
          <option>Both directions</option>
          <option>Northbound</option>
          <option>Eastbound</option>
          <option>Southbound</option>
          <option>Westbound</option>
        </select>
      </div>

      <div className={`input ${errors.severity ? 'error' : ''}`}>
        <label>Severity</label>
        <select
          name="severity"
          defaultValue={event.details.severity}
          onChange={(e) => {
            if (e.target.value === event.details.severity) { return; }
            dispatch({ type: 'set severity', value: e.target.value })
          }}
        >
          <option value="Minor">Minor (30- minute delay)</option>
          <option value="Major">Major (30+ minute delay)</option>
        </select>
      </div>
    </div>

    <div className={`input ${errors.category ? 'error' : ''}`} style={{marginBottom: '0.5rem'}}>
      <label>Category</label>
      <Select
        ref={catRef}
        value={[{ value: event.details.category, label: event.details.category }]}
        onChange={(changed, action) => {
          if (action.action === 'clear' || changed.value === event.details.category) { return; }
          sitRef.current.clearValue();
          dispatch({ type: 'set category', value: changed.value });
        }}
        options={FORM_CATEGORIES[event.type].map((cat) => ({
          value: cat, label: cat,
        }))}
        styles={selectStyle}
      />
    </div>

    <div className={`input ${errors.situation ? 'error' : ''}`}>
      <label>Situation</label>
      <Select
        ref={sitRef}
        value={[{ value: event.details.situation, label: PHRASES_LOOKUP[event.details.situation] }]}
        placeholder=""
        onChange={(changed, action) => {
          if (action.action === 'clear') { return; }
          dispatch({ type: 'set situation', value: changed.value, previous: event.details.situation })
        }}
        options={(FORM_CATEGORY_PHRASE[event.type][event.details.category] || FORM_PHRASES[event.type]).map((item, ii) => (
          { value: item.id, label: item.phrase }
        ))}
        styles={selectStyle}
      />
    </div>
  </>;
}