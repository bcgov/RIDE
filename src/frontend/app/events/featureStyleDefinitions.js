import { Fill, Icon, Stroke, Style } from 'ol/style.js';

// Static assets
// Cameras
import cameraIconActive from '../../public/images/mapIcons/camera-active.png';
import cameraIconHover from '../../public/images/mapIcons/camera-hover.png';
import cameraIconStatic from '../../public/images/mapIcons/camera-static.png';
import cameraIconHoverUnread from '../../public/images/mapIcons/camera-hover-unread.png';
import cameraIconStaticUnread from '../../public/images/mapIcons/camera-static-unread.png';

// Ferries
import ferryIconActive from '../../public/images/mapIcons/ferry-active.png';
import ferryIconHover from '../../public/images/mapIcons/ferry-hover.png';
import ferryIconStatic from '../../public/images/mapIcons/ferry-static.png';

// Coastal Ferries
import coastalFerryIconActive from '../../public/images/mapIcons/coastal-ferry-active.png';
import coastalFerryIconHover from '../../public/images/mapIcons/coastal-ferry-hover.png';
import coastalFerryIconStatic from '../../public/images/mapIcons/coastal-ferry-static.png';

// Road Weather
import roadWeatherIconActive from '../../public/images/mapIcons/road-weather-active.png';
import roadWeatherIconHover from '../../public/images/mapIcons/road-weather-hover.png';
import roadWeatherIconStatic from '../../public/images/mapIcons/road-weather-static.png';

// Regional Weather
import regionalWeatherIconActive from '../../public/images/mapIcons/regional-weather-active.png';
import regionalWeatherIconHover from '../../public/images/mapIcons/regional-weather-hover.png';
import regionalWeatherIconStatic from '../../public/images/mapIcons/regional-weather-static.png';

// Regional Weather with warning
import regionalWeatherWarningIconActive from '../../public/images/mapIcons/regional-weather-advisory-active.png';
import regionalWeatherWarningIconHover from '../../public/images/mapIcons/regional-weather-advisory-hover.png';
import regionalWeatherWarningIconStatic from '../../public/images/mapIcons/regional-weather-advisory-static.png';

// High Elevation Forecast
import hefIconActive from '../../public/images/mapIcons/elevation-active.png';
import hefIconHover from '../../public/images/mapIcons/elevation-hover.png';
import hefIconStatic from '../../public/images/mapIcons/elevation-static.png';

// Border Crossings
import borderIconActive from '../../public/images/mapIcons/border-active.png';
import borderIconHover from '../../public/images/mapIcons/border-hover.png';
import borderIconStatic from '../../public/images/mapIcons/border-static.png';

// Wildfires
import wildfireIconActive from '../../public/images/mapIcons/wildfire/wildfires-active.png';
import wildfireIconHover from '../../public/images/mapIcons/wildfire/wildfires-hover.png';
import wildfireIconStatic from '../../public/images/mapIcons/wildfire/wildfires-static.png';
import wildfireHoverUnread from '../../public/images/mapIcons/wildfire/wildfires-hover-unread.png';
import wildfireStaticUnread from '../../public/images/mapIcons/wildfire/wildfires-static-unread.png';

// Rest Stops
import restStopIconActive from '../../public/images/mapIcons/restarea-open-active.png';
import restStopIconHover from '../../public/images/mapIcons/restarea-open-hover.png';
import restStopIconStatic from '../../public/images/mapIcons/restarea-open-static.png';

import restStopIconActiveClosed from '../../public/images/mapIcons/restarea-closed-active.png';
import restStopIconHoverClosed from '../../public/images/mapIcons/restarea-closed-hover.png';
import restStopIconStaticClosed from '../../public/images/mapIcons/restarea-closed-static.png';

import restStopIconActiveTruck from '../../public/images/mapIcons/restarea-truck-open-active.png';
import restStopIconHoverTruck from '../../public/images/mapIcons/restarea-truck-open-hover.png';
import restStopIconStaticTruck from '../../public/images/mapIcons/restarea-truck-open-static.png';

import restStopIconActiveTruckClosed from '../../public/images/mapIcons/restarea-truck-closed-active.png';
import restStopIconHoverTruckClosed from '../../public/images/mapIcons/restarea-truck-closed-hover.png';
import restStopIconStaticTruckClosed from '../../public/images/mapIcons/restarea-truck-closed-static.png';

