import { AccountIdentityFields } from "@/components/shared/AccountIdentityFields";

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
      <AccountIdentityFields name={ownerName} email={ownerEmail} />
    </div>
  );
}
