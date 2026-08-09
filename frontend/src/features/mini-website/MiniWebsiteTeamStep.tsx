"use client";

import { ChevronDown, ChevronUp, Plus, Trash2, Users } from "lucide-react";
import {
  MINI_WEBSITE_ACTION_TYPES,
  MINI_WEBSITE_MAX_TEAM_MEMBERS,
  createMiniWebsiteTeamMember,
  type MiniWebsiteActionType,
  type MiniWebsiteTeamMember,
} from "@linktree/types";
import { CustomSelect } from "@/components/shared/CustomSelect";
import { IconActionButton } from "@/components/shared/IconActionButton";
import { StandardPlatformInput } from "@/features/link-editor/components/StandardPlatformInput";
import { modalInputClass } from "@/features/link-editor/modal-input-styles";
import { MediaUpload } from "./MiniWebsiteContentStep";
import { MiniWebsiteFieldLabel } from "./MiniWebsiteFieldLabel";
import { actionInputPlatform } from "./service-action";
import type { MiniWebsiteDraft } from "./types";
import type { MiniWebsiteValidationErrors } from "./validation";

const inputClass = modalInputClass(false, "h-11 py-0");
const textareaClass = modalInputClass(false, "min-h-24 py-3");

const ACTION_TYPE_LABELS: Record<MiniWebsiteActionType, string> = {
  none: "بێ دوگمە",
  whatsapp: "واتساپ",
  phone: "پەیوەندی تەلەفۆنی",
  link: "لینک",
};

const TEAM_ACTION_LABELS: Record<MiniWebsiteActionType, string> = {
  none: "",
  whatsapp: "پەیوەندی لە واتساپ",
  phone: "پەیوەندی",
  link: "زانیاری زیاتر",
};

const automaticLabels = new Set(Object.values(TEAM_ACTION_LABELS));

