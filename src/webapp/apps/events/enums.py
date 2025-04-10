from django.db import models


class EventType(models.TextChoices):
    CONSTRUCTION = 'CONSTRUCTION', 'Construction'
    INCIDENT = 'INCIDENT', 'Incident'
    SPECIAL_EVENT = 'SPECIAL_EVENT', 'Special event'
    WEATHER_CONDITION = 'WEATHER_CONDITION', 'Weather condition'
    ROAD_CONDITION = 'ROAD_CONDITION', 'Road condition'


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
    POOR_VISIBILITY =     'POOR_VISIBILITY', 'Poor visiblity'
    PARTLY_SNOW_COVERED = 'PARTLY_SNOW_COVERED', 'Partly snow packed'
    DRIFTING_SNOW =       'DRIFTING_SNOW', 'Drifting snow',
    PASSABLE_WITH_CARE =  'PASSABLE_WITH_CARE', 'Passable with care'


class Status(models.TextChoices):
    ACTIVE = 'ACTIVE'
    INACTIVE = 'INACTIVE'


class Severity(models.TextChoices):
    MINOR = 'MINOR'
    MAJOR = 'MAJOR'


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
