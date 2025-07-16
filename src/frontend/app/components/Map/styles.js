import { Circle, Fill, Stroke, Style } from 'ol/style';

export const normalStyle = new Style({
  image: new Circle({
    stroke: new Stroke({
      color: 'rgba(100, 64, 10, 0.5)',
      width: 2,
    }),
    fill: new Fill({ color: 'rgba(230, 148, 24, 1)' }),
    radius: 10,
  }),
});

export const hoverStyle = new Style({
  image: new Circle({
    stroke: new Stroke({
      color: 'rgba(150, 96, 20, 1)',
      width: 3,
    }),
    fill: new Fill({ color: 'rgba(255, 196, 48, 1)' }),
    radius: 10,
  }),
});

export const activeStyle = new Style({
  image: new Circle({
    stroke: new Stroke({
      color: 'rgba(100, 64, 10, 1)',
      width: 2,
    }),
    fill: new Fill({ color: 'rgba(24, 148, 230, 1)' }),
    radius: 10,
  }),
});

