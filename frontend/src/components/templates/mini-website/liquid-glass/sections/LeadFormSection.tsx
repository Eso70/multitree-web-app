import { useMemo, useState } from "react";
import { BadgeCheck, LoaderCircle, Send } from "lucide-react";
import type { Star } from "lucide-react";
import { MotionSpinner } from "@/components/motion/MotionPrimitives";
import { CustomSelect } from "@/components/shared/CustomSelect";
import { DateInput } from "@/components/shared/DateTimeInput";
import { SectionFrame } from "../LiquidGlassSectionFrame";
import { SWISS_ACCENT, toneWash } from "../liquid-glass-utils";
import { getAnalyticsSessionId, getVisitorId } from "@/lib/utils/visitor-id";
import { createRuntimeId } from "@/lib/utils/random-id";
import type {
  MiniWebsiteLeadField,
  MiniWebsiteLeadForm,
} from "@/features/mini-website/types";

/**
 * The public enquiry form.
 *
 * The only section a visitor writes to, so it carries the things the read-only
 * sections never needed: its own submitting and error state, a field no human
 * can see that catches scripted submitters, and a success state that replaces
 * the form rather than sitting under it — a form still on screen after a
 * successful send invites the same enquiry twice.
 *
 * No pixel event is fired from here. The server records the submission and
 * delivers the TikTok `Lead` conversion from its own outbox, which survives an
 * ad blocker and never puts the visitor's details on the wire a second time.
 */
