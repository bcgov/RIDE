import { useState } from 'react';

export default function AdditionalMessaging({ event, dispatch, errors }) {
  const [text, setText] = useState(event.additional || '');
  const error = errors?.additional;

  const change = (e) => {
    setText(e.target.value.substring(0, 400))
  }

  return <>
    <div className={`title ${error ? 'error' : ''}`}>
      <p>
        <strong>Additional Messaging</strong> (optional)
        { error && <span className="error-message">{error}</span>}
      </p>
      <p className={text.length === 400 ? 'bold' : ''}>{text.length}/400</p>
    </div>
    <textarea
      name="additional"
      onChange={change}
      onBlur={(e) => dispatch({ type: 'set additional', value: e.target.value })}
      value={text}
    />
  </>;
}