export function MiniWebsiteTeamFields({
  draft,
  onChange,
  errors = {},
}: {
  draft: MiniWebsiteDraft;
  onChange: (draft: MiniWebsiteDraft) => void;
  errors?: MiniWebsiteValidationErrors;
}) {
  const team = draft.team;
  const setTeam = (next: MiniWebsiteTeamMember[]) =>
    onChange({ ...draft, team: next });
  const patchAt = (index: number, patch: Partial<MiniWebsiteTeamMember>) =>
    setTeam(
      team.map((member, memberIndex) =>
        memberIndex === index ? { ...member, ...patch } : member,
      ),
    );
  const move = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= team.length) return;
    const next = [...team];
    [next[index], next[target]] = [next[target], next[index]];
    setTeam(next);
  };

  return (
    <div className="space-y-4">
      {errors.team && (
        <p className="text-[11px] font-bold text-red-500">{errors.team}</p>
      )}

      {team.map((member, index) => (
        <div
          key={member.id}
          className="mini-website-editor-item space-y-4"
        >
          <div className="flex items-center gap-2">
            <span className="w-6 shrink-0 text-center text-[11px] font-black text-slate-400">
              {index + 1}
            </span>
            <label className="min-w-0 flex-1">
              <MiniWebsiteFieldLabel required className="mb-1.5 block text-[11px] font-black text-slate-600 dark:text-slate-300">
                ناو
              </MiniWebsiteFieldLabel>
            <input
              required
              value={member.name}
              onChange={(event) => patchAt(index, { name: event.target.value })}
              maxLength={240}
              placeholder="ناوی ئەندامی تیم"
              aria-label={`ناوی ئەندامی تیم ${index + 1}`}
              className={`${inputClass} min-w-0 flex-1`}
              dir="auto"
            />
            </label>
            <span className="flex shrink-0 items-center gap-0.5">
              <IconActionButton
                label="بردنە سەرەوە"
                disabled={index === 0}
                onClick={() => move(index, -1)}
              >
                <ChevronUp className="h-4 w-4" />
              </IconActionButton>
              <IconActionButton
                label="بردنە خوارەوە"
                disabled={index === team.length - 1}
                onClick={() => move(index, 1)}
              >
                <ChevronDown className="h-4 w-4" />
              </IconActionButton>
              <IconActionButton
                label="سڕینەوەی ئەندامی تیم"
                tone="danger"
                onClick={() =>
                  setTeam(
                    team.filter((_, memberIndex) => memberIndex !== index),
                  )
                }
              >
                <Trash2 className="h-4 w-4" />
              </IconActionButton>
            </span>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <label>
              <span className="mb-1.5 block text-[11px] font-black text-slate-600 dark:text-slate-300">
                پسپۆڕی
              </span>
              <input
                required
                value={member.role}
                onChange={(event) =>
                  patchAt(index, { role: event.target.value })
                }
                maxLength={160}
                placeholder="بۆ نموونە: پزیشکی ددان"
                className={inputClass}
                dir="auto"
              />
            </label>
            <label>
              <span className="mb-1.5 block text-[11px] font-black text-slate-600 dark:text-slate-300">
                ئەزموون
              </span>
              <input
                value={member.experience}
                onChange={(event) =>
                  patchAt(index, { experience: event.target.value })
                }
                maxLength={160}
                placeholder="بۆ نموونە: ٨ ساڵ ئەزموون"
                className={inputClass}
                dir="auto"
              />
            </label>
          </div>

          <label>
            <span className="mb-1.5 block text-[11px] font-black text-slate-600 dark:text-slate-300">
              دەربارە
            </span>
          <textarea
            value={member.bio}
            onChange={(event) => patchAt(index, { bio: event.target.value })}
            maxLength={2000}
            placeholder="پێناسەیەکی کورت دەربارەی ئەم ئەندامە"
            className={`${textareaClass} w-full resize-y`}
            dir="auto"
          />
          </label>

          <MediaUpload
            label="وێنە"
            wide
            value={member.image ? [member.image] : []}
            onChange={(value) => patchAt(index, { image: value[0] ?? "" })}
          />

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <MiniWebsiteFieldLabel required className="mb-1.5 block text-[11px] font-black text-slate-600 dark:text-slate-300">
                جۆری دوگمە
              </MiniWebsiteFieldLabel>
              <CustomSelect
                label="جۆری دوگمە"
                hideLabel
                triggerClassName="h-11 text-xs sm:text-sm"
                value={member.actionType}
                onChange={(actionType) =>
                  patchAt(index, {
                    actionType,
                    actionValue: "",
                    url: "",
                    ...(member.actionLabel.trim() === "" ||
                    automaticLabels.has(member.actionLabel)
                      ? { actionLabel: TEAM_ACTION_LABELS[actionType] }
                      : {}),
                  })
                }
                options={MINI_WEBSITE_ACTION_TYPES.map((actionType) => ({
                  value: actionType,
                  label: ACTION_TYPE_LABELS[actionType],
                }))}
              />
            </div>
            <label>
              <span className="mb-1.5 block text-[11px] font-black text-slate-600 dark:text-slate-300">
                دەقی دوگمە
              </span>
              <input
                value={member.actionLabel}
                onChange={(event) =>
                  patchAt(index, { actionLabel: event.target.value })
                }
                maxLength={120}
                disabled={member.actionType === "none"}
                placeholder={
                  TEAM_ACTION_LABELS[member.actionType] || "دەقی دوگمە"
                }
                className={inputClass}
                dir="auto"
              />
            </label>
          </div>

          {member.actionType !== "none" && (
            <div>
              <MiniWebsiteFieldLabel required className="mb-1.5 block text-[11px] font-black text-slate-600 dark:text-slate-300">
                {member.actionType === "link" ? "لینک" : "ژمارەی مۆبایل"}
              </MiniWebsiteFieldLabel>
              {member.actionType === "link" ? (
                <input
                  required
                  value={member.actionValue}
                  onChange={(event) =>
                    patchAt(index, {
                      actionValue: event.target.value,
                      url: "",
                    })
                  }
                  maxLength={500}
                  placeholder="https://example.com"
                  className={inputClass}
                  dir="ltr"
                />
              ) : (
                <StandardPlatformInput
                  platform={actionInputPlatform(member.actionType)}
                  value={member.actionValue}
                  countryCode={member.actionCountryCode}
                  onChange={(value) =>
                    patchAt(index, { actionValue: value, url: "" })
                  }
                  onCountryCodeChange={(code) =>
                    patchAt(index, {
                      actionCountryCode: code,
                      url: "",
                    })
                  }
                  inputClassName="h-11 text-xs sm:text-sm"
                  countryClassName="h-11"
                />
              )}
            </div>
          )}

          {errors[`team.${index}`] && (
            <p className="text-[10px] font-bold text-red-500">
              {errors[`team.${index}`]}
            </p>
          )}
        </div>
      ))}

      {team.length < MINI_WEBSITE_MAX_TEAM_MEMBERS && (
        <button
          type="button"
          onClick={() => setTeam([...team, createMiniWebsiteTeamMember()])}
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-slate-300 py-3 text-xs font-black text-slate-500 transition hover:border-slate-400 hover:bg-slate-50 dark:border-white/15 dark:text-slate-400 dark:hover:bg-white/5"
        >
          <Plus className="h-4 w-4" />
          {team.length ? "ئەندامێکی تر" : "زیادکردنی ئەندامی تیم"}
        </button>
      )}

      {!team.length && (
        <div className="flex items-center gap-3 rounded-xl bg-slate-50 p-3 text-[11px] text-slate-500 dark:bg-white/5 dark:text-slate-400">
          <Users className="h-4 w-4 shrink-0" />
          یەکەم ئەندامی تیمەکەت زیاد بکە.
        </div>
      )}
    </div>
  );
}
