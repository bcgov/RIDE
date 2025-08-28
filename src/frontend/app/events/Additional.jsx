import { useState } from 'react';

export default function AdditionalMessaging({ event, dispatch }) {
  const [text, setText] = useState('');

  const change = (e) => {
    if (e.target.value.length <= 200) {
      setText(e.target.value)
    }
  }

  return <>
    <div className="title">
      <p><strong>Additional Messaging</strong> (optional)</p>
      <p className={text.length === 200 ? 'bold' : ''}>{text.length}/200</p>
    </div>
    <textarea
      name="additional"
      onChange={change}
      onBlur={(e) => dispatch({ type: 'set additional', value: e.target.value })}
      defaultValue={event.additional}
    />
  </>;
}
