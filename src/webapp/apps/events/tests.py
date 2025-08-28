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
    "name": null,
    "alias": "",
    "aliases": null,
    "nearby": {
      "options": null,
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