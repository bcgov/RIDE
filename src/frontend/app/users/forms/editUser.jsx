// React
import React, { useEffect, useState } from 'react';

// Internal imports
import { updateUser } from "../../shared/data/users.js";

// Styling
import './editUser.scss';
import RIDEDropdown from "../../components/shared/dropdown.jsx";

export default function EditUserForm(props) {
  /* Setup */
  // Props
  const { user, orgs, submitting, setSubmitting, setOpen, setUsers } = props

  /* Hooks */
  // States
  const [ selectedOrg, setSelectedOrg ] = useState(user.organization);
  const [ selectedRole, setSelectedRole ] = useState(user.is_approver);
  const [ isSuperuser, setIsSuperuser ] = useState(user.is_superuser);

  // Effects
  useEffect(() => {
    if (submitting) {
      updateUser(user.id, {
        organization: selectedOrg,
        is_approver: selectedRole,
        is_superuser: isSuperuser

      }).then(user => {
        if (user) {
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
  }, [submitting]);

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
          extraClasses={`mr-5 user-form`}
          items={orgs}
          initialValue={user.groups.length > 0 ? user.groups[0] : null}
          handler={setSelectedOrg} />

        <RIDEDropdown
          label={'Role: '}
          extraClasses={`mr-5 user-form`}
          items={['Submitter', 'Approver']}
          initialValue={user.is_approver ? 'Approver' : 'Submitter'}
          handler={(value) => setSelectedRole(value === 'Approver')} />

        <RIDEDropdown
          label={'Superuser: '}
          extraClasses={`mr-5 user-form`}
          items={['No', 'Yes']}
          initialValue={user.is_superuser ? 'Yes' : 'No'}
          handler={(value) => setIsSuperuser(value === 'Yes')} />
      </div>
    </div>
  );
}
