// React
import React, { useContext, useEffect, useState } from 'react';

// Internal imports
import { AlertContext } from "../../contexts.js";
import { updateUser } from "../../shared/data/users.js";

// Styling
import './editUser.scss';
import RIDEDropdown from "../../components/shared/dropdown.jsx";

export default function EditUserForm(props) {
  /* Setup */
  // Props
  const { user, orgs, submitting, setSubmitting, setOpen, setUsers } = props

  // Context
  const { setAlertContext } = useContext(AlertContext);

  /* Hooks */
  // States
  const [ selectedOrg, setSelectedOrg ] = useState(user.organization);
  const [ selectedRole, setSelectedRole ] = useState(user.is_approver);
  const [ isSuperuser, setIsSuperuser ] = useState(user.is_superuser);

  // Effects
  useEffect(() => {
    submitting && submitForm();
  }, [submitting]);

  /* Helpers */
  const submitForm = (undoing=false) => {
    updateUser(user.id, {
      organizations: undoing ? (user.organization ? [user.organization.id] : []) : [selectedOrg.id],
      is_approver: undoing ? user.is_approver : selectedRole,
      is_superuser: undoing? user.is_superuser : isSuperuser

    }).then(user => {
      if (user) {
        if (!undoing) {
          setAlertContext({
            type: 'success',
            message: `User successfully updated`,
            undoHandler: () => submitForm(true)
          });
        }

        setUsers(prevUsers => {
          return prevUsers.map(u => {
            if (u.id === user.id) {
              return user;
            }
            return u;
          });
        });

        setOpen(false);
        setSubmitting(false);

      } else {
        // Handle error (not implemented here)
      }
    });
  }

  /* Rendering */
  // Main component
  return (
    <div className="edit-user-form">
      <div className={'user-info'}>
        <div className={'row'}>
          <div className={'label'}>Name:</div>
          <div>{`${user.first_name} ${user.last_name}`}</div>
        </div>

        <div className={'row'}>
          <div className={'label'}>ID:</div>
          <div>{user.social_username}</div>
        </div>

        <div className={'row'}>
          <div className={'label'}>Email:</div>
          <div>{user.email}</div>
        </div>
      </div>

      <div className={'permissions'}>
        <div className={'header'}>Permissions</div>

        <RIDEDropdown
          label={'Organization: '}
          extraClasses={`extra-margin-right user-form`}
          items={orgs}
          value={user.organization}
          handler={setSelectedOrg} />

        <RIDEDropdown
          label={'Role: '}
          extraClasses={`extra-margin-right user-form`}
          items={['Submitter', 'Approver']}
          value={user.is_approver ? 'Approver' : 'Submitter'}
          handler={(value) => setSelectedRole(value === 'Approver')} />

        <RIDEDropdown
          label={'Superuser: '}
          extraClasses={`extra-margin-right user-form`}
          items={['No', 'Yes']}
          value={user.is_superuser ? 'Yes' : 'No'}
          handler={(value) => setIsSuperuser(value === 'Yes')} />
      </div>
    </div>
  );
}
