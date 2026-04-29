import { useEffect, useRef } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import AppLayout from "@/components/AppLayout";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

declare global { interface Window { JitsiMeetExternalAPI: any; } }

export default function LiveRoom() {
  const { id } = useParams<{ id: string }>();
  const { profile } = useAuth();
  const ref = useRef<HTMLDivElement>(null);
  const [session, setSession] = useState<any>(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (!id) return;
    supabase.from("live_sessions").select("*, batches(name)").eq("id", id).maybeSingle().then(({ data }) => setSession(data));
  }, [id]);

  useEffect(() => {
    if (!session || !ref.current) return;
    const ensureScript = () =>
      new Promise<void>((resolve) => {
        if (window.JitsiMeetExternalAPI) return resolve();
        const s = document.createElement("script");
        s.src = "https://meet.jit.si/external_api.js";
        s.onload = () => resolve();
        document.body.appendChild(s);
      });
    let api: any;
    ensureScript().then(() => {
      api = new window.JitsiMeetExternalAPI("meet.jit.si", {
        roomName: session.jitsi_room,
        parentNode: ref.current,
        width: "100%",
        height: "100%",
        userInfo: { displayName: profile?.full_name ?? "Guest" },
        configOverwrite: { prejoinPageEnabled: false, startWithAudioMuted: true },
      });
    });
    return () => { try { api?.dispose(); } catch {} };
  }, [session, profile]);

  return (
    <AppLayout>
      <div className="h-screen flex flex-col">
        <div className="px-6 py-3 border-b flex items-center justify-between bg-card">
          <div className="flex items-center gap-3">
            <Button size="sm" variant="ghost" onClick={() => navigate(-1)}>
              <ArrowLeft className="h-4 w-4 mr-1" /> Back
            </Button>
            <div>
              <div className="font-semibold">{session?.title ?? "Live class"}</div>
              <div className="text-xs text-muted-foreground">{session?.batches?.name}</div>
            </div>
          </div>
        </div>
        <div ref={ref} className="flex-1 bg-black" />
      </div>
    </AppLayout>
  );
}
