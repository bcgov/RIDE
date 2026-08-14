from django.db import models


class EventType(models.TextChoices):
    CONSTRUCTION = 'CONSTRUCTION', 'Construction'
    INCIDENT = 'INCIDENT', 'Incident'
    SPECIAL_EVENT = 'SPECIAL_EVENT', 'Special event'
    WEATHER_CONDITION = 'WEATHER_CONDITION', 'Weather condition'
    ROAD_CONDITION = 'ROAD_CONDITION', 'Road condition'
    CHAIN_UP = 'CHAIN_UP', 'Chain-up'


class EventSubtype(models.TextChoices):
    ALMOST_IMPASSABLE = 'ALMOST_IMPASSABLE', 'Almost impassable'
    AVALANCHE_HAZARD = 'AVALANCHE_HAZARD', 'Avalanche hazard'
    DRIFTING_SNOW = 'DRIFTING_SNOW', 'Drifting snow'
    FIRE = 'FIRE', 'Fire'
    HAZARD = 'HAZARD', 'Hazard'
    HEAVY_DOWNPOUR = 'HEAVY_DOWNPOUR', 'Heavy downpour'
    ICE_COVERED = 'ICE_COVERED', 'Ice covered'
    MUD = 'MUD', 'Mud'
    OBSTRUCTION = 'OBSTRUCTION', 'Obstruction'
    PARTLY_ICY = 'PARTLY_ICY', 'Partly icy'
    PARTLY_SNOW_COVERED = 'PARTLY_SNOW_COVERED', 'Partly snow covered'
    PARTLY_SNOW_PACKED = 'PARTLY_SNOW_PACKED', 'Partly snow packed'
    PASSABLE_WITH_CARE = 'PASSABLE_WITH_CARE', 'Passable with care'
    PLANNED_EVENT = 'PLANNED_EVENT', 'Planned event'
    POOR_VISIBILITY = 'POOR_VISIBILITY', 'Poor visibility'
    ROAD_CONSTRUCTION = 'ROAD_CONSTRUCTION', 'Road construction'
    ROAD_MAINTENANCE = 'ROAD_MAINTENANCE', 'Road maintenance'
    SIGNAL_LIGHT_FAILURE = 'SIGNAL_LIGHT_FAILURE', 'Signal light failure'
    SNOW_COVERED = 'SNOW_COVERED', 'Snow covered'
    SNOW_PACKED = 'SNOW_PACKED', 'Snow packed'
    SPILL = 'SPILL', 'Spill'
    STRONG_WINDS = 'STRONG_WINDS', 'Strong winds'
    SURFACE_WATER_HAZARD = 'SURFACE_WATER_HAZARD', 'Surface water hazard'


class Status(models.TextChoices):
    ACTIVE = 'ACTIVE'
    INACTIVE = 'INACTIVE'
    OPEN511_ARCHIVED = 'ARCHIVED'


class Severity(models.TextChoices):
    CLOSURE = 'CLOSURE'
    MINOR = 'MINOR'
    MAJOR = 'MAJOR'


