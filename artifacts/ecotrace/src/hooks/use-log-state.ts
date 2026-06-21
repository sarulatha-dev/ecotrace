import { useState, useEffect } from "react";

let globalHasLogged = false;
const listeners = new Set<(val: boolean) => void>();

export function useLogState() {
  const [hasLogged, setHasLoggedInternal] = useState(globalHasLogged);

  useEffect(() => {
    const listener = (val: boolean) => {
      setHasLoggedInternal(val);
    };
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  }, []);

  const setHasLogged = (val: boolean) => {
    globalHasLogged = val;
    listeners.forEach((l) => l(val));
  };

  return [hasLogged, setHasLogged] as const;
}
