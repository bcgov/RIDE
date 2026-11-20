from django.db import models


class Direction(models.TextChoices):
    BOTH = 'BOTH', 'Both Directions'
    NORTHBOUND = 'NORTHBOUND', 'Northbound'
    SOUTHBOUND = 'SOUTHBOUND', 'Southbound'
    EASTBOUND = 'EASTBOUND', 'Eastbound'
    WESTBOUND = 'WESTBOUND', 'Westbound'
