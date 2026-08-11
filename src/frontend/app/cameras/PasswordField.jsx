import React, { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faEye,
  faEyeSlash,
} from '@fortawesome/pro-regular-svg-icons';

export default function PasswordField({ value, hasPassword, onChange }) {
  
    const [show, setShow] = useState(false);

  return (
    <div className="form-group">
      <label htmlFor="password">Password</label>
      <div className="input-with-icon">
        <input
          type={show ? 'text' : 'password'}
          id="password"
          value={value ?? ''}
          placeholder={hasPassword ? '••••••••' : ''}
          autoComplete="new-password"
          onChange={(e) => onChange(e.target.value)}
        />
        <button
          type="button"
          className="icon-btn-toggle"
          onClick={() => setShow((s) => !s)}
          aria-label="Toggle password visibility"
        >
          <FontAwesomeIcon icon={show ? faEye : faEyeSlash} />
        </button>
      </div>
    </div>
  );
}