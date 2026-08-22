"use client";

import { memo, useState } from "react";
import Image from "next/image";
import {
  CalendarPlus,
  CirclePause,
  CirclePlay,
  CreditCard,
  ExternalLink,
  Eye,
  Search,
  Trash2,
  Users,
} from "lucide-react";
import {
  ManagementTable,
  MANAGEMENT_TABLE_CARD_CLASS,
  MANAGEMENT_TABLE_ROW_CLASS,
  hideBelowClass,
  type ManagementTableColumn,
  type ManagementTablePagination,
} from "@/components/shared/ManagementTable";
import { remoteAvatarSrc } from "@/lib/utils/remote-avatar";
import {
  creatorPageHref,
  formatOptionalDate,
  subscriptionDeadline,
  type Creator,
  type CreatorManageAction,
} from "@/features/platform-admin/creator-account";
import { CreatorMetaBadges } from "@/features/platform-admin/components/CreatorMetaBadges";

interface CreatorUsersTableProps {
  data?: Creator[];
  busyId?: string | null;
  isLoading?: boolean;
  searching?: boolean;
  pagination?: ManagementTablePagination;
  onView?: (creator: Creator) => void;
  onManage?: (creator: Creator, action: CreatorManageAction) => void;
  onDeletePage?: (creator: Creator) => void;
}

/**
 * Five columns, because everything else now lives one click away in the detail
 * modal. A management table earns its width by being scannable: who the account
 * belongs to, what state it is in, when that state runs out, and what can be
 * done about it.
 *
 * Header and cell hiding come from this one list, so a column that disappears
 * at a breakpoint cannot take its header with it and shear the row.
 */
const COLUMNS: ManagementTableColumn[] = [
  { key: "avatar", width: "w-14" },
  { key: "user", header: "بەکارهێنەر" },
  { key: "status", header: "دۆخ / بەشداری", width: "w-64" },
  { key: "deadline", header: "بەروار", width: "w-40", hideBelow: "lg" },
  { key: "actions", header: "کارەکان", width: "w-36" },
];

function AvatarCell({ item, size }: { item: Creator; size: "row" | "card" }) {
  // A stored photo `next/image` cannot load draws the placeholder instead of
  // throwing the table away.
  const avatarUrl = remoteAvatarSrc(item.avatar_url);
  const [imgError, setImgError] = useState(false);
  const box =
    size === "row" ? "w-8 h-8 sm:w-10 sm:h-10 mx-auto" : "h-14 w-14 shrink-0";

  return (
    <div
      className={`relative rounded-full overflow-hidden border border-gray-200 dark:border-white/10 ${box}`}
    >
      {avatarUrl && !imgError ? (
        <Image
          src={avatarUrl}
          alt={item.display_name}
          fill
          sizes={size === "row" ? "(min-width: 640px) 40px, 32px" : "56px"}
          onError={() => setImgError(true)}
          className="object-cover"
        />
      ) : (
        <div className="w-full h-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-xs sm:text-sm font-bold text-white">
          {item.display_name.trim().charAt(0).toUpperCase() || (
            <Users className="h-4 w-4" />
          )}
        </div>
      )}
    </div>
  );
}