// Events
// Closures
import closuresActiveIcon from '../../public/images/mapIcons/closure-active.png';
import closuresHoverIcon from '../../public/images/mapIcons/closure-hover.png';
import closuresHoverUnreadIcon from '../../public/images/mapIcons/closure-hover-unread.png';
import closuresStaticIcon from '../../public/images/mapIcons/closure-static.png';
import closuresStaticUnreadIcon from '../../public/images/mapIcons/closure-static-unread.png';
import futureClosureActiveIcon from '../../public/images/mapIcons/future-closure-active.png';
import futureClosureHoverIcon from '../../public/images/mapIcons/future-closure-hover.png';
import futureClosureHoverUnreadIcon from '../../public/images/mapIcons/future-closure-hover-unread.png';
import futureClosureStaticIcon from '../../public/images/mapIcons/future-closure-static.png';
import futureClosureStaticUnreadIcon from '../../public/images/mapIcons/future-closure-static-unread.png';

// Future Events
import futureEventsMajorActiveIcon from '../../public/images/mapIcons/future-event-major-active.png';
import futureEventsMajorHoverIcon from '../../public/images/mapIcons/future-event-major-hover.png';
import futureEventsMajorHoverUnreadIcon from '../../public/images/mapIcons/future-event-major-hover-unread.png';
import futureEventsMajorStaticIcon from '../../public/images/mapIcons/future-event-major-static.png';
import futureEventsMajorStaticUnreadIcon from '../../public/images/mapIcons/future-event-major-static-unread.png';
import futureEventsActiveIcon from '../../public/images/mapIcons/future-event-minor-active.png';
import futureEventsHoverIcon from '../../public/images/mapIcons/future-event-minor-hover.png';
import futureEventsHoverUnreadIcon from '../../public/images/mapIcons/future-event-minor-hover-unread.png';
import futureEventsStaticIcon from '../../public/images/mapIcons/future-event-minor-static.png';
import futureEventsStaticUnreadIcon from '../../public/images/mapIcons/future-event-minor-static-unread.png';

// Road Conditions
import roadConditionsActiveIcon from '../../public/images/mapIcons/road-condition-active.png';
import roadConditionsHoverIcon from '../../public/images/mapIcons/road-condition-hover.png';
import roadConditionsHoverUnreadIcon from '../../public/images/mapIcons/road-condition-hover-unread.png';
import roadConditionsStaticIcon from '../../public/images/mapIcons/road-condition-static.png';
import roadConditionsStaticUnreadIcon from '../../public/images/mapIcons/road-condition-static-unread.png';

// Chain Ups
import chainUpsActiveIcon from '../../public/images/mapIcons/chain-ups-active.png';
import chainUpsHoverIcon from '../../public/images/mapIcons/chain-ups-hover.png';
import chainUpsHoverUnreadIcon from '../../public/images/mapIcons/chain-ups-hover-unread.png';
import chainUpsStaticIcon from '../../public/images/mapIcons/chain-ups-static.png';
import chainUpsStaticUnreadIcon from '../../public/images/mapIcons/chain-ups-static-unread.png';

// Constructions
import constructionsMajorActiveIcon from '../../public/images/mapIcons/delay-major-active.png';
import constructionsMajorHoverIcon from '../../public/images/mapIcons/delay-major-hover.png';
import constructionsMajorHoverUnreadIcon from '../../public/images/mapIcons/delay-major-hover-unread.png';
import constructionsMajorStaticIcon from '../../public/images/mapIcons/delay-major-static.png';
import constructionsMajorStaticUnreadIcon from '../../public/images/mapIcons/delay-major-static-unread.png';
import constructionsActiveIcon from '../../public/images/mapIcons/delay-minor-active.png';
import constructionsHoverIcon from '../../public/images/mapIcons/delay-minor-hover.png';
import constructionsHoverUnreadIcon from '../../public/images/mapIcons/delay-minor-hover-unread.png';
import constructionsStaticIcon from '../../public/images/mapIcons/delay-minor-static.png';
import constructionsStaticUnreadIcon from '../../public/images/mapIcons/delay-minor-static-unread.png';

