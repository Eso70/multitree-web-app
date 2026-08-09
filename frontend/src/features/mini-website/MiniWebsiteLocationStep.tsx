"use client";

import { MotionSpinner } from "@/components/motion/MotionPrimitives";

import { useRef, useState } from "react";
import {
  ChevronDown,
  ChevronUp,
  Crosshair,
  Loader2,
  MapPin,
  Plus,
  ShieldCheck,
  Trash2,
} from "lucide-react";
import {
  createMiniWebsiteLocation,
  MINI_WEBSITE_LOCATION_RADIUS_MAX,
  MINI_WEBSITE_LOCATION_RADIUS_MIN,
  MINI_WEBSITE_MAX_LOCATIONS,
  type MiniWebsiteLocation,
} from "@linktree/types";
import { modalInputClass } from "@/features/link-editor/modal-input-styles";
import { StandardPlatformInput } from "@/features/link-editor/components/StandardPlatformInput";
import { IconActionButton } from "@/components/shared/IconActionButton";
import { LocationMap } from "./LocationMap";
import { MediaUpload } from "./MiniWebsiteContentStep";
import { MiniWebsiteFieldLabel } from "./MiniWebsiteFieldLabel";
import { coordinatesFromMapUrl, firstUrl, isShortenedMapUrl } from "./location-url";
import type { MiniWebsiteDraft } from "./types";
import type { MiniWebsiteValidationErrors } from "./validation";

const inputClass = modalInputClass(false, "h-11 py-0");

function Field({
  label,
  hint,
  error,
  required = false,
  children,
}: {
  label: string;
  hint?: string;
  error?: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <MiniWebsiteFieldLabel required={required} className="mb-1.5 block text-[11px] font-black text-slate-600 dark:text-slate-300">
        {label}
      </MiniWebsiteFieldLabel>
      {children}
      {hint && !error && (
        <span className="mt-1 block text-[10px] leading-4 text-slate-400">{hint}</span>
      )}
      {error && (
        <span className="mt-1 block text-[10px] font-bold leading-4 text-red-500">
          {error}
        </span>
      )}
    </label>
  );
}

/**
 * The branch list for a mini website.
 *
 * A single-location business keeps one entry and never sees the difference; a
 * multi-branch one adds more. Order is what makes a branch primary — the first
 * entry leads the public page — so reordering is how the primary is changed.
 * An explicit "primary" flag would need exactly one to be set at all times, and
 * every add, delete or import is a chance to end up with two or none.
 */
export function MiniWebsiteLocationFields({
  draft,
  onChange,
  errors = {},
}: {
  draft: MiniWebsiteDraft;
  onChange: (draft: MiniWebsiteDraft) => void;
  errors?: MiniWebsiteValidationErrors;
}) {
  const locations = draft.locations;

  const setLocations = (next: MiniWebsiteLocation[]) =>
    onChange({ ...draft, locations: next });

  const patchAt = (index: number, patch: Partial<MiniWebsiteLocation>) =>
    setLocations(
      locations.map((entry, entryIndex) =>
        entryIndex === index ? { ...entry, ...patch } : entry,
      ),
    );

  const move = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= locations.length) return;
    const next = [...locations];
    [next[index], next[target]] = [next[target], next[index]];
    setLocations(next);
  };

  return (
    <div className="space-y-4">
      {errors.locations && (
        <p className="text-[11px] font-bold text-red-500">{errors.locations}</p>
      )}

      {locations.map((location, index) => (
        <LocationEntryFields
          key={index}
          index={index}
          total={locations.length}
          location={location}
          accent={draft.businessWebsiteColor || draft.accentColor}
          errors={errors}
          onPatch={(patch) => patchAt(index, patch)}
          onRemove={() =>
            setLocations(locations.filter((_, entryIndex) => entryIndex !== index))
          }
          onMove={(direction) => move(index, direction)}
        />
      ))}

      {locations.length < MINI_WEBSITE_MAX_LOCATIONS && (
        <button
          type="button"
          onClick={() => setLocations([...locations, createMiniWebsiteLocation()])}
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-slate-300 py-3 text-xs font-black text-slate-500 transition hover:border-slate-400 hover:bg-slate-50 dark:border-white/15 dark:text-slate-400 dark:hover:bg-white/5"
        >
          <Plus className="h-4 w-4" />
          {locations.length ? "زیادکردنی لقێکی تر" : "زیادکردنی شوێن"}
        </button>
      )}
    </div>
  );
}

