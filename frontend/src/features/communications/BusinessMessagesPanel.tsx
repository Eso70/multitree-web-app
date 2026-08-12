"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  ArrowRight,
  Mail,
  MessageSquare,
  Plus,
} from "lucide-react";
import { toast } from "sonner";
import { SkeletonList } from "@/components/shared/Skeleton";
import { CustomSelect } from "@/components/shared/CustomSelect";
import { AccentActionButton } from "@/components/shared/AccentActionButton";
import { communicationRequest } from "./api";
import { usePolling } from "@/lib/utils/usePolling";
import { ChatComposer } from "./ChatComposer";
import type { Conversation } from "./types";

const CATEGORY_OPTIONS: Array<{ value: string; label: string }> = [
  { value: "account", label: "هەژمار" },
  { value: "billing", label: "پارەدان" },
  { value: "technical", label: "تەکنیکی" },
  { value: "feature_request", label: "داواکاری تایبەتمەندی" },
  { value: "security", label: "ئاسایش" },
  { value: "verification", label: "پشتڕاستکردنەوە" },
  { value: "other", label: "هیتر" },
];

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  open: { label: "کراوەیە", color: "text-blue-600 dark:text-blue-400" },
  waiting_business: {
    label: "چاوەڕوانی وەڵامی تۆیە",
    color: "text-amber-600 dark:text-amber-400",
  },
  waiting_platform: {
    label: "چاوەڕوانی وەڵامی ئەدمین بە",
    color: "text-slate-500 dark:text-slate-400",
  },
  resolved: {
    label: "چارەسەرکراوە",
    color: "text-emerald-600 dark:text-emerald-400",
  },
  archived: { label: "ئەرشیفکراوە", color: "text-slate-400" },
};

const inputClass =
  "w-full rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-sm text-slate-700 shadow-sm outline-none transition placeholder:text-slate-400 focus:ring-2 dark:border-white/10 dark:bg-[#161B22] dark:text-slate-200 dark:placeholder:text-slate-500 dark:[color-scheme:dark]";

type View = "list" | "thread" | "new";

