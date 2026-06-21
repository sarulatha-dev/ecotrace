import { useEffect, useState } from "react";

let inMemorySessionId: string | null = null;

export function useSessionId() {
  const [sessionId, setSessionId] = useState<string | null>(inMemorySessionId);

  useEffect(() => {
    if (!inMemorySessionId) {
      inMemorySessionId = crypto.randomUUID();
    }
    setSessionId(inMemorySessionId);
  }, []);

  return sessionId;
}

