import { useRef, useState } from 'react';

import Map from '../components/Map/index.jsx';
import Layer from '../components/Map/Layer.jsx';

export function meta() {
  return [
    { title: "RIDE Cameras" },
  ];
}

import './home.css';

export default function Home() {

  return (
    <div className='cameras-home'></div>
  );
}
