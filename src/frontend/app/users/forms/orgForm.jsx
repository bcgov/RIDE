// React
import React, { useContext, useEffect, useState } from 'react';

// Internal imports
import { AlertContext } from "../../contexts.js";
import { createOrganization, deleteOrganization, updateOrganization } from "../../shared/data/organizations.js";
import { UniqueNameError } from "../../shared/helpers.js";

// Styling
import './orgForm.scss';
import RIDETextInput from "../../components/shared/textinput.jsx";
import RIDECheckBoxes from "../../components/shared/checkboxes.jsx";

export default function OrgForm(props) {
  /* Setup */
  // Props
  const { initialOrg, areas, submitting, setSubmitting, setOpen, setOrgs } = props;

  // Context
  const { setAlertContext } = useContext(AlertContext);

  /* Hooks */
  // States
  const [ name, setName ] = useState('');
  const [ serviceAreas, setServiceAreas ] = useState([]);
  const [ contactName, setContactName ] = useState('');
  const [ contactId, setContactId ] = useState('');

  // Effects
  useEffect(() => {
    if (!initialOrg) return;

    setName(initialOrg.name);
    setServiceAreas(initialOrg.service_areas);
    setContactName(initialOrg.contact_name);
    setContactId(initialOrg.contact_id);
  }, [initialOrg]);

  useEffect(() => {
    {submitting && submitForm()}
  }, [submitting]);

  /* Helpers */
  const validateForm = () => {
    let msg = '';

    if (!name) {
      msg += 'Organization name is required.';
    }

    if (serviceAreas.length === 0) {
      msg += (msg ? '\n' : '') + 'An Organization must have access to at least one Service Area. Select at least one.';
    }

    if (msg) {
      setAlertContext({
        message: msg
      });

      setSubmitting(false);
      return false;
    }

    return true;
  }

  const submitForm = () => {
    const validated = validateForm();
    if (!validated) {
      return;
    }

    const payload = {
      name: name,
      service_areas: serviceAreas,
      contact_name: contactName,
      contact_id: contactId
    };
    const orgFunc = initialOrg ? updateOrganization : createOrganization;
    const orgArgs = initialOrg ? [initialOrg.id, payload] : [payload];

    orgFunc(...orgArgs).then(res => {
      setAlertContext({
        type: 'success',
        message: `Organization successfully ${initialOrg ? 'updated' : 'added'}`,
        undoHandler: () => initialOrg ? undoUpdateSubmit() : undoAddSubmit(res.id)
      });

      setOrgs(prevOrgs => {
        // Edit org, update existing list
        if (initialOrg) {
          return prevOrgs.map(org => org.id === res.id ? res : org);
        }

        // Add org, append to existing list
        const newOrgs = [...prevOrgs, res];
        newOrgs.sort((a, b) => a.name.localeCompare(b.name));
        return newOrgs;
      });

      setOpen(false);
      setSubmitting(false);

    }).catch(error => {
      if (error instanceof UniqueNameError) {
        setAlertContext({
          message: 'Organization name already exists. Can not add again.'
        });
        setSubmitting(false);
      }
    });
  }

  const undoAddSubmit = (id) => {
    deleteOrganization(id).then(() => {
      setOrgs(prevOrgs => prevOrgs.filter(org => org.id !== id));
      setOpen(false);
      setSubmitting(false);
    });
  }

  const undoUpdateSubmit = () => {
    updateOrganization(initialOrg.id, {
      name: initialOrg.name,
      service_areas: initialOrg.service_areas,
      contact_name: initialOrg.contact_name,
      contact_id: initialOrg.contact_id

    }).then((res) => {
      setOrgs(prevOrgs => prevOrgs.map(org => org.id === res.id ? res : org));
      setOpen(false);
      setSubmitting(false);
    });
  }

  /* Rendering */
  // Main component
  return (
    <div className="org-form">
      <div className={'container'}>
        <RIDETextInput label={'Organization name:'} extraClasses={'mr-5 org-form'} value={name} handler={setName} maxLength={30} />
        <RIDECheckBoxes
          label={'Service areas:'}
          extraClasses={'mr-5 org-form'}
          itemsList={areas.map((area) => { return {...area, name: area.sortingOrder + ' - ' + area.name} })}
          itemsState={serviceAreas} setItemsState={setServiceAreas}/>
        <RIDETextInput label={'Authoritative contact:'} extraClasses={'mr-5 org-form'} value={contactName} handler={setContactName} maxLength={30} />
        <RIDETextInput label={'Contact IDIR/BCeID:'} extraClasses={'mr-5 org-form'} value={contactId} handler={setContactId} maxLength={30} />
      </div>
    </div>
  );
}