class Situation(models.IntegerChoices):
    ROAD_CONDITION = 2, 'Road condition'
    PLANNED_SERVICE_INTERRUPTION = 4, 'Planned service interruption'
    SPECIAL_EVENT = 7, 'Special event'
    POSSIBLE_SERVICE_INTERRUPTIONS = 9, 'Possible service interruptions'
    BLASTING = 10, 'Blasting'
    BRIDGE_CONSTRUCTION = 11, 'Bridge construction'
    ROAD_CONSTRUCTION = 12, 'Road construction'
    AVALANCHE_CONTROL_ACTIVITIES_13 = 13, 'Avalanche control activities'
    BRIDGE_MAINTENANCE = 15, 'Bridge maintenance'
    CONSTRUCTION_WORK = 19, 'Construction work'
    GARBAGE_PICK_UP = 21, 'Garbage pick up'
    LINE_PAINTING = 25, 'Line painting'
    NEW_TRAFFIC_SIGNAL = 28, 'New traffic signal'
    NIGHT_WORK = 68, 'Night work'
    PAVING_OPERATIONS = 69, 'Paving operations'
    POTHOLE_REPAIR = 70, 'Pothole repair'
    ROAD_MAINTENANCE = 71, 'Road maintenance'
    VEHICLE_COLLISION = 72, 'Vehicle collision'
    UNPLANNED_SERVICE_INTERRUPTION = 73, 'Unplanned service interruption'
    DELAYED_DEPARTURE = 74, 'Delayed departure'
    FALLING_ICE = 76, 'Falling ice'
    FALLING_ROCK = 77, 'Falling rock'
    FLOODING = 78, 'Flooding'
    HAZARDOUS_MATERIALS_SPILL = 79, 'Hazardous materials spill'
    HYDRO_LINES_DOWN = 80, 'Hydro lines down'
    POLICE_INCIDENT = 81, 'Police incident'
    SAILING_WAIT_AT_EAST_TERMINAL = 82, 'Sailing wait at East Terminal'
    AVALANCHE = 84, 'Avalanche'
    HIGH_AVALANCHE_HAZARD = 86, 'High avalanche hazard'
    FOREST_FIRE = 87, 'Forest fire'
    STRUCTURAL_FIRE = 88, 'Structural fire'
    VEHICLE_FIRE = 89, 'Vehicle fire'
    BRIDGE_CLOSED = 90, 'Bridge closed'
    BRIDGE_DAMAGE = 91, 'Bridge damage'
    BRIDGE_WASH_OUT = 92, 'Bridge wash out'
    RAILWAY_CROSSING_INCIDENT = 93, 'Railway crossing incident'
    REST_AREA_CLOSED = 94, 'Rest area closed'
    ROCK_SLIDE = 95, 'Rock slide'
    TREE_ON_ROAD = 96, 'Tree on road'
    VEHICLE_RECOVERY_97 = 97, 'Vehicle recovery'
    VEHICLE_STALL = 98, 'Vehicle stall'
    WASHOUT = 99, 'Washout'
    WATER_POOLING = 100, 'Water pooling'
    WILDLIFE_ADVISORY = 102, 'Wildlife advisory'
    MUDSLIDE = 103, 'Mudslide'
    DEBRIS_ON_ROAD = 104, 'Debris on road'
    OBSTRUCTION_ON_ROADWAY = 105, 'Obstruction on roadway'
    LIMITED_VISIBILITY = 106, 'Limited visibility'
    TRAFFIC_SIGNAL_OUT_107 = 107, 'Traffic signal out'
    MATERIAL_SPILL = 108, 'Material spill'
    ROAD_SWEEPING = 109, 'Road sweeping'
    ROADSIDE_BRUSHING = 110, 'Roadside brushing'
    ROCK_SCALING = 111, 'Rock scaling'
    ROAD_SEAL_COATING = 112, 'Road seal coating'
    SNOW_DEPOSIT_REMOVAL = 113, 'Snow deposit removal'
    TREE_PRUNING = 114, 'Tree pruning'
    UTILITY_WORK = 115, 'Utility work'
    VEHICLE_RECOVERY_116 = 116, 'Vehicle recovery'
    TRAFFIC_SIGNAL_OUT_117 = 117, 'Traffic signal out'
    ADDITIONAL_SERVICE = 118, 'Additional service'
    VEHICLE_INCIDENT = 144, 'Vehicle incident'
    SAILING_WAIT_AT_WEST_TERMINAL = 146, 'Sailing wait at West Terminal'
    SAILING_WAIT_AT_NORTH_TERMINAL = 147, 'Sailing wait at North Terminal'
    SAILING_WAIT_AT_SOUTH_TERMINAL = 148, 'Sailing wait at South Terminal'
    SAILING_WAIT_AT_NORTH_BANK = 149, 'Sailing wait at North Bank'
    SAILING_WAIT_AT_SOUTH_BANK = 150, 'Sailing wait at South Bank'
    SAILING_WAIT_AT_EAST_SIDE = 151, 'Sailing wait at East Side'
    SAILING_WAIT_AT_WEST_SIDE = 152, 'Sailing wait at West Side'
    HIGH_TRAFFIC_VOLUME = 153, 'High traffic volume'
    REQUIRED_MAINTENANCE_156 = 156, 'Required maintenance'
    REPLACEMENT_VESSEL = 158, 'Replacement vessel'
    SAFETY_INSPECTION_160 = 160, 'Safety inspection'
    SAFETY_DRILLS_161 = 161, 'Safety drills'
    HIGH_RIVER_CURRENT = 164, 'High river current'
    DEBRIS_IN_WATER = 165, 'Debris in water'
    MARINE_TRAFFIC = 168, 'Marine traffic'
    GRASS_FIRE = 188, 'Grass fire'
    MOWING = 191, 'Mowing'
    ROCKS_ON_ROAD = 192, 'Rocks on road'
    MULTI_VEHICLE_INCIDENT = 203, 'Multi-vehicle Incident'
    DITCH_MAINTENANCE = 205, 'Ditch maintenance'
    STATE_OF_EMERGENCY = 218, 'State of emergency'
    POSSIBLE_FERRY_DELAYS = 224, 'Possible ferry delays'
    ROCK_SLOPE_STABILIZATION = 226, 'Rock slope stabilization'
    ADVERSE_WEATHER = 233, 'Adverse weather'
    CREWING_ISSUES = 234, 'Crewing issues'
    FRESHET_FLOODING = 235, 'Freshet (flooding)'
    SEASONAL_SHUTDOWN = 236, 'Seasonal shutdown'
    SAFETY_DRILLS_238 = 238, 'Safety drills'
    REQUIRED_MAINTENANCE_239 = 239, 'Required maintenance'
    MEDICAL_EMERGENCY = 240, 'Medical emergency'
    ELECTRICAL_MAINTENANCE = 245, 'Electrical maintenance'
    SHOULDER_MAINTENANCE = 251, 'Shoulder maintenance'
    N_1_SAILING_WAIT = 252, '1 sailing wait'
    N_2_SAILING_WAIT = 253, '2 sailing wait'
    N_3_SAILING_WAIT = 254, '3 sailing wait'
    N_4_SAILING_WAIT = 255, '4 sailing wait'
    N_5_6_SAILING_WAIT = 256, '5-6 sailing wait'
    GT_6_SAILING_WAIT = 257, '> 6 sailing wait'
    BEHIND_SCHEDULE_20_MINUTES = 258, 'Behind schedule 20 minutes'
    BEHIND_SCHEDULE_30_MINUTES = 259, 'Behind schedule 30 minutes'
    BEHIND_SCHEDULE_40_MINUTES = 261, 'Behind schedule 40 minutes'
    BEHIND_SCHEDULE_50_MINUTES = 262, 'Behind schedule 50 minutes'
    BEHIND_SCHEDULE_60_90_MINUTES = 263, 'Behind schedule 60-90 minutes'
    BEHIND_SCHEDULE_GT_90_MINUTES = 264, 'Behind schedule >90 minutes'
    EXPECT_DELAY_OF_20_MINUTES = 265, 'Expect delay of 20 minutes'
    EXPECT_DELAY_OF_30_MINUTES = 266, 'Expect delay of 30 minutes'
    EXPECT_DELAY_OF_40_MINUTES = 267, 'Expect delay of 40 minutes'
    EXPECT_DELAY_OF_50_MINUTES = 268, 'Expect delay of 50 minutes'
    EXPECT_DELAY_OF_60_90_MINUTES = 269, 'Expect delay of 60-90 minutes'
    FERRY_OPERATING_24_HOURS_A_DAY = 271, 'Ferry operating 24 hours a day'
    AVALANCHE_CONTROL_ACTIVITIES_279 = 279, 'Avalanche control activities'
    GEOTECHNICAL_INVESTIGATION = 280, 'Geotechnical investigation'
    EXPECT_DELAY_GT_90_MINUTES = 281, 'Expect delay >90 minutes'
    PATCHING = 282, 'Patching'
    AVALANCHE_DEPOSIT_REMOVAL_283 = 283, 'Avalanche deposit removal'
    CRACK_SEALING = 284, 'Crack sealing'
    INDUSTRIAL_TRAFFIC = 285, 'Industrial traffic'
    UNPLANNED_PROTEST_OR_SPECIAL_EVENT = 287, 'Unplanned protest or special event'
    MECHANICAL_ISSUE = 289, 'Mechanical issue'
    AVALANCHE_DEPOSIT_REMOVAL_292 = 292, 'Avalanche deposit removal'
    WASHROOMS_CLOSED = 295, 'Washrooms closed'
    LANDSLIDE = 296, 'Landslide'
    WILDFIRE = 298, 'Wildfire'
    WINTER_OPERATIONS = 300, 'Winter operations'
    SAFETY_INSPECTION_304 = 304, 'Safety inspection'
    LIVESTOCK_ON_ROAD = 305, 'Livestock on road'


