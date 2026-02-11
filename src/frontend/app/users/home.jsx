// React
import { useContext, useEffect, useState } from 'react';

// Navigation
import { useNavigate } from "react-router";

// Internal imports
import { AlertContext, AuthContext } from "../contexts.js";
import { getUsers, updateUser } from "../shared/data/users";
import { getOrganizations, getServiceAreas, deleteOrganization, createOrganization } from "../shared/data/organizations";
import { HasUserError } from "../shared/helpers.js";
import RIDEDropdown from '../components/shared/dropdown';
import RIDETextInput from '../components/shared/textinput';
import RIDEModal from "../components/shared/modal";
import EditUserForm from "./forms/editUser";
import OrgForm from "./forms/orgForm";

// External imports
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faEdit, faTrashCan, faBan, faPlus } from '@fortawesome/pro-regular-svg-icons';
import { faArrowUpLong } from '@fortawesome/pro-solid-svg-icons';

// Styling
import './home.scss';

export function meta() {
  return [
    { title: "RIDE Users" },
  ];
}

export default function Home() {
  /* Setup */
  // Navigation
  const navigate = useNavigate();

  /* Hooks */
  // Context
  const { setAlertContext } = useContext(AlertContext);
  const { authContext } = useContext(AuthContext);

  // States
  const [ users, setUsers ] = useState();
  const [ processedUsers, setProcessedUsers ] = useState();
  const [ serviceAreas, setServiceAreas ] = useState([]);
  const [ orgs, setOrgs ] = useState([]);
  const [ sortKey, setSortKey ] = useState('Name');
  const [ selectedOrg, setSelectedOrg ] = useState('All organizations');
  const [ searchText, setSearchText ] = useState('');

  // Effects
  useEffect(() => {
    if (!authContext?.loginStateKnown) { return; }

    if (!authContext.username) {
      navigate('/');

    // Redirect to first page if not superuser
    } else if (!authContext.is_superuser) {
      navigate('/events/');
    }
  }, [authContext]);

  useEffect(() => {
    getUsers().then(data => setUsers(data));
    getOrganizations().then(data => setOrgs(data));
    getServiceAreas().then(data => setServiceAreas(data));
  }, []);

  useEffect(() => {
    filterAndSortUsers();
  }, [users, sortKey, selectedOrg, searchText]);

  useEffect(() => {
    // Sync selectedOrg with orgs list if it changes
    if (selectedOrg !== 'All organizations') {
      const updatedOrg = orgs.find(org => org.id === selectedOrg.id);
      if (updatedOrg) {
        setSelectedOrg(updatedOrg);

      } else {
        setSelectedOrg('All organizations');
      }
    }
  }, [orgs]);

  /* Helpers */
  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toISOString().split('T')[0];
  };

  const getUserRole = (user) => {
    if (user.is_superuser) {
      return 'Approver (admin)';
    }

    return user.is_approver ? 'Approver' : 'Submitter';
  }

  // Add this function in the Helpers section
  const sortUsers = (unsortedUsers, key, direction) => {
    if (!unsortedUsers || !key) return users;

    const sortedUsers = [...unsortedUsers].sort((a, b) => {
      let valueA, valueB;

      // Determine values based on column key
      switch (key) {
        case 'Name':
          valueA = `${a.first_name}${a.last_name}`.toLowerCase();
          valueB = `${b.first_name}${b.last_name}`.toLowerCase();
          break;
        case 'ID':
          valueA = a.social_username?.toLowerCase();
          valueB = b.social_username?.toLowerCase();
          break;
        case 'Email':
          valueA = a.email?.toLowerCase();
          valueB = b.email?.toLowerCase();
          break;
        case 'Organization':
          valueA = a.group?.toLowerCase();
          valueB = b.group?.toLowerCase();
          break;
        case 'Role':
          valueA = getUserRole(a);
          valueB = getUserRole(b);
          break;
        case 'Created':
          valueA = a.date_joined ? new Date(a.date_joined).getTime() : 0;
          valueB = b.date_joined ? new Date(b.date_joined).getTime() : 0;
          break;
        case 'Last Login':
          valueA = a.last_login ? new Date(a.last_login).getTime() : 0;
          valueB = b.last_login ? new Date(b.last_login).getTime() : 0;
          break;
        default:
          return 0;
      }

      // Handle null/undefined values
      if (valueA === null || valueA === undefined) return direction === 'asc' ? -1 : 1;
      if (valueB === null || valueB === undefined) return direction === 'asc' ? 1 : -1;

      // Compare based on direction
      if (valueA < valueB) return direction === 'asc' ? -1 : 1;
      if (valueA > valueB) return direction === 'asc' ? 1 : -1;
      return 0;
    });

    return sortedUsers;
  };

  const filterAndSortUsers = () => {
    // Filter users based on selected organization
    let filteredUsers = users;
    if (!filteredUsers) return;  // Data not ready, do nothing

    // Apply organization filter
    if (selectedOrg !== 'All organizations') {
      filteredUsers = users.filter(user => (user.organizations?.length ? user.organizations[0] : null) === selectedOrg.id);
    }

    // Apply search text filter
    if (searchText) {
      const lowerSearchText = searchText.toLowerCase();
      filteredUsers = filteredUsers.filter(user =>
        user?.social_username.toLowerCase().includes(lowerSearchText) ||
        user?.username.toLowerCase().includes(lowerSearchText) ||
        `${user?.first_name} ${user?.last_name}`.toLowerCase().includes(lowerSearchText) ||
        user?.email.toLowerCase().includes(lowerSearchText)
      );
    }

    // Apply current sort to filtered users
    filteredUsers = sortUsers(filteredUsers, sortKey, 'asc');

    // Update state
    setProcessedUsers(filteredUsers);
  }

  /* Handlers */
  const disableUserHandler = (user, undoing=false) => {
    updateUser(user.id, {
      is_active: undoing

    }).then(user => {
      if (user) {
        setUsers((prevUsers) => {
          return prevUsers.map(u => {
            if (u.id === user.id) {
              return user;
            }

            return u;
          });
        });

        if (!undoing) {
          setAlertContext({
            type: 'success',
            message: `User successfully disabled`,
            undoHandler: () => disableUserHandler(user, true)
          });
        }

      } else {
        // Handle error (not implemented here)
      }
    });
  }

  const removeOrgHanlder = () => {
    deleteOrganization(selectedOrg.id).then(() => {
      setAlertContext({
        type: 'success',
        message: `Organization successfully deleted`,
        undoHandler: () => undoRemoveOrgHandler(selectedOrg)
      });

      setSelectedOrg('All organizations');
      setOrgs(prevOrgs => {
        return prevOrgs.filter(org => org.id !== selectedOrg.id);
      });

    }).catch(error => {
      if (error instanceof HasUserError) {
        setAlertContext({
          message: 'Organization delete unsuccessful. Organization must be empty to be deleted.'
        });
      }
    });
  }

  // Recreate deleted organization
  const undoRemoveOrgHandler = (org) => {
    const payload = {
      name: org.name,
      service_areas: org.service_areas,
      contact_name: org.contact_name,
      contact_id: org.contact_id
    };

    createOrganization(payload).then(res => {
      setSelectedOrg(res);
      setOrgs(prevOrgs => {
        // Add org, append to existing list
        const newOrgs = [...prevOrgs, res];
        newOrgs.sort((a, b) => a.name.localeCompare(b.name));
        return newOrgs;
      });
    });
  }

  /* Rendering */
  // Sub Components
  const columns = [
    'Name',
    'ID',
    'Email',
    'Organization',
    'Role',
    'Created',
    'Last Login'
  ]

  // Main Component
  const orgMap = orgs.reduce((res, org) => {
      res[org.id] = org;
      return res;
  }, {});

  return (
    <div className='users-home'>
      <div className={'toolbar'}>
        <div className={'left'}>
          <RIDETextInput label={'Search:'} extraClasses={'extra-margin-right'} value={searchText} handler={setSearchText} maxLength={100} />

          <RIDEDropdown
            label={'Organization'}
            extraClasses={'extra-margin-right'}
            items={['All organizations', ...orgs]}
            handler={(filter) => setSelectedOrg(filter)}
            value={selectedOrg} />

          <RIDEDropdown
            label={'Sort'}
            extraClasses={'extra-margin-right'}
            items={columns}
            handler={(column) => setSortKey(column)}
            value={'Name'} />
        </div>

        <div className={'right'}>
          <div className={'toolbar-btn'}><FontAwesomeIcon icon={faPlus} /> <span>Add user</span></div>

          <RIDEModal
            title={'Add RIDE organization'}
            confirmBtnText={'Add organization'}
            openButton={
              <div className={'toolbar-btn'}><FontAwesomeIcon icon={faPlus} /> <span>Add organization</span></div>
            }>

            <OrgForm areas={serviceAreas} setOrgs={setOrgs} />
          </RIDEModal>

          {selectedOrg && selectedOrg !== 'All organizations' &&
            <RIDEModal
              title={'Edit RIDE organization'}
              confirmBtnText={'Update organization'}
              openButton={
              <div className={'toolbar-btn'}><FontAwesomeIcon icon={faEdit} /> <span>Edit organization</span></div>
              }>

              <OrgForm initialOrg={selectedOrg} areas={serviceAreas} setOrgs={setOrgs} />
            </RIDEModal>
          }

          {selectedOrg && selectedOrg !== 'All organizations' &&
            <div
              className={'toolbar-btn'}
              tabIndex={0}
              onClick={() => removeOrgHanlder()}
              onKeyDown={
                (keyEvent) => {
                  if (['Enter', 'NumpadEnter'].includes(keyEvent.key)) {
                    removeOrgHanlder();
                  }
                }
              }>

              <FontAwesomeIcon icon={faTrashCan} /> <span>Delete organization</span>
            </div>
          }
        </div>
      </div>

      {processedUsers &&
        <div className={'users-table'}>
          {/* Header row */}
          <div className='header-row'>
            {columns.map((row, index) => (
              <div key={index} className='header'>
                {row}
                {sortKey == row &&
                  <FontAwesomeIcon icon={faArrowUpLong} className={'sort-icon ml-1'} />
                }
              </div>
            ))}
          </div>

          {/* Data columns */}
          <div className={'users-rows'}>
            {!!processedUsers.length && processedUsers.map((user) => user.is_active && (
              <div key={user.id} className='user-row'>
                <p>{`${user.first_name} ${user.last_name}`}</p>
                <p>{user.social_username || user.username}</p>
                <p>{user.email}</p>
                <p>{user.organizations?.length ? orgMap[user.organizations[0]]?.name : ''}</p>
                <p>{getUserRole(user)}</p>
                <p>{formatDate(user.date_joined)}</p>
                <p>{formatDate(user.last_login)}</p>

                <RIDEModal
                  title={'Edit RIDE User'}
                  confirmBtnText={'Update user'}
                  openButton={
                    <div className={'user-btn'}><FontAwesomeIcon icon={faEdit} /> <span>Edit</span></div>
                  }>

                  <EditUserForm user={user} orgs={orgs} setUsers={setUsers} />
                </RIDEModal>

                <div
                  className={'user-btn'}
                  tabIndex={0}
                  onClick={() => disableUserHandler(user)}
                  onKeyDown={(keyEvent) => {
                    if (['Enter', 'NumpadEnter'].includes(keyEvent.key)) {
                      disableUserHandler(user);
                    }
                  }}>

                  <FontAwesomeIcon icon={faBan} /> <span>Remove</span>
                </div>
              </div>
            ))}

            {!processedUsers.length &&
              <div className='empty-search'>No users found using current search and filters.</div>
            }
          </div>
        </div>
      }
    </div>
  );
}
