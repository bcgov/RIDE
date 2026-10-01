// Styling
import './Button.scss';

// Figma: "Buttons / Primary | Secondary | Tertiary | Links | Icon only"
//   variant: primary | secondary | tertiary | danger | link | icon
//   size:    sm | md | lg  (icon: sm 24px, md 36px circle)
//   as:      element to render, e.g. "a" for link-styled anchors
// Icons are passed as children (before or after the label) and sized by CSS.
export default function Button(props) {
  /* Setup */
  // Props
  const {
    variant = 'primary',
    size = 'md',
    outlined,
    as: Tag = 'button',
    extraClasses,
    children,
    ...rest
  } = props;

  const classes = [
    'ride-btn',
    `ride-btn--${variant}`,
    `ride-btn--${size}`,
    outlined && 'ride-btn--outlined',
    extraClasses,
  ].filter(Boolean).join(' ');

  /* Rendering */
  // Main Component
  return (
    <Tag className={classes} {...(Tag === 'button' ? { type: 'button' } : {})} {...rest}>
      {children}
    </Tag>
  );
}
