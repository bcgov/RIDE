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
    color: [100, 64, 10, 0.5],
    width: 5,
  })
});
export const lineStyle2 = new Style({
  stroke: new Stroke({
    color: [200, 150, 10, 1],
    width: 8,
  })
});

export const pinStartNormalStyle = new Style({
  image: new Icon({
    src:'/pin-start.svg',
    width: 32,
    height: 32,
    opacity: 0.7,
    displacement: [0, 16],
  }),
});

export const pinStartHoverStyle = new Style({
  image: new Icon({
    src:'/pin-start.svg',
    width: 32,
    height: 32,
    opacity: 1,
    displacement: [0, 16],
  }),
});

export const pinStartActiveStyle = new Style({
  image: new Icon({
    src:'/pin-start.svg',
    width: 32,
    height: 32,
    opacity: 0.9,
    displacement: [0, 16],
  }),
});

export const pinLocationNormalStyle = new Style({
  image: new Icon({
    src:'/pin-location.svg',
    width: 32,
    height: 32,
    opacity: 0.7,
    displacement: [0, 16],
  }),
});

export const pinLocationHoverStyle = new Style({
  image: new Icon({
    src:'/pin-location.svg',
    width: 32,
    height: 32,
    opacity: 1,
    displacement: [0, 16],
  }),
});

export const pinLocationActiveStyle = new Style({
  image: new Icon({
    src:'/pin-location.svg',
    width: 32,
    height: 32,
    opacity: 0.9,
    displacement: [0, 16],
  }),
});

export const pinEndNormalStyle = new Style({
  image: new Icon({
    src:'/pin-end.svg',
    width: 32,
    height: 32,
    opacity: 0.7,
    displacement: [0, 16],
  }),
});

export const pinEndHoverStyle = new Style({
  image: new Icon({
    src:'/pin-end.svg',
    width: 32,
    height: 32,
    opacity: 1,
    displacement: [0, 16],
  }),
});

export const pinEndActiveStyle = new Style({
  image: new Icon({
    src:'/pin-end.svg',
    width: 32,
    height: 32,
    opacity: 0.9,
    displacement: [0, 16],
  }),
});

export const routeNormalStyle = new Style({
  stroke: new Stroke({
    color: [0, 154, 255, 0.5],
    width: 12,
  })
});
export const routeHoverStyle = new Style({
  stroke: new Stroke({
    color: [0, 154, 255, 0.75],
    width: 14,
  })
});
export const routeActiveStyle = new Style({
  stroke: new Stroke({
    color: [0, 154, 255, 0.95],
    width: 12,
  })
});