export function BusinessMessagesPanel({
  initialConversationId,
}: {
  initialConversationId?: string;
}) {
  const [view, setView] = useState<View>(() =>
    initialConversationId ? "thread" : "list",
  );
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [active, setActive] = useState<Conversation | null>(null);
  const [threadLoading, setThreadLoading] = useState(
    Boolean(initialConversationId),
  );
  const [reply, setReply] = useState("");
  const [sendingReply, setSendingReply] = useState(false);
  const [form, setForm] = useState({
    subject: "",
    category: "account",
    message: "",
  });
  const [creating, setCreating] = useState(false);
  const replyRef = useRef<HTMLTextAreaElement>(null);
  const newMessageRef = useRef<HTMLTextAreaElement>(null);

  const loadConversations = useCallback(async () => {
    try {
      const data = await communicationRequest<Conversation[]>(
        "/api/auth/communications/conversations",
      );
      setConversations(data);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "بارکردنی پەیامەکان سەرکەوتوو نەبوو",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => void loadConversations());
    return () => window.cancelAnimationFrame(frame);
  }, [loadConversations]);

  // Re-rendering a chat on every tick re-runs its scroll handling, so unchanged
  // payloads are dropped before they reach state.
  const lastListRef = useRef<string>("");
  const lastThreadRef = useRef<string>("");

  // Not memoized: `usePolling` reads the latest task from a ref each tick.
  const refreshMessages = async () => {
    try {
      const items = await communicationRequest<Conversation[]>(
        "/api/auth/communications/conversations",
      );
      const serializedList = JSON.stringify(items);
      if (serializedList !== lastListRef.current) {
        lastListRef.current = serializedList;
        setConversations(items);
      }
      if (view === "thread" && active?.id) {
        const detail = await communicationRequest<Conversation>(
          `/api/auth/communications/conversations/${active.id}`,
        );
        const serializedThread = JSON.stringify(detail);
        if (serializedThread !== lastThreadRef.current) {
          lastThreadRef.current = serializedThread;
          setActive(detail);
        }
      }
    } catch {
      // Keep the current conversation visible during transient failures.
    }
  };

  usePolling(refreshMessages, 5_000, { immediate: false });

  useEffect(() => {
    if (!initialConversationId) return;
    communicationRequest<Conversation>(
      `/api/auth/communications/conversations/${initialConversationId}`,
    )
      .then((data) => setActive(data))
      .catch((error) => {
        toast.error(
          error instanceof Error ? error.message : "بارکردنی گفتوگۆکە سەرکەوتوو نەبوو",
        );
        setView("list");
      })
      .finally(() => setThreadLoading(false));
  }, [initialConversationId]);

  const openThread = async (conversation: Conversation) => {
    setView("thread");
    setActive(conversation);
    setThreadLoading(true);
    try {
      const data = await communicationRequest<Conversation>(
        `/api/auth/communications/conversations/${conversation.id}`,
      );
      setActive(data);
      setConversations((current) =>
        current.map((item) =>
          item.id === data.id ? { ...item, unreadCount: 0 } : item,
        ),
      );
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "بارکردنی گفتوگۆکە سەرکەوتوو نەبوو",
      );
      setView("list");
    } finally {
      setThreadLoading(false);
    }
  };

  const sendReply = async () => {
    if (!active || !reply.trim()) return;
    setSendingReply(true);
    try {
      const data = await communicationRequest<Conversation>(
        `/api/auth/communications/conversations/${active.id}/messages`,
        { method: "POST", body: JSON.stringify({ message: reply.trim() }) },
      );
      setActive(data);
      setReply("");
      void loadConversations();
      requestAnimationFrame(() => replyRef.current?.focus());
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "ناردنی پەیام سەرکەوتوو نەبوو",
      );
    } finally {
      setSendingReply(false);
    }
  };

  const createConversation = async () => {
    if (!form.subject.trim() || !form.message.trim()) {
      toast.error("بابەت و پەیام پێویستە پڕبکرێتەوە");
      return;
    }
    setCreating(true);
    try {
      const data = await communicationRequest<Conversation>(
        "/api/auth/communications/conversations",
        {
          method: "POST",
          body: JSON.stringify({
            subject: form.subject.trim(),
            category: form.category,
            message: form.message.trim(),
          }),
        },
      );
      toast.success("پەیامەکەت بۆ بەڕێوەبەری پلاتفۆرم نێردرا");
      setForm({ subject: "", category: "account", message: "" });
      await loadConversations();
      await openThread(data);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "ناردنی پەیام سەرکەوتوو نەبوو",
      );
    } finally {
      setCreating(false);
    }
  };

  if (loading) {
    return <SkeletonList className="min-h-[30vh]" rows={5} />;
  }

  if (view === "new") {
    return (
      <div className="space-y-5">
        <button
          type="button"
          onClick={() => setView("list")}
          className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
        >
          <ArrowRight className="h-3.5 w-3.5" />
          گەڕانەوە بۆ لیستی پەیامەکان
        </button>
        <div className="grid gap-5 sm:grid-cols-2">
          <label className="block">
            <span className="mb-2 block text-xs font-semibold text-slate-600 dark:text-slate-300">
              بابەت
            </span>
            <input
              className={inputClass}
              value={form.subject}
              onChange={(e) => setForm({ ...form, subject: e.target.value })}
              placeholder="بابەتی پەیامەکەت"
              maxLength={160}
            />
          </label>
          <div className="block">
            <span className="mb-2 block text-xs font-semibold text-slate-600 dark:text-slate-300">
              جۆر
            </span>
            <CustomSelect
              hideLabel
              label="جۆر"
              value={form.category}
              options={CATEGORY_OPTIONS}
              onChange={(value) => setForm((current) => ({ ...current, category: value }))}
              triggerClassName="h-11"
            />
          </div>
          <label className="col-span-full block">
            <span className="mb-2 block text-xs font-semibold text-slate-600 dark:text-slate-300">
              پەیام
            </span>
            <ChatComposer
              ref={newMessageRef}
              value={form.message}
              onChange={(value) => setForm((current) => ({ ...current, message: value }))}
              onSubmit={createConversation}
              placeholder="پەیامەکەت بۆ بەڕێوەبەری پلاتفۆرم بنووسە... (Enter بۆ ناردن، Shift+Enter بۆ دێڕی نوێ)"
              sending={creating}
            />
          </label>
        </div>
      </div>
    );
  }

  if (view === "thread" && active) {
    const status = STATUS_LABELS[active.status] || STATUS_LABELS.open;
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => setView("list")}
            className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
          >
            <ArrowRight className="h-3.5 w-3.5" />
            گەڕانەوە
          </button>
          <span className={`text-xs font-bold ${status.color}`}>{status.label}</span>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4 dark:border-white/10 dark:bg-white/[0.04]">
          <p className="font-bold text-slate-700 dark:text-slate-200">
            {active.subject}
          </p>
          {threadLoading ? (
            <SkeletonList className="mt-4" rows={4} />
          ) : (
            <div className="mt-4 max-h-[26rem] space-y-3 overflow-y-auto custom-scrollbar pr-1">
              {active.messages?.map((message) => {
                const mine = message.senderType === "business";
                return (
                  <div
                    key={message.id}
                    className={`flex ${mine ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm leading-6 shadow-sm ${
                        mine
                          ? "text-white"
                          : "bg-white text-slate-700 dark:bg-[#1c222b] dark:text-slate-200"
                      }`}
                      style={mine ? { background: "var(--theme-css)", color: "var(--theme-ink)" } : undefined}
                    >
                      <p className="whitespace-pre-wrap">{message.body}</p>
                      <p className={`mt-1.5 text-[10px] ${mine ? "opacity-80" : "text-slate-400 dark:text-gray-500"}`}>
                        {message.senderName} ·{" "}
                        {new Date(message.createdAt).toLocaleDateString("ckb-IQ", {
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
        {active.status !== "resolved" && active.status !== "archived" ? (
          <ChatComposer
            ref={replyRef}
            value={reply}
            onChange={setReply}
            onSubmit={sendReply}
            placeholder="وەڵامەکەت بنووسە... (Enter بۆ ناردن، Shift+Enter بۆ دێڕی نوێ)"
            sending={sendingReply}
            disabled={threadLoading}
          />
        ) : (
          <p className="rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-3 text-center text-xs text-slate-500 dark:border-white/10 dark:bg-white/5 dark:text-slate-400">
            ئەم گفتوگۆیە داخراوە
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-xs text-slate-500 dark:text-slate-400">
          پەیامەکانت لەگەڵ ئەدمین
        </p>
        <AccentActionButton onClick={() => setView("new")}>
          <Plus className="h-3.5 w-3.5" />
          پەیامی نوێ
        </AccentActionButton>
      </div>

      {conversations.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-slate-200 bg-slate-50/60 py-12 text-center dark:border-white/10 dark:bg-white/[0.04]">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 dark:bg-white/5">
            <Mail className="h-6 w-6 text-slate-300 dark:text-slate-600" />
          </div>
          <p className="mt-3 text-sm font-bold text-slate-400">هیچ پەیامێک نییە</p>
          <p className="mt-1 max-w-xs text-xs text-slate-400">
            پەیامێکی نوێ بنێرە بۆ بەڕێوەبەری پلاتفۆرم
          </p>
        </div>
      ) : (
        <div className="divide-y divide-slate-100 overflow-hidden rounded-2xl border border-slate-200 dark:divide-white/5 dark:border-white/10">
          {conversations.map((conversation) => {
            const status = STATUS_LABELS[conversation.status] || STATUS_LABELS.open;
            const unread = (conversation.unreadCount || 0) > 0;
            return (
              <button
                key={conversation.id}
                type="button"
                onClick={() => void openThread(conversation)}
                className="flex w-full items-start gap-3 bg-white p-4 text-right transition hover:bg-slate-50 dark:bg-[#1c222b] dark:hover:bg-white/5"
              >
                {unread && (
                  <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-[var(--theme-primary)]" />
                )}
                <div className={`min-w-0 flex-1 ${unread ? "" : "mr-5"}`}>
                  <div className="flex items-center justify-between gap-2">
                    <p className={`truncate text-sm leading-5 ${unread ? "font-bold text-slate-700 dark:text-slate-200" : "font-medium text-slate-600 dark:text-slate-400"}`}>
                      {conversation.subject}
                    </p>
                    {unread && (
                      <span className="shrink-0 rounded-full bg-[var(--theme-primary)] px-1.5 py-0.5 text-[9px] font-black text-white">
                        {conversation.unreadCount}
                      </span>
                    )}
                  </div>
                  {conversation.lastMessage && (
                    <p className="mt-0.5 truncate text-xs text-slate-400 dark:text-gray-500">
                      {conversation.lastMessage}
                    </p>
                  )}
                  <div className="mt-1.5 flex items-center gap-2 text-[10px] text-slate-400 dark:text-gray-500">
                    <MessageSquare className="h-3 w-3" />
                    <span className={`font-bold ${status.color}`}>{status.label}</span>
                    <span>·</span>
                    <span>
                      {new Date(conversation.lastMessageAt).toLocaleDateString("ckb-IQ", {
                        month: "short",
                        day: "numeric",
                      })}
                    </span>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
