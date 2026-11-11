"use client";

import React, { useState } from "react";
import {
  Film,
  Volume2,
  Eye,
  Clock,
  Sparkles,
  Copy,
  Check,
  Download,
  Printer,
  Code,
  FileText,
  CheckCircle2,
  AlertCircle,
  TrendingUp,
  Target,
  Megaphone,
  Radio,
  BookOpen,
} from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { Deliverable } from "@/lib/api";

interface DeliverableFormattedViewerProps {
  content: any;
  deliverable?: Deliverable | null;
  agentName?: string;
  agentRole?: string;
  qualityScore?: number;
  onDownloadJson?: () => void;
}

export default function DeliverableFormattedViewer({
  content,
  deliverable,
  agentName,
  agentRole,
  qualityScore,
  onDownloadJson,
}: DeliverableFormattedViewerProps) {
  const { isAr } = useI18n();
  const [showRawJson, setShowRawJson] = useState(false);
  const [copied, setCopied] = useState(false);

  // Normalize parsed content
  let parsedContent: Record<string, any> = {};
  if (typeof content === "string") {
    try {
      parsedContent = JSON.parse(content);
    } catch {
      parsedContent = { raw_text: content };
    }
  } else if (content && typeof content === "object") {
    parsedContent = content;
  }

  // Derive score
  const score =
    qualityScore ??
    deliverable?.quality_score ??
    parsedContent.quality_score ??
    95;

  // Determine deliverable archetype
  const hasTwoColumnScript =
    Array.isArray(parsedContent.two_column_script) &&
    parsedContent.two_column_script.length > 0;

  const hasScriptScenes =
    Array.isArray(parsedContent.script_scenes) &&
    parsedContent.script_scenes.length > 0;

  const isScriptDeliverable =
    hasTwoColumnScript ||
    hasScriptScenes ||
    (agentName && /script|video|سيناريو|فيديو/i.test(agentName)) ||
    (agentRole && /script|video|cinematic|narrative/i.test(agentRole));

  const isMarketingDeliverable =
    Boolean(
      parsedContent.headline || parsedContent.hook || parsedContent.body_copy
    ) && !hasTwoColumnScript;

  const isStrategyOrReport =
    Boolean(
      parsedContent.summary ||
      parsedContent.executive_summary ||
      parsedContent.sections ||
      parsedContent.findings ||
      parsedContent.recommendations ||
      parsedContent.competitors
    ) && !hasTwoColumnScript;

  // Extract score badge attributes
  const getScoreColor = (val: number) => {
    if (val >= 90) {
      return {
        text: "text-emerald-400",
        stroke: "#10b981",
        bg: "bg-emerald-500/10 border-emerald-500/30",
        label: isAr ? "ممتاز (معايير عالمية)" : "Exceptional Quality",
      };
    }
    if (val >= 75) {
      return {
        text: "text-amber-400",
        stroke: "#f59e0b",
        bg: "bg-amber-500/10 border-amber-500/30",
        label: isAr ? "جيد جداً (معتمد)" : "Very Good Quality",
      };
    }
    return {
      text: "text-rose-400",
      stroke: "#f43f5e",
      bg: "bg-rose-500/10 border-rose-500/30",
      label: isAr ? "يحتاج مراجعة" : "Needs Review",
    };
  };

  const scoreMeta = getScoreColor(score);
  const radius = 22;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset =
    circumference - (Math.min(100, Math.max(0, score)) / 100) * circumference;

  // Copy plain text content
  const handleCopyText = async () => {
    let plainText = "";

    if (hasTwoColumnScript) {
      plainText += `=== ${deliverable?.title || agentName || "Video Script"} ===\n`;
      if (parsedContent.hook_variations?.length) {
        plainText += `\n[HOOK VARIATIONS / زوايا الجذب]\n`;
        parsedContent.hook_variations.forEach((h: string, idx: number) => {
          plainText += `${idx + 1}. ${h}\n`;
        });
      }
      plainText += `\n[TWO-COLUMN SCRIPT / السيناريو ثنائي العمود]\n`;
      plainText += `--------------------------------------------------------\n`;
      parsedContent.two_column_script.forEach((scene: any, i: number) => {
        plainText += `[Scene ${i + 1}] Time: ${scene.timestamp || scene.duration || "N/A"}\n`;
        plainText += `VISUAL (الصورة): ${scene.visual_cue || scene.visual || ""}\n`;
        plainText += `AUDIO (الصوت):  ${scene.audio_vo || scene.audio || ""}\n`;
        if (scene.sfx) plainText += `SFX (المؤثرات): ${scene.sfx}\n`;
        plainText += `--------------------------------------------------------\n`;
      });
    } else if (isMarketingDeliverable) {
      if (parsedContent.headline)
        plainText += `HEADLINE: ${parsedContent.headline}\n\n`;
      if (parsedContent.subheadline)
        plainText += `SUBHEADLINE: ${parsedContent.subheadline}\n\n`;
      if (parsedContent.hook) plainText += `HOOK: ${parsedContent.hook}\n\n`;
      if (parsedContent.body_copy)
        plainText += `BODY COPY:\n${parsedContent.body_copy}\n\n`;
      if (parsedContent.call_to_action)
        plainText += `CALL TO ACTION: ${parsedContent.call_to_action}\n`;
    } else {
      // General structured text
      plainText = JSON.stringify(parsedContent, null, 2);
    }

    try {
      await navigator.clipboard.writeText(plainText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch (err) {
      console.error("Failed to copy text:", err);
    }
  };

  // Print PDF helper
  const handlePrintPdf = () => {
    window.print();
  };

  return (
    <div className="space-y-4">
      {/* Top Banner: Visual Quality Score + Action Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-gray-800 bg-[#12141e] p-3.5">
        {/* Left: Quality Circular Gauge */}
        <div className="flex items-center gap-3">
          <div className="relative flex h-14 w-14 items-center justify-center">
            <svg className="h-14 w-14 -rotate-90 transform" viewBox="0 0 54 54">
              <circle
                cx="27"
                cy="27"
                r={radius}
                stroke="#27272a"
                strokeWidth="4"
                fill="transparent"
              />
              <circle
                cx="27"
                cy="27"
                r={radius}
                stroke={scoreMeta.stroke}
                strokeWidth="4"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
                fill="transparent"
                className="transition-all duration-700 ease-out"
              />
            </svg>
            <div className="absolute flex flex-col items-center justify-center text-center">
              <span className={`text-xs font-black ${scoreMeta.text}`}>
                {score}%
              </span>
            </div>
          </div>

          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-bold text-white">
                {isAr ? "مؤشر جودة المخرج" : "Quality Benchmark Score"}
              </span>
              <span
                className={`rounded-full px-2 py-0.5 text-[10px] font-bold border ${scoreMeta.bg} ${scoreMeta.text}`}
              >
                {score}/100
              </span>
            </div>
            <p className="mt-0.5 text-[11px] text-gray-400">
              {scoreMeta.label} •{" "}
              {isAr ? "مفحوص بمعايير الامتثال" : "Audited by QA Standards"}
            </p>
          </div>
        </div>

        {/* Right: Action Buttons (Copy, Print/PDF, Raw JSON toggle) */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Copy Script / Text Button */}
          <button
            type="button"
            onClick={handleCopyText}
            className="inline-flex items-center gap-1.5 rounded-lg border border-gray-700 bg-gray-800/80 px-2.5 py-1.5 text-[11px] font-semibold text-gray-200 transition hover:bg-gray-700 hover:text-white"
            title={
              isAr
                ? "نسخ السكريبت كنص نظيف"
                : "Copy Formatted Script to Clipboard"
            }
          >
            {copied ? (
              <>
                <Check className="h-3.5 w-3.5 text-emerald-400" />
                <span className="text-emerald-400">
                  {isAr ? "تم النسخ!" : "Copied!"}
                </span>
              </>
            ) : (
              <>
                <Copy className="h-3.5 w-3.5 text-[#a78bfa]" />
                <span>{isAr ? "نسخ السكريبت" : "Copy Script"}</span>
              </>
            )}
          </button>

          {/* Export / Print PDF Button */}
          <button
            type="button"
            onClick={handlePrintPdf}
            className="inline-flex items-center gap-1.5 rounded-lg border border-gray-700 bg-gray-800/80 px-2.5 py-1.5 text-[11px] font-semibold text-gray-200 transition hover:bg-gray-700 hover:text-white"
            title={isAr ? "طباعة أو حفظ كـ PDF" : "Print or Export as PDF"}
          >
            <Printer className="h-3.5 w-3.5 text-cyan-400" />
            <span>{isAr ? "تصدير PDF" : "Print PDF"}</span>
          </button>

          {/* Developer Raw JSON Toggle */}
          <button
            type="button"
            onClick={() => setShowRawJson(!showRawJson)}
            className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-[11px] font-semibold transition ${
              showRawJson
                ? "border-[#8b5cf6] bg-[#8b5cf6]/20 text-white"
                : "border-gray-700 bg-gray-800/80 text-gray-300 hover:bg-gray-700 hover:text-white"
            }`}
            title={
              isAr
                ? "تبديل بين العرض المنسق وكود JSON للمطورين"
                : "Toggle Raw JSON for Developers"
            }
          >
            <Code className="h-3.5 w-3.5 text-purple-400" />
            <span>
              {showRawJson
                ? isAr
                  ? "العرض المنسق"
                  : "Formatted UI"
                : isAr
                  ? "كود JSON"
                  : "Raw JSON"}
            </span>
          </button>
        </div>
      </div>

      {/* Raw JSON View (when toggled by developers) */}
      {showRawJson ? (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs text-gray-400 px-1">
            <span className="font-mono text-[11px]">
              JSON Payload Contract:
            </span>
            {onDownloadJson && (
              <button
                type="button"
                onClick={onDownloadJson}
                className="inline-flex items-center gap-1 text-[#a78bfa] hover:text-white text-[11px]"
              >
                <Download className="h-3 w-3" />
                <span>{isAr ? "تحميل JSON" : "Download JSON"}</span>
              </button>
            )}
          </div>
          <pre
            data-testid="deliverable-json-output"
            className="max-h-[420px] overflow-auto rounded-xl border border-gray-800 bg-[#0d0e14] p-4 text-[11px] font-mono text-cyan-300 whitespace-pre-wrap break-all"
          >
            {JSON.stringify(parsedContent, null, 2)}
          </pre>
        </div>
      ) : (
        <div className="space-y-4">
          {/* AI Generated Artwork & Image Preview */}
          {(parsedContent.image_url || parsedContent.logo_url) && (
            <div className="overflow-hidden rounded-xl border border-indigo-500/30 bg-[#121124] p-4 shadow-xl shadow-purple-950/20">
              <div className="flex items-center justify-between pb-3 border-b border-indigo-500/20 mb-3">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-[#a78bfa]" />
                  <span className="text-xs font-bold text-white uppercase tracking-wider">
                    {isAr
                      ? "التصميم البصري المولد بالذكاء الاصطناعي (DALL-E 3 / Visual Output)"
                      : "AI Generated Artwork & Brand Visual (DALL-E 3)"}
                  </span>
                </div>
                <a
                  href={parsedContent.image_url || parsedContent.logo_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  download="ai-generated-artwork.png"
                  className="inline-flex items-center gap-1.5 rounded-lg border border-purple-500/40 bg-[#8b5cf6]/20 px-3 py-1.5 text-xs font-bold text-[#c4b5fd] hover:bg-[#8b5cf6]/30 transition"
                >
                  <Download className="h-3.5 w-3.5" />
                  <span>{isAr ? "تحميل الصورة" : "Download Image"}</span>
                </a>
              </div>

              <div className="relative group overflow-hidden rounded-lg border border-gray-800 bg-black/40">
                <img
                  src={parsedContent.image_url || parsedContent.logo_url}
                  alt={
                    parsedContent.headline ||
                    deliverable?.title ||
                    "AI Generated Visual Artwork"
                  }
                  className="w-full max-h-[360px] object-cover transition-transform duration-500 group-hover:scale-105"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-3">
                  <p className="text-xs text-white line-clamp-2">
                    {parsedContent.prompt ||
                      parsedContent.headline ||
                      parsedContent.concept ||
                      "AI Generated Visual Concept Artwork"}
                  </p>
                </div>
              </div>
            </div>
          )}

          {hasTwoColumnScript ? (
            /* ═════════════════════════════════════════════════════════════════════
           CASE 1: SCRIPTWRITER & VIDEO TWO-COLUMN SCRIPT
           ═════════════════════════════════════════════════════════════════════ */
            <div className="space-y-4">
              {/* Hook Variations (A/B Scroll-Stopping Hooks) */}
              {Array.isArray(parsedContent.hook_variations) &&
                parsedContent.hook_variations.length > 0 && (
                  <div className="rounded-xl border border-purple-500/30 bg-purple-950/20 p-3.5">
                    <div className="flex items-center gap-2 mb-2 text-xs font-bold text-purple-300">
                      <Sparkles className="h-4 w-4 text-[#a78bfa]" />
                      <span>
                        {isAr
                          ? "زوايا الجذب المقترحة لاختبار A/B (Hook Variations):"
                          : "Scroll-Stopping Hook Variations (A/B Testing):"}
                      </span>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-2">
                      {parsedContent.hook_variations.map(
                        (hook: string, idx: number) => (
                          <div
                            key={idx}
                            className="flex items-start gap-2.5 rounded-lg border border-purple-900/40 bg-[#141224] p-2.5 text-xs text-purple-100"
                          >
                            <span className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-purple-500/20 text-[10px] font-bold text-[#c4b5fd]">
                              {String.fromCharCode(65 + idx)}
                            </span>
                            <p className="leading-relaxed font-medium">
                              "{hook}"
                            </p>
                          </div>
                        )
                      )}
                    </div>
                  </div>
                )}

              {/* Quick Stats Badges */}
              <div className="flex flex-wrap items-center gap-2 text-[11px] text-gray-300">
                {parsedContent.total_words && (
                  <span className="inline-flex items-center gap-1 rounded-md border border-gray-800 bg-[#161824] px-2.5 py-1">
                    <BookOpen className="h-3 w-3 text-cyan-400" />
                    <span>
                      {isAr ? "إجمالي الكلمات:" : "Total Words:"}{" "}
                      <strong className="text-white">
                        {parsedContent.total_words}
                      </strong>
                    </span>
                  </span>
                )}
                {parsedContent.runtime_seconds && (
                  <span className="inline-flex items-center gap-1 rounded-md border border-gray-800 bg-[#161824] px-2.5 py-1">
                    <Clock className="h-3 w-3 text-amber-400" />
                    <span>
                      {isAr ? "المدة المستهدفة:" : "Target Runtime:"}{" "}
                      <strong className="text-white">
                        {parsedContent.runtime_seconds}s
                      </strong>
                    </span>
                  </span>
                )}
                {parsedContent.target_platform && (
                  <span className="inline-flex items-center gap-1 rounded-md border border-gray-800 bg-[#161824] px-2.5 py-1">
                    <Target className="h-3 w-3 text-emerald-400" />
                    <span>
                      {isAr ? "المنصة:" : "Platform:"}{" "}
                      <strong className="text-white">
                        {parsedContent.target_platform}
                      </strong>
                    </span>
                  </span>
                )}
              </div>

              {/* Two-Column Script Table */}
              <div className="overflow-hidden rounded-xl border border-gray-800 bg-[#0e1017]">
                <div className="border-b border-gray-800 bg-[#161824] px-4 py-2.5 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Film className="h-4 w-4 text-[#8b5cf6]" />
                    <span className="text-xs font-bold uppercase tracking-wider text-white">
                      {isAr
                        ? "جدول السيناريو المقسم (Two-Column Script)"
                        : "Audio-Visual Script Grid"}
                    </span>
                  </div>
                  <span className="text-[11px] text-gray-400">
                    {parsedContent.two_column_script.length}{" "}
                    {isAr ? "مشاهد" : "scenes"}
                  </span>
                </div>

                <div className="divide-y divide-gray-800/80 max-h-[460px] overflow-y-auto">
                  {parsedContent.two_column_script.map(
                    (scene: any, idx: number) => (
                      <div
                        key={idx}
                        className="grid grid-cols-1 md:grid-cols-12 gap-3 p-3.5 transition hover:bg-[#151722]"
                      >
                        {/* Timestamp & Scene Index */}
                        <div className="md:col-span-2 flex flex-row md:flex-col items-center md:items-start justify-between gap-1 border-b md:border-b-0 md:border-r border-gray-800 pb-2 md:pb-0 rtl:md:border-r-0 rtl:md:border-l">
                          <span className="inline-flex items-center gap-1 rounded bg-[#8b5cf6]/20 px-2 py-0.5 text-[11px] font-extrabold text-[#c4b5fd]">
                            {isAr ? `مشهد ${idx + 1}` : `Scene ${idx + 1}`}
                          </span>
                          <span className="inline-flex items-center gap-1 text-[11px] font-mono text-gray-400 mt-1">
                            <Clock className="h-3 w-3 text-gray-500" />
                            {scene.timestamp ||
                              scene.duration ||
                              `00:${idx * 5}`}
                          </span>
                        </div>

                        {/* Visual Cue (الكاميرا والصورة) */}
                        <div className="md:col-span-5 space-y-1.5">
                          <div className="flex items-center gap-1.5 text-[11px] font-bold text-cyan-400">
                            <Eye className="h-3.5 w-3.5" />
                            <span>
                              {isAr
                                ? "الكاميرا والصورة (Visual)"
                                : "Visual & Camera Action"}
                            </span>
                          </div>
                          <p className="text-xs leading-relaxed text-gray-200 bg-[#12141e] p-2.5 rounded-lg border border-gray-800/60 font-sans">
                            {scene.visual_cue ||
                              scene.visual ||
                              "No visual direction specified"}
                          </p>
                        </div>

                        {/* Audio / Voiceover (الصوت والتعليق) */}
                        <div className="md:col-span-5 space-y-1.5">
                          <div className="flex items-center justify-between text-[11px] font-bold text-emerald-400">
                            <div className="flex items-center gap-1.5">
                              <Volume2 className="h-3.5 w-3.5" />
                              <span>
                                {isAr
                                  ? "التعليق الصوتي (Voiceover)"
                                  : "Audio & Dialogue"}
                              </span>
                            </div>
                            {scene.sfx && (
                              <span className="rounded bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-mono text-amber-400 border border-amber-500/20">
                                SFX: {scene.sfx}
                              </span>
                            )}
                          </div>
                          <p className="text-xs leading-relaxed text-emerald-100 bg-[#0f1d17] p-2.5 rounded-lg border border-emerald-900/40 font-sans italic">
                            "
                            {scene.audio_vo ||
                              scene.audio ||
                              scene.dialogue ||
                              "—"}
                            "
                          </p>
                        </div>
                      </div>
                    )
                  )}
                </div>
              </div>
            </div>
          ) : isMarketingDeliverable ? (
            /* ═════════════════════════════════════════════════════════════════════
           CASE 2: MARKETING & PR COPYWRITER DELIVERABLES
           ═════════════════════════════════════════════════════════════════════ */
            <div className="space-y-4 rounded-xl border border-gray-800 bg-[#0e1017] p-5">
              {/* Headline */}
              {parsedContent.headline && (
                <div className="border-b border-gray-800 pb-4">
                  <span className="text-[10px] uppercase font-bold tracking-wider text-[#a78bfa] block mb-1">
                    {isAr ? "العنوان الرئيسي (Headline):" : "Primary Headline:"}
                  </span>
                  <h3 className="text-lg md:text-xl font-extrabold text-white leading-tight">
                    {parsedContent.headline}
                  </h3>
                  {parsedContent.subheadline && (
                    <p className="text-xs md:text-sm text-gray-400 mt-1 font-medium">
                      {parsedContent.subheadline}
                    </p>
                  )}
                </div>
              )}

              {/* Hook / Angle */}
              {parsedContent.hook && (
                <div className="rounded-lg border border-[#8b5cf6]/30 bg-[#8b5cf6]/10 p-3 text-xs">
                  <span className="font-bold text-[#c4b5fd] flex items-center gap-1.5 mb-1">
                    <Sparkles className="h-3.5 w-3.5" />
                    <span>
                      {isAr ? "زاوية الجذب (Magnetic Hook):" : "Magnetic Hook:"}
                    </span>
                  </span>
                  <p className="text-gray-200 leading-relaxed italic">
                    "{parsedContent.hook}"
                  </p>
                </div>
              )}

              {/* Body Copy */}
              {parsedContent.body_copy && (
                <div className="space-y-2">
                  <span className="text-[10px] uppercase font-bold tracking-wider text-gray-400 block">
                    {isAr
                      ? "نص المحتوى (Body Copy):"
                      : "Approved Copy Content:"}
                  </span>
                  <div className="rounded-lg border border-gray-800 bg-[#12141e] p-4 text-xs text-gray-200 leading-relaxed whitespace-pre-line font-sans">
                    {parsedContent.body_copy}
                  </div>
                </div>
              )}

              {/* Call to Action */}
              {parsedContent.call_to_action && (
                <div className="flex items-center gap-3 rounded-lg border border-emerald-500/30 bg-emerald-950/20 p-3">
                  <Megaphone className="h-5 w-5 text-emerald-400 shrink-0" />
                  <div>
                    <span className="text-[10px] uppercase font-bold text-emerald-400 block">
                      {isAr
                        ? "الدعوة لاتخاذ إجراء (Call To Action):"
                        : "Call to Action:"}
                    </span>
                    <p className="text-xs font-bold text-white mt-0.5">
                      {parsedContent.call_to_action}
                    </p>
                  </div>
                </div>
              )}

              {/* Key Takeaways */}
              {Array.isArray(parsedContent.key_takeaways) &&
                parsedContent.key_takeaways.length > 0 && (
                  <div className="pt-2">
                    <span className="text-[10px] uppercase font-bold tracking-wider text-gray-400 block mb-2">
                      {isAr
                        ? "النقاط المحورية (Key Takeaways):"
                        : "Key Strategic Takeaways:"}
                    </span>
                    <ul className="space-y-1.5">
                      {parsedContent.key_takeaways.map(
                        (item: string, idx: number) => (
                          <li
                            key={idx}
                            className="flex items-center gap-2 text-xs text-gray-300"
                          >
                            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                            <span>{item}</span>
                          </li>
                        )
                      )}
                    </ul>
                  </div>
                )}
            </div>
          ) : isStrategyOrReport ? (
            /* ═════════════════════════════════════════════════════════════════════
           CASE 3: STRATEGY, RESEARCH & ANALYSIS REPORTS
           ═════════════════════════════════════════════ */
            <div className="space-y-4 rounded-xl border border-gray-800 bg-[#0e1017] p-5">
              {/* Executive Summary */}
              {(parsedContent.summary || parsedContent.executive_summary) && (
                <div className="rounded-lg border border-cyan-500/30 bg-cyan-950/20 p-4">
                  <h4 className="text-xs font-bold text-cyan-300 flex items-center gap-2 mb-1.5">
                    <FileText className="h-4 w-4" />
                    <span>
                      {isAr
                        ? "الملخص التنفيذي (Executive Summary):"
                        : "Executive Summary:"}
                    </span>
                  </h4>
                  <p className="text-xs leading-relaxed text-gray-200">
                    {parsedContent.summary || parsedContent.executive_summary}
                  </p>
                </div>
              )}

              {/* Sections Grid */}
              {Array.isArray(parsedContent.sections) && (
                <div className="space-y-3">
                  {parsedContent.sections.map((sec: any, idx: number) => (
                    <div
                      key={idx}
                      className="rounded-lg border border-gray-800 bg-[#141622] p-3.5"
                    >
                      <h5 className="text-xs font-bold text-white mb-1">
                        {sec.title ||
                          `${isAr ? "القسم" : "Section"} ${idx + 1}`}
                      </h5>
                      <p className="text-xs text-gray-300 leading-relaxed">
                        {sec.content || sec.description || JSON.stringify(sec)}
                      </p>
                    </div>
                  ))}
                </div>
              )}

              {/* Recommendations / Findings */}
              {(Array.isArray(parsedContent.recommendations) ||
                Array.isArray(parsedContent.findings)) && (
                <div className="rounded-lg border border-emerald-500/30 bg-[#0f1d17] p-4">
                  <h4 className="text-xs font-bold text-emerald-400 flex items-center gap-2 mb-2">
                    <TrendingUp className="h-4 w-4" />
                    <span>
                      {isAr
                        ? "التوصيات والنتائج الرئيسية:"
                        : "Key Findings & Strategic Recommendations:"}
                    </span>
                  </h4>
                  <ul className="space-y-1.5">
                    {(
                      parsedContent.recommendations || parsedContent.findings
                    ).map((item: string, idx: number) => (
                      <li
                        key={idx}
                        className="flex items-start gap-2 text-xs text-emerald-100"
                      >
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 shrink-0 mt-0.5" />
                        <span>
                          {typeof item === "string"
                            ? item
                            : JSON.stringify(item)}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ) : (
            /* ═════════════════════════════════════════════════════════════════════
           CASE 4: GENERAL STRUCTURED CARD VIEW (CLEAN DATA PRESENTATION)
           ═════════════════════════════════════════════ */
            <div className="rounded-xl border border-gray-800 bg-[#0e1017] p-4 space-y-3">
              <div className="text-xs font-bold text-gray-300 border-b border-gray-800 pb-2 flex items-center justify-between">
                <span>
                  {isAr
                    ? "بيانات المخرج المعتمدة:"
                    : "Structured Deliverable Attributes:"}
                </span>
                <span className="text-[10px] text-gray-500 font-mono">
                  {Object.keys(parsedContent).length} fields
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[420px] overflow-y-auto pr-1">
                {Object.entries(parsedContent).map(([key, val]) => {
                  if (
                    key === "quality_score" ||
                    key === "image_url" ||
                    key === "logo_url"
                  )
                    return null;

                  return (
                    <div
                      key={key}
                      className="rounded-lg border border-gray-800/80 bg-[#141624] p-3 text-xs"
                    >
                      <span className="text-[10px] uppercase font-bold tracking-wider text-[#a78bfa] block mb-1">
                        {key.replace(/_/g, " ")}:
                      </span>
                      {typeof val === "string" ||
                      typeof val === "number" ||
                      typeof val === "boolean" ? (
                        <p className="text-gray-200 font-sans leading-relaxed break-words">
                          {String(val)}
                        </p>
                      ) : Array.isArray(val) ? (
                        <div className="space-y-1 mt-1">
                          {val.map((item, i) => (
                            <div
                              key={i}
                              className="text-[11px] text-gray-300 bg-[#0e1017] p-1.5 rounded border border-gray-800/60"
                            >
                              {typeof item === "object"
                                ? JSON.stringify(item)
                                : String(item)}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <pre className="text-[10px] font-mono text-cyan-300 bg-[#0e1017] p-2 rounded overflow-x-auto">
                          {JSON.stringify(val, null, 2)}
                        </pre>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
