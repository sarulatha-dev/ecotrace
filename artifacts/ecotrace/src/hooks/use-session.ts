import { useEffect, useState } from "react";

export function useSessionId() {
  const [sessionId, setSessionId] = useState<string | null>(null);

  useEffect(() => {
    let id = localStorage.getItem("ecotrace_session_id");
    if (!id) {
      id = crypto.randomUUID();
      localStorage.setItem("ecotrace_session_id", id);
    }
    setSessionId(id);
  }, []);

  return sessionId;
}
