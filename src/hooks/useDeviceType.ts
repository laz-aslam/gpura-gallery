"use client";

import { useState, useEffect } from "react";

interface DeviceType {
  isMobile: boolean;
  isTouch: boolean;
  isDesktop: boolean;
}

/**
 * Hook to detect device type based on screen size and input capabilities
 * - isMobile: Screen width < 768px
 * - isTouch: Device has coarse pointer (touch screen)
 * - isDesktop: Not mobile AND not primarily touch
 */
export function useDeviceType(): DeviceType {
  const [deviceType, setDeviceType] = useState<DeviceType>({
    isMobile: false,
    isTouch: false,
    isDesktop: true,
  });

  useEffect(() => {
    const checkDevice = () => {
      const isMobile = window.innerWidth < 768;
      const isTouch = window.matchMedia("(pointer: coarse)").matches;
      const isDesktop = !isMobile && !isTouch;

      setDeviceType({ isMobile, isTouch, isDesktop });
    };

    // Initial check
    checkDevice();

    // Listen for resize
    window.addEventListener("resize", checkDevice);

    // Also detect first touch event for hybrid devices
    const onFirstTouch = () => {
      setDeviceType((prev) => ({ ...prev, isTouch: true }));
    };
    window.addEventListener("touchstart", onFirstTouch, { once: true });

    return () => {
      window.removeEventListener("resize", checkDevice);
      window.removeEventListener("touchstart", onFirstTouch);
    };
  }, []);

  return deviceType;
}

/**
 * Hook to check if we're on the client side (for SSR safety)
 */
export function useIsClient(): boolean {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  return isClient;
}






