// Styling
import './Switch.scss';

// Figma: "Form / Switcher" (28×14, no label). Pass a label as `aria-label`, or
// put the switch inside a <label> that has text.
//   checked   current state
//   onChange  called with the next state
export default function Switch(props) {
  /* Setup */
  // Props
  const { checked, onChange, ...rest } = props;

  /* Rendering */
  // Main Component
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      className="ride-switch"
      onClick={() => onChange?.(!checked)}
      {...rest}
    >
      <span className="ride-switch__dot" />
    </button>
  );
}
