import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * Scrolls to the top of the page (instantly) whenever location.pathname changes.
 * Instant scroll is intentional — the PageTransition animation handles the
 * visual enter effect; we don't want competing smooth-scroll + fade.
 *
 * Same-route hash navigation (#section) is NOT affected because pathname
 * doesn't change when only the hash changes.
 */
const ScrollToTop = () => {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  }, [pathname]);

  return null;
};

export default ScrollToTop;
