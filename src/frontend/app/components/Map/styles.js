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
const citySVG = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640" width="24" height="24"><!--!Font Awesome Pro v7.2.0 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license (Commercial License) Copyright 2026 Fonticons, Inc.--><path opacity=".4" fill="white" d="M80 224L80 512C80 520.8 87.2 528 96 528L242 528C240.7 522.9 240 517.5 240 512L240 208L96 208C87.2 208 80 215.2 80 224zM128 272C128 263.2 135.2 256 144 256L176 256C184.8 256 192 263.2 192 272L192 304C192 312.8 184.8 320 176 320L144 320C135.2 320 128 312.8 128 304L128 272zM128 368C128 359.2 135.2 352 144 352L176 352C184.8 352 192 359.2 192 368L192 400C192 408.8 184.8 416 176 416L144 416C135.2 416 128 408.8 128 400L128 368zM288 128L288 512C288 520.8 295.2 528 304 528L544 528C552.8 528 560 520.8 560 512L560 320C560 311.2 552.8 304 544 304L472 304C458.7 304 448 293.3 448 280L448 128C448 119.2 440.8 112 432 112L304 112C295.2 112 288 119.2 288 128zM336 176C336 167.2 343.2 160 352 160L384 160C392.8 160 400 167.2 400 176L400 208C400 216.8 392.8 224 384 224L352 224C343.2 224 336 216.8 336 208L336 176zM336 272C336 263.2 343.2 256 352 256L384 256C392.8 256 400 263.2 400 272L400 304C400 312.8 392.8 320 384 320L352 320C343.2 320 336 312.8 336 304L336 272zM336 368C336 359.2 343.2 352 352 352L384 352C392.8 352 400 359.2 400 368L400 400C400 408.8 392.8 416 384 416L352 416C343.2 416 336 408.8 336 400L336 368zM448 368C448 359.2 455.2 352 464 352L496 352C504.8 352 512 359.2 512 368L512 400C512 408.8 504.8 416 496 416L464 416C455.2 416 448 408.8 448 400L448 368z"/><path d="M304 112L432 112C440.8 112 448 119.2 448 128L448 280C448 293.3 458.7 304 472 304L544 304C552.8 304 560 311.2 560 320L560 512C560 520.8 552.8 528 544 528L304 528C295.2 528 288 520.8 288 512L288 128C288 119.2 295.2 112 304 112zM240 512C240 517.5 240.7 522.9 242 528L96 528C87.2 528 80 520.8 80 512L80 224C80 215.2 87.2 208 96 208L240 208L240 512zM240 128L240 160L208 160L208 88C208 74.7 197.3 64 184 64C170.7 64 160 74.7 160 88L160 160L128 160L128 88C128 74.7 117.3 64 104 64C90.7 64 80 74.7 80 88L80 162C52.4 169.1 32 194.2 32 224L32 512C32 547.3 60.7 576 96 576L544 576C579.3 576 608 547.3 608 512L608 320C608 284.7 579.3 256 544 256L496 256L496 128C496 92.7 467.3 64 432 64L304 64C268.7 64 240 92.7 240 128zM336 176L336 208C336 216.8 343.2 224 352 224L384 224C392.8 224 400 216.8 400 208L400 176C400 167.2 392.8 160 384 160L352 160C343.2 160 336 167.2 336 176zM464 352C455.2 352 448 359.2 448 368L448 400C448 408.8 455.2 416 464 416L496 416C504.8 416 512 408.8 512 400L512 368C512 359.2 504.8 352 496 352L464 352zM336 272L336 304C336 312.8 343.2 320 352 320L384 320C392.8 320 400 312.8 400 304L400 272C400 263.2 392.8 256 384 256L352 256C343.2 256 336 263.2 336 272zM144 256C135.2 256 128 263.2 128 272L128 304C128 312.8 135.2 320 144 320L176 320C184.8 320 192 312.8 192 304L192 272C192 263.2 184.8 256 176 256L144 256zM336 368L336 400C336 408.8 343.2 416 352 416L384 416C392.8 416 400 408.8 400 400L400 368C400 359.2 392.8 352 384 352L352 352C343.2 352 336 359.2 336 368zM144 352C135.2 352 128 359.2 128 368L128 400C128 408.8 135.2 416 144 416L176 416C184.8 416 192 408.8 192 400L192 368C192 359.2 184.8 352 176 352L144 352z"/></svg>';
const townSVG = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640" width="24" height="24"><!--!Font Awesome Pro v7.2.0 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license (Commercial License) Copyright 2026 Fonticons, Inc.--><path opacity=".4" fill="white" d="M176 128L176 512C176 520.8 183.2 528 192 528L272 528L272 448C272 430.3 286.3 416 304 416L336 416C353.7 416 368 430.3 368 448L368 528L448 528C456.8 528 464 520.8 464 512L464 128C464 119.2 456.8 112 448 112L192 112C183.2 112 176 119.2 176 128zM224 176C224 167.2 231.2 160 240 160L272 160C280.8 160 288 167.2 288 176L288 208C288 216.8 280.8 224 272 224L240 224C231.2 224 224 216.8 224 208L224 176zM224 304C224 295.2 231.2 288 240 288L272 288C280.8 288 288 295.2 288 304L288 336C288 344.8 280.8 352 272 352L240 352C231.2 352 224 344.8 224 336L224 304zM352 176C352 167.2 359.2 160 368 160L400 160C408.8 160 416 167.2 416 176L416 208C416 216.8 408.8 224 400 224L368 224C359.2 224 352 216.8 352 208L352 176zM352 304C352 295.2 359.2 288 368 288L400 288C408.8 288 416 295.2 416 304L416 336C416 344.8 408.8 352 400 352L368 352C359.2 352 352 344.8 352 336L352 304z"/><path d="M192 112C183.2 112 176 119.2 176 128L176 512C176 520.8 183.2 528 192 528L272 528L272 448C272 430.3 286.3 416 304 416L336 416C353.7 416 368 430.3 368 448L368 528L448 528C456.8 528 464 520.8 464 512L464 128C464 119.2 456.8 112 448 112L192 112zM128 128C128 92.7 156.7 64 192 64L448 64C483.3 64 512 92.7 512 128L512 512C512 547.3 483.3 576 448 576L192 576C156.7 576 128 547.3 128 512L128 128zM224 176C224 167.2 231.2 160 240 160L272 160C280.8 160 288 167.2 288 176L288 208C288 216.8 280.8 224 272 224L240 224C231.2 224 224 216.8 224 208L224 176zM368 160L400 160C408.8 160 416 167.2 416 176L416 208C416 216.8 408.8 224 400 224L368 224C359.2 224 352 216.8 352 208L352 176C352 167.2 359.2 160 368 160zM224 304C224 295.2 231.2 288 240 288L272 288C280.8 288 288 295.2 288 304L288 336C288 344.8 280.8 352 272 352L240 352C231.2 352 224 344.8 224 336L224 304zM368 288L400 288C408.8 288 416 295.2 416 304L416 336C416 344.8 408.8 352 400 352L368 352C359.2 352 352 344.8 352 336L352 304C352 295.2 359.2 288 368 288z"/></svg>';

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
const cityIcon = new Icon({
  src: 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(citySVG),
  width: 24,
  height: 24,
  opacity: 0.7,
})
const townIcon = new Icon({
  src: 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(townSVG),
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
  major: cityIcon,
  minor: townIcon,
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