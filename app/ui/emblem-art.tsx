/* The Markforth emblem as live artwork: each bar slides in, then the mark floats inside slow
   rotating rings. Pure CSS animation (see "Emblem art" in globals.css); reduced motion shows it still. */
export function EmblemArt({className = ''}: {className?: string}) {
  return <div className={'emblem-art ' + className} aria-hidden="true">
    <span className="emblem-halo"/>
    <span className="emblem-ring r1"><i/></span>
    <span className="emblem-ring r2"><i/></span>
    <span className="emblem-ring r3"/>
    <svg className="emblem-mark" viewBox="35 45 445 430" role="presentation">
      <path className="b1" d="M 96.574219 60.777344 L 467.171875 60.777344 L 423.132812 136.777344 L 140.125 136.777344 Z" fill="#df2f18"/>
      <path className="b2" d="M 48.757812 136.777344 L 140.125 136.777344 L 180.257812 209.359375 L 87.183594 209.359375 Z" fill="#df2f18"/>
      <path className="b3" d="M 381.09375 209.359375 L 180.257812 209.359375 L 224.660156 284.074219 L 337.808594 284.074219 Z" fill="#ff4b2b"/>
      <path className="b4" d="M 130.730469 284.074219 L 224.660156 284.074219 L 281.390625 381.457031 L 234.910156 461.691406 L 130.730469 285.785156 Z" fill="#ffffff"/>
    </svg>
  </div>;
}

/* Three slanted bars that sweep across, taken from the emblem's shape. */
export function Slashes({className = ''}: {className?: string}) {
  return <div className={'slashes ' + className} aria-hidden="true"><i/><i/><i/></div>;
}
