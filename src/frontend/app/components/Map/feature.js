import { Feature } from 'ol';
import { Icon, Style } from 'ol/style';

import Styles from './styles';
import { getIconAndStroke } from '../../events/icons';



export default class RideFeature extends Feature {
  styleState = true;

  constructor(...args) {
    super(...args);
    const props = args[0] || {};

    if (props.style) {
      this.normal = Styles.pin[props.style].normal;
      this.active = Styles.pin[props.style].active;
      this.hover = Styles.pin[props.style].hover;
    } else if (props.styles) {
      this.normal = props.styles?.static;
      this.active = props.styles?.active;
      this.hover = props.styles?.hover;
    }
    this.action = props.action;
    this.on('propertychange', this.propertyChanged)
    this.set('visible', props.isVisible);
  }

  // used to update available styles based on the underlying event changing
  propertyChanged(e) {
    if (e.key === 'raw') {
      const event = this.get('raw');
      ['static', 'hover', 'active'].forEach((state) => {
        const [icon, stroke2] = getIconAndStroke(event, state);
        this[state] = new Style({ image: new Icon({ src: icon }), ...stroke2 });
      });
      this.changed();
    }
  }

  clear() { // used by the route feature on the map
    this.getGeometry().setCoordinates([]);
  }
}


/* A pin is a RideFeature used for the start and end pins on the map during
 * event creation/editing.
 */
export class PinFeature extends RideFeature {

  changeStyle(key) {
    this.normal = Styles.pin[key].normal;
    this.active = Styles.pin[key].active;
    this.hover = Styles.pin[key].hover;
  }

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
}