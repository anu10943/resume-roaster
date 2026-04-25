"use client";

import { useCallback, useRef, useState } from "react";
import { RoastResponse, ScoreBreakdown } from "@/types";

const MAX_FILE_SIZE = 10 * 1024 * 1024;

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

const BREAKDOWN_LABELS: Record<keyof ScoreBreakdown, string> = {
  clarity: "Clarity",
  impact: "Impact",
  formatting: "Formatting",
  relevance: "Relevance",
  conciseness: "Conciseness",
};

function ScoreBar({ label, score }: { label: string; score: number }) {
  const color =
    score >= 70 ? "bg-green-500" : score >= 40 ? "bg-yellow-500" : "bg-red-500";
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-sm">
        <span className="text-gray-400">{label}</span>
        <span className="font-semibold text-white">{score}/100</span>
      </div>
      <div className="h-2 rounded-full bg-gray-800 overflow-hidden">
        <div
          className={`h-full rounded-full animate-bar ${color}`}
          style={{ width: `${score}%` }}
        />
      </div>
    </div>
  );
}

function ResultsCard({
  result,
  fileName,
  onRoastAnother,
}: {
  result: RoastResponse;
  fileName: string;
  onRoastAnother: () => void;
}) {
  return (
    <div className="max-w-2xl w-full space-y-5 animate-fade-in">
      {/* Header */}
      <div className="text-center space-y-1">
        <h1 className="text-4xl font-bold text-orange-500">Roast Complete 🔥</h1>
        <p className="text-gray-500 text-sm truncate">{fileName}</p>
      </div>

      {/* Card */}
      <div className="bg-white/5 border border-white/10 rounded-2xl divide-y divide-white/10 shadow-xl">

        {/* Roast line */}
        <div className="p-6">
          <p className="font-bold text-red-400 text-lg leading-snug">
            &ldquo;{result.roast}&rdquo;
          </p>
        </div>

        {/* Score */}
        <div className="p-6 space-y-4">
          <div className="flex items-baseline gap-2">
            <span className="text-5xl font-extrabold tabular-nums text-white">
              {result.score.overall}
            </span>
            <span className="text-gray-500 text-sm">/100 overall</span>
          </div>
          <div className="space-y-3">
            {(Object.keys(BREAKDOWN_LABELS) as (keyof ScoreBreakdown)[]).map((key) => (
              <ScoreBar
                key={key}
                label={BREAKDOWN_LABELS[key]}
                score={result.score.breakdown[key]}
              />
            ))}
          </div>
        </div>

        {/* Improvements */}
        <div className="p-6 space-y-4">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-gray-500">
            Top 5 Improvements
          </h2>
          <ol className="space-y-5">
            {result.improvements.slice(0, 5).map((item, i) => (
              <li key={i} className="space-y-1.5">
                <span className="text-orange-400 font-bold text-sm">#{i + 1}</span>
                <p className="text-sm text-gray-500 line-through leading-snug">
                  {item.before}
                </p>
                <p className="text-sm text-green-400 leading-snug">{item.after}</p>
              </li>
            ))}
          </ol>
        </div>

        {/* Vibe */}
        <div className="p-6">
          <p className="text-gray-400 italic text-sm">&ldquo;{result.vibe}&rdquo;</p>
        </div>
      </div>

      {/* Roast Another */}
      <button
        onClick={onRoastAnother}
        className="w-full border border-orange-500 text-orange-400 hover:bg-orange-500 hover:text-white font-semibold py-3 rounded-xl transition-colors"
      >
        Roast Another Resume
      </button>
    </div>
  );
}

export default function Home() {
  const [file, setFile] = useState<File | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [result, setResult] = useState<RoastResponse | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = (incoming: File | null) => {
    setUploadError(null);
    setApiError(null);
    setResult(null);
    if (!incoming) return;
    if (incoming.size > MAX_FILE_SIZE) {
      setUploadError(
        `File too large (${formatBytes(incoming.size)}). Max 10 MB.`,
      );
      return;
    }
    setFile(incoming);
  };

  const onInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    handleFile(e.target.files?.[0] ?? null);
    e.target.value = "";
  };

  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const onDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    handleFile(e.dataTransfer.files?.[0] ?? null);
  }, []);

  const clearFile = () => {
    setFile(null);
    setUploadError(null);
    setApiError(null);
    setResult(null);
  };

  const handleRoast = async () => {
    if (!file) return;
    setLoading(true);
    setApiError(null);
    setResult(null);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/roast", { method: "POST", body: formData });
      const data = await res.json();

      if (!res.ok) {
        setApiError(data.error ?? "Something went wrong. Please try again.");
        return;
      }

      setResult(data as RoastResponse);
    } catch {
      setApiError("Could not reach the server. Check your connection and try again.");
    } finally {
      setLoading(false);
    }
  };

  if (result && file) {
    return (
      <main className="min-h-screen bg-gray-950 text-white flex flex-col items-center justify-center p-8">
        <ResultsCard
          result={result}
          fileName={file.name}
          onRoastAnother={clearFile}
        />
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-950 text-white flex flex-col items-center justify-center p-8">
      <div className="max-w-2xl w-full space-y-6">
        {/* Heading */}
        <div className="text-center space-y-2">
          <h1 className="text-5xl font-bold text-orange-500">Resume Roaster</h1>
          <p className="text-gray-400 text-lg">
            Upload your resume and get brutally honest feedback.
          </p>
        </div>

        {/* Drop zone */}
        <div
          onClick={() => !file && inputRef.current?.click()}
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
          onDrop={onDrop}
          className={[
            "relative w-full border-2 border-dashed rounded-xl p-10 flex flex-col items-center justify-center gap-3 transition-colors",
            file
              ? "border-orange-500 bg-orange-500/5 cursor-default"
              : isDragging
              ? "border-orange-400 bg-orange-400/10 cursor-copy"
              : "border-gray-700 hover:border-gray-500 bg-gray-900 cursor-pointer",
          ].join(" ")}
        >
          <input
            ref={inputRef}
            type="file"
            accept=".pdf,.docx,.txt"
            className="hidden"
            onChange={onInputChange}
          />

          {file ? (
            <div className="flex items-center gap-3 w-full">
              <div className="text-3xl">📄</div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-gray-100 truncate">{file.name}</p>
                <p className="text-sm text-gray-400">{formatBytes(file.size)}</p>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  clearFile();
                }}
                className="flex-shrink-0 text-gray-500 hover:text-white transition-colors text-xl leading-none"
                aria-label="Remove file"
              >
                ✕
              </button>
            </div>
          ) : (
            <>
              <div className="text-4xl">📎</div>
              <p className="text-gray-300 font-medium">
                {isDragging ? "Drop it here!" : "Drag & drop your resume"}
              </p>
              <p className="text-gray-500 text-sm">
                or click to browse — PDF, DOCX, TXT · max 10 MB
              </p>
            </>
          )}
        </div>

        {/* Upload validation error */}
        {uploadError && (
          <p className="text-red-400 text-sm text-center">{uploadError}</p>
        )}

        {/* API error */}
        {apiError && (
          <div className="bg-red-950/40 border border-red-800 rounded-xl p-4 text-red-300 text-sm text-center">
            {apiError}
          </div>
        )}

        {/* Roast button */}
        {file && (
          <button
            onClick={handleRoast}
            disabled={loading}
            className="w-full bg-orange-500 hover:bg-orange-600 disabled:opacity-60 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-xl transition-colors flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Roasting…
              </>
            ) : (
              "Roast My Resume 🔥"
            )}
          </button>
        )}
      </div>
    </main>
  );
}
