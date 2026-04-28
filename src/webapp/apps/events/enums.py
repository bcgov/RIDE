from django.db import models


class EventType(models.TextChoices):
    CONSTRUCTION = 'CONSTRUCTION', 'Construction'
    INCIDENT = 'INCIDENT', 'Incident'
    SPECIAL_EVENT = 'SPECIAL_EVENT', 'Special event'
    WEATHER_CONDITION = 'WEATHER_CONDITION', 'Weather condition'
    ROAD_CONDITION = 'ROAD_CONDITION', 'Road condition'
    CHAIN_UP = 'CHAIN_UP', 'Chain-up'


class EventSubtype(models.TextChoices):
    ALMOST_IMPASSABLE =   'ALMOST_IMPASSABLE', 'Almost impassable',
    FIRE =                'FIRE', 'Fire'
    HAZARD =              'HAZARD', 'Hazard'
    ROAD_CONSTRUCTION =   'ROAD_CONSTRUCTION', 'Road construction'
    ROAD_MAINTENANCE =    'ROAD_MAINTENANCE', 'Road maintenance'
    PARTLY_ICY =          'PARTLY_ICY', 'Partly icy'
    ICE_COVERED =         'ICE_COVERED', 'Ice covered'
    SNOW_PACKED =         'SNOW_PACKED', 'Snow packed'
    PARTLY_SNOW_PACKED =  'PARTLY_SNOW_PACKED', 'Partly snow packed'
    MUD =                 'MUD', 'Mud'
    PLANNED_EVENT =       'PLANNED_EVENT', 'Planned event'
    POOR_VISIBILITY =     'POOR_VISIBILITY', 'Poor visibility'
    PARTLY_SNOW_COVERED = 'PARTLY_SNOW_COVERED', 'Partly snow packed'
    DRIFTING_SNOW =       'DRIFTING_SNOW', 'Drifting snow',
    PASSABLE_WITH_CARE =  'PASSABLE_WITH_CARE', 'Passable with care'


class Status(models.TextChoices):
    ACTIVE = 'ACTIVE'
    INACTIVE = 'INACTIVE'
    OPEN511_ARCHIVED = 'ARCHIVED'


class Severity(models.TextChoices):
    CLOSURE = 'CLOSURE'
    MINOR = 'MINOR'
    MAJOR = 'MAJOR'


PHRASES_LOOKUP = {
    2: 'Road condition',
    4: 'Planned service interruption',
    7: 'Special event',
    9: 'Possible service interruptions',
    10: 'Blasting',
    11: 'Bridge construction',
    12: 'Road construction',
    13: 'Avalanche control activities',
    15: 'Bridge maintenance',
    19: 'Construction work',
    21: 'Garbage pick up',
    25: 'Line painting',
    28: 'New traffic signal',
    68: 'Night work',
    69: 'Paving operations',
    70: 'Pothole repair',
    71: 'Road maintenance',
    72: 'Vehicle collision',
    73: 'Unplanned service interruption',
    74: 'Delayed departure',
    76: 'Falling ice',
    77: 'Falling rock',
    78: 'Flooding',
    79: 'Hazardous materials spill',
    80: 'Hydro lines down',
    81: 'Police incident',
    82: 'Sailing wait at East Terminal',
    84: 'Avalanche',
    86: 'High avalanche hazard',
    87: 'Forest fire',
    88: 'Structural fire',
    89: 'Vehicle fire',
    90: 'Bridge closed',
    91: 'Bridge damage',
    92: 'Bridge wash out',
    93: 'Railway crossing incident',
    94: 'Rest area closed',
    95: 'Rock slide',
    96: 'Tree on road',
    97: 'Vehicle recovery',
    98: 'Vehicle stall',
    99: 'Washout',
    100: 'Water pooling',
    102: 'Wildlife advisory',
    103: 'Mudslide',
    104: 'Debris on road',
    105: 'Obstruction on roadway',
    106: 'Limited visibility',
    107: 'Traffic signal out',
    108: 'Material spill',
    109: 'Road sweeping',
    110: 'Roadside brushing',
    111: 'Rock scaling',
    112: 'Road seal coating',
    113: 'Snow deposit removal',
    114: 'Tree pruning',
    115: 'Utility work',
    116: 'Vehicle recovery',
    117: 'Traffic signal out',
    118: 'Additional service',
    144: 'Vehicle incident',
    146: 'Sailing wait at West Terminal',
    147: 'Sailing wait at North Terminal',
    148: 'Sailing wait at South Terminal',
    149: 'Sailing wait at North Bank',
    150: 'Sailing wait at South Bank',
    151: 'Sailing wait at East Side',
    152: 'Sailing wait at West Side',
    153: 'High traffic volume',
    156: 'Required maintenance',
    158: 'Replacement vessel',
    160: 'Safety inspection',
    161: 'Safety drills',
    164: 'High river current',
    165: 'Debris in water',
    168: 'Marine traffic',
    188: 'Grass fire',
    191: 'Mowing',
    192: 'Rocks on road',
    203: 'Multi-vehicle Incident',
    205: 'Ditch maintenance',
    218: 'State of emergency',
    224: 'Possible ferry delays',
    226: 'Rock slope stabilization',
    233: 'Adverse weather',
    234: 'Crewing issues',
    235: 'Freshet (flooding)',
    236: 'Seasonal shutdown',
    238: 'Safety drills',
    239: 'Required maintenance',
    240: 'Medical emergency',
    245: 'Electrical maintenance',
    251: 'Shoulder maintenance',
    252: '1 sailing wait',
    253: '2 sailing wait',
    254: '3 sailing wait',
    255: '4 sailing wait',
    256: '5-6 sailing wait',
    257: '> 6 sailing wait',
    258: 'Behind schedule 20 minutes',
    259: 'Behind schedule 30 minutes',
    261: 'Behind schedule 40 minutes',
    262: 'Behind schedule 50 minutes',
    263: 'Behind schedule 60-90 minutes',
    264: 'Behind schedule >90 minutes',
    265: 'Expect delay of 20 minutes',
    266: 'Expect delay of 30 minutes',
    267: 'Expect delay of 40 minutes',
    268: 'Expect delay of 50 minutes',
    269: 'Expect delay of 60-90 minutes',
    271: 'Ferry operating 24 hours a day',
    279: 'Avalanche control activities',
    280: 'Geotechnical investigation',
    281: 'Expect delay >90 minutes',
    282: 'Patching',
    283: 'Avalanche deposit removal',
    284: 'Crack sealing',
    285: 'Industrial traffic',
    287: 'Unplanned protest or special event',
    289: 'Mechanical issue',
    292: 'Avalanche deposit removal',
    295: 'Washrooms closed',
    296: 'Landslide',
    298: 'Wildfire',
    300: 'Winter operations',
    304: 'Safety inspection',
    305: 'Livestock on road',
}


