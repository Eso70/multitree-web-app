"use client";

import { useState } from "react";
import { EditorField } from "@/components/shared/EditorField";
import { ModalFooterActions } from "@/components/shared/ModalFooterActions";
import { ModalTextInput } from "@/components/shared/ModalTextInput";
import { ClientInvitationModal } from "./ClientInvitationModal";

export function CreateClientInvitationModal({
  isOpen,
  isCreating,
  onClose,
  onCreate,
}: {
  isOpen: boolean;
  isCreating: boolean;
  onClose: () => void;
  onCreate: (clientLabel: string) => Promise<boolean>;
}) {
  const [clientLabel, setClientLabel] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const error =
    submitted && clientLabel.trim().length < 2
      ? "ناوی کڕیار بە لانیکەم دوو پیت بنووسە."
      : undefined;

  const close = () => {
    setClientLabel("");
    setSubmitted(false);
    onClose();
  };

  return (
    <ClientInvitationModal
      isOpen={isOpen}
      onClose={close}
      title="بانگهێشتکردنی کڕیار"
      description="کڕیار دەتوانێت یەک پەڕەی لینکتری بە هەموو قاڵبەکانی پلانی ئێستات دروست بکات."
      busy={isCreating}
      footer={
        <ModalFooterActions
          submitLabel="دروستکردنی بانگهێشتنامە"
          submitDisabled={false}
          isSubmitting={isCreating}
          submittingLabel="دروست دەکرێت..."
          onCancel={close}
          onSubmit={() => {
            void (async () => {
              setSubmitted(true);
              const value = clientLabel.trim();
              if (value.length >= 2 && (await onCreate(value))) {
                setClientLabel("");
                setSubmitted(false);
              }
            })();
          }}
        />
      }
    >
      <div className="space-y-5">
        <EditorField label="ناوی کڕیار" required error={error}>
          <ModalTextInput
            autoFocus
            value={clientLabel}
            maxLength={100}
            disabled={isCreating}
            onChange={(event) => setClientLabel(event.target.value)}
            hasError={Boolean(error)}
            placeholder="ناوی کڕیار بنووسە..."
            dir="auto"
          />
        </EditorField>
        <p className="text-xs leading-5 text-slate-500 dark:text-slate-400">
          قاڵبە بەردەستەکان بە شێوەی خۆکار لە پلانی بزنسەکەت وەردەگیرێن.
        </p>
      </div>
    </ClientInvitationModal>
  );
}