export function LeadFormSection({
  form,
  endpoint,
  onSubmitted,
  interactive,
  tone = SWISS_ACCENT,
  ...frame
}: {
  form: MiniWebsiteLeadForm;
  endpoint?: string;
  /** Fires the browser half of the conversion with the id the server will reuse. */
  onSubmitted?: (eventId: string) => void;
  interactive: boolean;
  fullPage: boolean;
  accent: string;
  tone?: string;
  index?: number;
  title: string;
  icon: typeof Star;
}) {
  const fields = useMemo(
    () => form.fields.filter((field) => field.label.trim()),
    [form.fields],
  );
  const [answers, setAnswers] = useState<Record<string, string | boolean>>({});
  const [consent, setConsent] = useState(false);
  const [honeypot, setHoneypot] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "sent">("idle");
  const [error, setError] = useState<string | null>(null);

  if (!fields.length) return null;

  const consentBlocked = form.consentRequired && !consent;
  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!interactive || !endpoint || state === "sending") return;
    setState("sending");
    setError(null);
    // Minted here and sent to the server, which ingests the matching half
    // under the same id. A lead is the page's most valuable conversion, so it
    // is the one that most needs the browser and server events to collapse
    // into one rather than count as two. See docs/tracking.md.
    const eventId = createRuntimeId();
    try {
      onSubmitted?.(eventId);
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          eventId,
          visitorId: getVisitorId(),
          sessionId: getAnalyticsSessionId(),
          answers,
          consent,
          website: honeypot,
          pageUrl: window.location.href,
          referrer: document.referrer || undefined,
        }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok || !payload?.success) {
        throw new Error(
          typeof payload?.message === "string"
            ? payload.message
            : "ناردنەکە سەرکەوتوو نەبوو.",
        );
      }
      setState("sent");
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "ناردنەکە سەرکەوتوو نەبوو.",
      );
      setState("idle");
    }
  };

  if (state === "sent") {
    return (
      <SectionFrame tone={tone} {...frame}>
        <div
          className="flex items-start gap-3 rounded-2xl p-5"
          style={{ background: toneWash(tone, 10) }}
          role="status"
        >
          <BadgeCheck
            className="mt-0.5 h-5 w-5 shrink-0"
            style={{ color: tone }}
          />
          <p className="text-xs font-bold leading-6 sm:text-sm" dir="auto">
            {form.successMessage || "سوپاس، داواکارییەکەت گەیشت."}
          </p>
        </div>
      </SectionFrame>
    );
  }

  return (
    <SectionFrame tone={tone} {...frame}>
      <div
        className="rounded-3xl p-5 shadow-[0_18px_44px_-32px_rgba(15,23,42,0.5)] sm:p-6"
        style={{
          background: `linear-gradient(180deg, ${toneWash(tone, 8)}, ${toneWash(tone, 2)} 70%)`,
          border: `1px solid ${toneWash(tone, 18)}`,
        }}
      >
        {form.description && (
          <div className="mb-5 flex items-start gap-2.5" dir="auto">
            <span
              className="mt-[5px] h-2 w-2 shrink-0 rounded-full"
              style={{ background: tone }}
              aria-hidden="true"
            />
            <p className="text-xs font-bold leading-6 opacity-75 sm:text-sm">
              {form.description}
            </p>
          </div>
        )}
      <form className="grid gap-4 sm:grid-cols-2" onSubmit={submit} noValidate>
        {fields.map((field) => {
          // A dropdown and a date are rendered by shared components that own a
          // `<button>` of their own. Wrapping those in a `<label>` makes the
          // caption forward its click into them, so the caption gets its own
          // element and the control is labelled by id instead.
          const ownsControl = field.type === "select" || field.type === "date";
          const Wrapper = ownsControl ? "div" : "label";
          const captionId = `lead-field-${field.id}`;
          return (
            <Wrapper
              key={field.id}
              className={`min-w-0 ${field.type === "textarea" ? "sm:col-span-2" : ""}`}
            >
              <span
                id={ownsControl ? captionId : undefined}
                className="mb-1.5 block text-[11px] font-black opacity-70"
                dir="auto"
              >
                {field.label}
                {field.required && (
                  <span style={{ color: tone }} aria-hidden="true">
                    {" *"}
                  </span>
                )}
              </span>
              <div aria-labelledby={ownsControl ? captionId : undefined}>
                <LeadFormControl
                  field={field}
                  tone={tone}
                  disabled={!interactive || state === "sending"}
                  value={answers[field.id]}
                  onChange={(value) =>
                    setAnswers((current) => ({ ...current, [field.id]: value }))
                  }
                />
              </div>
              {field.helpText && (
                <span
                  className="mt-1.5 block text-[10px] leading-4 opacity-50"
                  dir="auto"
                >
                  {field.helpText}
                </span>
              )}
            </Wrapper>
          );
        })}

        {/* Off-screen rather than `display:none`: a submitter that skips hidden
            inputs would otherwise walk straight past it.

            It has to look like a real field to a bot, which means password
            managers and autofill extensions find it just as convincing — and a
            hidden text input is exactly what they rewrite before React
            hydrates. The opt-out attributes ask them not to, and the
            suppression covers the ones that ignore being asked: a value only
            a third party could have written is never worth a console error. */}
        <div className="sr-only" aria-hidden="true">
          <label>
            وێبسایت
            <input
              type="text"
              name="website"
              tabIndex={-1}
              autoComplete="off"
              maxLength={200}
              data-lpignore="true"
              data-1p-ignore=""
              data-bwignore="true"
              data-form-type="other"
              suppressHydrationWarning
              value={honeypot}
              onChange={(event) => setHoneypot(event.target.value)}
            />
          </label>
        </div>

        {form.consentText && (
          <label className="flex cursor-pointer items-start gap-2.5 sm:col-span-2">
            <input
              type="checkbox"
              checked={consent}
              disabled={!interactive || state === "sending"}
              onChange={(event) => setConsent(event.target.checked)}
              className="mt-0.5 h-4 w-4 shrink-0 rounded border-current/30"
              style={{ accentColor: tone }}
            />
            <span className="text-[11px] leading-5 opacity-70" dir="auto">
              {form.consentText}
            </span>
          </label>
        )}

        {error && (
          <p
            className="text-[11px] font-bold text-rose-500 sm:col-span-2"
            role="alert"
            dir="auto"
          >
            {error}
          </p>
        )}

        <div className="sm:col-span-2">
          <button
            type="submit"
            // Also disabled without an endpoint, so an editor preview shows a
            // button that plainly cannot send rather than one that does nothing.
            disabled={
              !interactive || !endpoint || consentBlocked || state === "sending"
            }
            // Same primary-action treatment every other section's button uses,
            // so sending the form does not read as a lesser act than opening a
            // service card.
            className="mini-glass-action inline-flex h-12 w-full items-center justify-center gap-2 rounded-full px-8 text-xs font-black text-white shadow-lg transition duration-200 hover:-translate-y-0.5 hover:opacity-95 disabled:translate-y-0 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
            style={{ background: toneWash(tone, 85) }}
          >
            {state === "sending" ? (
              <MotionSpinner><LoaderCircle className="h-4 w-4 "  /></MotionSpinner>
            ) : (
              <Send className="h-4 w-4" />
            )}
            {form.submitLabel || "ناردن"}
          </button>
        </div>
      </form>
      </div>
    </SectionFrame>
  );
}