EVENT_SUBTYPE_GROUPS = {
    'OBSTRUCTION': [
       'Debris on Road',
    ],
    'HAZARD': [
       'Bridge Wash Out',
       'Hydro Lines Down',
       'Frost Heaves',
       'Falling Ice',
       'Tree on Road',
       'Livestock on Road',
       'Wildlife on Road',
       'Falling Rock',
       'Flooded',
       'High Flood Warning',
       'Wash Out',
       'Rock Slide',
       'Hydro Line Down',
    ],
    'FIRE': [
       'Forest Fire',
       'Structural Fire',
       'Vehicle Fire',
    ],
    'MUD': [
       'Mud Slide',
       'Muddy Sections',
       'Muddy with Slippery Sections',
    ],
    'SIGNAL_LIGHT_FAILURE': [
       'Signal Light Failure',
       'Traffic Signal Failure',
    ],
    'AVALANCHE_HAZARD': [
       'Avalanche',
       'Avalanche Control',
       'High Avalanche Hazard',
    ],
    'ROAD_CONSTRUCTION': [
       'Bridge Construction',
       'Blasting',
       'Road Construction',
    ],
    'ROAD_MAINTENANCE': [
       'Bridge Maintenance',
       'Brushing',
       'Construction',
       'Ditching',
       'Winter Highway Maintenance',
       'Line Painting',
       'Maintenance',
       'Mowing',
       'Paving',
       'Rock Scaling',
       'Seal Coating',
       'Sweeping',
       'New Traffic Signal',
       'Night Work',
       'Paving Operations',
       'Pothole Repair',
       'Road Maintenance',
       'Road Sweeping',
       'Roadside Brushing',
       'Snow Deposit Removal',
       'Traffic Signal Out',
       'Tree Pruning',
       'Utility Works',
       'Electrical Maintenance',
    ],
    'PARTLY_ICY': [
       'Rain on Compact Snow',
       'Slippery Sections',
       'Slushy with Slippery Sections',
       'Snowing with Slippery Sections',
    ],
    'ICE_COVERED': [
       'Freezing Rain',
       'Black Ice',
       'Black Ice with Blowing Snow',
       'Compact Ice',
       'Freezing Rain',
       'Ice Fog',
       'Fog and Black Ice',
    ],
    'SNOW_PACKED': [
       'Sanded',
       'Plowing & Sanding',
       'Compact Snow',
       'Compact Snow with Slippery Sections',
       'Compact Snow with Slushy Sections',
    ],
    'SURFACE_WATER_HAZARD': [
       'Flooding',
       'Water Pooling',
    ],
    'POOR_VISIBILITY': [
       'Limited Visibility with Blowing Snow',
       'Limited Visibility with Fog',
       'Limited Visibility with Heavy Snowfall',
       'Limited Visibility with Smoke',
       'Fog Patches',
       'Heavy Snowfall',
       'Limited Visibility',
       'Smoke',
       'Dense Fog',
       'Dust Storm',
       'Blowing Snow',
    ],
    'SNOW_COVERED': [
       'Winter Driving Conditions',
    ],
    'PARTLY_SNOW_COVERED': [
       'Slushy Sections',
    ],
    'DRIFTING_SNOW': [
       'Drifting Snow',
    ],
    'HEAVY_DOWNPOUR': [
       'Heavy Rain',
       'Heavy Rain and Wind',
    ],
    'STRONG_WINDS': [
       'Strong Cross Winds',
       'High Winds',
    ],
    'SPILL': [
       'Material Spill',
       'Hazardous Material',
    ],
    'ALMOST_IMPASSABLE': [
       'Ferry Out of Service',
    ],
    'PARTLY_SNOW_PACKED': [
       'Heavy Slush',
    ],
    'PLANNED_EVENT': [
       'Special Event',
    ],
}

