import { useEffect, useState } from "react";
import {
  userLicenseService,
  type MyLicense,
} from "@app/services/userLicenseService";

// Module-level cache so the current user's license is fetched once and shared across every tool
// button, rather than re-fetched per component instance.
let cachedLicense: MyLicense | null = null;
let inFlight: Promise<void> | null = null;
const listeners = new Set<() => void>();

function ensureLoaded(): void {
  if (cachedLicense !== null || inFlight !== null) {
    return;
  }
  inFlight = userLicenseService
    .getMyLicense()
    .then((license) => {
      cachedLicense = license;
      listeners.forEach((listener) => listener());
    })
    .catch(() => {
      // Fail open: if the license can't be read (endpoint missing, signed out, network error) we
      // simply don't gate anything in the UI. The backend remains the source of truth.
    })
    .finally(() => {
      inFlight = null;
    });
}

/**
 * The current user's admin-managed access license, or null until it has loaded (or if it could not
 * be read). Backed by a shared module-level cache so many callers trigger only one request.
 */
export function useUserLicense(): MyLicense | null {
  const [license, setLicense] = useState<MyLicense | null>(cachedLicense);

  useEffect(() => {
    const update = () => setLicense(cachedLicense);
    listeners.add(update);
    ensureLoaded();
    update();
    return () => {
      listeners.delete(update);
    };
  }, []);

  return license;
}
