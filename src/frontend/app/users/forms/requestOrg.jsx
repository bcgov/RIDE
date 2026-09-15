import { useContext, useRef } from 'react';
import { useSelector } from 'react-redux';

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCheck } from '@fortawesome/pro-solid-svg-icons';

import { API_HOST } from '../../env';
import { post } from '../../shared/helpers';
import { AlertContext } from "../../contexts";
import { selectAllOrganizations } from '../../slices/organizations';
import './requestOrg.scss';

export default function requestOrg({ setRequestingOrg }) {
  const { setAlertContext } = useContext(AlertContext);

  const select = useRef()
  const organizations = useSelector(selectAllOrganizations);

  const submitForm = () => {
    const organization = select.current.value;
    if (!organization) {
      setAlertContext({ type: 'failure', message: "You must select an organization to continue" });
      return;
    }

    post(`${API_HOST}/api/users/request`, {
      type: 'ADD_TO_ORGANIZATION', organization,
    }).then(() => {
      setRequestingOrg(false);
      setAlertContext({ type: 'success', message: 'Request submitted' });
    }).catch((err) => {
      setAlertContext({ type: 'failure', message: err.message });
    })
  }

  return (
    <div className='request-organization'>
      <div className="header"><h4>Request Access</h4></div>

      <div className="body">
        <p>You currently have view-only access.  Please choose the organization
          to which you should be added and click on the <strong>Submit</strong> button.  An admin will
          verify your account and organization and make the update.
        </p>

        <div className='select'>
          <select ref={select} required>
            <option disabled selected hidden value='' key='none'>select organization</option>
           { organizations.map((org) => (
              <option value={org.id} key={org.id}>{org.name}</option>)
            )}
          </select>
        </div>
      </div>

      <div className="buttons">
        <button
          type="button"
          className='primary'
          onClick={() => submitForm()}
        ><FontAwesomeIcon icon={faCheck} /> Submit</button>
      </div>
    </div>
  )
}