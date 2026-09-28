import React, { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { Menu, X, Hexagon } from "lucide-react";
import { Outlet } from "react-router-dom";
import PageTransition from "../components/PageTransition";

const NAVBAR_HEIGHT = 64; // px — matches h-16 on the sticky header

const Layout = ({ children }) => {
  const { isAuthenticated, logout } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const toggleMenu = () => setMobileMenuOpen(!mobileMenuOpen);

  /**
   * Handles anchor nav to a Home-page section (e.g. #charity, #rewards).
   * - If already on Home (/), smoothly scrolls without triggering PageTransition.
   * - If on a different route, navigates to Home first, then scrolls after mount.
   * - Accounts for the sticky navbar height.
   * - On mobile, closes the hamburger menu first.
   */
  const handleSectionNav = (e, sectionId, closeMobileMenu = false) => {
    e.preventDefault();
    if (closeMobileMenu) setMobileMenuOpen(false);

    const scrollToSection = () => {
      const el = document.getElementById(sectionId);
      if (!el) return;
      const top = el.getBoundingClientRect().top + window.scrollY - NAVBAR_HEIGHT;
      window.scrollTo({ top, behavior: 'smooth' });
    };

    if (location.pathname === '/') {
      // Already on Home — just scroll, no route change, no PageTransition.
      scrollToSection();
    } else {
      // Navigate to Home, then scroll once the page has rendered.
      navigate('/');
      // rAF + timeout gives React time to render the Home sections before scrolling.
      setTimeout(() => {
        requestAnimationFrame(scrollToSection);
      }, 350); // slightly longer than the 300ms pageEnter animation
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900 font-sans selection:bg-blue-100 selection:text-blue-900">
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-200/50">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo */}
            <div className="flex-shrink-0 flex items-center">
              <Link
                to="/"
                className="flex items-center gap-2 text-xl font-bold tracking-tight text-slate-900 group"
              >
                <Hexagon className="w-8 h-8 text-blue-600 fill-blue-600/10 group-hover:fill-blue-600/20 transition-colors" />
                <span>Golfish</span>
              </Link>
            </div>

            {/* Desktop Nav */}
            <nav className="hidden md:flex space-x-8">
              <Link
                to="/"
                className="text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors"
              >
                Home
              </Link>
              <button
                onClick={(e) => handleSectionNav(e, 'how-it-works')}
                className="text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors"
              >
                How It Works
              </button>
              <button
                onClick={(e) => handleSectionNav(e, 'charity')}
                className="text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors"
              >
                Charity
              </button>
              <button
                onClick={(e) => handleSectionNav(e, 'rewards')}
                className="text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors"
              >
                Rewards
              </button>
            </nav>

            {/* Desktop Actions */}
            <div className="hidden md:flex items-center space-x-4">
              {isAuthenticated ? (
                <>
                  <Link
                    to="/dashboard"
                    className="text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors"
                  >
                    Dashboard
                  </Link>
                  <button
                    onClick={logout}
                    className="text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors"
                  >
                    Sign out
                  </button>
                </>
              ) : (
                <>
                  <Link
                    to="/login"
                    className="text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors"
                  >
                    Log in
                  </Link>
                  <Link
                    to="/register"
                    className="inline-flex items-center justify-center px-4 py-2 bg-slate-900 text-white text-sm font-medium rounded-full hover:bg-slate-800 transition-colors shadow-sm"
                  >
                    Join
                  </Link>
                </>
              )}
            </div>

            {/* Mobile menu button */}
            <div className="flex items-center md:hidden">
              <button
                onClick={toggleMenu}
                className="inline-flex items-center justify-center p-2 rounded-md text-slate-400 hover:text-slate-500 hover:bg-slate-100 focus:outline-none"
              >
                {mobileMenuOpen ? (
                  <X className="h-6 w-6" />
                ) : (
                  <Menu className="h-6 w-6" />
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Nav — animated fade-in/slide-down */}
        {mobileMenuOpen && (
          <div
            className="md:hidden bg-white border-b border-slate-200"
            style={{
              animation: 'mobileNavIn 170ms ease-out both',
            }}
          >
            <style>{`
              @keyframes mobileNavIn {
                from { opacity: 0; transform: translateY(-6px); }
                to   { opacity: 1; transform: translateY(0); }
              }
            `}</style>
            <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3">
              <Link
                to="/"
                onClick={toggleMenu}
                className="block px-3 py-2 rounded-md text-base font-medium text-slate-700 hover:text-slate-900 hover:bg-slate-50"
              >
                Home
              </Link>
              <button
                onClick={(e) => handleSectionNav(e, 'how-it-works', true)}
                className="block w-full text-left px-3 py-2 rounded-md text-base font-medium text-slate-700 hover:text-slate-900 hover:bg-slate-50"
              >
                How It Works
              </button>
              <button
                onClick={(e) => handleSectionNav(e, 'charity', true)}
                className="block w-full text-left px-3 py-2 rounded-md text-base font-medium text-slate-700 hover:text-slate-900 hover:bg-slate-50"
              >
                Charity
              </button>
              <button
                onClick={(e) => handleSectionNav(e, 'rewards', true)}
                className="block w-full text-left px-3 py-2 rounded-md text-base font-medium text-slate-700 hover:text-slate-900 hover:bg-slate-50"
              >
                Rewards
              </button>
              <div className="border-t border-slate-200 pt-4 pb-2">
                {isAuthenticated ? (
                  <>
                    <Link
                      to="/dashboard"
                      onClick={toggleMenu}
                      className="block px-3 py-2 rounded-md text-base font-medium text-slate-700 hover:text-slate-900 hover:bg-slate-50"
                    >
                      Dashboard
                    </Link>
                    <button
                      onClick={() => {
                        logout();
                        toggleMenu();
                      }}
                      className="block w-full text-left px-3 py-2 rounded-md text-base font-medium text-slate-700 hover:text-slate-900 hover:bg-slate-50"
                    >
                      Sign out
                    </button>
                  </>
                ) : (
                  <>
                    <Link
                      to="/login"
                      onClick={toggleMenu}
                      className="block px-3 py-2 rounded-md text-base font-medium text-slate-700 hover:text-slate-900 hover:bg-slate-50"
                    >
                      Log in
                    </Link>
                    <Link
                      to="/register"
                      onClick={toggleMenu}
                      className="block px-3 py-2 rounded-md text-base font-medium text-blue-600 hover:text-blue-700 hover:bg-slate-50"
                    >
                      Join Golfish
                    </Link>
                  </>
                )}
              </div>
            </div>
          </div>
        )}
      </header>

      <main className="flex-grow w-full">{children}</main>
      <PageTransition>
        <Outlet />
      </PageTransition>

      <footer className="bg-white border-t border-slate-200 pt-16 pb-8">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-12">
            <div className="col-span-1 md:col-span-2">
              <Link
                to="/"
                className="flex items-center gap-2 text-xl font-bold tracking-tight text-slate-900 mb-4"
              >
                <Hexagon className="w-6 h-6 text-blue-600 fill-blue-600/10" />
                <span>Golfish</span>
              </Link>
              <p className="text-slate-500 max-w-sm">
                Play your game. Make an impact. Join the modern community for
                golfers who care about performance and purpose.
              </p>
            </div>

            <div>
              <h3 className="text-sm font-semibold text-slate-900 tracking-wider uppercase mb-4">
                Product
              </h3>
              <ul className="space-y-3">
                <li>
                  <button
                    onClick={(e) => handleSectionNav(e, 'how-it-works')}
                    className="text-slate-500 hover:text-slate-900 transition-colors"
                  >
                    How it Works
                  </button>
                </li>
                <li>
                  <button
                    onClick={(e) => handleSectionNav(e, 'charity')}
                    className="text-slate-500 hover:text-slate-900 transition-colors"
                  >
                    Charity Impact
                  </button>
                </li>
                <li>
                  <button
                    onClick={(e) => handleSectionNav(e, 'rewards')}
                    className="text-slate-500 hover:text-slate-900 transition-colors"
                  >
                    Monthly Draws
                  </button>
                </li>
              </ul>
            </div>

            <div>
              <h3 className="text-sm font-semibold text-slate-900 tracking-wider uppercase mb-4">
                Account
              </h3>
              <ul className="space-y-3">
                {isAuthenticated ? (
                  <li>
                    <Link
                      to="/dashboard"
                      className="text-slate-500 hover:text-slate-900 transition-colors"
                    >
                      Dashboard
                    </Link>
                  </li>
                ) : (
                  <>
                    <li>
                      <Link
                        to="/login"
                        className="text-slate-500 hover:text-slate-900 transition-colors"
                      >
                        Log In
                      </Link>
                    </li>
                    <li>
                      <Link
                        to="/register"
                        className="text-slate-500 hover:text-slate-900 transition-colors"
                      >
                        Join
                      </Link>
                    </li>
                  </>
                )}
                <li>
                  <Link
                    to="#"
                    className="text-slate-500 hover:text-slate-900 transition-colors"
                  >
                    Terms of Service
                  </Link>
                </li>
                <li>
                  <Link
                    to="#"
                    className="text-slate-500 hover:text-slate-900 transition-colors"
                  >
                    Privacy Policy
                  </Link>
                </li>
              </ul>
            </div>
          </div>

          <div className="pt-8 border-t border-slate-200 text-center text-slate-500 text-sm">
            &copy; {new Date().getFullYear()} Golfish. All rights
            reserved.
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Layout;
