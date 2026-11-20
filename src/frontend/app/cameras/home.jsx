import Cameras from './Cameras';
import './home.scss';

export function meta() {
  return [
    { title: 'RIDE Cameras' },
  ];
}

export default function Home() {
  return (
    <div className="cameras-home">
      <Cameras />
    </div>
  );
}