const roadSVG = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640" width="24" height="24"><!--!Font Awesome Pro v7.2.0 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license (Commercial License) Copyright 2026 Fonticons, Inc.--><path fill="#f9c430" d="M112 473.7C112 486 122 496 134.3 496L296 496L296 456C296 442.7 306.7 432 320 432C333.3 432 344 442.7 344 456L344 496L505.7 496C518 496 528 486 528 473.7C528 471.7 527.7 469.6 527.2 467.6L439 155.6C437 148.8 430.7 144 423.6 144L344 144L344 184C344 197.3 333.3 208 320 208C306.7 208 296 197.3 296 184L296 144L216.4 144C209.2 144 203 148.8 201 155.6L112.8 467.6C112.2 469.6 112 471.6 112 473.7zM296 280C296 266.7 306.7 256 320 256C333.3 256 344 266.7 344 280L344 360C344 373.3 333.3 384 320 384C306.7 384 296 373.3 296 360L296 280z"/><path fill="#584215" d="M112.8 467.7C112.2 469.7 112 471.7 112 473.8C112 486.1 122 496.1 134.3 496.1L296 496.1L296 456.1C296 442.8 306.7 432.1 320 432.1C333.3 432.1 344 442.8 344 456.1L344 496.1L505.7 496.1C518 496.1 528 486.1 528 473.8C528 471.8 527.7 469.7 527.2 467.7L439 155.6C437 148.8 430.7 144 423.6 144L344 144L344 184C344 197.3 333.3 208 320 208C306.7 208 296 197.3 296 184L296 144L216.4 144C209.2 144 203 148.8 201 155.6L112.8 467.6zM66.6 454.6L154.8 142.6C162.6 115 187.8 96 216.4 96L423.6 96C452.2 96 477.4 115 485.2 142.6L573.4 454.6C575.2 460.8 576 467.2 576 473.7C576 512.5 544.5 544 505.7 544L134.3 544C95.5 544 64 512.5 64 473.7C64 467.2 64.9 460.8 66.6 454.6zM344 280L344 360C344 373.3 333.3 384 320 384C306.7 384 296 373.3 296 360L296 280C296 266.7 306.7 256 320 256C333.3 256 344 266.7 344 280z"/></svg>';
const archSVG = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640" width="24" height="24"><!--!Font Awesome Pro v7.2.0 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license (Commercial License) Copyright 2026 Fonticons, Inc.--><path fill="#7ec4f2" d="M144 144L144 192L496 192L496 144L144 144zM144 240L144 496L208 496L208 416C208 354.1 258.1 304 320 304C381.9 304 432 354.1 432 416L432 496L496 496L496 240L144 240z"/><path fill="#1e53a7" d="M64 120C64 106.7 74.7 96 88 96L552 96C565.3 96 576 106.7 576 120C576 133.3 565.3 144 552 144L544 144L544 496L552 496C565.3 496 576 506.7 576 520C576 533.3 565.3 544 552 544L408 544C394.7 544 384 533.3 384 520L384 416C384 380.7 355.3 352 320 352C284.7 352 256 380.7 256 416L256 520C256 533.3 245.3 544 232 544L88 544C74.7 544 64 533.3 64 520C64 506.7 74.7 496 88 496L96 496L96 144L88 144C74.7 144 64 133.3 64 120zM144 144L144 192L496 192L496 144L144 144zM496 240L144 240L144 496L208 496L208 416C208 354.1 258.1 304 320 304C381.9 304 432 354.1 432 416L432 496L496 496L496 240z"/></svg>';
const mapSVG = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640" width="24" height="24"><!--!Font Awesome Pro v7.2.0 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license (Commercial License) Copyright 2026 Fonticons, Inc.--><path fill="#7ec4f2" d="M112 191.2L208 146L208 445L112 490.2L112 191.2zM234.6 91.1C236.4 91.1 238.2 91.3 240 91.9L418.1 151.3L416.5 152.1L244 93.4C240.9 92.4 237.8 91.6 234.6 91.1zM256 148.2L384 191.7L384 298.4C359.1 327.2 344 364.7 344 405.8C344 433.3 351.1 460.1 360.9 484.3L256 449.3L256 148.2zM432 198L528 150.6L528 240.7C522.7 240.2 517.4 240 512 240C483.1 240 455.9 247.2 432 260L432 198z"/><path fill="#1e53a7" d="M576 112C576 103.7 571.7 96 564.7 91.6C557.7 87.2 548.8 86.8 541.4 90.5L416.5 152.1L244 93.4C230.3 88.7 215.3 89.6 202.1 95.7L77.8 154.3C69.4 158.2 64 166.7 64 176L64 528C64 536.2 68.2 543.9 75.1 548.3C82 552.7 90.7 553.2 98.2 549.7L225.5 489.8L392.8 545.6C390.9 542.6 389 539.6 387.2 536.5C377.8 520.9 368.4 503.2 360.9 484.4L256 449.4L256 148.3L384 191.8L384 298.5C397.4 282.9 413.7 269.9 432 260.1L432 198.1L528 150.7L528 240.8C544.8 242.4 560.9 246.4 576 252.5L576 112zM208 146.1L208 445.1L112 490.3L112 191.3L208 146.1zM392 405.9C392 474.8 456.1 556.3 490.6 595.2C502.2 608.2 521.9 608.2 533.5 595.2C568 556.3 632.1 474.8 632.1 405.9C632.1 340.8 578.4 288 512.1 288C445.8 288 392 340.8 392 405.9z"/></svg>';

