import { MotionSpinner } from "@/components/motion/MotionPrimitives";
import { useEffect, useState, type CSSProperties } from "react";
import { createPortal } from "react-dom";
import {
  Check,
  Eye,
  Layers3,
  Loader2,
  Pencil,
  Trash2,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { ConfirmDeleteModal } from "@/components/shared/ConfirmDeleteModal";
import { DetailViewModal } from "@/components/shared/DetailViewModal";
import { ModalWizardActions } from "@/components/shared/ModalWizardActions";
import { useModalKeyboard } from "@/hooks/useModalKeyboard";
import { RequiredMark } from "@/components/shared/RequiredMark";
import { modalInputClass } from "@/features/link-editor/modal-input-styles";
import type {
  Permission,
  PermissionProfile,
  PermissionProfileConfiguration,
} from "./types";
import { getKurdishPermissionDescription } from "./permission-descriptions";

const REQUIRED_PERMISSION_KEYS = new Set([
  "business:dashboard:view",
  "business:pages:linktrees-access",
  "business:pages:templates-access",
  "business:pages:profile-access",
  "business:pages:settings-access",
  "business:settings:profile-access",
  "business:settings:defaults-access",
  "business:settings:security-access",
  "business:profile:read",
  "business:defaults:read",
  "business:defaults:update",
  "business:security:email-update",
  "business:security:username-update",
  "business:security:sessions-revoke",
  "business:templates:browse",
  "business:templates:use",
  "business:templates:set-default",
  "business:linktrees:read",
  "business:linktrees:create",
  "business:linktrees:update",
  "business:linktrees:delete",
  "business:linktrees:upload",
  "business:links:read",
  "business:links:create",
  "business:links:update",
  "business:links:delete",
  "business:links:sync",
  "business:links:reorder",
  "business:analytics:totals-read",
  "business:analytics:details-read",
]);

export function PermissionProfiles({
  permissions,
  profiles,
  createOpen,
  onCreateOpenChange,
  onChanged,
}: {
  permissions: Permission[];
  profiles: PermissionProfile[];
  createOpen: boolean;
  onCreateOpenChange: (open: boolean) => void;
  onChanged: () => void;
}) {
  const [viewing, setViewing] = useState<{
    profile: PermissionProfile;
    configuration: PermissionProfileConfiguration;
  } | null>(null);
  const [editing, setEditing] = useState<{
    profile: PermissionProfile;
    configuration: PermissionProfileConfiguration;
  } | null>(null);
  const [loadingAction, setLoadingAction] = useState<string | null>(null);
  const [deletingProfile, setDeletingProfile] =
    useState<PermissionProfile | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const loadProfile = async (
    profile: PermissionProfile,
    action: "view" | "edit",
  ) => {
    setLoadingAction(`${action}:${profile.id}`);
    try {
      const response = await fetch(
        `/api/platform/billing/plans/${profile.id}/configuration`,
        { credentials: "include", cache: "no-store" },
      );
      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(
          result.message || "زانیاری پڕۆفایلی مۆڵەت بار نەکرا",
        );
      }
      const value = {
        profile,
        configuration: result.data as PermissionProfileConfiguration,
      };
      if (action === "view") setViewing(value);
      else setEditing(value);
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "زانیاری پڕۆفایلی مۆڵەت بار نەکرا",
      );
    } finally {
      setLoadingAction(null);
    }
  };

  const deleteProfile = async () => {
    if (!deletingProfile || isDeleting) return;
    setIsDeleting(true);
    try {
      const response = await fetch(
        `/api/platform/billing/plans/${deletingProfile.id}`,
        {
          method: "DELETE",
          credentials: "include",
        },
      );
      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        toast.error(
          response.status === 409
            ? "ئەم پڕۆفایلە بنەڕەتییە یان لەلایەن بزنسێکەوە بەکاردێت و ناتوانرێت بسڕدرێتەوە."
            : result.message || "سڕینەوەی پڕۆفایلی مۆڵەت سەرکەوتوو نەبوو",
        );
        throw new Error(result.message || "Delete failed");
      }
      toast.success("پڕۆفایلی مۆڵەت سڕایەوە");
      onChanged();
    } catch (error) {
      if (error instanceof TypeError) {
        toast.error("سڕینەوەی پڕۆفایلی مۆڵەت سەرکەوتوو نەبوو");
      }
      throw error;
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div dir="ltr">
      <div className="overflow-x-auto custom-scrollbar lime-custom-scrollbar">
        <table className="w-full min-w-[680px] text-left text-xs">
          <thead>
            <tr className="border-b border-slate-100 text-slate-400 dark:border-white/5">
              {[
                "پڕۆفایل",
                "کۆد",
                "ژمارەی مۆڵەتەکان",
                "کارەکان",
              ].map((header) => (
                <th key={header} className="px-3 py-3 font-semibold">
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {profiles.map((profile) => (
              <tr
                key={profile.id}
                className="border-b border-slate-100 text-slate-600 transition hover:bg-slate-50/60 dark:border-white/5 dark:text-slate-300 dark:hover:bg-white/[0.03]"
              >
                <td className="px-3 py-3">
                  <p className="font-bold">{profile.name}</p>
                  <p className="mt-0.5 text-[10px] text-slate-400">
                    پڕۆفایلی مۆڵەتی بەشداربوون
                  </p>
                </td>
                <td className="px-3 py-3 font-mono text-[11px]">
                  {profile.code}
                </td>
                <td className="px-3 py-3">{profile.permissionCount}</td>
                <td className="px-3 py-3">
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => void loadProfile(profile, "view")}
                      disabled={loadingAction !== null}
                      className="flex h-8 w-8 items-center justify-center rounded-lg text-sky-600 transition hover:bg-sky-50 disabled:opacity-50 dark:hover:bg-sky-500/10"
                      title="بینین"
                      aria-label={`بینینی ${profile.name}`}
                    >
                      {loadingAction === `view:${profile.id}` ? (
                        <MotionSpinner><Loader2 className="h-4 w-4 "  /></MotionSpinner>
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => void loadProfile(profile, "edit")}
                      disabled={loadingAction !== null}
                      className="flex h-8 w-8 items-center justify-center rounded-lg text-violet-600 transition hover:bg-violet-50 disabled:opacity-50 dark:hover:bg-violet-500/10"
                      title="دەستکاریکردن"
                      aria-label={`دەستکاریکردنی ${profile.name}`}
                    >
                      {loadingAction === `edit:${profile.id}` ? (
                        <MotionSpinner><Loader2 className="h-4 w-4 "  /></MotionSpinner>
                      ) : (
                        <Pencil className="h-4 w-4" />
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (profile.isDefault) {
                          toast.error(
                            "پڕۆفایلی بنەڕەتی ناتوانرێت بسڕدرێتەوە.",
                          );
                          return;
                        }
                        if (profile.subscriberCount > 0) {
                          toast.error(
                            "ئەم پڕۆفایلە لەلایەن بزنسێکەوە بەکاردێت و ناتوانرێت بسڕدرێتەوە.",
                          );
                          return;
                        }
                        setDeletingProfile(profile);
                      }}
                      className="flex h-8 w-8 items-center justify-center rounded-lg text-red-600 transition hover:bg-red-50 dark:hover:bg-red-500/10"
                      title="سڕینەوە"
                      aria-label={`سڕینەوەی ${profile.name}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {createOpen && (
        <ProfileEditorModal
          permissions={permissions}
          profiles={profiles}
          onClose={() => onCreateOpenChange(false)}
          onSaved={() => {
            onCreateOpenChange(false);
            onChanged();
          }}
        />
      )}

      {editing && (
        <ProfileEditorModal
          permissions={permissions}
          profiles={profiles}
          profile={editing.profile}
          initialPermissionIds={Object.keys(
            editing.configuration.permissions,
          )}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            onChanged();
          }}
        />
      )}

      {viewing && (
        <ProfileViewModal
          permissions={permissions}
          profile={viewing.profile}
          configuration={viewing.configuration}
          onClose={() => setViewing(null)}
        />
      )}

      <ConfirmDeleteModal
        isOpen={!!deletingProfile}
        onClose={() => {
          if (!isDeleting) setDeletingProfile(null);
        }}
        onConfirm={deleteProfile}
        isDeleting={isDeleting}
        title="سڕینەوەی پڕۆفایلی مۆڵەت"
        message={
          <span>
            دڵنیایت لە سڕینەوەی پڕۆفایلی{" "}
            <strong>{deletingProfile?.name}</strong>؟ ئەم کردارە
            ناگەڕێندرێتەوە.
          </span>
        }
        zIndexClassName="z-[160]"
      />
    </div>
  );
}

function ProfileEditorModal({
  permissions,
  profiles,
  profile,
  initialPermissionIds,
  onClose,
  onSaved,
}: {
  permissions: Permission[];
  profiles: PermissionProfile[];
  profile?: PermissionProfile;
  initialPermissionIds?: string[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const isEditing = !!profile;
  const [name, setName] = useState(profile?.name || "");
  const [saving, setSaving] = useState(false);
  const [selectedPermissionIds, setSelectedPermissionIds] = useState(
    () => {
      const selected = new Set(initialPermissionIds || []);
      for (const permission of permissions) {
        if (REQUIRED_PERMISSION_KEYS.has(permission.key)) {
          selected.add(permission.id);
        }
      }
      return selected;
    },
  );
  const normalizedName = name.trim().toLocaleLowerCase();
  const existingNames = new Set(
    profiles
      .filter((item) => item.id !== profile?.id)
      .map((item) => item.name.trim().toLocaleLowerCase()),
  );
  const duplicateName =
    normalizedName.length > 0 && existingNames.has(normalizedName);
  const suggestedName = (() => {
    const base = name.trim();
    if (!base || !duplicateName) return "";
    let suffix = 1;
    while (existingNames.has(`${base} ${suffix}`.toLocaleLowerCase())) {
      suffix += 1;
    }
    return `${base} ${suffix}`;
  })();
  const canCreate = name.trim().length >= 2 && !duplicateName;

  useModalKeyboard({
    isOpen: true,
    onEscape: onClose,
    enterEnabled: false,
  });

  useEffect(() => {
    document.body.classList.add("multitree-theme-portals");
    return () => {
      document.body.classList.remove("multitree-theme-portals");
    };
  }, []);

  const togglePermission = (permission: Permission) => {
    if (REQUIRED_PERMISSION_KEYS.has(permission.key)) return;
    setSelectedPermissionIds((current) => {
      const next = new Set(current);
      if (next.has(permission.id)) next.delete(permission.id);
      else next.add(permission.id);
      return next;
    });
  };

  const save = async () => {
    if (!canCreate || saving) return;

    setSaving(true);
    try {
      const response = await fetch(
        profile
          ? `/api/platform/billing/plans/${profile.id}/profile`
          : "/api/platform/billing/plans",
        {
          method: isEditing ? "PATCH" : "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(
            isEditing
              ? {
                  name: name.trim(),
                  permissionIds: [...selectedPermissionIds],
                }
              : {
                  name: name.trim(),
                  description: `پڕۆفایلی مۆڵەتی ${name.trim()}`,
                  status: "active",
                  currency: "USD",
                  yearlyPriceMinor: 0,
                  trialDays: 0,
                  displayOrder: 100,
                  isDefault: false,
                  permissionIds: [...selectedPermissionIds],
                },
          ),
        },
      );
      if (!response.ok) {
        const result = await response.json().catch(() => ({}));
        if (response.status === 409) {
          toast.error(
            "ئەم ناوە پێشتر بەکارهاتووە. ناوەکە بگۆڕە یان ژمارەیەکی وەک 1 زیاد بکە.",
          );
          return;
        }
        toast.error(
          result.message ||
            (isEditing
              ? "دەستکاریکردنی پڕۆفایلی مۆڵەت سەرکەوتوو نەبوو"
              : "دروستکردنی پڕۆفایلی مۆڵەت سەرکەوتوو نەبوو"),
        );
        return;
      }
      toast.success(
        isEditing
          ? "پڕۆفایلی مۆڵەت نوێکرایەوە"
          : "پڕۆفایلی مۆڵەت دروستکرا",
      );
      onSaved();
    } catch {
      toast.error(
        isEditing
          ? "دەستکاریکردنی پڕۆفایلی مۆڵەت سەرکەوتوو نەبوو"
          : "دروستکردنی پڕۆفایلی مۆڵەت سەرکەوتوو نەبوو",
      );
    } finally {
      setSaving(false);
    }
  };

  return createPortal(
    <div
      className="modal-ltr fixed inset-0 z-[140] flex items-center justify-center p-2 sm:p-4"
      dir="ltr"
      data-multitree-theme
      style={
        {
          "--theme-primary": "var(--multitree-accent)",
          "--theme-css": "var(--multitree-accent)",
        } as CSSProperties
      }
    >
      <button
        type="button"
        aria-label="داخستن"
        className="absolute inset-0 bg-black/40 backdrop-blur-md   duration-300"
        onClick={onClose}
      />

      <div
        className="relative z-10 w-full max-w-2xl max-h-[95vh] sm:max-h-[90vh] overflow-hidden rounded-2xl bg-primary-95 backdrop-blur-sm border border-gray-100 shadow-2xl    duration-300"
        style={{ contain: "layout style paint" }}
      >
        <form
          onSubmit={(event) => {
            event.preventDefault();
            void save();
          }}
          onKeyDown={(event) => {
            if (event.key !== "Enter" || event.shiftKey) return;
            event.preventDefault();
            event.stopPropagation();
            void save();
          }}
          className="flex h-full max-h-[95vh] flex-col sm:max-h-[90vh]"
        >
          <div
            className="flex items-center justify-between border-b border-gray-100/50 bg-linear-to-r from-white to-slate-50/30 p-4 sm:p-5 md:p-6"
            dir="ltr"
          >
            <div className="min-w-0 flex-1">
              <h2 className="truncate text-lg font-bold text-slate-700 sm:text-xl md:text-2xl">
                {isEditing
                  ? "دەستکاریکردنی پڕۆفایلی مۆڵەت"
                  : "پڕۆفایلی مۆڵەتی نوێ"}
              </h2>
              <p className="mt-0.5 text-xs text-slate-500 sm:mt-1 sm:text-sm">
                {isEditing
                  ? "ناو و مۆڵەتەکانی پڕۆفایلەکە نوێ بکەرەوە"
                  : "ناو و مۆڵەتەکانی پڕۆفایلە نوێیەکە دیاری بکە"}
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="ml-3 flex shrink-0 items-center justify-center rounded-xl border border-slate-100 bg-linear-to-br from-slate-50 to-gray-50 p-2 text-slate-500 shadow-sm transition-all duration-300 hover:from-slate-100 hover:to-gray-100 hover:text-slate-700 hover:shadow"
              aria-label="داخستن"
            >
              <X className="h-4 w-4 sm:h-5 sm:w-5" />
            </button>
          </div>

          <div
            className="flex-1 overflow-y-auto bg-linear-to-br from-white to-slate-50/20 p-4 sm:p-5 md:p-6 custom-scrollbar lime-custom-scrollbar"
            style={{
              scrollbarWidth: "thin",
              scrollbarColor: "rgba(156,163,175,0.5) transparent",
            }}
          >
            <div className="space-y-6 min-h-[50vh]">
              <div className="mx-auto w-full max-w-xl">
                <div className="space-y-1.5">
                  <label
                    htmlFor="permission-profile-name"
                    className="block text-xs font-medium text-gray-700 sm:text-sm"
                  >
                    ناوی پڕۆفایل <RequiredMark />
                  </label>
                  <input
                    id="permission-profile-name"
                    autoFocus
                    className={modalInputClass(duplicateName)}
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    placeholder="بۆ نموونە: Basic یان Basic 1"
                    required
                  />
                  {duplicateName ? (
                    <p className="mt-1.5 text-xs font-medium text-red-500">
                      ئەم ناوە پێشتر بەکارهاتووە. ناوێکی تر هەڵبژێرە، بۆ
                      نموونە:{" "}
                      <button
                        type="button"
                        onClick={() => setName(suggestedName)}
                        className="font-bold underline underline-offset-2"
                      >
                        {suggestedName}
                      </button>
                    </p>
                  ) : (
                    <p className="mt-1.5 text-[11px] text-slate-400">
                      کۆدی ناوخۆی پڕۆفایل بە شێوەی خۆکار دروست دەکرێت.
                    </p>
                  )}
                </div>
              </div>

              <section className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
                <div className="flex flex-col gap-3 border-b border-gray-100 bg-linear-to-r from-white to-slate-50/40 p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-slate-700 sm:text-base">
                      مۆڵەتەکانی پڕۆفایل
                    </h3>
                    <p className="mt-1 text-[11px] leading-5 text-slate-500 sm:text-xs">
                      مۆڵەتە بنەڕەتییەکان هەمیشە چالاکن و ناتوانرێت
                      لاببرێن.
                    </p>
                  </div>
                  <div className="flex items-center gap-2 self-start sm:self-auto">
                    <span className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-[10px] font-semibold text-slate-500 shadow-sm">
                      {selectedPermissionIds.size} مۆڵەت
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        setSelectedPermissionIds(
                          new Set(
                            permissions.map((permission) => permission.id),
                          ),
                        )
                      }
                      className="rounded-xl border border-slate-100 bg-linear-to-br from-slate-50 to-gray-50 px-3 py-2 text-[10px] font-bold text-slate-600 shadow-sm transition-all duration-300 hover:from-slate-100 hover:to-gray-100 hover:text-slate-700 hover:shadow"
                    >
                      هەمووی دیاری بکە
                    </button>
                  </div>
                </div>

                <div className="p-3 sm:p-4">
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    {permissions.map((permission) => {
                      const required = REQUIRED_PERMISSION_KEYS.has(
                        permission.key,
                      );
                      const selected = selectedPermissionIds.has(permission.id);
                      return (
                        <label
                          key={permission.id}
                          className={`group flex cursor-pointer items-start gap-3 rounded-xl border p-3 text-left shadow-sm transition-all duration-200 ${
                            selected
                              ? "border-lime-300 bg-lime-50/70"
                              : "border-gray-100 bg-white hover:border-gray-200 hover:bg-slate-50/70"
                          } ${required ? "cursor-default" : ""}`}
                        >
                          <span
                            className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition ${
                              selected
                                ? "border-lime-500 bg-lime-500 text-slate-900"
                                : "border-slate-300 bg-white text-transparent"
                            }`}
                          >
                            <Check className="h-3.5 w-3.5" strokeWidth={3} />
                          </span>
                          <input
                            type="checkbox"
                            checked={selected}
                            disabled={required}
                            onChange={() => togglePermission(permission)}
                            className="sr-only"
                          />
                          <span className="min-w-0 flex-1">
                            <span className="block break-all font-mono text-[10px] font-bold leading-4 text-slate-700">
                              {permission.key}
                            </span>
                            <span className="mt-1 block text-[10px] leading-4 text-slate-500">
                              {permission.description}
                            </span>
                            <span
                              className="mt-1 block text-[10px] font-medium leading-4 text-slate-600"
                              dir="rtl"
                            >
                              {getKurdishPermissionDescription(permission.key)}
                            </span>
                            {required && (
                              <span className="mt-2 inline-flex rounded-full border border-lime-300/70 bg-white/70 px-2 py-0.5 text-[9px] font-bold text-lime-700">
                                بنەڕەتی
                              </span>
                            )}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              </section>
            </div>
          </div>

          <ModalWizardActions
            variant="multitree"
            isFirstStep
            isFinalStep
            isSubmitting={saving}
            canContinue={canCreate}
            submitLabel={isEditing ? "نوێکردنەوە" : "دروستکردن"}
            onBack={() => undefined}
            onCancel={onClose}
            onNext={() => undefined}
            onSubmit={() => void save()}
          />
        </form>
      </div>
    </div>,
    document.body,
  );
}

function ProfileViewModal({
  permissions,
  profile,
  configuration,
  onClose,
}: {
  permissions: Permission[];
  profile: PermissionProfile;
  configuration: PermissionProfileConfiguration;
  onClose: () => void;
}) {
  const selectedIds = new Set(
    Object.entries(configuration.permissions)
      .filter(([, rule]) => rule.accessMode !== "deny")
      .map(([permissionId]) => permissionId),
  );
  const selectedPermissions = permissions.filter((permission) =>
    selectedIds.has(permission.id),
  );

  return (
    <DetailViewModal
      isOpen
      wide
      onClose={onClose}
      title={profile.name}
      subtitle="وردەکاری پڕۆفایلی مۆڵەت"
      icon={Layers3}
      iconClassName="border-lime-200 bg-lime-50 text-lime-600 dark:border-lime-900/40 dark:bg-lime-950/20 dark:text-lime-300"
      fields={[
        {
          label: "ژمارەی مۆڵەتەکان",
          value: `${selectedPermissions.length} مۆڵەت`,
        },
        {
          label: "بزنسە بەشداربووەکان",
          value: `${configuration.subscriberCount} بزنس`,
        },
        {
          label: "مۆڵەتەکان",
          fullWidth: true,
          value: (
            <div className="overflow-hidden rounded-xl border border-slate-200 bg-white divide-y divide-slate-100 dark:border-white/10 dark:bg-white/[0.02] dark:divide-white/5">
              {selectedPermissions.map((permission) => (
                <div
                  key={permission.id}
                  className="px-3 py-3"
                >
                  <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between sm:gap-3">
                    <div className="min-w-0">
                      <p className="break-all font-mono text-[10px] font-bold leading-4 sa-accent-text">
                        {permission.key}
                      </p>
                      <p
                        className="mt-1 text-[10px] font-medium leading-4 text-slate-600 dark:text-slate-300"
                        dir="rtl"
                      >
                        {getKurdishPermissionDescription(permission.key)}
                      </p>
                      <p className="mt-1 text-[10px] leading-4 text-slate-400">
                        {permission.description}
                      </p>
                    </div>
                    <span className="mt-1 shrink-0 rounded-full bg-slate-100 px-2 py-1 text-[9px] font-bold text-slate-500 dark:bg-white/5 dark:text-slate-400">
                      {permission.category}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ),
        },
      ]}
    />
  );
}