function CreatorActions({
  item,
  busy,
  compact,
  onView,
  onManage,
  onDeletePage,
}: {
  item: Creator;
  busy: boolean;
  compact: boolean;
  onView?: (creator: Creator) => void;
  onManage?: (creator: Creator, action: CreatorManageAction) => void;
  onDeletePage?: (creator: Creator) => void;
}) {
  const suspended = item.status === "suspended";
  const paid = item.billing_status === "active";
  const buttonClass = compact
    ? "flex items-center justify-center p-2 rounded-lg transition-colors cursor-pointer disabled:cursor-not-allowed disabled:opacity-40"
    : "p-1 sm:p-1.5 rounded transition-colors duration-200 shrink-0 cursor-pointer disabled:cursor-not-allowed disabled:opacity-40";
  const iconClass = compact ? "h-4 w-4" : "h-3.5 w-3.5 sm:h-4 sm:w-4";

  return (
    <div
      className={
        compact
          ? "flex items-center gap-1 shrink-0"
          : "flex items-center gap-1 sm:gap-1.5 flex-wrap justify-start"
      }
    >
      {onView && (
        <button
          type="button"
          onClick={() => onView(item)}
          className={`${buttonClass} hover:bg-sky-50 dark:hover:bg-sky-500/10`}
          title="بینینی وردەکاری"
          aria-label={`بینینی وردەکاری ${item.display_name}`}
        >
          <Eye className={`${iconClass} text-sky-600`} />
        </button>
      )}
      {onManage && (
        <>
          <button
            type="button"
            disabled={busy}
            onClick={() => onManage(item, suspended ? "reactivate" : "suspend")}
            className={`${buttonClass} ${suspended ? "hover:bg-emerald-50 dark:hover:bg-emerald-500/10" : "hover:bg-orange-50 dark:hover:bg-orange-500/10"}`}
            title={suspended ? "چالاککردنەوە" : "ڕاگرتن"}
            aria-label={
              suspended
                ? `چالاککردنەوەی ${item.display_name}`
                : `ڕاگرتنی ${item.display_name}`
            }
          >
            {suspended ? (
              <CirclePlay className={`${iconClass} text-emerald-600`} />
            ) : (
              <CirclePause className={`${iconClass} text-orange-600`} />
            )}
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => onManage(item, "extend_trial")}
            className={`${buttonClass} hover:bg-violet-50 dark:hover:bg-violet-500/10`}
            title="درێژکردنەوەی تاقیکردنەوە بۆ ٧ ڕۆژ"
            aria-label={`درێژکردنەوەی تاقیکردنەوەی ${item.display_name}`}
          >
            <CalendarPlus className={`${iconClass} text-violet-600`} />
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() =>
              onManage(item, paid ? "cancel_paid" : "activate_paid")
            }
            className={`${buttonClass} ${paid ? "hover:bg-amber-50 dark:hover:bg-amber-500/10" : "hover:bg-emerald-50 dark:hover:bg-emerald-500/10"}`}
            title={paid ? "وەستاندنی پارەدان" : "چالاککردنی پارەدان"}
            aria-label={
              paid
                ? `وەستاندنی پارەدانی ${item.display_name}`
                : `چالاککردنی پارەدانی ${item.display_name}`
            }
          >
            <CreditCard
              className={`${iconClass} ${paid ? "text-amber-600" : "text-emerald-600"}`}
            />
          </button>
        </>
      )}
      {onDeletePage && item.page_type && (
        <button
          type="button"
          disabled={busy}
          onClick={() => onDeletePage(item)}
          className={`${buttonClass} hover:bg-red-50 dark:hover:bg-red-500/10`}
          title="سڕینەوەی پەڕە"
          aria-label={`سڕینەوەی پەڕەی ${item.display_name}`}
        >
          <Trash2 className={`${iconClass} text-red-600`} />
        </button>
      )}
    </div>
  );
}

/**
 * Name, email and the page slug in one cell.
 *
 * The slug stays on the table rather than moving to the modal because the
 * delete-page action is gated on the account having a page: without it visible,
 * that destructive button appears on some rows with nothing on screen saying
 * why.
 */
function IdentityCell({ item }: { item: Creator }) {
  const href = creatorPageHref(item);
  return (
    <>
      <div className="truncate text-sm font-medium text-gray-900 dark:text-white">
        {item.display_name}
      </div>
      <div
        className="mt-0.5 truncate text-[11px] text-gray-400"
        title={item.email}
      >
        {item.email}
      </div>
      {href ? (
        <a
          href={href}
          target="_blank"
          rel="noreferrer"
          className="mt-0.5 inline-flex items-center gap-1 font-mono text-[11px] text-sky-600 hover:underline dark:text-sky-400"
        >
          {item.page_slug}
          <ExternalLink className="h-3 w-3" />
        </a>
      ) : (
        <div className="mt-0.5 text-[11px] text-gray-400">بێ پەڕە</div>
      )}
    </>
  );
}

