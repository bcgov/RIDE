// React
import { useContext, useEffect, useState } from 'react';
import { useDispatch } from 'react-redux';

// Internal imports
import { AlertContext } from "../../contexts.js";
import { addOrUpdateOrganization, deleteOrganization } from '../../slices/organizations.js';

// Styling
import './orgForm.scss';
import RIDETextInput from "../../components/shared/textinput.jsx";
import RIDECheckBoxes from "../../components/shared/checkboxes.jsx";

export default function OrgForm(props) {
  /* Setup */
  // Props
  const { initialOrg, areas, submitting, setSubmitting, setOpen } = props;

  // Context
  const { setAlertContext } = useContext(AlertContext);

  /* Hooks */
  // States
  const [ name, setName ] = useState('');
  const [ serviceAreas, setServiceAreas ] = useState([]);
  const [ contactName, setContactName ] = useState('');
  const [ contactId, setContactId ] = useState('');

  const dispatch = useDispatch();

  // Effects
  useEffect(() => {
    if (!initialOrg) return;

    setName(initialOrg.name);
    setServiceAreas(initialOrg.service_areas);
    setContactName(initialOrg.contact_name);
    setContactId(initialOrg.contact_id);
  }, [initialOrg]);

  useEffect(() => {
    submitting && submitForm()
  }, [submitting]);

  /* Helpers */
  const validateForm = () => {
    let message = '';

    if (!name) {
      message += 'Organization name is required.';
    }

    if (serviceAreas.length === 0) {
      message += (message ? '\n' : '') + 'An Organization must have access to at least one Service Area. Select at least one.';
    }

    if (message) {
      setAlertContext({ message });
      setSubmitting(false);
      return false;
    }

    return true;
  }

  const submitForm = () => {
    if (!validateForm()) {
      return;
    }

    const payload = {
      id: initialOrg?.id,
      name: name,
      service_areas: serviceAreas,
      contact_name: contactName,
      contact_id: contactId
    };

    dispatch(addOrUpdateOrganization(payload)).then((result) => {
      if (result.error) {
        throw result;
      }

      setAlertContext({
        type: 'success',
        message: `Organization successfully ${initialOrg ? 'updated' : 'added'}`,
        undoHandler: () => initialOrg ? undoUpdateSubmit() : undoAddSubmit(result.payload.id)
      });

      setOpen(false);

    }).catch(error => {
      if (error?.payload?.data?.error === 'unique_name') {
        setAlertContext({
          message: 'Organization name already exists. Can not add again.'
        });

      } else {
        console.log(error);
      }

    }).finally(() => {
      setSubmitting(false);
    });
  }

  const undoAddSubmit = (id) => {
    dispatch(deleteOrganization(id)).then(() => {
      setOpen(false);
      setSubmitting(false);
    });
  }

  const undoUpdateSubmit = () => {
    dispatch(addOrUpdateOrganization({
      id: initialOrg.id,
      name: initialOrg.name,
      service_areas: initialOrg.service_areas,
      contact_name: initialOrg.contact_name,
      contact_id: initialOrg.contact_id

    })).then(() => {
      setOpen(false);
      setSubmitting(false);
    });
  }

  /* Rendering */
  // Main component
  return (
    <div className="org-form">
      <div className={'container'}>
        <RIDETextInput label={'Organization name:'} extraClasses={'extra-margin-right org-form'} value={name} handler={setName} maxLength={30} />
        <RIDECheckBoxes
          label={'Service areas:'}
          extraClasses={'extra-margin-right org-form'}
          itemsList={areas.map((area) => { return {...area, name: area.sortingOrder + ' - ' + area.name} })}
          itemsState={serviceAreas} setItemsState={setServiceAreas}/>
        <RIDETextInput label={'Authoritative contact:'} extraClasses={'extra-margin-right org-form'} value={contactName} handler={setContactName} maxLength={30} />
        <RIDETextInput label={'Contact IDIR/BCeID:'} extraClasses={'extra-margin-right org-form'} value={contactId} handler={setContactId} maxLength={30} />
      </div>
    </div>
  );
}
