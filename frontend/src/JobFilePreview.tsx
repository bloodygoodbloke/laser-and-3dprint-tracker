import { createElement, useEffect, useState } from "react";

interface JobFilePreviewProps {
  filePath: string;
  jobName: string;
  previewType: "svg" | "stl" | string;
}

// Uploads need the sign-in token, which plain links and <img> tags cannot send, so the file is fetched
// (the app's fetch adds the token) and shown from a temporary in-memory URL.
export default function JobFilePreview({ filePath, jobName, previewType }: JobFilePreviewProps) {
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    let created: string | null = null;
    setBlobUrl(null);
    setError("");

    fetch(filePath)
      .then(async (res) => {
        if (!res.ok) throw new Error(res.status === 401 || res.status === 403 ? "You do not have access to this file." : "File could not be loaded.");
        return res.blob();
      })
      .then((blob) => {
        if (cancelled) return;
        created = URL.createObjectURL(blob);
        setBlobUrl(created);
      })
      .catch((err) => { if (!cancelled) setError(err instanceof Error ? err.message : "File could not be loaded."); });

    return () => {
      cancelled = true;
      if (created) URL.revokeObjectURL(created);
    };
  }, [filePath]);

  const fileName = filePath.split("/").pop() || "file";

  if (error) return <p className="mt-3 text-sm text-amber-300">{error}</p>;
  if (!blobUrl) return <p className="mt-3 text-sm text-slate-400">Loading file…</p>;

  return (
    <div className="mt-3 space-y-3">
      <div className="flex flex-wrap gap-3 text-xs">
        <a className="text-cyan-300 underline" href={blobUrl} target="_blank" rel="noreferrer">Open file</a>
        <a className="text-cyan-300 underline" href={blobUrl} download={fileName}>Download file</a>
      </div>
      {previewType === "svg" ? (
        <div className="overflow-hidden rounded-xl border border-slate-800 bg-white p-2">
          <img src={blobUrl} alt={`${jobName} preview`} className="max-h-72 w-full object-contain" />
        </div>
      ) : null}
      {previewType === "stl" ? (
        <div className="overflow-hidden rounded-xl border border-slate-800 bg-slate-900">
          {createElement("model-viewer", {
            src: blobUrl,
            style: { width: "100%", height: "320px", backgroundColor: "#0f172a" },
            "camera-controls": "",
            "auto-rotate": "",
            "shadow-intensity": "1",
            exposure: "1",
          })}
        </div>
      ) : null}
    </div>
  );
}
