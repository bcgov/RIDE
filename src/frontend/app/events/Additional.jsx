import { useState } from 'react';

export default function AdditionalMessaging() {
  const [text, setText] = useState('');

  const change = (e) => {
    if (e.target.value.length <= 200) {
      setText(e.target.value)
    }
  }

  return <>
    <div className="title">
      <p><strong>Additional Messaging</strong></p>
      <p className={text.length === 200 ? 'bold' : ''}>{text.length}/200</p>
    </div>
    <textarea
      name="additional"
      value={text}
      onChange={change}
    />
  </>;
}