// Generic Events
import genericDelaysMajorActiveIcon from '../../public/images/mapIcons/incident-major-active.png';
import genericDelaysMajorHoverIcon from '../../public/images/mapIcons/incident-major-hover.png';
import genericDelaysMajorHoverUnreadIcon from '../../public/images/mapIcons/incident-major-hover-unread.png';
import genericDelaysMajorStaticIcon from '../../public/images/mapIcons/incident-major-static.png';
import genericDelaysMajorStaticUnreadIcon from '../../public/images/mapIcons/incident-major-static-unread.png';
import genericDelaysActiveIcon from '../../public/images/mapIcons/incident-minor-active.png';
import genericDelaysHoverIcon from '../../public/images/mapIcons/incident-minor-hover.png';
import genericDelaysHoverUnreadIcon from '../../public/images/mapIcons/incident-minor-hover-unread.png';
import genericDelaysStaticIcon from '../../public/images/mapIcons/incident-minor-static.png';
import genericDelaysStaticUnreadIcon from '../../public/images/mapIcons/incident-minor-static-unread.png';

// Map advisory styles
export const advisoryStyles = {
  static: new Style({
    stroke: new Stroke({
      color: 'rgba(242, 76, 39)',
      width: 2,
      lineDash: [5,5]
    }),
    fill: new Fill({
      color: 'rgba(252, 214, 192, 0.25)',
    }),
  }),
  hover: new Style({
    stroke: new Stroke({
      color: 'rgba(248, 165, 147)',
      width: 2,
      lineDash: [5,5]
    }),
    fill: new Fill({
      color: 'rgba(252, 214, 192, 0.65)',
    }),
  }),
  active: new Style({
    stroke: new Stroke({
      color: 'rgba(242, 76, 39)',
      width: 2,
      lineDash: [5,5]
    }),
    fill: new Fill({
      color: 'rgba(252, 214, 192, 0.65)',
    }),
  })
};

// Camera icon styles
export const cameraStyles = {
  static: new Style({
    image: new Icon({
      scale: 0.25,
      src: cameraIconStatic,
    }),
  }),
  hover: new Style({
    image: new Icon({
      scale: 0.25,
      src: cameraIconHover,
    }),
  }),
  active: new Style({
    image: new Icon({
      scale: 0.25,
      src: cameraIconActive,
    }),
  }),
};

export const unreadCameraStyles = {
  static: new Style({
    image: new Icon({
      scale: 0.25,
      src: cameraIconStaticUnread,
    }),
  }),
  hover: new Style({
    image: new Icon({
      scale: 0.25,
      src: cameraIconHoverUnread,
    }),
  }),
  active: new Style({
    image: new Icon({
      scale: 0.25,
      src: cameraIconActive,
    }),
  }),
};

// Ferry icon styles
export const ferryStyles = {
  static: new Style({
    image: new Icon({
      scale: 0.25,
      src: ferryIconStatic,
    }),
  }),
  hover: new Style({
    image: new Icon({
      scale: 0.25,
      src: ferryIconHover,
    }),
  }),
  active: new Style({
    image: new Icon({
      scale: 0.25,
      src: ferryIconActive,
    }),
  }),
};

export const coastalFerryStyles = {
  static: new Style({
    image: new Icon({
      scale: 0.25,
      src: coastalFerryIconStatic,
    }),
  }),
  hover: new Style({
    image: new Icon({
      scale: 0.25,
      src: coastalFerryIconHover,
    }),
  }),
  active: new Style({
    image: new Icon({
      scale: 0.25,
      src: coastalFerryIconActive,
    }),
  }),
};

// Weather icon styles
export const roadWeatherStyles = {
  static: new Style({
    image: new Icon({
      scale: 0.25,
      src: roadWeatherIconStatic,
    }),
  }),
  hover: new Style({
    image: new Icon({
      scale: 0.25,
      src: roadWeatherIconHover,
    }),
  }),
  active: new Style({
    image: new Icon({
      scale: 0.25,
      src: roadWeatherIconActive,
    }),
  }),
};

// Regional weather icon styles
export const regionalStyles = {
  static: new Style({
    image: new Icon({
      scale: 0.25,
      src: regionalWeatherIconStatic,
    }),
  }),
  hover: new Style({
    image: new Icon({
      scale: 0.25,
      src: regionalWeatherIconHover,
    }),
  }),
  active: new Style({
    image: new Icon({
      scale: 0.25,
      src: regionalWeatherIconActive,
    }),
  }),
};

export const regionalWarningStyles = {
  static: new Style({
    image: new Icon({
      scale: 0.25,
      src: regionalWeatherWarningIconStatic,
    }),
  }),
  hover: new Style({
    image: new Icon({
      scale: 0.25,
      src: regionalWeatherWarningIconHover,
    }),
  }),
  active: new Style({
    image: new Icon({
      scale: 0.25,
      src: regionalWeatherWarningIconActive,
    }),
  }),
};

