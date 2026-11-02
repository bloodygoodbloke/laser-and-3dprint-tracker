import { useEffect, useState } from "react";
import StlViewer from "./StlViewer";

interface JobFilePreviewProps {
  filePath: string;
  jobName: string;
  previewType: "svg" | "stl" | "image" | string;
}

const extensionOf = (path: string) => path.toLowerCase().split("?")[0].split(".").pop() || "";
const IMAGE_TYPES: Record<string, string> = {
  svg: "image/svg+xml", png: "image/png", jpg: "image/jpeg", jpeg: "image/jpeg", webp: "image/webp", gif: "image/gif",
};

// Uploads need the sign-in token, which plain links and <img> tags cannot send, so the file is fetched
// (the app's fetch adds the token) and shown from a temporary in-memory URL.
export default function JobFilePreview({ filePath, jobName, previewType }: JobFilePreviewProps) {
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [stlData, setStlData] = useState<ArrayBuffer | null>(null);

  useEffect(() => {
    let cancelled = false;
    let created: string | null = null;
    setBlobUrl(null);
    setStlData(null);
    setError("");

    fetch(filePath)
      .then(async (res) => {
        if (!res.ok) throw new Error(res.status === 401 || res.status === 403 ? "You do not have access to this file." : "File could not be loaded.");
        return res.blob();
      })
      .then(async (blob) => {
        // An <img> only renders an SVG when its type is image/svg+xml, so do not trust the server's Content-Type.
        const typed = IMAGE_TYPES[extensionOf(filePath)] ? new Blob([blob], { type: IMAGE_TYPES[extensionOf(filePath)] }) : blob;
        const buffer = previewType === "stl" ? await blob.arrayBuffer() : null;
        if (cancelled) return;
        created = URL.createObjectURL(typed);
        setStlData(buffer);
        setBlobUrl(created);
      })
      .catch((err) => { if (!cancelled) setError(err instanceof Error ? err.message : "File could not be loaded."); });

    return () => {
      cancelled = true;
      if (created) URL.revokeObjectURL(created);
    };
  }, [filePath, previewType]);

  const fileName = filePath.split("/").pop() || "file";

  if (error) return <p className="mt-3 text-sm font-medium text-amber-300" role="alert">{error}</p>;
  if (!blobUrl) return <p className="mt-3 text-sm text-slate-400">Loading file…</p>;

  return (
    <div className="mt-3 space-y-3">
      <div className="flex flex-wrap gap-3 text-xs">
        <a className="text-cyan-300 underline" href={blobUrl} target="_blank" rel="noreferrer">Open file</a>
        <a className="text-cyan-300 underline" href={blobUrl} download={fileName}>Download file</a>
      </div>
      {previewType === "svg" || previewType === "image" ? (
        <div className="overflow-hidden rounded-xl border border-slate-800 bg-white p-2">
          <img src={blobUrl} alt={`${jobName} preview`} className="max-h-72 w-full object-contain" />
        </div>
      ) : null}
      {previewType === "stl" && stlData ? (
        <div className="overflow-hidden rounded-xl border border-slate-800 bg-slate-900">
          <StlViewer data={stlData} label={jobName} />
        </div>
      ) : null}
    </div>
  );
}
