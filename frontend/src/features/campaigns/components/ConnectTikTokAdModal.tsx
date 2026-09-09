"use client";

import { useState } from "react";
import { ManagementModal } from "@/components/shared/ManagementModal";
import { ModalFooterActions } from "@/components/shared/ModalFooterActions";
import { CopyValueField } from "@/components/shared/CopyValueField";
import { EditorField } from "@/components/shared/EditorField";
import { ModalTextInput } from "@/components/shared/ModalTextInput";
import type { TikTokAdAccount } from "../types";

interface ConnectTikTokAdModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConnect: (account: TikTokAdAccount) => void;
  initialAccount?: TikTokAdAccount | null;
  sponsorKrdTheme?: boolean;
}

export function ConnectTikTokAdModal({
  isOpen,
  onClose,
  onConnect,
  initialAccount,
  sponsorKrdTheme = false,
}: ConnectTikTokAdModalProps) {
  const [appId, setAppId] = useState("");
  const [appSecret, setAppSecret] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const redirectUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/api/auth/tiktok/callback`
      : "http://localhost:3011/api/auth/tiktok/callback";

  const handleSubmit = () => {
    setIsSubmitting(true);

    // If demo test ID, connect directly for testing without leaving
    if (appId.trim().toLowerCase() === "demo") {
      setTimeout(() => {
        const newAccount: TikTokAdAccount = {
          id: initialAccount?.id || `tt-acc-${Date.now()}`,
          advertiserId: "ADV-TIKTOK-DEMO",
          advertiserName:
            initialAccount?.advertiserName ||
            (sponsorKrdTheme ? "هەژماری ڕیکلامی پلاتفۆرم" : "هەژماری ڕیکلامی بزنس"),
          currency: "USD",
          timezone: "Asia/Baghdad",
          status: "connected",
          lastSyncedAt: new Date().toISOString(),
          accountType: "AUCTION",
        };
        onConnect(newAccount);
        setIsSubmitting(false);
        onClose();
      }, 600);
      return;
    }

    // Launch official TikTok Business Marketing API OAuth authorization
    const state = Date.now().toString();
    const authUrl = `https://business-api.tiktok.com/portal/auth?app_id=${encodeURIComponent(appId.trim())}&state=${state}&redirect_uri=${encodeURIComponent(redirectUrl)}`;
    window.location.href = authUrl;
  };

  return (
    <ManagementModal
      isOpen={isOpen}
      onClose={onClose}
      sponsorKrdTheme={sponsorKrdTheme}
      title="بەستنەوەی هەژماری تیکتۆک"
      description="زانیارییەکانی بەستنەوە داخڵ بکە بۆ پەیوەستکردنی هەژماری ڕیکلام."
      footer={
        <ModalFooterActions
          submitLabel={initialAccount ? "گۆڕینی هەژمار" : "بەستنەوە بە تیکتۆک"}
          submittingLabel="دەبەسترێتەوە..."
          cancelLabel="پاشگەزبوونەوە"
          submitDisabled={!appId.trim()}
          isSubmitting={isSubmitting}
          onCancel={onClose}
          onSubmit={handleSubmit}
        />
      }
    >
      <div className="space-y-4">
        {/* Copyable Redirect URL for TikTok Developer Portal */}
        <CopyValueField
          label="Advertiser redirect URL (بۆ TikTok Developer Portal):"
          value={redirectUrl}
          copyName="Advertiser redirect URL"
          monospace
        />

        {/* Standard App Credentials Fields */}
        <EditorField label="TikTok App ID" required>
          <ModalTextInput
            type="text"
            value={appId}
            onChange={(e) => setAppId(e.target.value)}
            placeholder="TikTok App ID لێرە بنووسە..."
            className="font-mono text-xs"
          />
        </EditorField>

        <EditorField label="TikTok App Secret" required>
          <ModalTextInput
            type="password"
            value={appSecret}
            onChange={(e) => setAppSecret(e.target.value)}
            placeholder="TikTok App Secret لێرە بنووسە..."
            className="font-mono text-xs"
          />
        </EditorField>
      </div>
    </ManagementModal>
  );
}

