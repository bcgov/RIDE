// React
import React from "react";

// Internal imports
import { API_HOST, DEPLOYMENT_TAG, RELEASE } from '../../env.js';
import { getCookie } from "../../shared/helpers";
import { handleFormSubmit } from "../../shared/handlers";

// External imports
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faChevronDown } from '@fortawesome/pro-regular-svg-icons';
import { faCircleUser } from '@fortawesome/pro-solid-svg-icons';
import { Menu, MenuButton, MenuItems } from '@headlessui/react'

// Styling
import './dropdown.scss';
import './UserNavigation.scss';

// https://headlessui.com/react/menu
export default function UserNavigation(props) {
  /* Setup */
  // props
  const { authContext } = props;

  /* Rendering */
  // Main Component
  return authContext && authContext.username && (
    <Menu as="div" className={`ride-dropdown user-nav`}>
      <MenuButton className="ride-dropdown-button user-nav-btn">
        <FontAwesomeIcon id="user-icon" icon={faCircleUser} />
        <FontAwesomeIcon icon={faChevronDown} aria-hidden="true" className="ride-dropdown-icon" />
      </MenuButton>

      <MenuItems transition className={`ride-dropdown-menu user-nav-dropdown`}>
        <div id="user-menu-header">
          <FontAwesomeIcon id="user-icon" icon={faCircleUser} />
          <p id="user-email">{authContext.email}</p>

          <form id="signout-link" className="nav-link" method='post' action={`${API_HOST}/accounts/logout/`} onSubmit={handleFormSubmit}>
            <input type='hidden' name='csrfmiddlewaretoken' value={getCookie('csrftoken')} />
            <button type='submit' className="btn" autoFocus={true}>Sign out</button>
          </form>
        </div>

        <div className={'menu-items'}>
          <div className='release-tag'>
            { DEPLOYMENT_TAG || '' }
            { RELEASE || '' }
          </div>
        </div>
      </MenuItems>
    </Menu>
  )
}
