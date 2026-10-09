// Styling
import './Collapse.scss';

// Opens and closes its content with a height animation. The content stays mounted but is
// hidden from the page and keyboard once closed.
//   open   whether the content shows
export default function Collapse({ open, children }) {
  return (
    <div className="ride-collapse" data-open={open || undefined}>
      <div className="ride-collapse__inner">{children}</div>
    </div>
  );
}
