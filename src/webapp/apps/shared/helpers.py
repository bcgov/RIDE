from email.mime.image import MIMEImage
from functools import cache
from pathlib import Path
import logging
import re

logger = logging.getLogger(__name__)

ROAD_ABBREVIATIONS = {
    r"\bHwy\b": "Highway",
    r"\bAve\b": "Avenue",
    r"\bRd\.(?=\s|$)": "Road",
    r"\bRd\b(?!\.)": "Road",
    r"\bPl\b": "Place",
    r"\bCrt\b": "Court",
    r"\bBlvd\b": "Boulevard",
    r"\bDr\b": "Drive",
    r"\bPky\b": "Parkway",
    r"\bPkwy\.(?=\s|$)": "Parkway",
    r"\bPkwy\b(?!\.)": "Parkway",
    r"\bCres\b": "Crescent",
    r"\bCir\b": "Circle",
    r"\bTerr\b": "Terrace",
    r"\bSt\.(?=\s|$)": "Street",
    r"\bSt\b(?!\.)": "Street",
    r"\bLn\b": "Lane",
    r"\bFSR\b": "Forest Service Road",
    r"\bRte\.(?=\s|$)": "Route",
    r"\bRte\b(?!\.)": "Route",
    r"\bJunc\.(?=\s|$)": "Junction",
    r"\bJunc\b(?!\.)": "Junction",
    r"\bJunct\b": "Junction",
    r"\bJct\b": "Junction",
    r"\bJCT\b": "Junction",
    r"\bJctn\b": "Junction",
    r"\bJntc\b": "Junction",
    r"\bS/B\b": "Southbound",
    r"\bN/B\b": "Northbound",
    r"\bW/B\b": "Westbound",
    r"\bE/B\b": "Eastbound",
    r"\bO/P\b": "Overpass",
    r"\bU/P\b": "Underpass",
    r"\bO/H\b": "Overhead",
    r"\bkmhr\b": "km/hr",
    r"\bkm/h\b": "km/hr",
    r"\bKm Post\b": "Kilometre Post",
    r"\bkm Post\b": "Kilometre Post",
    r"\bKm P\b": "Kilometre Post",
    r"\bkm P\b": "Kilometre Post",
    r"\bNo\.(?=\s|$)": "Number",
    r"\bNo\b(?!\.)": "Number",
    r"\bXing\b": "Crossing",
    r"\bMt\.(?=\s|$)": "Mount",
    r"\bMt\b(?!\.)": "Mount",
    r"\bLk\b": "Lake",
    r"\bCr\b": "Creek",
    r"\bNat\b": "National",
    r"\bGt\b": "Gate",
    r"\bMtnc\b": "Maintenance",
    r"\bW/\s*": "with ",
    r"\bw/\s*": "with ",
}


def transform_road_abbreviations(input):
    if not isinstance(input, str):
        return input

    s = input
    for pattern, full_name in ROAD_ABBREVIATIONS.items():
        s = re.sub(pattern, full_name, s)

    return s


# DBC22-7322: email images, from DBC apps/shared/helpers.py
EMAIL_IMAGES_DIR = Path(__file__).resolve().parents[2] / 'static' / 'images'


@cache
def read_email_image(filename):
    ''' Image bytes, read once per process since every email attaches the same images '''

    return (EMAIL_IMAGES_DIR / filename).read_bytes()


# Attach images with Content-ID
def attach_image_to_email(msg, cid, filename):
    img = MIMEImage(read_email_image(filename), _subtype="png")
    img.add_header('Content-ID', f'<{cid}>')
    img.add_header('X-Attachment-Id', filename)
    img.add_header('Content-Disposition', 'inline', filename=filename)
    msg.attach(img)


def get_used_email_images(html):
    '''
    The images ({cid: file name}) the HTML shows.  Each cid is its image's
    file name in EMAIL_IMAGES_DIR without ".png"
    '''

    images = {}
    # image sources only, so event text can't add attachments
    for cid in sorted(set(re.findall(r'src="cid:([\w.-]+)"', html))):
        if (EMAIL_IMAGES_DIR / f'{cid}.png').is_file():
            images[cid] = f'{cid}.png'
        else:
            logger.error(f'Email image {cid}.png not found')
    return images


def attach_email_images(msg, images):
    '''
    Attach images ({cid: file name}) as parts related to the HTML.  DBC
    attaches every image to a multipart/mixed email, which mail apps such as
    Apple Mail list as attachments under the message.
    '''

    msg.mixed_subtype = 'related'
    for cid, filename in images.items():
        attach_image_to_email(msg, cid, filename)
