import { Feature } from 'ol';

import { normalStyle, hoverStyle, activeStyle } from './styles';


export default class RideFeature extends Feature {
  hovered = false;
  selected = false;
  styleState = true;

  constructor(...args) {
    super(...args);
    const props = args[0] || {};
    this.setStyle(normalStyle);
  }

  updateStyle() {
    if (this.selected) {
      this.setStyle(activeStyle);
    } else if (this.hovered) {
      this.setStyle(hoverStyle);
    } else {
      this.setStyle(normalStyle);
    }
  }
}