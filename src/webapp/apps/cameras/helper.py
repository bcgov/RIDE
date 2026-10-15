from .models import CameraHistory

def create_camera_history(
    camera,
    user,
    action_type,
    description,
    category="",
    changes=None,
):
    return CameraHistory.objects.create(
        camera=camera,
        user=user,
        action_type=action_type,
        category=category,
        description=description,
        changes=changes or {},
    )