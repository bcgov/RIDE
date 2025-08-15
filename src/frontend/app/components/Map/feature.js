import { Feature } from 'ol';

import Styles, { normalStyle, hoverStyle, activeStyle } from './styles';


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
    this.setStyle(this.normal);
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

  setText(text) {
    this.text = text;
    if (!this.normal.getText()) { return; }
    this.normal.getText().setText(text);
    this.active.getText().setText(text);
    this.hover.getText().setText(text);
  }

  updateStyle() {
    if (this.selected) {
      this.setStyle(this.active);
    } else if (this.hovered) {
      this.setStyle(this.hover);
    } else {
      this.setStyle(this.normal);
    }
  }
}