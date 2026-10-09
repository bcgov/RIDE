// Styling
import './Button.scss';

// Figma: "Buttons / Primary | Secondary | Tertiary | Links | Icon only"
//   variant: primary | secondary | tertiary | danger | link | icon
//   filled:  danger only, solid red background for destructive confirmations
//   pill:    icon-and-label pill, e.g. "More"
//   size "dialog" is the padding of the buttons that close a modal
//   size:    sm 28px | md 32px | lg 36px  (icon: sm 24px, md 36px circle)
//            These are Figma's X-Small, Small and Medium
//   as:      element to render, e.g. "a" for link-styled anchors
// Icons are passed as children (before or after the label) and sized by CSS.
export default function Button(props) {
  /* Setup */
  // Props
  const {
    variant = 'primary',
    size = 'md',
    outlined,
    filled,
    pill,
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
    filled && 'ride-btn--filled',
    pill && 'ride-btn--pill',
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