SITUATION_LOOKUP = {member.value: member for member in Situation}

EVENT_SUBTYPE_GROUPS = {
    EventSubtype.OBSTRUCTION: [
        Situation.DEBRIS_ON_ROAD,
        Situation.OBSTRUCTION_ON_ROADWAY,
    ],
    EventSubtype.HAZARD: [
        Situation.BRIDGE_CLOSED,
        Situation.BRIDGE_DAMAGE,
        Situation.BRIDGE_WASH_OUT,
        Situation.FALLING_ICE,
        Situation.FALLING_ROCK,
        Situation.FLOODING,
        Situation.HAZARDOUS_MATERIALS_SPILL,
        Situation.HYDRO_LINES_DOWN,
        Situation.INDUSTRIAL_TRAFFIC,
        Situation.LANDSLIDE,
        Situation.LIVESTOCK_ON_ROAD,
        Situation.POLICE_INCIDENT,
        Situation.RAILWAY_CROSSING_INCIDENT,
        Situation.ROCK_SLIDE,
        Situation.ROCKS_ON_ROAD,
        Situation.STATE_OF_EMERGENCY,
        Situation.TREE_ON_ROAD,
        Situation.VEHICLE_COLLISION,
        Situation.VEHICLE_INCIDENT,
        Situation.VEHICLE_RECOVERY_97,
        Situation.VEHICLE_STALL,
        Situation.WASHOUT,
        Situation.WATER_POOLING,
        Situation.WILDLIFE_ADVISORY,
        Situation.UNPLANNED_PROTEST_OR_SPECIAL_EVENT,
        Situation.ADDITIONAL_SERVICE,
        Situation.REST_AREA_CLOSED,

        # Ferry situations set to 'NULL' in references.js
        Situation.DEBRIS_IN_WATER,
        Situation.EXPECT_DELAY_OF_20_MINUTES,
        Situation.EXPECT_DELAY_OF_30_MINUTES,
        Situation.EXPECT_DELAY_OF_40_MINUTES,
        Situation.EXPECT_DELAY_OF_50_MINUTES,
        Situation.EXPECT_DELAY_OF_60_90_MINUTES,
        Situation.FERRY_OPERATING_24_HOURS_A_DAY,
        Situation.HIGH_RIVER_CURRENT,
        Situation.HIGH_TRAFFIC_VOLUME,
        Situation.MARINE_TRAFFIC,
        Situation.REPLACEMENT_VESSEL,
        Situation.REQUIRED_MAINTENANCE_156,
        Situation.SAFETY_DRILLS_161,
        Situation.SAFETY_INSPECTION_160,
    ],
    EventSubtype.FIRE: [
        Situation.FOREST_FIRE,
        Situation.GRASS_FIRE,
        Situation.STRUCTURAL_FIRE,
        Situation.VEHICLE_FIRE,
        Situation.WILDFIRE,
    ],
    EventSubtype.MUD: [
        Situation.MUDSLIDE,
    ],
    EventSubtype.SIGNAL_LIGHT_FAILURE: [
        Situation.TRAFFIC_SIGNAL_OUT_107,
        Situation.TRAFFIC_SIGNAL_OUT_117,
    ],
    EventSubtype.AVALANCHE_HAZARD: [
        Situation.AVALANCHE,
        Situation.AVALANCHE_DEPOSIT_REMOVAL_283,
        Situation.HIGH_AVALANCHE_HAZARD,
        Situation.AVALANCHE_DEPOSIT_REMOVAL_292,
    ],
    EventSubtype.ROAD_CONSTRUCTION: [
        Situation.BLASTING,
        Situation.BRIDGE_CONSTRUCTION,
        Situation.PATCHING,
        Situation.ROAD_CONSTRUCTION,
        Situation.ROCK_SLOPE_STABILIZATION,
        Situation.MOWING,
    ],
    EventSubtype.ROAD_MAINTENANCE: [
        Situation.WASHROOMS_CLOSED,
        Situation.WINTER_OPERATIONS,
        Situation.AVALANCHE_CONTROL_ACTIVITIES_13,
        Situation.BRIDGE_MAINTENANCE,
        Situation.CONSTRUCTION_WORK,
        Situation.CRACK_SEALING,
        Situation.DITCH_MAINTENANCE,
        Situation.ELECTRICAL_MAINTENANCE,
        Situation.GARBAGE_PICK_UP,
        Situation.GEOTECHNICAL_INVESTIGATION,
        Situation.LINE_PAINTING,
        Situation.NEW_TRAFFIC_SIGNAL,
        Situation.NIGHT_WORK,
        Situation.PAVING_OPERATIONS,
        Situation.POTHOLE_REPAIR,
        Situation.ROAD_MAINTENANCE,
        Situation.ROAD_SEAL_COATING,
        Situation.ROAD_SWEEPING,
        Situation.ROADSIDE_BRUSHING,
        Situation.ROCK_SCALING,
        Situation.SHOULDER_MAINTENANCE,
        Situation.SNOW_DEPOSIT_REMOVAL,
        Situation.TREE_PRUNING,
        Situation.UTILITY_WORK,
        Situation.VEHICLE_RECOVERY_116,
    ],
    EventSubtype.POOR_VISIBILITY: [
        Situation.LIMITED_VISIBILITY,
    ],
    EventSubtype.SPILL: [
        Situation.MATERIAL_SPILL,
    ],
    EventSubtype.ALMOST_IMPASSABLE: [
        Situation.AVALANCHE_CONTROL_ACTIVITIES_279,
        Situation.GT_6_SAILING_WAIT,
        Situation.N_1_SAILING_WAIT,
        Situation.N_2_SAILING_WAIT,
        Situation.N_3_SAILING_WAIT,
        Situation.N_4_SAILING_WAIT,
        Situation.N_5_6_SAILING_WAIT,
        Situation.ADVERSE_WEATHER,
        Situation.BEHIND_SCHEDULE_GT_90_MINUTES,
        Situation.BEHIND_SCHEDULE_20_MINUTES,
        Situation.BEHIND_SCHEDULE_30_MINUTES,
        Situation.BEHIND_SCHEDULE_40_MINUTES,
        Situation.BEHIND_SCHEDULE_50_MINUTES,
        Situation.BEHIND_SCHEDULE_60_90_MINUTES,
        Situation.CREWING_ISSUES,
        Situation.DELAYED_DEPARTURE,
        Situation.EXPECT_DELAY_GT_90_MINUTES,
        Situation.FRESHET_FLOODING,
        Situation.MECHANICAL_ISSUE,
        Situation.MEDICAL_EMERGENCY,
        Situation.POSSIBLE_FERRY_DELAYS,
        Situation.SAILING_WAIT_AT_EAST_SIDE,
        Situation.SAILING_WAIT_AT_EAST_TERMINAL,
        Situation.SAILING_WAIT_AT_NORTH_BANK,
        Situation.SAILING_WAIT_AT_NORTH_TERMINAL,
        Situation.SAILING_WAIT_AT_SOUTH_BANK,
        Situation.SAILING_WAIT_AT_SOUTH_TERMINAL,
        Situation.SAILING_WAIT_AT_WEST_SIDE,
        Situation.SAILING_WAIT_AT_WEST_TERMINAL,
        Situation.UNPLANNED_SERVICE_INTERRUPTION,
        Situation.PLANNED_SERVICE_INTERRUPTION,
        Situation.POSSIBLE_SERVICE_INTERRUPTIONS,
        Situation.REQUIRED_MAINTENANCE_239,
        Situation.SAFETY_DRILLS_238,
        Situation.SAFETY_INSPECTION_304,
        Situation.SEASONAL_SHUTDOWN,
    ],
    EventSubtype.PLANNED_EVENT: [
        Situation.SPECIAL_EVENT,
    ],
}
