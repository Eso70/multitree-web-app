"use client";

import {
  BusinessPageAnalyticsModal,
} from "./BusinessPageAnalyticsModal";

/**
 * The linktree-shaped name for the shared page analytics modal.
 *
 * Kept so existing callers read the way they always did while the modal itself
 * serves both page types. New code should use `BusinessPageAnalyticsModal`.
 */
export function BusinessLinktreeAnalyticsModal({
  isOpen,
  onClose,
  linktreeId,
  linktreeName,
  canClearAnalytics = true,
}: {
  isOpen: boolean;
  onClose: () => void;
  linktreeId: string;
  linktreeName: string;
  canClearAnalytics?: boolean;
}) {
  return (
    <BusinessPageAnalyticsModal
      isOpen={isOpen}
      onClose={onClose}
      pageId={linktreeId}
      pageName={linktreeName}
      pageKind="linktree"
      canClearAnalytics={canClearAnalytics}
    />
  );
}