/** The label and date `subscriptionDeadline` resolved, as one stacked cell. */
function DeadlineCell({ item }: { item: Creator }) {
  const deadline = subscriptionDeadline(item);
  return (
    <div>
      {deadline.value ? (
        <div className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">
          {deadline.label}
        </div>
      ) : null}
      <div className="text-xs text-gray-600 dark:text-gray-300">
        {formatOptionalDate(deadline.value)}
      </div>
    </div>
  );
}

const TableRow = memo(function TableRow({
  item,
  busy,
  onView,
  onManage,
  onDeletePage,
}: {
  item: Creator;
  busy: boolean;
  onView?: (creator: Creator) => void;
  onManage?: (creator: Creator, action: CreatorManageAction) => void;
  onDeletePage?: (creator: Creator) => void;
}) {
  return (
    <tr
      className={MANAGEMENT_TABLE_ROW_CLASS}
      style={{
        contentVisibility: "auto",
        containIntrinsicSize: "90px",
      }}
    >
      <td className="px-3 py-3">
        <AvatarCell item={item} size="row" />
      </td>
      <td className="px-3 py-3">
        <IdentityCell item={item} />
      </td>
      <td className="px-3 py-3">
        <CreatorMetaBadges
          status={item.status}
          billingStatus={item.billing_status}
          createdAt={item.created_at}
          riskLevel={item.risk_level}
        />
      </td>
      <td className={`px-3 py-3 ${hideBelowClass("lg")}`}>
        <DeadlineCell item={item} />
      </td>
      <td className="px-3 py-3">
        <CreatorActions
          item={item}
          busy={busy}
          compact={false}
          onView={onView}
          onManage={onManage}
          onDeletePage={onDeletePage}
        />
      </td>
    </tr>
  );
});

const MobileCard = memo(function MobileCard({
  item,
  busy,
  onView,
  onManage,
  onDeletePage,
}: {
  item: Creator;
  busy: boolean;
  onView?: (creator: Creator) => void;
  onManage?: (creator: Creator, action: CreatorManageAction) => void;
  onDeletePage?: (creator: Creator) => void;
}) {
  const deadline = subscriptionDeadline(item);
  return (
    <div
      className={MANAGEMENT_TABLE_CARD_CLASS}
      style={{
        contentVisibility: "auto",
        containIntrinsicSize: "170px",
      }}
    >
      <AvatarCell item={item} size="card" />
      <div className="min-w-0 flex-1 space-y-2">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <IdentityCell item={item} />
          </div>
          <CreatorActions
            item={item}
            busy={busy}
            compact
            onView={onView}
            onManage={onManage}
            onDeletePage={onDeletePage}
          />
        </div>
        <CreatorMetaBadges
          status={item.status}
          billingStatus={item.billing_status}
          createdAt={item.created_at}
          riskLevel={item.risk_level}
        />
        {deadline.value ? (
          <div className="text-[11px] text-gray-500 dark:text-gray-400">
            {deadline.label}: {formatOptionalDate(deadline.value)}
          </div>
        ) : null}
      </div>
    </div>
  );
});

export const CreatorUsersTable = memo(function CreatorUsersTable({
  data = [],
  busyId = null,
  isLoading = false,
  searching = false,
  pagination,
  onView,
  onManage,
  onDeletePage,
}: CreatorUsersTableProps) {
  return (
    <ManagementTable
      data={data}
      columns={COLUMNS}
      getRowKey={(item) => item.id}
      isLoading={isLoading}
      minWidth="min-w-[700px]"
      pagination={pagination}
      empty={{
        icon: searching ? Search : Users,
        title: searching ? "هیچ ئەنجامێک نەدۆزرایەوە" : "هیچ بەکارهێنەرێک نییە",
        description: searching
          ? "دووبارە گەڕان بکەرەوە بە وشەیەکی تر"
          : "هێشتا هیچ هەژمارێکی سەربەخۆ تۆمار نەکراوە.",
      }}
      renderRow={(item) => (
        <TableRow
          item={item}
          busy={busyId === item.id}
          onView={onView}
          onManage={onManage}
          onDeletePage={onDeletePage}
        />
      )}
      renderCard={(item) => (
        <MobileCard
          item={item}
          busy={busyId === item.id}
          onView={onView}
          onManage={onManage}
          onDeletePage={onDeletePage}
        />
      )}
    />
  );
});
