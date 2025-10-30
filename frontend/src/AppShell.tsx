// src/AppShell.tsx
import { useEffect, useState } from "react";
import { BACKEND_URL } from "./config";
import { Header } from "./components/header";

type InitialData = {
  githubClientId: string | null;
  googleClientId: string | null;
  user: { id: string; name: string; avatar: string } | null;
};

export default function AppShell() {
  const [data, setData] = useState<InitialData | null>(null);

  useEffect(() => {
    (async () => {
      const r = await fetch(`${BACKEND_URL}/api/initial-data`, { credentials: "include" });
      const j = await r.json();
      setData({
        githubClientId: j.githubClientId || null,
        googleClientId: j.googleClientId || null,
        user: j.user || null,
      });
    })();
  }, []);

  if (!data) return null; // or a loader

  return (
    <Header
      githubClientId={data.githubClientId}
      googleClientId={data.googleClientId}  {/* <-- pass it */}
      user={data.user}
      openProfile={(id) => console.log("openProfile", id)}
    />
  );
}
