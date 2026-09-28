import React from 'react';
import { useLocation } from 'react-router-dom';

/**
 * Triggers a visible page-enter animation whenever location.pathname changes.
 *
 * How it works:
 *   The wrapper div is keyed on location.pathname. When React sees a new key
 *   it unmounts the old element and mounts a fresh one — this restarts the
 *   CSS @keyframes animation from scratch on every route change, guaranteed.
 *
 * The animation (pageEnter) is defined in index.css.
 * prefers-reduced-motion: index.css collapses animation-duration to 0.01ms.
 */
const PageTransition = ({ children }) => {
  const location = useLocation();

  return (
    <div key={location.pathname} className="page-transition">
      {children}
    </div>
  );
};

export default PageTransition;
