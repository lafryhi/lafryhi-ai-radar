"use client";

import { memo, useEffect, useMemo, useRef, useState } from "react";
import type { MissionControlResponse, PipelineStageName, PipelineStageResult } from "@/domain/mission-control";

const stages: Array<[PipelineStageName, string, string]> = [
  ["collect", "Collect", "Connecting to trusted AI sources..."],
  ["verify", "Verify", "Verifying evidence and source trust..."],
  ["analyze", "Analyze", "Calculating impact and confidence..."],
  ["rank", "Rank", "Ranking global AI events..."],
  ["editorial", "Editorial Review", "Preparing editorial intelligence..."],
  ["report", "Report", "Generating weekly report..."],
  ["video", "Video Package", "Preparing publication package..."],
];

function Icon({ name }: { name: "check" | "arrow" | "spark" | "clock" | "file" | "play" }) {
  if (name === "check") return <svg aria-hidden="true" viewBox="0 0 20 20"><path d="m4 10 4 4 8-8" /></svg>;
  if (name === "arrow") return <svg aria-hidden="true" viewBox="0 0 20 20"><path d="M4 10h11m-5-5 5 5-5 5" /></svg>;
  if (name === "spark") return <svg aria-hidden="true" viewBox="0 0 20 20"><path d="m10 2 1.5 5 5 1.5-5 1.5-1.5 5-1.5-5-5-1.5 5-1.5L10 2Zm6 11 .6 2.4L19 16l-2.4.6L16 19l-.6-2.4L13 16l2.4-.6L16 13Z" /></svg>;
  if (name === "clock") return <svg aria-hidden="true" viewBox="0 0 20 20"><circle cx="10" cy="10" r="7" /><path d="M10 6v4l2.5 1.5" /></svg>;
  if (name === "file") return <svg aria-hidden="true" viewBox="0 0 20 20"><path d="M5 2.5h7l3 3V17H5V2.5Zm7 0V6h3" /><path d="M7.5 9h5m-5 3h5" /></svg>;
  return <svg aria-hidden="true" viewBox="0 0 20 20"><path d="m7 5 7 5-7 5V5Z" /></svg>;
}

function AnimatedNumber({ value }: { value: number }) {
  const [display, setDisplay] = useState(value);
  useEffect(() => {
    if (value === 0) return;
    const started = performance.now();
    const frame = (time: number) => {
      const progress = Math.min(1, (time - started) / 650);
      setDisplay(Math.round(value * (1 - Math.pow(1 - progress, 3))));
      if (progress < 1) requestAnimationFrame(frame);
    };
    const id = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(id);
  }, [value]);
  return <>{value === 0 ? 0 : display}</>;
}

function ProgressRing({ progress, running, complete, live }: { progress: number; running: boolean; complete: boolean; live: boolean }) {
  const label = complete ? "Mission Complete" : live && !running && progress === 100 ? "Analysis Complete" : running ? "Mission Running" : "Ready";
  return <div className="mission-progress" aria-label={`${complete ? "100% " : progress ? `${progress}% ` : ""}${label}`} role="img">
    <svg viewBox="0 0 120 120"><circle className="mission-progress-track" cx="60" cy="60" r="50" /><circle className="mission-progress-value" cx="60" cy="60" r="50" pathLength="100" style={{ strokeDashoffset: 100 - progress }} /></svg>
    <div className="mission-progress-label">{progress === 0 && !running && !complete ? <strong>Ready</strong> : <><strong>{progress}%</strong><span>{label}</span></>}</div>
  </div>;
}

type DisplayStageStatus = "waiting" | "running" | "completed" | "failed" | "deferred" | "skipped";

const StageCard = memo(function StageCard({ definition, item, index, displayStatus }: { definition: typeof stages[number]; item?: PipelineStageResult; index: number; displayStatus: DisplayStageStatus }) {
  const [name, label, fallback] = definition;
  const statusLabel = displayStatus[0].toUpperCase() + displayStatus.slice(1);
  return <article className={`mission-stage-card mission-stage-${displayStatus}`} style={{ "--stage-delay": `${index * 55}ms` } as React.CSSProperties}>
    <div className="mission-stage-top"><span className="mission-stage-icon">{displayStatus === "completed" ? <Icon name="check" /> : displayStatus === "running" ? <span className="mission-stage-dot" /> : displayStatus === "failed" ? <span className="mission-stage-fail">!</span> : displayStatus === "deferred" ? <span>—</span> : displayStatus === "skipped" ? <span>—</span> : <span>{index + 1}</span>}</span><span className="mission-stage-status">{statusLabel}</span></div>
    <h3>{label}</h3><p>{item?.message || fallback}</p>
    <div className="mission-stage-meta"><span><Icon name="clock" />{displayStatus === "waiting" ? "—" : `${item?.elapsedMs ?? 0} ms`}</span><span>{displayStatus === "waiting" ? "—" : `${item?.inputCount ?? 0} in`}</span><span>{displayStatus === "waiting" ? "—" : `${item?.outputCount ?? 0} out`}</span></div>
    <span className="sr-only">Stage {name}</span>
  </article>;
});

