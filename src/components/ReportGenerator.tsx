"use client";

import { useState } from "react";
import { Log, Category } from "@/lib/types";
import { generateReport } from "@/lib/gameLogic";

interface ReportGeneratorProps {
  logs: Log[];
  categories: Category[];
}

export default function ReportGenerator({ logs, categories }: ReportGeneratorProps) {
  const today = new Date();
  const threeMonthsAgo = new Date(today);
  threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

  const fmt = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

  const [startDate, setStartDate] = useState(fmt(threeMonthsAgo));
  const [endDate, setEndDate] = useState(fmt(today));
  const [report, setReport] = useState("");
  const [copied, setCopied] = useState(false);

  const handleGenerate = () => {
    const text = generateReport(logs, categories, startDate, endDate);
    setReport(text);
    setCopied(false);
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(report);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
      const textarea = document.createElement("textarea");
      textarea.value = report;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="bg-gray-900/90 backdrop-blur rounded-t-2xl p-4 space-y-4">
      <h2 className="text-lg font-bold text-white">MBOレポート出力</h2>

      {/* Date Range */}
      <div className="flex items-center gap-2">
        <div className="flex-1">
          <label className="text-xs text-gray-400 block mb-1">開始日</label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:border-blue-400"
          />
        </div>
        <div className="text-gray-500 mt-5">〜</div>
        <div className="flex-1">
          <label className="text-xs text-gray-400 block mb-1">終了日</label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:border-blue-400"
          />
        </div>
      </div>

      {/* Generate Button */}
      <button
        onClick={handleGenerate}
        className="w-full py-3 bg-gradient-to-r from-purple-600 to-indigo-500 hover:from-purple-500 hover:to-indigo-400 text-white font-bold rounded-xl shadow-lg transition-all active:scale-95"
      >
        レポート生成
      </button>

      {/* Report Output */}
      {report && (
        <div className="space-y-2">
          <pre className="bg-gray-800 p-4 rounded-xl text-xs text-gray-200 overflow-x-auto whitespace-pre-wrap font-mono leading-relaxed max-h-80 overflow-y-auto">
            {report}
          </pre>
          <button
            onClick={handleCopy}
            className={`w-full py-2 rounded-xl font-bold text-sm transition-all ${
              copied
                ? "bg-green-600 text-white"
                : "bg-gray-700 hover:bg-gray-600 text-gray-200"
            }`}
          >
            {copied ? "コピーしました ✓" : "クリップボードにコピー"}
          </button>
        </div>
      )}
    </div>
  );
}
