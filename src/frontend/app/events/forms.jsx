import { useCallback, useState, useRef } from 'react';

import Conditions from './Conditions.jsx';
import Details from './Details.jsx';
import EventTiming from './Timing.jsx';
import Impacts from './Impacts.jsx';
import InternalNotes from './Internal.jsx';
import Location from './Location.jsx';
import Restrictions from './Restrictions.jsx';
import AdditionalMessaging from './Additional.jsx';

import './forms.css';


export default function EventForm() {

  const handleSubmit = (event) => {
    event.preventDefault();
    const formData = new FormData(event.target);
    for (let [key, value] of formData.entries()) {
      console.log(`${key}: ${value}`);
    }
  }

  return (
    <div className="form">
      <form onSubmit={handleSubmit} autoComplete="off">

      <div className="section form-header">
        <div className="title">

        <h4>Create Incident</h4>
        <button type="submit">Publish</button>
        </div>
      </div>

      <div className="form-body">

        <div className="section location">
          <Location />
        </div>


        <div className="section details">
          <Details />
        </div>

        <div className="section impacts">
          <Impacts />
        </div>

        <div className="section restrictions">
          <Restrictions />
        </div>

        <div className="section conditions">
          <Conditions />
        </div>

        <div className="section timing">
          <EventTiming />
        </div>

        <div className="section additional">
          <AdditionalMessaging />
        </div>

        <div className="section internal">
          <InternalNotes />
        </div>
      </div>
      </form>
    </div>
  );
}
