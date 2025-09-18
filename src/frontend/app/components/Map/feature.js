import { Feature } from 'ol';

import Styles, { normalStyle, hoverStyle, activeStyle } from './styles';
import * as eStyles from '../../events/featureStyleDefinitions';
import { get } from './helpers';


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
    }
    this.setStyle(this.normal);

    this.action = props.action;
    this.ref = props.ref;
  }

  updateInfobox(map) {
    if (this.ref.current) {
      const xy = map.getPixelFromCoordinate(this.getGeometry().getCoordinates());
      this.ref.current.style.left = (xy[0] + 16) + 'px';
      this.ref.current.style.top = (xy[1] - 30) + 'px';
      if (!this.dra?.properties) {
        this.ref.current.style.visibility = 'hidden';
      } else {
        this.ref.current.style.visibility = 'unset';
      }
    }
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

  clear() { // used by the route feature on the map
    this.getGeometry().setCoordinates([]);
  }

  upHandler(e) {
    this.updateInfobox(e.map);
  }
}