// React
import { useContext, useEffect, useState } from 'react';

// Internal imports
import { AlertContext } from "../contexts.js";
import { getUsers, getOrganizations, updateUser } from "../shared/data/users";
import RIDEDropdown from '../components/shared/dropdown';
import RIDETextInput from '../components/shared/textinput';
import RIDEModal from "../components/shared/modal.jsx";
import EditUserForm from "./forms/editUser.jsx";

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
  // Context
  const { _alertContext, setAlertContext } = useContext(AlertContext);

  /* Hooks */
  // States
  const [ users, setUsers ] = useState();
  const [ processedUsers, setProcessedUsers ] = useState();
  const [ orgs, setOrgs ] = useState([]);
  const [ sortKey, setSortKey ] = useState('Name');
  const [ orgFilter, setOrgFilter ] = useState('All organizations');
  const [ searchText, setSearchText ] = useState('');

  // Effects
  useEffect(() => {
    getUsers().then(data => {
      setUsers(data);
    });
    getOrganizations().then(data => setOrgs(data));
  }, []);

  useEffect(() => {
    filterAndSortUsers();
  }, [users, sortKey, orgFilter, searchText]);

  /* Helpers */
  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toISOString().split('T')[0];
  };

  const getUserRole = (user) => {
    if (user.is_superuser) {
      return 'Superuser';
    }

    return user.is_approver ? 'Approver (admin)' : 'Submitter';
  }

  // Add this function in the Helpers section
  const sortUsers = (unsortedUsers, key, direction) => {
    if (!unsortedUsers || !key) return users;

    const sortedUsers = [...unsortedUsers].sort((a, b) => {
      let valueA, valueB;

      // Determine values based on column key
      switch (key) {
        case 'Name':
          valueA = `${a.first_name} ${a.last_name}`.toLowerCase();
          valueB = `${b.first_name} ${b.last_name}`.toLowerCase();
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
    if (orgFilter !== 'All organizations') {
      filteredUsers = users.filter(user => user.group === orgFilter);
    }

    // Apply search text filter
    if (searchText) {
      const lowerSearchText = searchText.toLowerCase();
      filteredUsers = filteredUsers.filter(user =>
        user.social_username && user.social_username.toLowerCase().includes(lowerSearchText) ||
        user.username.toLowerCase().includes(lowerSearchText) ||
        `${user.first_name} ${user.last_name}`.toLowerCase().includes(lowerSearchText) ||
        user.email.toLowerCase().includes(lowerSearchText)
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
        setUsers(prevUsers => {
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
  return (
    <div className='users-home p-4'>
      <div className={'toolbar'}>
        <div className={'left'}>
          <RIDETextInput label={'Search:'} extraClasses={'mr-5'} value={searchText} handler={setSearchText}/>

          <RIDEDropdown
            label={'Organization'}
            extraClasses={'mr-5'}
            items={['All organizations', ...orgs]}
            handler={(filter) => setOrgFilter(filter)}
            initialValue={'All organizations'} />

          <RIDEDropdown
            label={'Sort'}
            extraClasses={'mr-5'}
            items={columns}
            handler={(column) => setSortKey(column)}
            initialValue={'Name'} />
        </div>

        <div className={'right'}>
          <div className={'toolbar-btn'}><FontAwesomeIcon icon={faPlus} /> <span>Add user</span></div>
          <div className={'toolbar-btn'}><FontAwesomeIcon icon={faPlus} /> <span>Add organization</span></div>
          <div className={'toolbar-btn'}><FontAwesomeIcon icon={faEdit} /> <span>Edit organization</span></div>
          <div className={'toolbar-btn'}><FontAwesomeIcon icon={faTrashCan} /> <span>Delete organization</span></div>
        </div>
      </div>

      {processedUsers &&
        <div className={'users-table mt-13'}>
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
          {!!processedUsers.length && processedUsers.map((user) => user.is_active && (
            <div key={user.id} className='user-row'>
              <p>{`${user.first_name} ${user.last_name}`}</p>
              <p>{user.social_username || user.username}</p>
              <p>{user.email}</p>
              <p>{user.group}</p>
              <p>{getUserRole(user)}</p>
              <p>{formatDate(user.date_joined)}</p>
              <p>{formatDate(user.last_login)}</p>

              <RIDEModal
                title={'Edit RIDE User'}
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

          {/* Data columns */}
          {!processedUsers.length &&
            <div className='empty-search ml-2 mt-4'>No users found using current search term.</div>
          }
        </div>
      }
    </div>
  );
}