// High elevation forecase styles
export const hefStyles = {
  static: new Style({
    image: new Icon({
      scale: 0.25,
      src: hefIconStatic,
    }),
  }),
  hover: new Style({
    image: new Icon({
      scale: 0.25,
      src: hefIconHover,
    }),
  }),
  active: new Style({
    image: new Icon({
      scale: 0.25,
      src: hefIconActive,
    }),
  }),
};

// Rest Stop icon styles
export const restStopStyles = {
  static: new Style({
    image: new Icon({
      scale: 0.25,
      src: restStopIconStatic,
    }),
  }),
  hover: new Style({
    image: new Icon({
      scale: 0.25,
      src: restStopIconHover,
    }),
  }),
  active: new Style({
    image: new Icon({
      scale: 0.25,
      src: restStopIconActive,
    }),
  }),
};

export const restStopTruckStyles = {
  static: new Style({
    image: new Icon({
      scale: 0.25,
      src: restStopIconStaticTruck,
    }),
  }),
  hover: new Style({
    image: new Icon({
      scale: 0.25,
      src: restStopIconHoverTruck,
    }),
  }),
  active: new Style({
    image: new Icon({
      scale: 0.25,
      src: restStopIconActiveTruck,
    }),
  }),
};

export const restStopClosedStyles = {
  static: new Style({
    image: new Icon({
      scale: 0.25,
      src: restStopIconStaticClosed,
    }),
  }),
  hover: new Style({
    image: new Icon({
      scale: 0.25,
      src: restStopIconHoverClosed,
    }),
  }),
  active: new Style({
    image: new Icon({
      scale: 0.25,
      src: restStopIconActiveClosed,
    }),
  }),
};

