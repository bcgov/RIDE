import datetime
from zoneinfo import ZoneInfo


def get_default_next_update():
    # Current time with 30 minutes buffer
    now = datetime.datetime.now(tz=ZoneInfo("America/Vancouver")) + datetime.timedelta(minutes=30)
    now = now.replace(second=0, microsecond=0)
    month = now.month
    day = now.day

    # October 1 - April 30
    in_winter_season = (month > 9 or month < 5) or (month == 10 and day >= 1) or (month == 4 and day <= 30)
    if in_winter_season:
        times = [datetime.time(5, 0), datetime.time(7, 0), datetime.time(16, 0)]
        candidates = []
        for t in times:
            candidate = now.replace(hour=t.hour, minute=t.minute)
            if candidate <= now:
                candidate += datetime.timedelta(days=1)
            candidates.append(candidate)
        return min(candidates)

    else:
        return now + datetime.timedelta(days=1)
