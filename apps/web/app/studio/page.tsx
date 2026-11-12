"use client";

import React, { useState, useEffect } from "react";
import {
  Film,
  Palette,
  ShieldAlert,
  TrendingUp,
  Sparkles,
  Play,
  CheckCircle2,
  Clock,
  ArrowRight,
  ChevronRight,
  Download,
  Edit3,
  Save,
  RefreshCw,
  FileText,
  Check,
  Printer,
  Bot,
  Sliders,
  Layers,
  Wand2,
  Brain,
  X,
  Eye,
} from "lucide-react";

import AppShell from "@/components/AppShell";
import { useI18n } from "@/lib/i18n";
import {
  STUDIO_PLAYBOOKS,
  StudioPlaybook,
  StudioStep,
  PlaybookId,
} from "@/lib/studioPlaybooks";
import { executeAgentStream, Deliverable } from "@/lib/api";
import DeliverableFormattedViewer from "@/components/DeliverableFormattedViewer";

interface StepState {
  status: "pending" | "running" | "ready" | "approved";
  deliverable: Deliverable | null;
  output: Record<string, any> | null;
  customPrompt: string;
  isEditingText: boolean;
  editedRawText: string;
}

export default function ProductionStudioPage() {
  const { t, isAr } = useI18n();

  // Selected Playbook
  const [activePlaybookId, setActivePlaybookId] =
    useState<PlaybookId>("video-campaign");
  const activePlaybook =
    STUDIO_PLAYBOOKS.find(p => p.id === activePlaybookId) ||
    STUDIO_PLAYBOOKS[0];

  // Global Campaign Metadata
  const [clientName, setClientName] = useState(activePlaybook.defaultClient);
  const [targetAudience, setTargetAudience] = useState(
    activePlaybook.defaultAudience
  );
  const [toneOfVoice, setToneOfVoice] = useState(activePlaybook.defaultTone);

  // Active Focused Step Index (0, 1, 2, 3)
  const [activeStepIndex, setActiveStepIndex] = useState(0);

  // Per-step execution & deliverables state
  const [stepsState, setStepsState] = useState<Record<string, StepState>>({});
  const [isAutoRunningAll, setIsAutoRunningAll] = useState(false);
  const [streamingText, setStreamingText] = useState("");
  const [exportModalOpen, setExportModalOpen] = useState(false);

  // Initialize or reset steps when playbook changes
  useEffect(() => {
    setClientName(activePlaybook.defaultClient);
    setTargetAudience(activePlaybook.defaultAudience);
    setToneOfVoice(activePlaybook.defaultTone);
    setActiveStepIndex(0);

    const initial: Record<string, StepState> = {};
    activePlaybook.steps.forEach(step => {
      initial[step.id] = {
        status: "pending",
        deliverable: null,
        output: null,
        customPrompt: isAr ? step.defaultPromptAr : step.defaultPromptEn,
        isEditingText: false,
        editedRawText: "",
      };
    });
    setStepsState(initial);
  }, [activePlaybookId, isAr]);

  const activeStep: StudioStep =
    activePlaybook.steps[activeStepIndex] || activePlaybook.steps[0];
  const activeStepState: StepState = stepsState[activeStep?.id] || {
    status: "pending",
    deliverable: null,
    output: null,
    customPrompt: activeStep
      ? isAr
        ? activeStep.defaultPromptAr
        : activeStep.defaultPromptEn
      : "",
    isEditingText: false,
    editedRawText: "",
  };

  // Run a single step via agent streaming
  const handleRunStep = async (stepIndexToRun: number) => {
    const stepToRun = activePlaybook.steps[stepIndexToRun];
    if (!stepToRun) return;

    const currentPrompt =
      stepsState[stepToRun.id]?.customPrompt ||
      (isAr ? stepToRun.defaultPromptAr : stepToRun.defaultPromptEn);

    // Update state to running
    setStepsState(prev => ({
      ...prev,
      [stepToRun.id]: {
        ...prev[stepToRun.id],
        status: "running",
      },
    }));
    setStreamingText("");

    const payloadInput = {
      brief: currentPrompt,
      task_brief: currentPrompt,
      client_name: clientName,
      project_name: clientName,
      brand_name: clientName,
      target_audience: targetAudience,
      tone: toneOfVoice,
      colors: "Modern & Royal",
      campaign_goal: currentPrompt,
    };

    try {
      await executeAgentStream(
        stepToRun.agentId,
        {
          title: `${clientName} - ${stepToRun.titleEn}`,
          input: payloadInput,
        },
        token => {
          if (stepIndexToRun === activeStepIndex) {
            setStreamingText(prev => prev + token);
          }
        },
        result => {
          setStepsState(prev => ({
            ...prev,
            [stepToRun.id]: {
              ...prev[stepToRun.id],
              status: "ready",
              deliverable: result.deliverable,
              output: result.output,
              editedRawText: JSON.stringify(result.output, null, 2),
            },
          }));
          setStreamingText("");
        },
        err => {
          console.error("Step execution error:", err);
          setStepsState(prev => ({
            ...prev,
            [stepToRun.id]: {
              ...prev[stepToRun.id],
              status: "pending",
            },
          }));
          setStreamingText("");
        }
      );
    } catch (err) {
      console.error("Failed to run step:", err);
      setStepsState(prev => ({
        ...prev,
        [stepToRun.id]: {
          ...prev[stepToRun.id],
          status: "pending",
        },
      }));
    }
  };

  // Run all 4 steps sequentially
  const handleAutoRunPipeline = async () => {
    setIsAutoRunningAll(true);
    for (let i = 0; i < activePlaybook.steps.length; i++) {
      setActiveStepIndex(i);
      await handleRunStep(i);
    }
    setIsAutoRunningAll(false);
  };

  // Approve Step and auto-advance
  const handleApproveStep = (stepId: string) => {
    setStepsState(prev => ({
      ...prev,
      [stepId]: {
        ...prev[stepId],
        status: "approved",
      },
    }));

    if (activeStepIndex < activePlaybook.steps.length - 1) {
      setActiveStepIndex(prev => prev + 1);
    }
  };

  // Save in-place edited deliverable
  const handleSaveEditedText = (stepId: string) => {
    const raw = stepsState[stepId]?.editedRawText || "";
    try {
      const parsed = JSON.parse(raw);
      setStepsState(prev => ({
        ...prev,
        [stepId]: {
          ...prev[stepId],
          output: parsed,
          isEditingText: false,
        },
      }));
    } catch {
      // If plain text was edited, store in raw_text attribute
      setStepsState(prev => ({
        ...prev,
        [stepId]: {
          ...prev[stepId],
          output: {
            ...prev[stepId]?.output,
            custom_edited_note: raw,
          },
          isEditingText: false,
        },
      }));
    }
  };

  const getPlaybookIcon = (id: PlaybookId) => {
    switch (id) {
      case "video-campaign":
        return <Film className="h-5 w-5 text-purple-400" />;
      case "brand-identity":
        return <Palette className="h-5 w-5 text-amber-400" />;
      case "crisis-control":
        return <ShieldAlert className="h-5 w-5 text-rose-400" />;
      case "performance-growth":
        return <TrendingUp className="h-5 w-5 text-emerald-400" />;
      case "founder-validation":
        return <Brain className="h-5 w-5 text-blue-400" />;
    }
  };

  const totalCompleted = Object.values(stepsState).filter(
    s => s.status === "approved" || s.status === "ready"
  ).length;

  return (
    <AppShell>
      <div className="space-y-6 pb-12">
        {/* Top Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-800 pb-5">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#8b5cf6]/20 text-[#c4b5fd]">
                <Wand2 className="h-4 w-4" />
              </span>
              <h1 className="text-xl md:text-2xl font-black text-white tracking-tight">
                {isAr
                  ? "استوديو العمل ومسارات الإنتاج المتكاملة"
                  : "Production Studio & Campaign Playbooks"}
              </h1>
              <span className="rounded-full bg-emerald-500/15 border border-emerald-500/30 px-2.5 py-0.5 text-[11px] font-bold text-emerald-400">
                {isAr ? "تحكم كامل وتعديل فوري" : "Full Control & Live Edit"}
              </span>
            </div>
            <p className="text-xs md:text-sm text-gray-400">
              {isAr
                ? "اختر نوع المشروع المطلوب، وتابع فريق الوكلاء الذكي خطوة بخطوة مع إمكانية مراجعة وتعديل كل مخرج فوراً."
                : "Choose a production playbook, supervise specialized agents step-by-step, and tweak deliverables on the fly."}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleAutoRunPipeline}
              disabled={isAutoRunningAll}
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#8b5cf6] to-indigo-600 px-4 py-2.5 text-xs font-bold text-white shadow-lg shadow-[#8b5cf6]/25 transition hover:brightness-110 disabled:opacity-50"
            >
              {isAutoRunningAll ? (
                <>
                  <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  <span>
                    {isAr
                      ? "جارٍ الإنتاج الشامل..."
                      : "Auto-Running Pipeline..."}
                  </span>
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4 fill-current" />
                  <span>
                    {isAr
                      ? "⚡ تشغيل المسار بالكامل آلياً"
                      : "Auto-Run Full Pipeline"}
                  </span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={() => setExportModalOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-xl border border-gray-700 bg-gray-800/80 px-3.5 py-2.5 text-xs font-semibold text-gray-200 transition hover:bg-gray-700 hover:text-white"
            >
              <Download className="h-4 w-4 text-cyan-400" />
              <span>
                {isAr ? "تصدير حزمة المشروع" : "Export Campaign Pack"}
              </span>
            </button>
          </div>
        </div>

        {/* 1. Playbook Selector Grid */}
        <div>
          <h2 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-3 flex items-center gap-1.5">
            <Layers className="h-3.5 w-3.5 text-[#8b5cf6]" />
            <span>
              {isAr
                ? "١. حدد نوع المشروع المطلوب إنتاجه (Production Playbooks):"
                : "1. Select Production Playbook Preset:"}
            </span>
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3">
            {STUDIO_PLAYBOOKS.map(pb => {
              const isSelected = pb.id === activePlaybookId;
              return (
                <button
                  key={pb.id}
                  type="button"
                  onClick={() => setActivePlaybookId(pb.id)}
                  className={`text-start relative overflow-hidden rounded-xl border p-4 transition-all duration-200 ${
                    isSelected
                      ? `${pb.borderClass} bg-[#181a28] shadow-lg shadow-purple-950/30 ring-1 ring-[#8b5cf6]/50`
                      : "border-gray-800 bg-[#12141f] hover:border-gray-700 hover:bg-[#151724]"
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-black/40 border border-gray-800">
                      {getPlaybookIcon(pb.id)}
                    </div>
                    <span
                      className="rounded-full px-2 py-0.5 text-[10px] font-bold border"
                      style={{
                        borderColor: `${pb.color}40`,
                        backgroundColor: `${pb.color}15`,
                        color: pb.color,
                      }}
                    >
                      {isAr ? pb.badgeAr : pb.badgeEn}
                    </span>
                  </div>

                  <h3 className="text-sm font-bold text-white mb-1">
                    {isAr ? pb.titleAr : pb.titleEn}
                  </h3>
                  <p className="text-[11px] text-gray-400 line-clamp-2 leading-relaxed">
                    {isAr ? pb.descAr : pb.descEn}
                  </p>

                  <div className="mt-3 flex items-center gap-1.5 text-[10px] text-gray-500 font-medium">
                    <span>
                      {pb.steps.length} {isAr ? "مراحل إنتاج" : "stages"}
                    </span>
                    <span>•</span>
                    <span>
                      {isAr ? "فريق ذكاء اصطناعي مخصص" : "Dedicated AI Crew"}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* 2. Campaign Context Bar */}
        <div className="rounded-xl border border-gray-800 bg-[#141624] p-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1">
                {isAr ? "اسم العميل / المشروع" : "Project / Brand Name"}
              </label>
              <input
                type="text"
                value={clientName}
                onChange={e => setClientName(e.target.value)}
                className="w-full rounded-lg border border-gray-800 bg-[#0f1118] px-3 py-2 text-xs text-white focus:border-[#8b5cf6] focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1">
                {isAr ? "الجمهور المستهدف" : "Target Audience"}
              </label>
              <input
                type="text"
                value={targetAudience}
                onChange={e => setTargetAudience(e.target.value)}
                className="w-full rounded-lg border border-gray-800 bg-[#0f1118] px-3 py-2 text-xs text-white focus:border-[#8b5cf6] focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1">
                {isAr ? "نبرة الصوت المعتمدة (Tone)" : "Tone of Voice"}
              </label>
              <select
                value={toneOfVoice}
                onChange={e => setToneOfVoice(e.target.value)}
                className="w-full rounded-lg border border-gray-800 bg-[#0f1118] px-3 py-2 text-xs text-white focus:border-[#8b5cf6] focus:outline-none"
              >
                <option value="Bold & Viral">
                  Bold & Viral (جريء وحماسي فيروسي)
                </option>
                <option value="Luxury">Luxury (فاخر وراقٍ ومترف)</option>
                <option value="Authoritative">
                  Authoritative (تقني وموثوق ورسمي)
                </option>
                <option value="Friendly">Friendly (ودود وجذاب)</option>
              </select>
            </div>
          </div>
        </div>

        {/* 3. Steps Pipeline Stepper */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-xs font-bold uppercase tracking-wider text-gray-400 flex items-center gap-1.5">
              <Sliders className="h-3.5 w-3.5 text-[#8b5cf6]" />
              <span>
                {isAr
                  ? "٢. شريط مراحل الإنتاج (Production Pipeline):"
                  : "2. Production Pipeline Stepper:"}
              </span>
            </h2>
            <span className="text-xs font-bold text-gray-400">
              {totalCompleted} / {activePlaybook.steps.length}{" "}
              {isAr ? "مراحل جاهزة" : "Completed"}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
            {activePlaybook.steps.map((step, idx) => {
              const isCurrent = idx === activeStepIndex;
              const sState = stepsState[step.id] || { status: "pending" };

              return (
                <button
                  key={step.id}
                  type="button"
                  onClick={() => setActiveStepIndex(idx)}
                  className={`text-start flex flex-col justify-between rounded-xl border p-3 transition-all ${
                    isCurrent
                      ? "border-[#8b5cf6] bg-[#1a1b2c] ring-1 ring-[#8b5cf6]/50 shadow-md"
                      : "border-gray-800 bg-[#12141f] hover:bg-[#161826]"
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span
                      className={`inline-flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-black ${
                        sState.status === "approved"
                          ? "bg-emerald-500 text-black"
                          : isCurrent
                            ? "bg-[#8b5cf6] text-white"
                            : "bg-gray-800 text-gray-400"
                      }`}
                    >
                      {idx + 1}
                    </span>

                    {/* Status Badge */}
                    {sState.status === "approved" ? (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-400">
                        <CheckCircle2 className="h-3 w-3" />
                        <span>{isAr ? "معتمد" : "Approved"}</span>
                      </span>
                    ) : sState.status === "ready" ? (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-purple-400">
                        <Eye className="h-3 w-3" />
                        <span>{isAr ? "جاهز للمراجعة" : "Ready"}</span>
                      </span>
                    ) : sState.status === "running" ? (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-400">
                        <div className="h-2.5 w-2.5 animate-spin rounded-full border-2 border-amber-400 border-t-transparent" />
                        <span>{isAr ? "جارٍ الإنتاج" : "Running"}</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-gray-500">
                        <Clock className="h-3 w-3" />
                        <span>{isAr ? "في الانتظار" : "Pending"}</span>
                      </span>
                    )}
                  </div>

                  <div>
                    <h4 className="text-xs font-bold text-white line-clamp-1 mb-0.5">
                      {isAr ? step.titleAr : step.titleEn}
                    </h4>
                    <p className="text-[10px] text-gray-400 flex items-center gap-1">
                      <Bot className="h-3 w-3 text-[#a78bfa]" />
                      <span>{isAr ? step.agentNameAr : step.agentNameEn}</span>
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* 4. Active Step Studio Canvas */}
        <div className="rounded-2xl border border-gray-800 bg-[#12141e] p-5 shadow-xl">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left: Step Brief & Control */}
            <div className="lg:col-span-5 space-y-4 border-b lg:border-b-0 lg:border-r border-gray-800 pb-5 lg:pb-0 rtl:lg:border-r-0 rtl:lg:border-l rtl:lg:pl-6 ltr:lg:pr-6">
              <div className="flex items-center justify-between pb-3 border-b border-gray-800">
                <div className="flex items-center gap-2">
                  <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-[#8b5cf6]/20 text-[#c4b5fd] font-black text-xs">
                    #{activeStepIndex + 1}
                  </span>
                  <div>
                    <h3 className="text-sm font-bold text-white">
                      {isAr ? activeStep.titleAr : activeStep.titleEn}
                    </h3>
                    <p className="text-[11px] text-gray-400">
                      {isAr ? activeStep.descAr : activeStep.descEn}
                    </p>
                  </div>
                </div>
              </div>

              {/* Responsible Agent Card */}
              <div className="flex items-center justify-between rounded-xl border border-gray-800 bg-[#161826] p-3 text-xs">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-500/10 text-purple-400">
                    <Bot className="h-4 w-4" />
                  </div>
                  <div>
                    <span className="font-bold text-white block">
                      {isAr ? activeStep.agentNameAr : activeStep.agentNameEn}
                    </span>
                    <span className="text-[10px] text-gray-400">
                      {isAr ? activeStep.agentRoleAr : activeStep.agentRoleEn}
                    </span>
                  </div>
                </div>
                <span className="rounded bg-purple-500/20 px-2 py-0.5 text-[10px] font-bold text-[#c4b5fd]">
                  {activeStep.agentId}
                </span>
              </div>

              {/* Editable Prompt Textarea */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-semibold text-gray-300">
                    {isAr
                      ? "توجيهات البريف لهذه الخطوة (Step Instructions):"
                      : "Brief & Instructions for this Step:"}
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setStepsState(prev => ({
                        ...prev,
                        [activeStep.id]: {
                          ...prev[activeStep.id],
                          customPrompt: isAr
                            ? activeStep.defaultPromptAr
                            : activeStep.defaultPromptEn,
                        },
                      }));
                    }}
                    className="text-[11px] text-[#a78bfa] hover:text-white flex items-center gap-1"
                  >
                    <RefreshCw className="h-3 w-3" />
                    <span>{isAr ? "الافتراضي" : "Reset"}</span>
                  </button>
                </div>
                <textarea
                  rows={5}
                  value={activeStepState.customPrompt}
                  onChange={e => {
                    const val = e.target.value;
                    setStepsState(prev => ({
                      ...prev,
                      [activeStep.id]: {
                        ...prev[activeStep.id],
                        customPrompt: val,
                      },
                    }));
                  }}
                  className="w-full text-xs rounded-xl border border-gray-800 bg-[#0e1017] p-3 text-gray-100 focus:border-[#8b5cf6] focus:outline-none leading-relaxed"
                />
              </div>

              {/* Action Buttons */}
              <div className="space-y-2 pt-2">
                <button
                  type="button"
                  disabled={activeStepState.status === "running"}
                  onClick={() => handleRunStep(activeStepIndex)}
                  className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#8b5cf6] to-indigo-600 py-2.5 text-xs font-bold text-white shadow-lg shadow-[#8b5cf6]/25 transition hover:brightness-110 disabled:opacity-50"
                >
                  {activeStepState.status === "running" ? (
                    <>
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                      <span>
                        {isAr
                          ? "جارٍ توليد المخرج بالذكاء الاصطناعي..."
                          : "Generating Deliverable with AI..."}
                      </span>
                    </>
                  ) : (
                    <>
                      <Play className="h-4 w-4 fill-current" />
                      <span>
                        {isAr
                          ? "توليد هذا المخرج الآن (Generate Step)"
                          : "Generate Step Deliverable"}
                      </span>
                    </>
                  )}
                </button>

                {activeStepState.status === "ready" && (
                  <button
                    type="button"
                    onClick={() => handleApproveStep(activeStep.id)}
                    className="w-full flex items-center justify-center gap-2 rounded-xl border border-emerald-500/40 bg-emerald-500/20 py-2 text-xs font-bold text-emerald-300 hover:bg-emerald-500/30 transition"
                  >
                    <Check className="h-4 w-4" />
                    <span>
                      {isAr
                        ? "اعتماد هذا المخرج والانتقال للتالي"
                        : "Approve Step & Proceed Next"}
                    </span>
                  </button>
                )}
              </div>
            </div>

            {/* Right: The Deliverable Canvas & In-place Editor */}
            <div className="lg:col-span-7 space-y-3">
              <div className="flex items-center justify-between pb-3 border-b border-gray-800">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-[#8b5cf6]" />
                  <span className="text-xs font-bold text-white uppercase tracking-wider">
                    {isAr
                      ? "مخرج هذه المرحلة (Deliverable Output)"
                      : "Live Step Deliverable Canvas"}
                  </span>
                </div>

                {activeStepState.output && (
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setStepsState(prev => ({
                          ...prev,
                          [activeStep.id]: {
                            ...prev[activeStep.id],
                            isEditingText: !prev[activeStep.id].isEditingText,
                          },
                        }));
                      }}
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-semibold rounded-lg border transition ${
                        activeStepState.isEditingText
                          ? "border-[#8b5cf6] bg-[#8b5cf6]/20 text-white"
                          : "border-gray-700 bg-gray-800/80 text-gray-300 hover:bg-gray-700"
                      }`}
                    >
                      <Edit3 className="h-3 w-3 text-amber-400" />
                      <span>
                        {activeStepState.isEditingText
                          ? isAr
                            ? "إلغاء التعديل"
                            : "Cancel Edit"
                          : isAr
                            ? "تعديل المخرج يدوياً"
                            : "Edit Content"}
                      </span>
                    </button>
                  </div>
                )}
              </div>

              {/* Streaming state or Ready Deliverable */}
              {activeStepState.status === "running" ? (
                <div className="space-y-3 py-6 text-center">
                  <div className="flex items-center justify-center gap-2 text-xs font-semibold text-cyan-400">
                    <Sparkles className="h-4 w-4 animate-spin text-[#8b5cf6]" />
                    <span>
                      {isAr
                        ? "جارٍ صياغة المخرج وتوليده في الوقت الحقيقي..."
                        : "Streaming Real-Time AI Generation..."}
                    </span>
                  </div>
                  <pre className="max-h-[380px] overflow-auto rounded-xl border border-[#8b5cf6]/40 bg-[#0d0e14] p-4 text-[11px] font-mono text-cyan-300 whitespace-pre-wrap text-start">
                    {streamingText || "Connecting to stream..."}
                    <span className="inline-block w-2 h-3.5 ml-1 bg-cyan-400 animate-pulse align-middle" />
                  </pre>
                </div>
              ) : activeStepState.output ? (
                activeStepState.isEditingText ? (
                  /* In-place Text/JSON Editor */
                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-xs text-amber-300 bg-amber-500/10 border border-amber-500/20 p-2.5 rounded-lg">
                      <span>
                        {isAr
                          ? "محرر المخرج المباشر: يمكنك تعديل أي كلمة وسيحفظ التعديل فوراً."
                          : "Direct Editor: Tweak any phrase or JSON parameter directly."}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleSaveEditedText(activeStep.id)}
                        className="inline-flex items-center gap-1 rounded bg-amber-500 px-2.5 py-1 text-[11px] font-bold text-black hover:bg-amber-400 transition"
                      >
                        <Save className="h-3.5 w-3.5" />
                        <span>{isAr ? "حفظ التعديل" : "Save Changes"}</span>
                      </button>
                    </div>
                    <textarea
                      rows={14}
                      value={activeStepState.editedRawText}
                      onChange={e => {
                        const val = e.target.value;
                        setStepsState(prev => ({
                          ...prev,
                          [activeStep.id]: {
                            ...prev[activeStep.id],
                            editedRawText: val,
                          },
                        }));
                      }}
                      className="w-full font-mono text-xs rounded-xl border border-gray-800 bg-[#090a0f] p-3 text-emerald-400 focus:border-[#8b5cf6] focus:outline-none"
                    />
                  </div>
                ) : (
                  /* Formatted Deliverable Viewer */
                  <DeliverableFormattedViewer
                    content={activeStepState.output}
                    deliverable={activeStepState.deliverable}
                    agentName={activeStep.agentNameAr}
                    agentRole={activeStep.agentRoleAr}
                    qualityScore={
                      activeStepState.deliverable?.quality_score ?? 96
                    }
                  />
                )
              ) : (
                /* Empty state */
                <div className="flex h-72 flex-col items-center justify-center text-center text-gray-500 border border-dashed border-gray-800 rounded-xl p-6">
                  <Bot className="h-10 w-10 text-gray-600 mb-2" />
                  <h4 className="text-xs font-bold text-gray-400 mb-1">
                    {isAr
                      ? "هذه المرحلة لم يتم توليدها بعد"
                      : "Stage Pending Generation"}
                  </h4>
                  <p className="text-[11px] text-gray-500 max-w-sm">
                    {isAr
                      ? "اضغط على زر 'توليد هذا المخرج الآن' أو 'تشغيل المسار بالكامل' لبدء العمل."
                      : "Click 'Generate Step Deliverable' or 'Auto-Run Pipeline' to produce this artifact."}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 5. Full Campaign Dossier Export Modal */}
        {exportModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
            <div className="relative w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-2xl border border-gray-800 bg-[#12141e] p-6 shadow-2xl">
              <div className="flex items-center justify-between pb-4 border-b border-gray-800 mb-4">
                <div className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-[#8b5cf6]" />
                  <h3 className="text-base font-bold text-white">
                    {isAr
                      ? `حقيبة مخرجات المشروع: ${clientName}`
                      : `Campaign Production Dossier: ${clientName}`}
                  </h3>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => window.print()}
                    className="inline-flex items-center gap-1 rounded-lg bg-cyan-500/20 border border-cyan-500/40 px-3 py-1.5 text-xs font-bold text-cyan-300 hover:bg-cyan-500/30 transition"
                  >
                    <Printer className="h-3.5 w-3.5" />
                    <span>{isAr ? "طباعة / حفظ PDF" : "Print PDF"}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setExportModalOpen(false)}
                    className="rounded-lg p-1 text-gray-400 hover:bg-gray-800 hover:text-white"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
              </div>

              <div className="space-y-6">
                <div className="rounded-xl border border-gray-800 bg-[#181a28] p-4 text-xs">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-gray-300">
                    <div>
                      <span className="text-gray-500 block text-[10px] uppercase">
                        Client
                      </span>
                      <strong className="text-white">{clientName}</strong>
                    </div>
                    <div>
                      <span className="text-gray-500 block text-[10px] uppercase">
                        Playbook
                      </span>
                      <strong className="text-white">
                        {isAr ? activePlaybook.titleAr : activePlaybook.titleEn}
                      </strong>
                    </div>
                    <div>
                      <span className="text-gray-500 block text-[10px] uppercase">
                        Audience
                      </span>
                      <strong className="text-white">{targetAudience}</strong>
                    </div>
                    <div>
                      <span className="text-gray-500 block text-[10px] uppercase">
                        Tone
                      </span>
                      <strong className="text-white">{toneOfVoice}</strong>
                    </div>
                  </div>
                </div>

                {activePlaybook.steps.map((st, i) => {
                  const sState = stepsState[st.id];
                  return (
                    <div
                      key={st.id}
                      className="rounded-xl border border-gray-800 bg-[#0e1017] p-4 space-y-3"
                    >
                      <div className="flex items-center justify-between border-b border-gray-800 pb-2">
                        <div className="flex items-center gap-2">
                          <span className="rounded bg-[#8b5cf6]/20 px-2 py-0.5 text-xs font-bold text-[#c4b5fd]">
                            Step {i + 1}
                          </span>
                          <h4 className="text-sm font-bold text-white">
                            {isAr ? st.titleAr : st.titleEn}
                          </h4>
                        </div>
                        <span className="text-xs text-gray-400 font-mono">
                          {isAr ? st.agentNameAr : st.agentNameEn}
                        </span>
                      </div>

                      {sState?.output ? (
                        <DeliverableFormattedViewer
                          content={sState.output}
                          agentName={st.agentNameAr}
                        />
                      ) : (
                        <p className="text-xs text-gray-500 italic">
                          {isAr
                            ? "لم يتم توليد هذه الخطوة بعد."
                            : "Stage not yet generated."}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
