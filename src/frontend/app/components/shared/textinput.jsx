import { Field, Label, Input } from '@headlessui/react'

// Styling
import './textinput.scss'

// https://headlessui.com/react/input
export default function RIDETextInput(props) {
  /* Setup */
  // Props
  const { label, extraClasses, value, handler } = props;

  /* Rendering */
  // Main Component
  return (
    <div className={`ride-textinput ${extraClasses ? extraClasses : ''}`}>
      <Field className={'ride-textinput-container'}>
        <Label className={'ride-textinput-label'}>{label}</Label>

        <Input
          className={'ride-textinput-input'}
          value={value}
          onChange={(e) => handler(e.target.value)} />
      </Field>
    </div>
  );
}
