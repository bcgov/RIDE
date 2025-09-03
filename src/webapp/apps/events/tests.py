from django.test import TestCase

sample = '''{
  "type": "Incident",
  "start": {
    "location": [
      -120.69816026633748,
      50.09734902191738
    ],
    "name": "Hwy 97C",
    "alias": "Hwy 5A",
    "aliases": [
      "Hwy 5A",
      "Merritt-Princeton Hwy 5A"
    ],
    "nearby": {
      "options": [
        {
          "source": "BCGNWS",
          "name": "Merritt",
          "type": "City",
          "coordinates": [
            -120.788333334,
            50.1124999965
          ],
          "distance": 15.431,
          "direction": "E",
          "priority": 6,
          "phrase": "15.4km E of Merritt"
        },
        {
          "source": "BCGNWS",
          "name": "Kamloops",
          "type": "City",
          "coordinates": [
            -120.3394444447,
            50.6758333294
          ],
          "distance": 98.428,
          "direction": "S",
          "priority": 6,
          "phrase": "98.4km S of Kamloops"
        },
        {
          "source": "BCGNWS",
          "name": "Logan Lake",
          "type": "District Municipality (1)",
          "coordinates": [
            -120.8133333333,
            50.4944444401
          ],
          "distance": 63.998,
          "direction": "S",
          "priority": 5,
          "phrase": "64km S of Logan Lake"
        },
        {
          "source": "BCGNWS",
          "name": "Peachland",
          "type": "District Municipality (1)",
          "coordinates": [
            -119.7363888889,
            49.7738888844
          ],
          "distance": 108.016,
          "direction": "NW",
          "priority": 5,
          "phrase": "108km NW of Peachland"
        },
        {
          "source": "BCGNWS",
          "name": "Princeton",
          "type": "Town",
          "coordinates": [
            -120.5089678006,
            49.4590345969
          ],
          "distance": 82.293,
          "direction": "N",
          "priority": 4,
          "phrase": "82.3km N of Princeton"
        }
      ],
      "picked": [
        0,
        2
      ],
      "other": ""
    }
  },
  "end": {
    "location": "",
    "route": "",
    "name": None,
    "alias": "",
    "aliases": None,
    "nearby": {
      "options": None,
      "picked": [],
      "other": ""
    }
  },
  "route": [],
  "impacts": [
    "1",
    "4",
    "3"
  ],
  "restrictions": [],
  "conditions": [],
  "delay": {
    "amount": "20",
    "unit": "hours"
  },
  "timing": {
    "nextUpdate": "2025-08-22T13:04",
    "end": ""
  },
  "additional": "Additional Messaging",
  "direction": "Both",
  "severity": "Minor (30- minute delay)",
  "situation": "92"
}'''

e = {


  "type": "Incident",
  "start": {
    "location": [
      -120.69816026633748,
      50.09734902191738
    ],
    "name": "Hwy 97C",
    "alias": "Hwy 5A",
    "aliases": [
      "Hwy 5A",
      "Merritt-Princeton Hwy 5A"
    ],
    "nearby": {
      "options": [
        {
          "source": "BCGNWS",
          "name": "Merritt",
          "type": "City",
          "coordinates": [
            -120.788333334,
            50.1124999965
          ],
          "distance": 15.431,
          "direction": "E",
          "priority": 6,
          "phrase": "15.4km E of Merritt"
        },
        {
          "source": "BCGNWS",
          "name": "Kamloops",
          "type": "City",
          "coordinates": [
            -120.3394444447,
            50.6758333294
          ],
          "distance": 98.428,
          "direction": "S",
          "priority": 6,
          "phrase": "98.4km S of Kamloops"
        },
        {
          "source": "BCGNWS",
          "name": "Logan Lake",
          "type": "District Municipality (1)",
          "coordinates": [
            -120.8133333333,
            50.4944444401
          ],
          "distance": 63.998,
          "direction": "S",
          "priority": 5,
          "phrase": "64km S of Logan Lake"
        },
        {
          "source": "BCGNWS",
          "name": "Peachland",
          "type": "District Municipality (1)",
          "coordinates": [
            -119.7363888889,
            49.7738888844
          ],
          "distance": 108.016,
          "direction": "NW",
          "priority": 5,
          "phrase": "108km NW of Peachland"
        },
        {
          "source": "BCGNWS",
          "name": "Princeton",
          "type": "Town",
          "coordinates": [
            -120.5089678006,
            49.4590345969
          ],
          "distance": 82.293,
          "direction": "N",
          "priority": 4,
          "phrase": "82.3km N of Princeton"
        }
      ],
      "picked": [
        0,
        2
      ],
      "other": ""
    }
  },
  "end": {
    "location": "",
    "route": "",
    "name": None,
    "alias": "",
    "aliases": None,
    "nearby": {
      "options": None,
      "picked": [],
      "other": ""
    }
  },
  "route": [],
  "impacts": [
    "1",
    "4",
    "3"
  ],
  "restrictions": [],
  "conditions": [],
  "delay": {
    "amount": "20",
    "unit": "hours"
  },
  "timing": {
    "nextUpdate": "2025-08-22T13:04",
    "end": ""
  },
  "additional": "Additional Messaging",
  "direction": "Both",
  "severity": "Minor (30- minute delay)",
  "situation": "92"
}

