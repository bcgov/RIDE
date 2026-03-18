import { useSelector } from 'react-redux';

export default function Bubble({ classes, selector }) {
  const number = useSelector(selector);

  return <>
    { number ? <span className={classes}>{number}</span> : null }
  </>;
}
