import { useState } from 'react';

export default function AdditionalMessaging({ event, dispatch }) {
  const [text, setText] = useState(event.additional || '');

  const change = (e) => {
    setText(e.target.value.substring(0, 400))
  }

  return <>
    <div className="title">
      <p><strong>Additional Messaging</strong> (optional)</p>
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