e2 = {
    "id": None,
    "type": "Incident",
    "waypoints": [],
    "location": {
        "start": {
            "name": "Hwy 97C",
            "alias": "Hwy 5A",
            "aliases": [
                "Hwy 5A",
                "Merritt-Princeton Hwy 5A"
            ],
            "useAlias": True,
            "other": None,
            "useOther": False,
            "nearby": [
                {
                    "source": "BCGNWS",
                    "name": "Merritt",
                    "type": "City",
                    "coordinates": [
                        -120.788333334,
                        50.1124999965
                    ],
                    "distance": 12.093,
                    "direction": "SE",
                    "priority": 6,
                    "phrase": "12.1km SE of Merritt",
                    "include": True
                },
                {
                    "source": "BCGNWS",
                    "name": "Kamloops",
                    "type": "City",
                    "coordinates": [
                        -120.3394444447,
                        50.6758333294
                    ],
                    "distance": 95.091,
                    "direction": "S",
                    "priority": 6,
                    "phrase": "95.1km S of Kamloops",
                    "include": True
                },
                {
                    "source": "BCGNWS",
                    "name": "Logan Lake",
                    "type": "District Municipality (1)",
                    "coordinates": [
                        -120.8133333333,
                        50.4944444401
                    ],
                    "distance": 60.661,
                    "direction": "S",
                    "priority": 5,
                    "phrase": "60.7km S of Logan Lake"
                },
                {
                    "source": "BCGNWS",
                    "name": "Peachland",
                    "type": "District Municipality (1)",
                    "coordinates": [
                        -119.7363888889,
                        49.7738888844
                    ],
                    "distance": 106.196,
                    "direction": "NW",
                    "priority": 5,
                    "phrase": "106.2km NW of Peachland"
                },
                {
                    "source": "BCGNWS",
                    "name": "Summerland",
                    "type": "District Municipality (1)",
                    "coordinates": [
                        -119.6819444441,
                        49.6022222178
                    ],
                    "distance": 128.221,
                    "direction": "NW",
                    "priority": 5,
                    "phrase": "128.2km NW of Summerland"
                }
            ],
            "pending": False,
            "nearbyPending": False,
            "coords": [
                -13432996.733995885,
                6459540.839290078
            ],
            "DIGITAL_ROAD_ATLAS_LINE_ID": 334901,
            "FEATURE_TYPE": "Road",
            "HIGHWAY_EXIT_NUMBER": None,
            "HIGHWAY_ROUTE_NUMBER": "97C+5A",
            "SEGMENT_LENGTH_2D": 881.595,
            "SEGMENT_LENGTH_3D": None,
            "ROAD_NAME_ALIAS1": "Hwy 5A",
            "ROAD_NAME_ALIAS2": "Merritt-Princeton Hwy 5A",
            "ROAD_NAME_ALIAS3": None,
            "ROAD_NAME_ALIAS4": None,
            "ROAD_NAME_FULL": "Hwy 97C",
            "ROAD_SURFACE": "paved",
            "ROAD_CLASS": "freeway",
            "NUMBER_OF_LANES": 2,
            "DATA_CAPTURE_DATE": "2007-05-01Z",
            "FEATURE_CODE": None,
            "OBJECTID": 234219703,
            "SE_ANNO_CAD_DATA": None,
            "FEATURE_LENGTH_M": 881.5946
        },
        "end": {
            "name": None,
            "alias": None,
            "aliases": [],
            "useAlias": True,
            "other": None,
            "useOther": False,
            "nearby": []
        }
    },
    "details": {
        "direction": "Both directions",
        "severity": "Minor",
        "category": "Hazard",
        "situation": 305
    },
    "impacts": [
        {
            "id": 2,
            "label": "Assessment in progress"
        },
        {
            "id": 7,
            "label": "Closed"
        },
        {
            "id": 20,
            "label": "Expect delays"
        }
    ],
    "delays": {
        "amount": "20",
        "unit": "minutes"
    },
    "restrictions": [
        {
            "id": 4,
            "label": "Speed Limit",
            "text": "20km/h"
        }
    ],
    "conditions": [],
    "timing": {
        "nextUpdate": "2025-09-05T14:25",
        "nextUpdateTZ": "PST",
        "nextUpdateIsDefault": True,
        "endTime": None,
        "endTimeTZ": None
    },
    "additional": "",
    "external": {
        "url": ""
    }
}