EVENT_TYPE_GROUPS = {
    'INCIDENT': [
        'Wildlife on Road',
        'Bridge Wash Out',
        'Collision',
        'Debris on Road',
        'Forest Fire',
        'Hydro Lines Down',
        'Livestock on Road',
        'Material Spill',
        'Mud Slide',
        'Police Incident',
        'Rock Slide',
        'Signal Light Failure',
        'Tree on Road',
        'Vehicle Incident',
        'Vehicle Recovery',
        'Wash Out',
        'Ferry Out of Service',
        'Ferry Service Interruption',
        'Bridge Damage',
        'Falling Rock',
        'Flooded',
        'Hazardous Material',
        'Heavy Traffic Volume',
        'Railway Crossing Incident',
        'Structural Fire',
        'Traffic Signal Failure',
        'Vehicle Fire',
        'Vehicle Stall',
        'Traffic Congestion',
        'High Avalanche Hazard',
        'Avalanche',
    ],
    'CONSTRUCTION': [
        'Avalanche Control',
        'Bridge Construction',
        'Bridge Maintenance',
        'Brushing',
        'Construction',
        'Ditching',
        'Electrical Maintenance',
        'Line Painting',
        'Maintenance',
        'Mowing',
        'Paving',
        'Rock Scaling',
        'Seal Coating',
        'Sweeping',
        'Winter Highway Maintenance',
        'Blasting',
        'New Traffic Signal',
        'Night Work',
        'Paving Operations',
        'Pothole Repair',
        'Road Construction',
        'Road Maintenance',
        'Road Sweeping',
        'Roadside Brushing',
        'Snow Deposit Removal',
        'Traffic Signal Out',
        'Tree Pruning',
        'Utility Works',
    ],
    'SPECIAL_EVENT': [
        'Special Event',
        'Garbage Pickup',
    ],
    'ROAD_CONDITION': [
        'Frost Heaves',
        'Black Ice',
        'Black Ice with Blowing Snow',
        'Compact Ice',
        'Compact Snow',
        'Compact Snow with Slippery Sections',
        'Compact Snow with Slushy Sections',
        'Drifting Snow',
        'Falling Ice',
        'Flooding',
        'Fog and Black Ice',
        'Muddy Sections',
        'Muddy with Slippery Sections',
        'Rain on Compact Snow',
        'Slippery Sections',
        'Slushy Sections',
        'Slushy with Slippery Sections',
        'Snowing with Slippery Sections',
        'Traffic Congestion',
        'Water Pooling',
        'Winter Driving Conditions',
        'Winter Highway Maintenance',
        'Congestion',
        'Sanded',
        'Plowing & Sanding',
        'High Flood Warning',
        'Slippery Section/Plowing & Sanding',
        'Slippery Sections/ Plowing & Sanding',
        'All Vehicles Chain Or Snow Tires',
        'All Vehicles Chains Required',
        'All Vehicles Must use Chains or Snow Tires',
        'Trucks Chains Required',
    ],
    'WEATHER_CONDITION': [
        'Fog Patches',
        'Drifting Snow',
        'Freezing Rain',
        'Fog and Black Ice',
        'Limited Visibility with Blowing Snow',
        'Limited Visibility with Fog',
        'Limited Visibility with Heavy Snowfall',
        'Limited Visibility with Smoke',
        'Heavy Rain',
        'Heavy Rain and Wind',
        'Heavy Slush',
        'Heavy Snowfall',
        'Ice Fog',
        'Strong Cross Winds',
        'Blowing Snow',
        'Forest Fire',
        'High Winds',
        'Smoke',
        'Dense Fog',
        'Dust Storm',
        'Limited Visibility',
    ],
}

# Generate reverse mapping for EVENT_TYPE_GROUPS and EVENT_TYPE_SUBGROUPS:
# {
#    'Black Ice': 'ROAD_CONDITION',
#    'Compact Snow': 'ROAD_CONDITION',
#    ...
#    'Fog Patches': 'WEATHER_CONDITION',
#    'Drifting Snow': 'WEATHER_CONDITION',
#    ...
#}
CARS_CAUSE_TO_EVENT = {}
for key, values in EVENT_TYPE_GROUPS.items():
    for value in values:
        CARS_CAUSE_TO_EVENT[value] = key

CARS_CAUSE_TO_SUBEVENT = {}
for key, values in EVENT_SUBTYPE_GROUPS.items():
    for value in values:
        CARS_CAUSE_TO_EVENT[value] = key
