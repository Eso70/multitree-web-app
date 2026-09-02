"use client";

import { CopyValueField } from "@/components/shared/CopyValueField";
import { ModalFooterActions } from "@/components/shared/ModalFooterActions";
import { ClientInvitationModal } from "./ClientInvitationModal";
import type { CreatedClientInvitation } from "../types";

export function InvitationCredentialsModal({
  invitation,
  onClose,
}: {
  invitation: CreatedClientInvitation | null;
  onClose: () => void;
}) {
  if (!invitation) return null;
  const invitationUrl = `${window.location.origin}/client-linktree#${invitation.token}`;

  return (
    <ClientInvitationModal
      isOpen
      onClose={onClose}
      locked={false}
      title="بانگهێشتنامە ئامادەیە"
      description="بەستەر و پینەکە تەنها ئەم جارە پیشان دەدرێن. هەریەکەیان بە ڕێگایەکی جیاواز بۆ کڕیار بنێرە."
      footer={
        <ModalFooterActions
          showCancel={false}
          submitLabel="تەواو"
          submitDisabled={false}
          onCancel={onClose}
          onSubmit={onClose}
        />
      }
    >
      <div className="space-y-5">
        <CopyValueField
          label="بەستەری بانگهێشتنامە"
          value={invitationUrl}
          copyName="بەستەر"
        />
        <CopyValueField
          label="پینی ٦ ژمارەیی"
          value={invitation.pin}
          copyName="پین"
          monospace
          centered
        />
      </div>
    </ClientInvitationModal>
  );
}
