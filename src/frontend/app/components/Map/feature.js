import { Feature } from 'ol';

import { normalStyle, hoverStyle, activeStyle } from './styles';


export default class RideFeature extends Feature {
  hovered = false;
  selected = false;
  styleState = true;

  constructor(...args) {
    super(...args);
    const props = args[0] || {};

    this.normal = props.normalStyle || normalStyle;
    this.hover = props.hoverStyle || hoverStyle;
    this.active = props.activeStyle || activeStyle;

    this.setStyle(this.normal);
  }

  addText(text) {
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