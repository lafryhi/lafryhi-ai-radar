import { MissionControlConsole } from "@/components/operator/mission-control-console";

export const dynamic = "force-dynamic";

export default function MissionControlPage() {
  const demoEnabled = process.env.AI_RADAR_DEMO_MODE === "true";
  return <>
    <header className="mission-page-header"><div><p className="mission-brand">AI Radar</p><p className="mission-tagline">Trusted Intelligence <span>·</span> Operator Workspace</p><p className="mission-product-tagline">Human-Verified AI Intelligence</p></div><div className="mission-environment"><span className="badge">{process.env.NODE_ENV === "production" ? "production" : "local"}</span>{demoEnabled && <span className="badge badge-approved">Demo Mode</span>}<span className="mission-status-dot"><i /> {demoEnabled ? "Ready" : "Demo disabled"}</span></div></header>
    <MissionControlConsole demoEnabled={demoEnabled} />
  </>;
}
