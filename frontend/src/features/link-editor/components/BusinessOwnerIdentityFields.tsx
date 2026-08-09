import { EditorField } from "@/components/shared/EditorField";
import { modalInputClass } from "@/features/link-editor/modal-input-styles";

interface BusinessOwnerIdentityFieldsProps {
  ownerName?: string | null;
  ownerEmail?: string | null;
}

export function BusinessOwnerIdentityFields({
  ownerName,
  ownerEmail,
}: BusinessOwnerIdentityFieldsProps) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4">
      <EditorField label="Account name" hint="From the verified account">
        <input
          disabled
          className={`${modalInputClass()} cursor-not-allowed opacity-60`}
          value={ownerName || "Not available"}
        />
      </EditorField>
      <EditorField label="Email" hint="Verified sign-in email">
        <input
          disabled
          type="email"
          className={`${modalInputClass()} cursor-not-allowed opacity-60`}
          value={ownerEmail || "Not available"}
        />
      </EditorField>
    </div>
  );
}
