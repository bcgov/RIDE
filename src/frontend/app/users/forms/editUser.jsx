// React
import { useContext, useEffect, useState } from 'react';
import { useDispatch } from 'react-redux';

// Internal imports
import { AlertContext } from "../../contexts";
import { updateUser } from "../../slices/users";

// Styling
import './editUser.scss';
import RIDEDropdown from "../../components/shared/dropdown.jsx";

export default function EditUserForm(props) {
  /* Setup */
  // Props
  const { user, orgs, submitting, setSubmitting, setOpen } = props

  // Context
  const { setAlertContext } = useContext(AlertContext);

  /* Hooks */
  // States
  const hasOrg = Array.isArray(user.organizations) && user.organizations.length > 0;
  const [ selectedOrgId, setSelectedOrgId ] = useState(hasOrg ? user.organizations[0] : null);
  const [ selectedRole, setSelectedRole ] = useState(user.is_approver);
  const [ isSuperuser, setIsSuperuser ] = useState(user.is_superuser);

  const dispatch = useDispatch();

  // Effects
  useEffect(() => {
    submitting && submitForm();
  }, [submitting]);

  /* Helpers */
  const submitForm = () => {
    dispatch(updateUser({
      id: user.id,
      organizations: selectedOrgId ? [selectedOrgId] : [],
      is_approver: selectedRole,
      is_superuser: isSuperuser

    })).then((result) => {
      if (result.error) { throw result; }

      setAlertContext({
        type: 'success',
        message: `User successfully updated`,
        undoHandler: () => undoSubmit({
          id: user.id,
          organizations: user.organizations,
          is_approver: user.is_approver,
          is_superuser: user.is_superuser,
        })
      });

      setOpen(false);
    }).catch((error) => {
      console.error(error);
    }).finally(() => {
      setSubmitting(false);
    });
  }

  const undoSubmit = (payload) => {
    dispatch(updateUser(payload));
  }

  /* Rendering */
  // Main component
  const userOrg = Array.isArray(user.organizations) && user.organizations.length ?
    orgs.find(org => org.id === user.organizations[0]) : null;

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
          value={userOrg}
          handler={(org) => setSelectedOrgId(org.id)} />

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
