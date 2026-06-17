import { useSelector } from 'react-redux';

export default function Bubble({ classes, selector }) {
  const selected = useSelector(selector);
  const number = Array.isArray(selected) ? selected.length : selected;

  return <>
    { number ? <span className={classes}>{number}</span> : null }
  </>;
}