/** One branch: its name, address, pin and how precisely it is shown. */
function LocationEntryFields({
  index,
  total,
  location,
  accent,
  errors,
  onPatch,
  onRemove,
  onMove,
}: {
  index: number;
  total: number;
  location: MiniWebsiteLocation;
  accent: string;
  errors: MiniWebsiteValidationErrors;
  onPatch: (patch: Partial<MiniWebsiteLocation>) => void;
  onRemove: () => void;
  onMove: (direction: -1 | 1) => void;
}) {
  const [resolveState, setResolveState] = useState<"idle" | "resolving" | "failed">(
    "idle",
  );
  const resolveToken = useRef(0);

  const approximate = location.precision === "approximate";
  const hasPin = location.lat !== null && location.lng !== null;
  const multiple = total > 1;

  /**
   * Pasting a map link places the pin, so the common path is paste-and-done.
   * A shortened link from Google's Share button carries no coordinates, so the
   * server expands it first.
   */
  const applyMapUrl = (raw: string) => {
    const mapUrl = firstUrl(raw);
    const parsed = coordinatesFromMapUrl(mapUrl);
    if (parsed) {
      setResolveState("idle");
      onPatch({
        mapUrl,
        lat: parsed.lat,
        lng: parsed.lng,
        ...(parsed.zoom ? { zoom: parsed.zoom } : {}),
      });
      return;
    }

    onPatch({ mapUrl });
    if (!isShortenedMapUrl(mapUrl)) {
      setResolveState("idle");
      return;
    }

    setResolveState("resolving");
    // Only the newest paste may apply its result, so a slow response for an
    // older link cannot overwrite a newer one.
    const token = ++resolveToken.current;
    void (async () => {
      try {
        const response = await fetch(
          `/api/mini-websites/resolve-map-link?url=${encodeURIComponent(mapUrl)}`,
          { credentials: "include", cache: "no-store" },
        );
        const result = await response.json();
        if (token !== resolveToken.current) return;
        if (result?.data?.lat != null && result?.data?.lng != null) {
          setResolveState("idle");
          onPatch({
            mapUrl,
            lat: result.data.lat,
            lng: result.data.lng,
            ...(result.data.zoom ? { zoom: result.data.zoom } : {}),
          });
        } else {
          setResolveState("failed");
        }
      } catch {
        if (token === resolveToken.current) setResolveState("failed");
      }
    })();
  };

  const resolving = resolveState === "resolving";
  const unresolved =
    Boolean(location.mapUrl.trim()) && resolveState === "failed" && !hasPin;

  return (
    <section className="mini-website-editor-item space-y-4">
      {multiple && (
        <header className="flex items-center justify-between gap-3">
          <span className="flex items-center gap-2">
            <span className="text-[11px] font-black text-slate-600 dark:text-slate-300">
              {location.name?.trim() || `شوێنی ${index + 1}`}
            </span>
            {index === 0 && (
              // Position is the source of truth, so the badge follows the order
              // rather than a stored flag that could drift out of sync.
              <span
                className="rounded-full px-2 py-0.5 text-[9px] font-black"
                style={{
                  background: "color-mix(in srgb, var(--theme-primary, #64748b) 12%, transparent)",
                  color: "var(--theme-primary, #64748b)",
                }}
              >
                سەرەکی
              </span>
            )}
          </span>
          <span className="flex items-center gap-1">
            <IconActionButton
              onClick={() => onMove(-1)}
              disabled={index === 0}
              label="بەرزکردنەوە"
            >
              <ChevronUp className="h-3.5 w-3.5" />
            </IconActionButton>
            <IconActionButton
              onClick={() => onMove(1)}
              disabled={index === total - 1}
              label="نزمکردنەوە"
            >
              <ChevronDown className="h-3.5 w-3.5" />
            </IconActionButton>
            <IconActionButton onClick={onRemove} tone="danger" label="سڕینەوە">
              <Trash2 className="h-3.5 w-3.5" />
            </IconActionButton>
          </span>
        </header>
      )}

      {multiple && (
        <Field label="ناوی لق">
          <input
            className={inputClass}
            value={location.name}
            onChange={(event) => onPatch({ name: event.target.value })}
            placeholder="هەولێر — ناوەندی شار"
            dir="auto"
          />
        </Field>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <Field required label="ناونیشان" error={errors[`location.${index}.address`]}>
          <input
            className={inputClass}
            value={location.address}
            onChange={(event) => onPatch({ address: event.target.value })}
            placeholder="١٠٠ مەتری، ناوەندی شار، هەولێر"
            dir="auto"
          />
        </Field>

        <Field label="لینکی نەخشە" error={errors[`location.${index}.mapUrl`]}>
          {/* No separate paste handler: `change` already fires after a paste
              with the final value. Handling both applied the link twice. */}
          <input
            className={inputClass}
            value={location.mapUrl}
            onChange={(event) => applyMapUrl(event.target.value)}
            placeholder="https://www.google.com/maps/place/..."
            dir="ltr"
          />
        </Field>
      </div>

      {/* Full width on its own row: the country selector sits inline with the
          number, so pairing it with another field squeezes both. */}
      <Field label="ژمارەی پەیوەندی">
        {/* The same input the WhatsApp and phone platforms use, so the number is
            normalized and the country selector behaves identically. */}
        <StandardPlatformInput
          platform="phone"
          value={location.phone}
          countryCode={location.phoneCountryCode}
          onChange={(phone) => onPatch({ phone })}
          onCountryCodeChange={(phoneCountryCode) => onPatch({ phoneCountryCode })}
        />
      </Field>

      {resolving && (
        <p
          className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 p-3 text-[11px] font-bold leading-5 text-slate-500 dark:border-white/10 dark:bg-white/5 dark:text-slate-400"
          role="status"
        >
          <MotionSpinner><Loader2 aria-hidden="true" className="h-3.5 w-3.5 shrink-0 "  /></MotionSpinner>
          لینکەکە دەکرێتەوە بۆ دۆزینەوەی شوێن...
        </p>
      )}

      {unresolved && (
        <p className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-[11px] font-bold leading-5 text-amber-700 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-400">
          <Crosshair className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          نەتوانرا شوێن لەم لینکەوە دەربهێنرێت. لەسەر نەخشەکە کلیک بکە بۆ دانانی
          نیشانەکە.
        </p>
      )}

      <MediaUpload
        label="وێنەی شوێنەکە"
        wide
        value={location.image ? [location.image] : []}
        onChange={(images) => onPatch({ image: images[0] || "" })}
      />

      <div>
        <div className="mb-2 flex items-center justify-between gap-3">
          <span className="text-[11px] font-black text-slate-600 dark:text-slate-300">
            نیشانە
          </span>
          <span className="font-mono text-[10px] text-slate-400" dir="ltr">
            {hasPin
              ? `${location.lat?.toFixed(5)}, ${location.lng?.toFixed(5)}`
              : "نیشانە دانەنراوە"}
          </span>
        </div>
        <div className="relative h-72 overflow-hidden rounded-2xl border border-slate-200 sm:h-80 dark:border-white/10">
          <LocationMap
            location={location}
            accent={accent}
            editable
            onChange={({ lat, lng, zoom }) => onPatch({ lat, lng, zoom })}
          />
        </div>
        {errors[`location.${index}.pin`] && (
          <p className="mt-1.5 text-[10px] font-bold text-red-500">
            {errors[`location.${index}.pin`]}
          </p>
        )}
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        <PrecisionOption
          active={!approximate}
          icon={Crosshair}
          label="نیشانەی ورد"
          onSelect={() => onPatch({ precision: "exact" })}
        />
        <PrecisionOption
          active={approximate}
          icon={ShieldCheck}
          label="تەنها ناوچە"
          onSelect={() => onPatch({ precision: "approximate" })}
        />
      </div>

      {approximate && (
        <Field
          label={`گەورەیی ناوچە — ${location.radiusMeters.toLocaleString("en-US")} م`}
        >
          <input
            type="range"
            min={MINI_WEBSITE_LOCATION_RADIUS_MIN}
            max={MINI_WEBSITE_LOCATION_RADIUS_MAX}
            step={100}
            value={location.radiusMeters}
            onChange={(event) => onPatch({ radiusMeters: Number(event.target.value) })}
            className="w-full accent-[var(--theme-primary,#64748b)]"
            dir="ltr"
          />
        </Field>
      )}
    </section>
  );
}

function PrecisionOption({
  active,
  icon: Icon,
  label,
  onSelect,
}: {
  active: boolean;
  icon: typeof MapPin;
  label: string;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={active}
      className={`flex items-center gap-3 rounded-xl border p-3 text-right transition ${
        active
          ? ""
          : "border-slate-200 bg-white hover:border-slate-300 dark:border-white/10 dark:bg-[#161B22]"
      }`}
      style={
        active
          ? {
              borderColor: "var(--theme-primary, #64748b)",
              backgroundColor:
                "color-mix(in srgb, var(--theme-primary, #64748b) 8%, transparent)",
            }
          : undefined
      }
    >
      <Icon
        className="h-4 w-4 shrink-0"
        style={{ color: "var(--theme-primary, #64748b)" }}
      />
      <span className="min-w-0 text-xs font-black text-slate-700 dark:text-slate-200">
        {label}
      </span>
    </button>
  );
}