export const restStopTruckClosedStyles = {
  static: new Style({
    image: new Icon({
      scale: 0.25,
      src: restStopIconStaticTruckClosed,
    }),
  }),
  hover: new Style({
    image: new Icon({
      scale: 0.25,
      src: restStopIconHoverTruckClosed,
    }),
  }),
  active: new Style({
    image: new Icon({
      scale: 0.25,
      src: restStopIconActiveTruckClosed,
    }),
  }),
};

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

  // Closures
  closures: {
    static: new Style({
      image: new Icon({
        scale: 0.25,
        src: closuresStaticIcon,
      }),
    }),

    hover: new Style({
      image: new Icon({
        scale: 0.25,
        src: closuresHoverIcon,
      }),
    }),

    active: new Style({
      image: new Icon({
        scale: 0.25,
        src: closuresActiveIcon,
      }),
    }),
  },

  closures_unread: {
    static: new Style({
      image: new Icon({
        scale: 0.25,
        src: closuresStaticUnreadIcon,
      }),
    }),

    hover: new Style({
      image: new Icon({
        scale: 0.25,
        src: closuresHoverUnreadIcon,
      }),
    }),

    active: new Style({
      image: new Icon({
        scale: 0.25,
        src: closuresActiveIcon,
      }),
    }),
  },

  // Future events
  major_future_events: {
    static: new Style({
      image: new Icon({
        scale: 0.25,
        src: futureEventsMajorStaticIcon,
      }),
    }),

    hover: new Style({
      image: new Icon({
        scale: 0.25,
        src: futureEventsMajorHoverIcon,
      }),
    }),

    active: new Style({
      image: new Icon({
        scale: 0.25,
        src: futureEventsMajorActiveIcon,
      }),
    }),
  },

  major_future_events_unread: {
    static: new Style({
      image: new Icon({
        scale: 0.25,
        src: futureEventsMajorStaticUnreadIcon,
      }),
    }),

    hover: new Style({
      image: new Icon({
        scale: 0.25,
        src: futureEventsMajorHoverUnreadIcon,
      }),
    }),

    active: new Style({
      image: new Icon({
        scale: 0.25,
        src: futureEventsMajorActiveIcon,
      }),
    }),
  },

  future_events: {
    static: new Style({
      image: new Icon({
        scale: 0.25,
        src: futureEventsStaticIcon,
      }),
    }),

    hover: new Style({
      image: new Icon({
        scale: 0.25,
        src: futureEventsHoverIcon,
      }),
    }),

    active: new Style({
      image: new Icon({
        scale: 0.25,
        src: futureEventsActiveIcon,
      }),
    }),
  },

  future_events_unread: {
    static: new Style({
      image: new Icon({
        scale: 0.25,
        src: futureEventsStaticUnreadIcon,
      }),
    }),

    hover: new Style({
      image: new Icon({
        scale: 0.25,
        src: futureEventsHoverUnreadIcon,
      }),
    }),

    active: new Style({
      image: new Icon({
        scale: 0.25,
        src: futureEventsActiveIcon,
      }),
    }),
  },

  // Road Conditions
  road_conditions: {
    static: new Style({
      image: new Icon({
        scale: 0.25,
        src: roadConditionsStaticIcon,
      }),
    }),

    hover: new Style({
      image: new Icon({
        scale: 0.25,
        src: roadConditionsHoverIcon,
      }),
    }),

    active: new Style({
      image: new Icon({
        scale: 0.25,
        src: roadConditionsActiveIcon,
      }),
    }),
  },

  road_conditions_unread: {
    static: new Style({
      image: new Icon({
        scale: 0.25,
        src: roadConditionsStaticUnreadIcon,
      }),
    }),

    hover: new Style({
      image: new Icon({
        scale: 0.25,
        src: roadConditionsHoverUnreadIcon,
      }),
    }),

    active: new Style({
      image: new Icon({
        scale: 0.25,
        src: roadConditionsActiveIcon,
      }),
    }),
  },

  // Chain Ups
  chain_ups: {
    static: new Style({
      image: new Icon({
        scale: 0.25,
        src: chainUpsStaticIcon,
      }),
    }),

    hover: new Style({
      image: new Icon({
        scale: 0.25,
        src: chainUpsHoverIcon,
      }),
    }),

    active: new Style({
      image: new Icon({
        scale: 0.25,
        src: chainUpsActiveIcon,
      }),
    }),
  },

  chain_ups_unread: {
    static: new Style({
      image: new Icon({
        scale: 0.25,
        src: chainUpsStaticUnreadIcon,
      }),
    }),

    hover: new Style({
      image: new Icon({
        scale: 0.25,
        src: chainUpsHoverUnreadIcon,
      }),
    }),

    active: new Style({
      image: new Icon({
        scale: 0.25,
        src: chainUpsActiveIcon,
      }),
    }),
  },

  // Constructions
  major_constructions: {
    static: new Style({
      image: new Icon({
        scale: 0.25,
        src: constructionsMajorStaticIcon,
      }),
    }),

    hover: new Style({
      image: new Icon({
        scale: 0.25,
        src: constructionsMajorHoverIcon,
      }),
    }),

    active: new Style({
      image: new Icon({
        scale: 0.25,
        src: constructionsMajorActiveIcon,
      }),
    }),
  },

  major_constructions_unread: {
    static: new Style({
      image: new Icon({
        scale: 0.25,
        src: constructionsMajorStaticUnreadIcon,
      }),
    }),

    hover: new Style({
      image: new Icon({
        scale: 0.25,
        src: constructionsMajorHoverUnreadIcon,
      }),
    }),

    active: new Style({
      image: new Icon({
        scale: 0.25,
        src: constructionsMajorActiveIcon,
      }),
    }),
  },

  constructions: {
    static: new Style({
      image: new Icon({
        scale: 0.25,
        src: constructionsStaticIcon,
      }),
    }),

    hover: new Style({
      image: new Icon({
        scale: 0.25,
        src: constructionsHoverIcon,
      }),
    }),

    active: new Style({
      image: new Icon({
        scale: 0.25,
        src: constructionsActiveIcon,
      }),
    }),
  },

  constructions_unread: {
    static: new Style({
      image: new Icon({
        scale: 0.25,
        src: constructionsStaticUnreadIcon,
      }),
    }),

    hover: new Style({
      image: new Icon({
        scale: 0.25,
        src: constructionsHoverUnreadIcon,
      }),
    }),

    active: new Style({
      image: new Icon({
        scale: 0.25,
        src: constructionsActiveIcon,
      }),
    }),
  },

  // Future closures
  future_closures: {
    static: new Style({
      image: new Icon({
        scale: 0.25,
        src: futureClosureStaticIcon,
      }),
    }),

    hover: new Style({
      image: new Icon({
        scale: 0.25,
        src: futureClosureHoverIcon,
      }),
    }),

    active: new Style({
      image: new Icon({
        scale: 0.25,
        src: futureClosureActiveIcon,
      }),
    }),
  },

  future_closures_unread: {
    static: new Style({
      image: new Icon({
        scale: 0.25,
        src: futureClosureStaticUnreadIcon,
      }),
    }),

    hover: new Style({
      image: new Icon({
        scale: 0.25,
        src: futureClosureHoverUnreadIcon,
      }),
    }),

    active: new Style({
      image: new Icon({
        scale: 0.25,
        src: futureClosureActiveIcon,
      }),
    }),
  },

  // Generic delay
  major_generic_delays: {
    static: new Style({
      image: new Icon({
        scale: 0.25,
        src: genericDelaysMajorStaticIcon,
      }),
    }),

    hover: new Style({
      image: new Icon({
        scale: 0.25,
        src: genericDelaysMajorHoverIcon,
      }),
    }),

    active: new Style({
      image: new Icon({
        scale: 0.25,
        src: genericDelaysMajorActiveIcon,
      }),
    }),
  },

  major_generic_delays_unread: {
    static: new Style({
      image: new Icon({
        scale: 0.25,
        src: genericDelaysMajorStaticUnreadIcon,
      }),
    }),

    hover: new Style({
      image: new Icon({
        scale: 0.25,
        src: genericDelaysMajorHoverUnreadIcon,
      }),
    }),

    active: new Style({
      image: new Icon({
        scale: 0.25,
        src: genericDelaysMajorActiveIcon,
      }),
    }),
  },

  generic_delays: {
    static: new Style({
      image: new Icon({
        scale: 0.25,
        src: genericDelaysStaticIcon,
      }),
    }),

    hover: new Style({
      image: new Icon({
        scale: 0.25,
        src: genericDelaysHoverIcon,
      }),
    }),

    active: new Style({
      image: new Icon({
        scale: 0.25,
        src: genericDelaysActiveIcon,
      }),
    }),
  },

  generic_delays_unread: {
    static: new Style({
      image: new Icon({
        scale: 0.25,
        src: genericDelaysStaticUnreadIcon,
      }),
    }),

    hover: new Style({
      image: new Icon({
        scale: 0.25,
        src: genericDelaysHoverUnreadIcon,
      }),
    }),

    active: new Style({
      image: new Icon({
        scale: 0.25,
        src: genericDelaysActiveIcon,
      }),
    }),
  }
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

