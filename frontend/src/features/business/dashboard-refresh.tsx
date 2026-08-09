"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

export type BusinessDashboardRefreshHandler = () => void | Promise<void>;

export interface BusinessDashboardRefreshResult {
  attempted: number;
  failed: number;
}

interface BusinessDashboardRefreshValue {
  isRefreshing: boolean;
  refresh: () => Promise<BusinessDashboardRefreshResult>;
  register: (
    key: string,
    handler: BusinessDashboardRefreshHandler,
  ) => () => void;
}

const BusinessDashboardRefreshContext =
  createContext<BusinessDashboardRefreshValue | null>(null);

export function useBusinessDashboardRefreshController(
  refreshShared: BusinessDashboardRefreshHandler,
): BusinessDashboardRefreshValue {
  const handlersRef = useRef(new Map<string, BusinessDashboardRefreshHandler>());
  const inFlightRef = useRef<Promise<BusinessDashboardRefreshResult> | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const register = useCallback(
    (key: string, handler: BusinessDashboardRefreshHandler) => {
      handlersRef.current.set(key, handler);
      return () => {
        if (handlersRef.current.get(key) === handler) {
          handlersRef.current.delete(key);
        }
      };
    },
    [],
  );

  const refresh = useCallback(() => {
    if (inFlightRef.current) return inFlightRef.current;

    setIsRefreshing(true);
    const tasks = [refreshShared, ...handlersRef.current.values()];
    const request = Promise.allSettled(
      tasks.map((handler) => Promise.resolve().then(handler)),
    )
      .then((results) => ({
        attempted: results.length,
        failed: results.filter((result) => result.status === "rejected").length,
      }))
      .finally(() => {
        inFlightRef.current = null;
        setIsRefreshing(false);
      });
    inFlightRef.current = request;
    return request;
  }, [refreshShared]);

  return useMemo(
    () => ({ isRefreshing, refresh, register }),
    [isRefreshing, refresh, register],
  );
}

export function BusinessDashboardRefreshProvider({
  value,
  children,
}: {
  value: BusinessDashboardRefreshValue;
  children: ReactNode;
}) {
  return (
    <BusinessDashboardRefreshContext.Provider value={value}>
      {children}
    </BusinessDashboardRefreshContext.Provider>
  );
}

/** Registers only while its page is mounted, so global refresh targets the active route. */
export function useRegisterBusinessDashboardRefresh(
  key: string,
  handler: BusinessDashboardRefreshHandler,
) {
  const context = useContext(BusinessDashboardRefreshContext);
  const register = context?.register;

  useEffect(() => {
    if (!register) return;
    return register(key, handler);
  }, [handler, key, register]);
}
