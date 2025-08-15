import { useCallback, useState, useRef } from 'react';

import { getTransform } from 'ol/proj';

import Conditions from './Conditions.jsx';
import Details from './Details.jsx';
import Delays from './Delays.jsx';
import EventTiming from './Timing.jsx';
import Impacts from './Impacts.jsx';
import InternalNotes from './Internal.jsx';
import Location from './Location.jsx';
import Restrictions from './Restrictions.jsx';
import AdditionalMessaging from './Additional.jsx';
import {
  CONDITIONS_FORMS, DELAYS_FORMS, DETAILS_FORMS, FORMS, IMPACTS_FORMS, RESTRICTIONS_FORMS
} from './references.js';

import './forms.css';


export default function EventForm({ start, end, map }) {

  const [errors, setErrors] = useState({});
  const [severity, setSeverity] = useState('Minor');
  const [formType, setFormType] = useState('Incident');

  const transform = getTransform(map.getView().getProjection().getCode(), 'EPSG:4326');

  const handleSubmit = (event) => {
    event.preventDefault();
    const form = {
      type: formType,
      start: {
        location: '',
        name: '',
        alias: '',
        aliases: [],
        nearby: {
          options: [],
          picked: [],
          other: '',
        },
      },
      end: {
        location: '',
        route: '',
        name: '',
        alias: '',
        aliases: [],
        nearby: {
          options: [],
          picked: [],
          other: '',
        },
      },
      route: [],
      impacts: [],
      restrictions: [],
      conditions: [],
      delay: {
        amount: 0,
        unit: 'minutes',
      },
      timing: {
        nextUpdate: null,
        end: null,
      },
      additional: '',
    };
    const err = {};

    const formData = new FormData(event.target);
    // for (let [key, value] of formData.entries()) {
    //   console.log(`${key}: ${value}`);
    // }

    if (map.start) {
      form.start.location = transform(map.start.getGeometry().getCoordinates());
    }
    form.start.name = formData.get('start name');
    form.start.aliases = JSON.parse(formData.get('start aliases'));
    if (formData.get('include start alias')) { form.start.alias = formData.get('start alias') }
    form.start.nearby.options = JSON.parse(formData.get('start nearby options'));
    form.start.nearby.picked = formData.getAll("start nearby").map(o => parseInt(o));
    if (formData.get('include start other')) {
      form.start.nearby.other = formData.get('start other');
    }

    if (map.end) {
      form.end.location = transform(map.end.getGeometry().getCoordinates());
      form.end.route = map.route.getGeometry().getCoordinates().map((coordinate) => transform(coordinate));
    }
    form.end.name = formData.get('end name');
    form.end.aliases = JSON.parse(formData.get('end aliases'));
    if (formData.get('include end alias')) { form.end.alias = formData.get('end alias') }
    form.end.nearby.options = JSON.parse(formData.get('end nearby options'));
    form.end.nearby.picked = formData.getAll("end nearby").map(o => parseInt(o));
    if (formData.get('include end other')) {
      form.end.nearby.other = formData.get('end other');
    }

    if (formType !== 'condition') {
      if (!formData.get('direction')) { err.direction = true; } else { form.direction = formData.get('direction'); }
      if (!formData.get('severity')) { err.severity = true; } else { form.severity = formData.get('severity'); }
      if (!formData.get('category')) { err.category = true; } else { form.situation = formData.get('category'); }
      if (!formData.get('situation')) { err.situation = true; } else { form.situation = formData.get('situation'); }

      form.impacts = formData.getAll("impact").filter((i) => i !== '0');
      const impacts = formData.getAll('impact').filter((el) => el !== '0');
      if (impacts.length === 0) { err['Traffic Impacts'] = 'Must include at least one'}

      form.delay.amount = formData.get('delay time');
      form.delay.unit = formData.get('delay unit');

      form.restrictions = formData.getAll("restrictions").filter((i) => i !== '0');
    } else {
      form.conditions = formData.getAll("conditions").filter((i) => i !== '0');
    }


    form.additional = formData.get('additional');

    if (!formData.get('next update time') && !formData.get('end time')) {
      err['Manage Timing By'] = 'Must set one or both';
    }
    form.timing.nextUpdate = formData.get('next update time');
    form.timing.end = formData.get('end time');

    form.additional = formData.get('additional');
    form.route = map.route.getGeometry().getCoordinates();

    setErrors(err);
    console.log(form);
  }

  const getLabel = () => severity.startsWith('Minor') ? 'Publish' : 'Submit';

  return (
    <div className="form">
      <form onSubmit={handleSubmit} autoComplete="off">
        <div className="section form-header">
          <div className="title">

          <h4>
            Create&nbsp;
            <select name="formType" onChange={(e) => setFormType(e.target.value)} defaultValue={formType}>
              {FORMS.map((form) => (<option key={form}>{form}</option>))}
            </select>
          </h4>
          <button type="submit">{getLabel()}</button>
          </div>
        </div>

        <div className="form-body">

        { start && <>
            <div className="section location">
              <Location start={start} end={end} />
            </div>

            { DETAILS_FORMS.includes(formType) &&
              <div className="section details">
                <Details formType={formType} errors={errors} severity={severity} setSeverity={setSeverity} />
              </div>
            }

            { IMPACTS_FORMS.includes(formType) &&
              <div className="section impacts">
                <Impacts formType={formType} errors={errors} />
              </div>
            }

            { DELAYS_FORMS.includes(formType) &&
              <div className="section delays">
                <Delays errors={errors} />
              </div>
            }

            { RESTRICTIONS_FORMS.includes(formType) &&
              <div className="section restrictions">
                <Restrictions errors={errors} />
              </div>
            }

            { CONDITIONS_FORMS.includes(formType) &&
              <div className="section conditions">
                <Conditions errors={errors} />
              </div>
            }

            { formType &&
              <div className="section timing">
                <EventTiming errors={errors} severity={severity} formType={formType} />
              </div>
            }

            { formType &&
              <div className="section additional">
                <AdditionalMessaging />
              </div>
            }

            { formType &&
              <div className="section internal">
                <InternalNotes />
              </div>
            }
          </> }
        </div>
      </form>
    </div>
  );
}
