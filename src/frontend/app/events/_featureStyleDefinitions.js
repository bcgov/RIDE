import { Fill, Stroke, Style } from 'ol/style.js';

// Event icon styles
export const eventStyles = {
  // Line Segments
  segments: {
    closures: {
      static: [
        new Style({
          stroke: new Stroke({
            color: 'rgba(204, 0, 0, 0.7)',
            width: 8,
          }),
        }),
        new Style({
          stroke: new Stroke({
            color: 'rgba(255, 255, 255, 0.8)',
            width: 4,
          }),
        }),
      ],
      hover: [
        new Style({
          stroke: new Stroke({
            color: 'rgba(204, 0, 0, 1)',
            width: 10,
          }),
        }),
        new Style({
          stroke: new Stroke({
            color: 'rgba(255, 255, 255, 1)',
            width: 6,
          }),
        }),
      ],
      active: [
        new Style({
          stroke: new Stroke({
            color: 'rgba(204, 0, 0, 0.85)',
            width: 10,
          }),
        }),
        new Style({
          stroke: new Stroke({
            color: 'rgba(255, 255, 255, 0.85)',
            width: 6,
          }),
        }),
      ]
    },

    majorEvents: {
      static: new Style({
        stroke: new Stroke({
          color: 'rgba(204, 0, 0, 0.5)',
          width: 8,
        }),
      }),
      hover: new Style({
        stroke: new Stroke({
          color: 'rgba(204, 0, 0, 0.8)',
          width: 10,
          zIndex: 900,
        }),
      }),
      active: new Style({
        stroke: new Stroke({
          color: 'rgba(204, 0, 0, 0.65)',
          width: 10,
        }),
      })
    },

    conditions: {
      static: new Style({
        stroke: new Stroke({
          color: 'rgba(204, 0, 0, 1)',
          width: 8,
        }),
      }),
      hover: new Style({
        stroke: new Stroke({
          color: 'rgba(255, 0, 0, 1)',
          width: 10,
          zIndex: 300,
        }),
      }),
      active: new Style({
        stroke: new Stroke({
          color: 'rgba(255, 0, 0, 0.9)',
          width: 10,
        }),
      })
    },

    roadConditions: {
      static: new Style({
        stroke: new Stroke({
          color: 'rgba(100, 74, 10, 0.5)',
          width: 2,
        }),
        fill: new Fill({ color: 'rgba(255,181,0,0.1)' }),
      }),
      hover: new Style({
        stroke: new Stroke({
          color: 'rgba(100, 74, 10, 0.75)',
          width: 3,
        }),
        fill: new Fill({ color: 'rgba(255, 181, 0, 0.35)' }),
      }),
      active: new Style({
        stroke: new Stroke({
          color: 'rgba(100, 74, 10, 1)',
          width: 3,
        }),
        fill: new Fill({ color: 'rgba(255, 181, 0, 0.25)' }),
      }),
    },

    chainUps: {
      static: new Style({
        stroke: new Stroke({
          color: 'rgba(45, 45, 45, 0.75)',
          width: 2,
          lineDash: [6, 5],
        }),
        fill: new Fill({ color: 'rgba(246, 226, 75, 0.15)' }),
      }),
      hover: new Style({
        stroke: new Stroke({
          color: 'rgba(45, 45, 45, 0.75)',
          width: 3,
          lineDash: [6, 5],
        }),
        fill: new Fill({ color: 'rgba(255, 241, 133, 0.35)' }),
      }),
      active: new Style({
        stroke: new Stroke({
          color: 'rgba(45, 45, 45, 1)',
          width: 3,
          lineDash: [6, 5],
        }),
        fill: new Fill({ color: 'rgba(246, 226, 75, 0.25)' }),
      }),
    },

    minorEvents: {
      static: new Style({
        stroke: new Stroke({
          color: 'rgba(232 ,192 ,97, 0.5)',
          width: 8,
        }),
      }),
      hover: new Style({
        stroke: new Stroke({
          color: 'rgba(232 ,192 ,97, 0.75)',
          width: 10,
          zIndex: 300,
        }),
      }),
      active: new Style({
        stroke: new Stroke({
          color: 'rgba(252 ,186 ,25, 0.9)',
          width: 10,
        }),
      })
    },

    futureEvents: {
      static: new Style({
        stroke: new Stroke({
          color: 'rgba(144 ,164 ,190, 0)',
          width: 8,
        }),
      }),
      hover: new Style({
        stroke: new Stroke({
          color: 'rgba(232 ,192 ,97, 0.75)',
          width: 10,
          zIndex: 300,
        }),
      }),
      active: new Style({
        stroke: new Stroke({
          color: 'rgba(252 ,186 ,25, 0.9)',
          width: 10,
        }),
      })
    },
  },

  polygon: [
    {
      'stroke-color': ['get', 'strokeColor'],
      'stroke-width': ['get', 'strokeWidth'],
      'stroke-line-dash': [ 6, 3 ],
      'stroke-offset': ['get', 'strokeOffset'],
      'stroke-miter-limit': 10,
      'stroke-line-cap': 'butt',
      'stroke-line-join': 'miter',
      'stroke-line-dash-offset': 0,
    }, {
      'fill-color': ['get', 'fillColor'],
    }
  ],
};

// Route styles
export const routeStyles = {
  static: [
    new Style({
      stroke: new Stroke({
        color: 'rgba(85, 149, 217, 1)',
        width: 6,
      }),
      zIndex: 6
    }),
    new Style({
      stroke: new Stroke({
        color: 'rgba(216, 234, 253, 1)',
        width: 4,
      }),
      zIndex: 6
    }),
  ],
  hover: [
    new Style({
      stroke: new Stroke({
        color: 'rgba(168, 208, 251, 1)',
        width: 6,
      }),
      zIndex: 8
    }),
    new Style({
      stroke: new Stroke({
        color: 'rgba(83, 134, 237, 1)',
        width: 4,
      }),
      zIndex: 8
    }),
  ],
  active: [
    new Style({
      stroke: new Stroke({
        color: 'rgba(85, 149, 217, 1)',
        width: 6,
      }),
      zIndex: 7
    }),
    new Style({
      stroke: new Stroke({
        color: 'rgba(30, 83, 167, 1)',
        width: 4,
      }),
      zIndex: 7
    }),
  ],
};
