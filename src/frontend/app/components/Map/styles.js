import { Circle, Fill, Stroke, Style, Icon, Text } from 'ol/style';

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

export const dotStyle = new Style({
  image: new Circle({
    fill: new Fill({ color: 'rgba(230, 148, 24, 1)' }),
    radius: 2,
  }),
});

export const dotStyle2 = new Style({
  image: new Circle({
    fill: new Fill({ color: 'rgba(230, 0, 24, 1)' }),
    radius: 3,
  }),
});

export const lineStyle = new Style({
  stroke: new Stroke({
    color: [100, 64, 10, 1],
    width: 4,
  })
});

const startTextStyle = new Text({
  font: '9pt Arial',
  fill: new Fill({ color: '#fff' }),
  stroke: new Stroke({ color: '#000', width: 2, }),
  backgroundFill: new Fill({ color: [0, 102, 51, 0.6 ] }),
  padding: [4, 4, 4, 4],
  textAlign: 'left',
  textBaseline: 'top',
  offsetX: 24,
  offsetY: -20,
});

const endTextStyle = new Text({
  font: '9pt Arial',
  fill: new Fill({ color: '#fff' }),
  stroke: new Stroke({ color: '#000', width: 2, }),
  backgroundFill: new Fill({ color: [102, 51, 0, 0.7 ] }),
  padding: [4, 4, 4, 4],
  textAlign: 'left',
  textBaseline: 'top',
  offsetX: 24,
  offsetY: -20,
});

export const pinStartNormalStyle = new Style({
  image: new Icon({
    src:'/pin-start.svg',
    width: 32,
    height: 32,
    opacity: 0.7,
    displacement: [0, 16],
  }),
  text: startTextStyle,
});

export const pinStartHoverStyle = new Style({
  image: new Icon({
    src:'/pin-start.svg',
    width: 32,
    height: 32,
    opacity: 1,
    displacement: [0, 16],
  }),
  text: startTextStyle,
});

export const pinStartActiveStyle = new Style({
  image: new Icon({
    src:'/pin-start.svg',
    width: 32,
    height: 32,
    opacity: 0.9,
    displacement: [0, 16],
  }),
  text: startTextStyle,
});

export const pinEndNormalStyle = new Style({
  image: new Icon({
    src:'/pin-end.svg',
    width: 32,
    height: 32,
    opacity: 0.7,
    displacement: [0, 16],
  }),
  text: endTextStyle,
});

export const pinEndHoverStyle = new Style({
  image: new Icon({
    src:'/pin-end.svg',
    width: 32,
    height: 32,
    opacity: 1,
    displacement: [0, 16],
  }),
  text: endTextStyle,
});

export const pinEndActiveStyle = new Style({
  image: new Icon({
    src:'/pin-end.svg',
    width: 32,
    height: 32,
    opacity: 0.9,
    displacement: [0, 16],
  }),
  text: endTextStyle,
});

export const routeNormalStyle = new Style({
  stroke: new Stroke({
    color: [0, 154, 255, 0.5],
    width: 10,
  })
});
export const routeHoverStyle = new Style({
  stroke: new Stroke({
    color: [0, 154, 255, 0.75],
    width: 12,
  })
});
export const routeActiveStyle = new Style({
  stroke: new Stroke({
    color: [0, 154, 255, 0.95],
    width: 10,
  })
});

export default {
  pin: {
    start: {
      normal: pinStartNormalStyle, active: pinStartActiveStyle, hover: pinStartHoverStyle,
    },
    end: {
      normal: pinEndNormalStyle, active: pinEndActiveStyle, hover: pinEndHoverStyle,
    },
  }
};