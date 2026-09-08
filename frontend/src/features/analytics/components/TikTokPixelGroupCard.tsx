"use client";

import { useState } from "react";
import {
  AlertTriangle,
  Check,
  CheckCircle2,
  Copy,
  Eye,
  EyeOff,
  Loader2,
  Send,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";
import { toast } from "sonner";
import type { TikTokEventsApiTestResult } from "@linktree/types";
import { MotionSpinner } from "@/components/motion/MotionPrimitives";
import {
  CustomSelect,
  type CustomSelectOption,
} from "@/components/shared/CustomSelect";
import { EditorField } from "@/components/shared/EditorField";
import { IconActionButton } from "@/components/shared/IconActionButton";
import { Tooltip } from "@/components/shared/Tooltip";
import { testTikTokEventsApi } from "@/features/analytics/api";
import { copyToClipboard } from "@/lib/utils/clipboard";

export interface PixelConfigRow {
  id?: string;
  pixel_id: string;
  events_token: string;
  token_last_four?: string | null;
  has_events_token?: boolean;
  keep_events_token?: boolean;
}

interface TikTokPixelGroupCardProps {
  index: number;
  config: PixelConfigRow;
  testEndpoint: string;
  secretEndpoint?: (id: string) => string;
  onUpdate: (updates: Partial<PixelConfigRow>) => void;
  canDelete?: boolean;
  onDelete: () => void;
}

type TikTokTestEventName = "ViewContent" | "Contact" | "ClickButton";

const TIKTOK_TEST_EVENTS: CustomSelectOption<TikTokTestEventName>[] = [
  { value: "ViewContent", label: "ViewContent (بینینی پەڕە)" },
  { value: "Contact", label: "Contact (پەیوەندی)" },
  { value: "ClickButton", label: "ClickButton (کلیک لە بەستەر)" },
];

export function TikTokPixelGroupCard({
  index,
  config,
  testEndpoint,
  secretEndpoint,
  onUpdate,
  canDelete = true,
  onDelete,
}: TikTokPixelGroupCardProps) {
  const [showToken, setShowToken] = useState(false);
  const [revealingToken, setRevealingToken] = useState(false);
  const [copyingToken, setCopyingToken] = useState(false);
  const [copiedToken, setCopiedToken] = useState(false);
  const [copiedPixel, setCopiedPixel] = useState(false);
  const [testCode, setTestCode] = useState("");
  const [selectedEvent, setSelectedEvent] =
    useState<TikTokTestEventName>("ViewContent");
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<TikTokEventsApiTestResult | null>(
    null,
  );

  const inputClass =
    "h-10 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-xs text-slate-800 shadow-2xs transition outline-none placeholder:text-slate-400 focus:border-[var(--theme-primary)] focus:ring-1 focus:ring-[var(--theme-primary)] dark:border-white/10 dark:bg-[#161B22] dark:text-slate-200 dark:placeholder:text-slate-500";

  const hasEventsToken =
    Boolean(config.has_events_token) || Boolean(config.events_token.trim());

  const handleCopyPixel = async () => {
    const pixelId = config.pixel_id.trim();
    if (!pixelId) {
      toast.error("هیچ Pixel IDێک بۆ کۆپیکردن نییە");
      return;
    }

    const success = await copyToClipboard(pixelId);
    if (success) {
      setCopiedPixel(true);
      toast.success("Pixel ID کۆپی کرا");
      setTimeout(() => setCopiedPixel(false), 2000);
    } else {
      toast.error("کۆپیکردنی Pixel ID سەرکەوتوو نەبوو");
    }
  };

  const handleToggleShowToken = async () => {
    if (showToken) {
      setShowToken(false);
      return;
    }

    if (config.events_token.trim()) {
      setShowToken(true);
      return;
    }

    if (config.id && hasEventsToken) {
      setRevealingToken(true);
      try {
        const endpoint = secretEndpoint
          ? secretEndpoint(config.id)
          : `/api/auth/tiktok/${config.id}/secret`;
        const res = await fetch(endpoint, {
          credentials: "include",
          cache: "no-store",
        });
        const payload = await res.json().catch(() => null);
        if (!res.ok || !payload?.data?.events_token) {
          throw new Error(
            payload?.message || "نەتوانرا نهێنیی Events API پیشان بدرێت",
          );
        }
        onUpdate({ events_token: payload.data.events_token });
        setShowToken(true);
      } catch (err) {
        toast.error(
          err instanceof Error
            ? err.message
            : "نەتوانرا نهێنیی Events API پیشان بدرێت",
        );
      } finally {
        setRevealingToken(false);
      }
    } else {
      setShowToken(true);
    }
  };

  const handleCopyToken = async () => {
    let token = config.events_token.trim();

    if (!token && config.id && hasEventsToken) {
      setCopyingToken(true);
      try {
        const endpoint = secretEndpoint
          ? secretEndpoint(config.id)
          : `/api/auth/tiktok/${config.id}/secret`;
        const res = await fetch(endpoint, {
          credentials: "include",
          cache: "no-store",
        });
        const payload = await res.json().catch(() => null);
        if (!res.ok || !payload?.data?.events_token) {
          throw new Error(payload?.message || "نەتوانرا Token کۆپی بکرێت");
        }
        token = payload.data.events_token;
        onUpdate({ events_token: token });
      } catch (err) {
        toast.error(
          err instanceof Error ? err.message : "نەتوانرا Token کۆپی بکرێت",
        );
        setCopyingToken(false);
        return;
      } finally {
        setCopyingToken(false);
      }
    }

    if (!token) {
      toast.error("هیچ Tokenێک بۆ کۆپیکردن نییە");
      return;
    }

    const success = await copyToClipboard(token);
    if (success) {
      setCopiedToken(true);
      toast.success("Events API Token کۆپی کرا");
      setTimeout(() => setCopiedToken(false), 2000);
    } else {
      toast.error("کۆپیکردنی Events API Token سەرکەوتوو نەبوو");
    }
  };

  const handleTest = async () => {
    const cleanCode = testCode.trim().toUpperCase();
    if (!cleanCode || !config.pixel_id.trim()) return;

    setTesting(true);
    setTestResult(null);

    try {
      const response = await testTikTokEventsApi(testEndpoint, {
        test_event_code: cleanCode,
        pixel_id: config.pixel_id.trim(),
        event_name: selectedEvent,
      });
      setTestResult(response);
    } catch (err: unknown) {
      setTestResult({
        success: false,
        statusCode: 500,
        tiktokCode: null,
        message:
          err instanceof Error
            ? err.message
            : "نەتوانرا پەیوەندی بە ڕاژەکارەوە بکرێت",
        requestId: null,
        pixelId: config.pixel_id,
        testEventCode: cleanCode,
        eventName: selectedEvent,
        sentAt: new Date().toISOString(),
      });
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="rounded-2xl border border-slate-200/90 bg-white p-4.5 shadow-xs transition hover:border-slate-300 dark:border-white/10 dark:bg-slate-900/30 dark:hover:border-white/20">
      {/* Group Card Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3 dark:border-white/5">
        <div className="flex items-center gap-2.5">
          <span
            className="flex h-7 w-7 items-center justify-center rounded-lg text-xs font-black"
            style={{
              background:
                "color-mix(in srgb, var(--theme-primary) 14%, transparent)",
              color: "var(--theme-primary)",
            }}
          >
            {index + 1}
          </span>
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-slate-700 dark:text-slate-200">
              گرووپی TikTok #{index + 1}
            </span>
            {config.pixel_id.trim() && (
              <span className="font-mono text-xs text-slate-400">
                ({config.pixel_id.trim()})
              </span>
            )}
            {hasEventsToken && (
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
                <Sparkles className="h-2.5 w-2.5" />
                Events API چالاکە
              </span>
            )}
          </div>
        </div>

        <IconActionButton
          label={
            canDelete
              ? "سڕینەوەی ئەم گرووپە"
              : "دەبێت لانیکەم یەک گرووپ بمێنێتەوە"
          }
          tone="danger"
          disabled={!canDelete}
          onClick={onDelete}
        >
          <X className="h-4 w-4" />
        </IconActionButton>
      </div>

      {/* 4x Grid Continuous Line */}
      <div className="mt-3.5 grid grid-cols-1 items-start gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
        {/* Col 1: Pixel ID */}
        <EditorField label="Pixel ID" required>
          <div className="relative">
            <input
              required
              type="text"
              dir="ltr"
              className={`${inputClass} pr-10 font-mono`}
              value={config.pixel_id}
              onChange={(e) => onUpdate({ pixel_id: e.target.value })}
              placeholder="C9ABC123456789"
            />
            <div className="absolute right-1 top-1/2 flex -translate-y-1/2 items-center">
              <IconActionButton
                label={
                  copiedPixel
                    ? "Pixel ID کۆپی کرا"
                    : "کۆپیکردنی Pixel ID"
                }
                disabled={!config.pixel_id.trim()}
                onClick={() => void handleCopyPixel()}
              >
                {copiedPixel ? (
                  <Check className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                ) : (
                  <Copy className="h-3.5 w-3.5" />
                )}
              </IconActionButton>
            </div>
          </div>
        </EditorField>

        {/* Col 2: Events API Token */}
        <EditorField
          label="Events API Token"
          hint={config.has_events_token ? undefined : "ئارەزوومەندانە"}
        >
          <div className="relative">
            <input
              type={showToken ? "text" : "password"}
              dir="ltr"
              autoComplete="new-password"
              className={`${inputClass} pr-24 font-mono`}
              value={config.events_token}
              onChange={(e) =>
                onUpdate({
                  events_token: e.target.value,
                  keep_events_token: false,
                  has_events_token:
                    Boolean(e.target.value) ||
                    Boolean(config.token_last_four),
                })
              }
              placeholder={
                config.keep_events_token && config.token_last_four
                  ? `••••${config.token_last_four}`
                  : "Access Token"
              }
            />
            <div className="absolute right-1 top-1/2 flex -translate-y-1/2 items-center gap-0.5">
              {config.has_events_token && (
                <IconActionButton
                  label="لابردنی Token"
                  tone="danger"
                  onClick={() => {
                    onUpdate({
                      events_token: "",
                      has_events_token: false,
                      keep_events_token: false,
                      token_last_four: null,
                    });
                    setShowToken(false);
                  }}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </IconActionButton>
              )}
              {hasEventsToken && (
                <IconActionButton
                  label={
                    copyingToken
                      ? "لە کۆپیکردندایە..."
                      : copiedToken
                        ? "Events API Token کۆپی کرا"
                        : "کۆپیکردنی Events API Token"
                  }
                  disabled={copyingToken || revealingToken}
                  onClick={() => void handleCopyToken()}
                >
                  {copyingToken ? (
                    <MotionSpinner>
                      <Loader2 className="h-3.5 w-3.5" />
                    </MotionSpinner>
                  ) : copiedToken ? (
                    <Check className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                  ) : (
                    <Copy className="h-3.5 w-3.5" />
                  )}
                </IconActionButton>
              )}
              <IconActionButton
                label={
                  revealingToken
                    ? "باردەکرێت..."
                    : showToken
                      ? "شاردنەوەی Token"
                      : "پیشاندانی Token"
                }
                disabled={revealingToken || copyingToken}
                onClick={() => void handleToggleShowToken()}
              >
                {revealingToken ? (
                  <MotionSpinner>
                    <Loader2 className="h-3.5 w-3.5" />
                  </MotionSpinner>
                ) : showToken ? (
                  <EyeOff className="h-3.5 w-3.5" />
                ) : (
                  <Eye className="h-3.5 w-3.5" />
                )}
              </IconActionButton>
            </div>
          </div>
        </EditorField>

        {/* Col 3: Test Event Code */}
        <EditorField label="کۆدی Test Event" hint="لە TikTok وەریگرە">
          <input
            type="text"
            value={testCode}
            onChange={(e) => setTestCode(e.target.value.toUpperCase().trim())}
            placeholder="TEST77408"
            className={`${inputClass} font-mono uppercase tracking-wider`}
          />
        </EditorField>

        {/* Col 4: Event Selector + Test Action */}
        <EditorField label="ڕووداو و تاقیکردنەوە">
          <div className="flex items-center gap-2">
            <div className="min-w-0 flex-1">
              <CustomSelect<TikTokTestEventName>
                label="جۆری ڕووداو"
                hideLabel
                value={selectedEvent}
                options={TIKTOK_TEST_EVENTS}
                onChange={setSelectedEvent}
                triggerClassName="h-10 text-xs rounded-xl"
              />
            </div>
            <Tooltip
              content={
                !hasEventsToken
                  ? "Events API Token دابنێ"
                  : !testCode.trim()
                    ? "Test Event Code بنووسە"
                    : !config.pixel_id.trim()
                      ? "Pixel ID پێویستە"
                      : "تاقیکردنەوەی ئەم Pixelە لەگەڵ TikTok"
              }
              side="top"
            >
              <button
                type="button"
                onClick={() => void handleTest()}
                disabled={
                  testing ||
                  !testCode.trim() ||
                  !config.pixel_id.trim() ||
                  !hasEventsToken
                }
                className="inline-flex h-10 shrink-0 items-center justify-center gap-1.5 rounded-xl bg-slate-900 px-3.5 text-xs font-bold text-white shadow-xs transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-40 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100 cursor-pointer"
              >
                {testing ? (
                  <MotionSpinner>
                    <Loader2 className="h-3.5 w-3.5" />
                  </MotionSpinner>
                ) : (
                  <Send className="h-3.5 w-3.5" />
                )}
                <span>تاقیکردنەوە</span>
              </button>
            </Tooltip>
          </div>
        </EditorField>
      </div>

      {/* Real-time Inline Result Feedback */}
      {testResult && (
        <div
          className={`mt-3.5 rounded-xl border p-3 text-xs transition-all ${
            testResult.success
              ? "border-emerald-200 bg-emerald-50/80 dark:border-emerald-500/25 dark:bg-emerald-950/20"
              : "border-red-200 bg-red-50/80 dark:border-red-500/25 dark:bg-red-950/20"
          }`}
        >
          <div className="flex items-start gap-2.5">
            {testResult.success ? (
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
            ) : (
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-red-600 dark:text-red-400" />
            )}
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={`font-bold ${
                    testResult.success
                      ? "text-emerald-800 dark:text-emerald-200"
                      : "text-red-800 dark:text-red-200"
                  }`}
                >
                  {testResult.success
                    ? "ڕووداوەکە بە سەرکەوتوویی گەیشتە TikTok!"
                    : "نەتوانرا ڕووداوەکە بنێردرێت"}
                </span>
                <span className="rounded bg-white/80 px-1.5 py-0.5 font-mono text-[10px] text-slate-600 dark:bg-white/10 dark:text-slate-300">
                  HTTP {testResult.statusCode}
                </span>
              </div>

              <p className="mt-1 text-slate-600 dark:text-slate-300 text-[11px]">
                {testResult.message}
              </p>

              {testResult.success && (
                <p className="mt-1 text-[11px] font-medium text-emerald-700 dark:text-emerald-300">
                  ئێستا لە <strong>TikTok Events Manager &gt; Test Events</strong> سەیری بکە، ڕووداوەکە بە جۆری <strong>{testResult.eventName}</strong> و کۆدی <strong>{testResult.testEventCode}</strong> تۆمار کراوە.
                </p>
              )}

              {testResult.requestId && (
                <p className="mt-1 font-mono text-[10px] text-slate-400">
                  Request ID: {testResult.requestId}
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