/** The input a single question renders as. */
function LeadFormControl({
  field,
  tone,
  disabled,
  value,
  onChange,
}: {
  field: MiniWebsiteLeadField;
  tone: string;
  disabled: boolean;
  value: string | boolean | undefined;
  onChange: (value: string | boolean) => void;
}) {
  const shared =
    "w-full rounded-xl border border-current/15 bg-white/60 px-3.5 text-xs shadow-[0_1px_2px_rgb(15_23_42/0.04)] outline-none transition focus:border-current/40 focus:shadow-none disabled:opacity-60 dark:bg-white/[0.05]";

  if (field.type === "checkbox") {
    return (
      <span className="flex h-11 items-center">
        <input
          type="checkbox"
          checked={value === true}
          disabled={disabled}
          required={field.required}
          onChange={(event) => onChange(event.target.checked)}
          className="h-5 w-5 rounded border-current/30"
          style={{ accentColor: tone }}
        />
      </span>
    );
  }
  if (field.type === "textarea") {
    return (
      <textarea
        value={typeof value === "string" ? value : ""}
        disabled={disabled}
        required={field.required}
        maxLength={1000}
        placeholder={field.placeholder}
        onChange={(event) => onChange(event.target.value)}
        className={`${shared} min-h-28 resize-y py-3 leading-6`}
        dir="auto"
      />
    );
  }
  // The same controls the dashboard uses. They read the page's colour from CSS
  // variables, which `fullPage` publishes onto the document root so their
  // portalled menus stay on-brand instead of falling back to a native widget.
  if (field.type === "select") {
    return (
      <CustomSelect
        label={field.label}
        hideLabel
        disabled={disabled}
        value={typeof value === "string" ? value : ""}
        onChange={onChange}
        options={[
          { value: "", label: field.placeholder || "هەڵبژێرە" },
          ...field.options.map((option) => ({ value: option, label: option })),
        ]}
        triggerClassName="h-11 rounded-xl"
      />
    );
  }
  if (field.type === "date") {
    return (
      <DateInput
        label={field.label}
        hideLabel
        disabled={disabled}
        value={typeof value === "string" ? value : ""}
        onChange={onChange}
      />
    );
  }
  return (
    <input
      // `tel` and `email` change the keyboard a phone offers and let the
      // browser autofill what it already knows about the visitor.
      type={
        field.type === "email"
          ? "email"
          : field.type === "phone"
            ? "tel"
            : field.type === "number"
              ? "number"
              : "text"
      }
      autoComplete={
        field.mapping === "email"
          ? "email"
          : field.mapping === "phone"
            ? "tel"
            : field.mapping === "name"
              ? "name"
              : "off"
      }
      value={typeof value === "string" ? value : ""}
      disabled={disabled}
      required={field.required}
      maxLength={1000}
      placeholder={field.placeholder}
      onChange={(event) => onChange(event.target.value)}
      className={`${shared} h-11`}
      dir={field.type === "phone" || field.type === "email" ? "ltr" : "auto"}
    />
  );
}