export function MissionControlConsole({ demoEnabled }: { demoEnabled: boolean }) {
  const [mode, setMode] = useState<"demo" | "live">(demoEnabled ? "demo" : "live");
  const [result, setResult] = useState<MissionControlResponse | null>(null);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [completedStageCount, setCompletedStageCount] = useState(0);
  const [lastRun, setLastRun] = useState<{ completedAt: string; status: MissionControlResponse["status"] } | null>(null);
  const logRef = useRef<HTMLOListElement>(null);
  const run = async () => {
    setRunning(true); setError(null); setResult(null); setCompletedStageCount(0);
    const end = new Date(); const start = new Date(end.getTime() - 7 * 24 * 60 * 60 * 1000);
    try {
      const response = await fetch("/operator/mission-control/run", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ mode, period: { start: start.toISOString(), end: end.toISOString() } }) });
      const payload: unknown = await response.json();
      if (!response.ok) throw new Error(typeof payload === "object" && payload && "error" in payload ? String(payload.error) : "Mission Control failed safely.");
      const mission = payload as MissionControlResponse;
      setResult(mission); setLastRun({ completedAt: mission.completedAt, status: mission.status });
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Mission Control failed safely."); }
    finally { setRunning(false); }
  };
  useEffect(() => {
    const element = logRef.current; if (!element) return;
    const nearBottom = element.scrollHeight - element.scrollTop - element.clientHeight < 48;
    if (nearBottom) element.scrollTop = element.scrollHeight;
  }, [result?.logs.length]);
  useEffect(() => {
    if (!result || completedStageCount >= stages.length) return;
    const id = window.setInterval(() => setCompletedStageCount((count) => Math.min(stages.length, count + 1)), 520);
    return () => window.clearInterval(id);
  }, [result, completedStageCount]);
  const stageMap = useMemo(() => new Map(result?.stages.map((stage) => [stage.stage, stage]) ?? []), [result?.stages]);
  const summary = result?.summary;
  const liveResult = result?.mode === "live";
  const activeStageCount = liveResult ? 2 : stages.length;
  const missionAnimating = running || Boolean(result && completedStageCount < activeStageCount);
  const complete = result?.status === "success" && completedStageCount >= stages.length;
  const progress = running ? 8 : result ? liveResult ? Math.round((Math.min(completedStageCount, activeStageCount) / activeStageCount) * 100) : Math.round((completedStageCount / stages.length) * 100) : 0;
  const displayStatus = (index: number, item?: PipelineStageResult): DisplayStageStatus => {
    if (item?.status === "error") return "failed";
    if (!result) return running && index === 0 ? "running" : "waiting";
    if (liveResult && (index === 1 || index > 2)) return "deferred";
    const activeIndex = liveResult && index === 2 ? 1 : index;
    if (liveResult && index === 2 && item?.status === "warning" && completedStageCount > activeIndex) return "skipped";
    if (completedStageCount > activeIndex) return "completed";
    if (completedStageCount === activeIndex) return "running";
    return "waiting";
  };
  const lastRunLabel = lastRun ? new Date(lastRun.completedAt).toDateString() === new Date().toDateString() ? "Today" : new Date(lastRun.completedAt).toLocaleDateString(undefined, { month: "short", day: "numeric" }) : "No runs yet";
  const kpis: Array<[string, number, string]> = [["Sources", summary?.collected ?? 0, "trusted records"], ["Articles", summary?.qualified ?? 0, "qualified"], ["Verified", summary?.verified ?? 0, "evidence checked"], ["High impact", summary?.highImpact ?? 0, "priority signals"], ["Approved", summary?.approved ?? 0, "editorial decisions"], ["Report Ready", summary?.reportStatus === "ready" ? 1 : 0, "weekly intelligence"], ["Video Ready", summary?.videoPackageStatus === "ready" ? 1 : 0, "publication package"]];
  return <div className="mission-control-stack">
    <section className="mission-hero panel"><div className="mission-hero-copy"><span className="mission-kicker"><Icon name="spark" /> Weekly intelligence run</span><h2>Generate Weekly Intelligence</h2><p>One transparent workflow from trusted sources to editorial insight. Every conclusion remains traceable and human-controlled.</p><div className="mission-mode-control" role="group" aria-label="Execution mode"><span className={`badge mission-mode-badge ${mode === "live" ? "mission-live-badge" : ""}`}>{mode === "live" ? "Live Collection" : "Prepared Demo"}</span><button className={mode === "demo" ? "mission-mode-active" : ""} onClick={() => setMode("demo")} disabled={missionAnimating || !demoEnabled}>Prepared Demo</button><button className={mode === "live" ? "mission-mode-active" : ""} onClick={() => setMode("live")} disabled={missionAnimating}>Live Collection</button></div><div className="mission-action-row"><button className="mission-primary-button" onClick={run} disabled={missionAnimating || (mode === "demo" && !demoEnabled)}><span>{missionAnimating ? "Mission running" : complete ? "Run again" : mode === "live" ? "Collect Live Sources" : "Generate Weekly Intelligence"}</span>{missionAnimating ? <span className="mission-button-spinner" aria-hidden="true" /> : <Icon name="arrow" />}</button>{mode === "demo" && !demoEnabled && <span className="mission-disabled-note">Enable Demo Mode to run the prepared workflow.</span>}</div></div><ProgressRing progress={progress} running={missionAnimating} complete={complete} live={liveResult === true || mode === "live"} /></section>
    {mode === "demo" && !demoEnabled && <p className="notice" role="status">Demo Mode is disabled. Set <code>AI_RADAR_DEMO_MODE=true</code> to run the prepared workflow.</p>}
    {error && <p className="error" role="alert">{error}</p>}
    {complete && <section className="mission-success" role="status"><div className="mission-success-icon"><Icon name="check" /></div><div><p className="eyebrow">Mission completed</p><h2>Weekly Intelligence Ready</h2><p>Approved intelligence is ready for the next human publishing decision.</p></div><div className="mission-success-actions"><a className="button-link" href="#mission-report"><Icon name="file" /> Open Report</a><a className="button-link secondary" href="#mission-video"><Icon name="play" /> Open Video Package</a><button className="secondary" onClick={run}>Run Again</button></div></section>}
    {liveResult && !missionAnimating && <section className="mission-live-notice" role="status"><strong>Live collection and analysis complete</strong><span>Ranking, editorial review, report, and video remain deferred to Sprint 3.3.</span></section>}
    <section className="mission-section"><div className="mission-section-heading"><div><p className="eyebrow">Execution overview</p><h2>{complete ? "Mission complete" : missionAnimating ? "Mission in progress" : "Ready for your weekly run"}</h2></div>{result && <span className="badge badge-approved">{result.mode === "demo" ? "Demo Mode" : "Live"}</span>}</div>{result && <p className="muted mission-run-meta"><Icon name="clock" /> {result.elapsedMs} ms <span>·</span> Started {new Date(result.startedAt).toLocaleTimeString()} <span>·</span> Completed {new Date(result.completedAt).toLocaleTimeString()}</p>}</section>
    <section className="mission-last-run-panel"><div><p className="eyebrow">Run history</p><h2>Last Run</h2></div><div className="mission-last-run-detail">{lastRun ? <><strong>{lastRunLabel}</strong><span>{new Date(lastRun.completedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span><em className={lastRun.status === "success" ? "last-run-success" : "last-run-failed"}>{lastRun.status === "success" ? "Success" : "Failed"}</em></> : <strong className="last-run-empty">No runs yet</strong>}</div></section>
    <section className="mission-section"><div className="mission-section-heading"><div><p className="eyebrow">Seven-stage execution</p><h2>Pipeline progress</h2></div><small>Trust at every step</small></div><div className="mission-stage-grid">{stages.map((definition, index) => <StageCard key={definition[0]} definition={definition} item={stageMap.get(definition[0])} displayStatus={displayStatus(index, stageMap.get(definition[0]))} index={index} />)}</div></section>
    {result && <section className="mission-section"><div className="mission-kpi-grid">{kpis.map(([label, value, detail]) => <div className="mission-kpi" key={label}><span>{label}</span><strong><AnimatedNumber value={value} /></strong><small>{detail}</small></div>)}</div></section>}
    {liveResult && result.liveCollection && <section className="mission-live-summary"><div><p className="eyebrow">Live collection summary</p><strong>{result.liveCollection.successfulSources} of {result.liveCollection.eligibleLiveSources} sources returned usable data</strong></div><div><span>{result.liveCollection.totalRegistrySources} registry</span><span>{result.liveCollection.attemptedSources} attempted</span><span>{result.liveCollection.failedSources} failed</span><span>{result.liveCollection.duplicateRecords} duplicates</span></div></section>}
    {liveResult && result.liveAnalysis && <section className="mission-live-summary"><div><p className="eyebrow">Live analysis summary</p><strong>{result.liveAnalysis.analyzedItems} analyzed · {result.liveAnalysis.skippedItems} skipped · {result.liveAnalysis.failedItems} failed</strong></div><div><span>{result.liveAnalysis.durationMs} ms</span><span>{result.liveAnalysis.model ?? "Vertex AI"}</span><span>{result.liveAnalysis.promptVersion ?? "live-analysis-v1"}</span></div></section>}
    {result && <section className="mission-section"><div className="mission-section-heading"><div><p className="eyebrow">Activity</p><h2>Execution log</h2></div><small>{result.logs.length} updates</small></div><ol className="mission-log" ref={logRef} aria-label="Mission execution log">{result.logs.map((entry) => <li key={entry.id} className={`mission-log-${entry.level}`}><span className="mission-log-icon">{entry.level === "success" ? <Icon name="check" /> : <span />}</span><time>{new Date(entry.timestamp).toLocaleTimeString()}</time><span>{entry.message}</span></li>)}</ol></section>}
    {result && <section className="mission-section"><div className="mission-section-heading"><div><p className="eyebrow">Editorial intelligence</p><h2>{liveResult ? "Analyzed intelligence" : "Top stories"}</h2></div><small>{liveResult ? "Analysis rationale · Human review required" : "Ranked by impact, confidence, and evidence"}</small></div><div className="mission-items">{result.items.map((item, index) => <details className="mission-story" key={item.id} open={index === 0}><summary><span className="mission-story-rank">{String(index + 1).padStart(2, "0")}</span><span className="mission-story-main"><strong>{item.title}</strong><span>{item.sourceName} <i>·</i> {item.category}</span></span><span className="mission-story-score"><b>{item.impactScore}</b><small>impact</small></span><span className="mission-story-chevron">⌄</span></summary><div className="mission-story-detail"><p>{item.summary}</p><div className="mission-story-facts"><span><b>{item.confidenceScore}</b> confidence</span><span><b>{item.evidenceCount}</b> evidence</span><span className={`badge badge-${item.editorialStatus}`}>{item.analysisStatus === "completed" ? "Human review required" : item.analysisStatus ?? item.editorialStatus}</span></div>{item.impactRationale && <p><strong>Impact rationale:</strong> {item.impactRationale}</p>}{item.confidenceRationale && <p><strong>Confidence rationale:</strong> {item.confidenceRationale}</p>}{item.keyClaims && <ul>{item.keyClaims.map((claim) => <li key={claim.claim}>{claim.claim} <small>({claim.evidenceRefs.join(", ")})</small></li>)}</ul>}{item.limitations && item.limitations.length > 0 && <p className="muted"><strong>Limitations:</strong> {item.limitations.join(" ")}</p>}{!liveResult && <><p className="mission-why"><strong>Why ranked?</strong></p><ul>{item.whyRanked?.map((reason) => <li key={reason}>{reason}</li>)}</ul></>}</div></details>)}</div></section>}
    {result && <div className="mission-output-grid"><section className="mission-output-card" id="mission-report"><span className="mission-output-icon"><Icon name="file" /></span><div><p className="eyebrow">Report output</p><h3>{summary?.reportStatus === "ready" ? "Weekly report ready" : "Report pending"}</h3><p className="muted">Approved editorial items only.</p></div></section><section className="mission-output-card" id="mission-video"><span className="mission-output-icon"><Icon name="play" /></span><div><p className="eyebrow">Video output</p><h3>{summary?.videoPackageStatus === "ready" ? "Video package ready" : "Package pending"}</h3><p className="muted">Narration follows approved report content.</p></div></section></div>}
  </div>;
}