// Border crossing styles
export const borderCrossingStyles = {
  static: new Style({
    image: new Icon({
      scale: 0.25,
      src: borderIconStatic,
    }),
  }),
  hover: new Style({
    image: new Icon({
      scale: 0.25,
      src: borderIconHover,
    }),
  }),
  active: new Style({
    image: new Icon({
      scale: 0.25,
      src: borderIconActive,
    }),
  }),
};


// Wildfire styles
export const wildfireAreaStyles = {
  static: new Style({
    stroke: new Stroke({
      color: 'rgba(242, 76, 39)',
      width: 2,
      lineDash: [5,5]
    }),
    fill: new Fill({
      color: 'rgba(210, 55, 55, 0.20)',
    }),
  }),
  hover: new Style({
    stroke: new Stroke({
      color: 'rgba(248, 165, 147)',
      width: 2,
      lineDash: [5,5]
    }),
    fill: new Fill({
      color: 'rgba(210, 55, 55, 0.12)',
    }),
  }),
  active: new Style({
    stroke: new Stroke({
      color: 'rgba(242, 76, 39)',
      width: 2,
      lineDash: [5,5]
    }),
    fill: new Fill({
      color: 'rgba(210, 55, 55, 0.28)',
    }),
  })
};

export const wildfireCentroidStyles = {
  static: new Style({
    image: new Icon({
      scale: 0.25,
      src: wildfireIconStatic,
    }),
  }),
  hover: new Style({
    image: new Icon({
      scale: 0.25,
      src: wildfireIconHover,
    }),
  }),
  active: new Style({
    image: new Icon({
      scale: 0.25,
      src: wildfireIconActive,
    }),
  }),
};

export const wildfireUnreadStyles = {
  static: new Style({
    image: new Icon({
      scale: 0.25,
      src: wildfireStaticUnread,
    }),
  }),
  hover: new Style({
    image: new Icon({
      scale: 0.25,
      src: wildfireHoverUnread,
    }),
  })
};
