import { Feature } from 'ol';
import { Circle, Fill, Icon, Stroke, Style } from 'ol/style';

import Styles, { normalStyle, hoverStyle, activeStyle } from './styles';
import * as eStyles from '../../events/featureStyleDefinitions';
import { getIcon } from '../../events/icons';



function get(obj, path, defaultValue=undefined) {
  const travel = regexp =>
    String.prototype.split
      .call(path, regexp)
      .filter(Boolean)
      .reduce((res, key) => (res !== null && res !== undefined ? res[key] : res), obj);
  const result = travel(/[,[\]]+?/) || travel(/[,[\].]+?/);
  return result === undefined || result === obj ? defaultValue : result;
};

export default class RideFeature extends Feature {
  hovered = false;
  selected = false;
  styleState = true;

  constructor(...args) {
    super(...args);
    const props = args[0] || {};
    if (props.style) {
      this.normal = Styles.pin[props.style].normal;
      this.active = Styles.pin[props.style].active;
      this.hover = Styles.pin[props.style].hover;
    } else {
      this.normal = props.normalStyle || normalStyle;
      this.hover = props.hoverStyle || hoverStyle;
      this.active = props.activeStyle || activeStyle;
    }

    if (props.feat) {
      const style = get(eStyles, props.feat);
      this.normal = style.static;
      this.active = style.active;
      this.hover = style.hover;
    } else if (props.feat2) {
      this.normal = props.feat2.static;
      this.active = props.feat2.active;
      this.hover = props.feat2.hover;
    }
    this.setStyle(this.normal);

    this.action = props.action;
    this.ref = props.ref;
    this.on('propertychange', this.propertyChanged)
  }

  resetStyle(key) {
    this.normal = Styles.pin[key].normal.clone();
    this.active = Styles.pin[key].active.clone();
    this.hover = Styles.pin[key].hover.clone();
    this.updateStyle();
  }

  updateStyle() {
    if (this.selected) {
      this.setStyle(this.active);
      if (this.paired) {
        this.paired.selected = true;
        this.paired.setStyle(this.paired.active);
      }
    } else if (this.hovered) {
      this.setStyle(this.hover);
      if (this.paired) {
        this.paired.hovered = true;
        this.paired.setStyle(this.paired.hover);
      }
    } else {
      this.setStyle(this.normal);
      if (this.paired) {
        this.paired.selected = false;
        this.paired.hovered = false;
        this.paired.setStyle(this.paired.normal);
      }
    }
  }

  // used to update available styles based on the underlying event changing
  propertyChanged(e) {
    if (e.key === 'raw') {
      const event = this.get('raw');
      ['static', 'hover', 'active'].forEach((state) => {
        this[state] = new Style({ image: new Icon({ src: getIcon(event, state) }) });
      });
      this.updateStyle();
    }
  }

  clear() { // used by the route feature on the map
    this.getGeometry().setCoordinates([]);
  }
}


/* A pin is a RideFeature that adds control of an accompanying infobox.
 * Currently used for the start and end pins on the map during event creation/
 * editing, which have highway name and nearest cities attached.
 */
export class PinFeature extends RideFeature {
  /* Return a two element array that gives the cardinality of the first point
   * with respect to the second point, as either a 1 (greater than) or -1 (less
   * than), so that pixel dimensions can be multiplied by that to shift the
   * coordinates.  This calculation works for a canvas whose x, y origin (0, 0)
   * is in the upper left.  The first element is East/West, the second is
   * North/South.
   */
  getDirectionOffsets(a, b) {
    const coordsA = a.getGeometry().getCoordinates();
    const coordsB = b.getGeometry().getCoordinates();

    return [
      coordsA[0] < coordsB[0] ? -1 : 1, // A is west of B
      coordsA[1] < coordsB[1] ? 1 : -1, // A is south of B
    ];
  }

  /* Get pixel offsets for el that take account of relative position with
   * respect to the 'other' pin (i.e., if both start and end pins are on the
   * map, for each of those);
   *
   * If only the start pin is present, the offsets are basic spacing off the
   * pin icon itself..
   */
  getOffsets(map, el) {
    let baseX = 16;
    let baseY = -30;
    let offsetX = 0, offsetY = 0;
    let xMult = 1, yMult = 1;

    if (map.end) {
      if (this === map.start) {
        [xMult, yMult] = this.getDirectionOffsets(map.start, map.end);
      } else {
        [xMult, yMult] = this.getDirectionOffsets(map.end, map.start);
      }
      if (xMult === -1) { offsetX += el.offsetWidth; }
      if (yMult === -1) { offsetY += el.offsetHeight; baseY =0; }
    }

    return [(baseX + offsetX) * xMult, (baseY + offsetY) * yMult];
  }

  updateInfobox(map) {
    if (this.ref.current) {
      const [offsetX, offsetY] = this.getOffsets(map, this.ref.current);
      const xy = map.getPixelFromCoordinate(this.getGeometry().getCoordinates());
      this.ref.current.style.left = (xy[0] + offsetX) + 'px';
      this.ref.current.style.top = (xy[1] + offsetY) + 'px';
      if (this.dra?.properties) {
        this.ref.current.style.visibility = 'unset';
      } else {
        this.ref.current.style.visibility = 'hidden';
      }
    }
  }

  upHandler(e) {
    // this.updateInfobox(e.map);
  }
}