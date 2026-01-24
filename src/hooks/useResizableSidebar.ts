import { useState, useEffect, useRef, useCallback } from "react";

const MIN_SIDEBAR_WIDTH = 200;
const MAX_SIDEBAR_WIDTH = 500;
const MIN_MAIN_WIDTH = 600;
const MOBILE_BREAKPOINT = 768;

interface UseResizableSidebarOptions {
  defaultWidth?: number;
}

interface UseResizableSidebarReturn {
  // State
  sidebarCollapsed: boolean;
  sidebarWidth: number;
  isMobile: boolean;
  crossingBreakpoint: boolean;
  // Refs for DOM elements
  sidebarRef: React.RefObject<HTMLDivElement | null>;
  headerRef: React.RefObject<HTMLDivElement | null>;
  navRef: React.RefObject<HTMLDivElement | null>;
  // Handlers
  handleResizeMouseDown: (e: React.MouseEvent) => void;
  toggleSidebar: () => void;
  closeSidebar: () => void;
}

export function useResizableSidebar(
  options: UseResizableSidebarOptions = {}
): UseResizableSidebarReturn {
  const { defaultWidth = 300 } = options;

  const getInitialMobile = () =>
    typeof window !== "undefined" && window.innerWidth <= MOBILE_BREAKPOINT;

  const [sidebarCollapsed, setSidebarCollapsed] = useState(getInitialMobile);
  const [sidebarWidth, setSidebarWidth] = useState(defaultWidth);
  const [isMobile, setIsMobile] = useState(getInitialMobile);
  const [crossingBreakpoint, setCrossingBreakpoint] = useState(false);

  const wasAutoCollapsed = useRef(getInitialMobile());
  const preferredSidebarWidth = useRef(defaultWidth);
  const sidebarRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLDivElement>(null);
  const navRef = useRef<HTMLDivElement>(null);

  // Track window resize for responsive behavior
  useEffect(() => {
    const handleResize = () => {
      const viewportWidth = window.innerWidth;
      const mobile = viewportWidth <= MOBILE_BREAKPOINT;

      // Handle mobile breakpoint crossing
      if (mobile !== isMobile) {
        setCrossingBreakpoint(true);
        requestAnimationFrame(() => {
          requestAnimationFrame(() => setCrossingBreakpoint(false));
        });
        setIsMobile(mobile);
      }

      if (mobile) {
        // Mobile mode - collapse sidebar
        setSidebarCollapsed((prev) => {
          if (!prev) {
            wasAutoCollapsed.current = true;
            return true;
          }
          return prev;
        });
      } else {
        // Desktop mode - calculate available width for sidebar
        const availableForSidebar = viewportWidth - MIN_MAIN_WIDTH;

        setSidebarCollapsed((prevCollapsed) => {
          if (
            prevCollapsed &&
            wasAutoCollapsed.current &&
            availableForSidebar >= MIN_SIDEBAR_WIDTH
          ) {
            // Restore sidebar - it was auto-collapsed and now there's room
            const newWidth = Math.min(
              preferredSidebarWidth.current,
              Math.max(MIN_SIDEBAR_WIDTH, availableForSidebar)
            );
            setSidebarWidth(newWidth);
            wasAutoCollapsed.current = false;
            return false;
          } else if (!prevCollapsed) {
            if (availableForSidebar < MIN_SIDEBAR_WIDTH) {
              // Not enough room - auto-collapse
              wasAutoCollapsed.current = true;
              return true;
            } else {
              // Constrain sidebar width to available space
              const newWidth = Math.min(
                preferredSidebarWidth.current,
                Math.max(MIN_SIDEBAR_WIDTH, availableForSidebar)
              );
              setSidebarWidth(newWidth);
            }
          }
          return prevCollapsed;
        });
      }
    };

    window.addEventListener("resize", handleResize);
    // Run once on mount to set initial constrained width
    handleResize();
    return () => window.removeEventListener("resize", handleResize);
  }, [isMobile]);

  // Resize handler - set up listeners on mousedown, no state needed
  const handleResizeMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();

      let currentWidth = sidebarWidth;

      // Add is-resizing class directly to avoid re-render
      const viewer = sidebarRef.current?.closest(".diff-viewer");
      viewer?.classList.add("is-resizing");

      const handleMouseMove = (e: MouseEvent) => {
        const viewportWidth = window.innerWidth;
        const maxAllowed = Math.min(
          MAX_SIDEBAR_WIDTH,
          viewportWidth - MIN_MAIN_WIDTH
        );
        const newWidth = Math.min(
          maxAllowed,
          Math.max(MIN_SIDEBAR_WIDTH, e.clientX)
        );
        currentWidth = newWidth;
        preferredSidebarWidth.current = newWidth;

        // Direct DOM manipulation for smooth resizing
        if (sidebarRef.current) {
          sidebarRef.current.style.width = `${newWidth}px`;
          sidebarRef.current.style.minWidth = `${newWidth}px`;
        }
        if (headerRef.current) {
          headerRef.current.style.left = `${newWidth}px`;
        }
        if (navRef.current) {
          navRef.current.style.transform = `translateX(calc(-50% + ${newWidth / 2}px))`;
        }
      };

      const handleMouseUp = () => {
        // Remove is-resizing class
        viewer?.classList.remove("is-resizing");
        // Commit final width to state
        setSidebarWidth(currentWidth);
        // Clean up listeners
        document.removeEventListener("mousemove", handleMouseMove);
        document.removeEventListener("mouseup", handleMouseUp);
      };

      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
    },
    [sidebarWidth]
  );

  const toggleSidebar = useCallback(() => {
    wasAutoCollapsed.current = false;
    setSidebarCollapsed((prev) => !prev);
  }, []);

  const closeSidebar = useCallback(() => {
    setSidebarCollapsed(true);
  }, []);

  return {
    sidebarCollapsed,
    sidebarWidth,
    isMobile,
    crossingBreakpoint,
    sidebarRef,
    headerRef,
    navRef,
    handleResizeMouseDown,
    toggleSidebar,
    closeSidebar,
  };
}