const archIcon = new Icon({
  src: 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(archSVG),
  width: 24,
  height: 24,
  opacity: 0.7,
})
const mapLocationIcon = new Icon({
  src: 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(mapSVG),
  width: 24,
  height: 24,
  opacity: 0.7,
})
const roadIcon = new Icon({
  src: 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(roadSVG),
  width: 24,
  height: 24,
  opacity: 0.7,
})

export const iconStyles = {
  A1: roadIcon,
  A2: roadIcon,
  A3: roadIcon,
  A5: roadIcon,
  A8: roadIcon,
  B3: roadIcon,
  D1: archIcon,
  G6: roadIcon,
  R1: roadIcon,
  R2: roadIcon,
  Y1: mapLocationIcon,
  Y3: mapLocationIcon,
  Y4: mapLocationIcon,
};

export const markerStyles = {
  static: new Style({
    image: new Icon({
      src: '/km-marker.svg',
      height: 32,
      opacity: 0.7,
      // displacement: [0, 16],
    }),
    text: new Text({
      font: '10px/1 BC Sans',
      fill: new Fill({ color: [ 255, 255, 255, 1], }),
      text: '',
      textBaseline: 'middle',
      offsetY: 2,
    }),
  }),
  hover: [
    new Style({
      image: new Icon({
        src: '/km-marker.svg',
        height: 32,
      }),
      text: new Text({
        font: '10px/1 BC Sans',
        fill: new Fill({ color: [ 255, 255, 255, 1], }),
        text: '',
        textBaseline: 'middle',
        offsetY: 2,
      }),
    }),
    new Style({
      text: new Text({
        font: '13px BC Sans',
        fill: new Fill({ color: [ 255, 255, 255, 1], }),
        backgroundFill: new Fill({ color: [ 0, 0, 0, 0.5], }),
        padding: [3, 5, 1, 6],
        text: 'asdfasdf',
        offsetY: -20,
        textBaseline: 'bottom',
      }),
    }),
  ],
  active: new Style({
    image: new Circle({
      stroke: new Stroke({
        color: 'rgba(30, 83, 167, 1)',
        width: 2,
      }),
      fill: new Fill({ color: 'rgba(30, 83, 167, 0.7)' }),
      radius: 8,
    }),
  }),
}

export const intersectionStyles = {
  static: new Style({
    image: roadIcon,
  }),
  hover: new Style({
    image: roadIcon,
    text: new Text({
      font: '13px BC Sans',
      // fill: new Fill({ color: [ 0, 0, 0, 1], }),
      fill: new Fill({ color: [ 255, 255, 255, 1], }),
      backgroundFill: new Fill({ color: [ 0, 0, 0, 0.5], }),
      padding: [3, 5, 1, 6],
      // stroke: new Stroke({ color: [255, 255, 255,1], width: 2 }),
      text: '',
      offsetY: -20,
      textBaseline: 'bottom',
    }),
  }),
  active: new Style({
    image: new Circle({
      stroke: new Stroke({
        color: 'rgba(88, 66, 21, 1)',
        width: 2,
      }),
      fill: new Fill({ color: 'rgba(249, 196, 48, 0.7)' }),
      radius: 8,
    }),
  }),
}


export default {
  pin: {
    start: {
      normal: pinStartNormalStyle, active: pinStartActiveStyle, hover: pinStartHoverStyle,
    },
    end: {
      normal: pinEndNormalStyle, active: pinEndActiveStyle, hover: pinEndHoverStyle,
    },
    location: {
      normal: pinLocationNormalStyle, active: pinLocationActiveStyle, hover: pinLocationHoverStyle,
    },
    route: {
        normal: routeNormalStyle, active: routeActiveStyle, hover: routeHoverStyle,
    }
  },
};