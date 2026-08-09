export type SignupApplicationForm = {
  businessName: string;
  phone: string;
  requestedSubdomain: string;
};

export type SignupField = keyof SignupApplicationForm | "subdomainAvailability";
export type SignupFieldErrors = Partial<Record<SignupField, string>>;

const SUBDOMAIN_PATTERN = /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/;

export function validateSignupApplication(
  form: SignupApplicationForm,
  subdomainAvailable: boolean | null,
): SignupFieldErrors {
  const errors: SignupFieldErrors = {};
  const businessNameLength = form.businessName.trim().length;
  const phoneLength = form.phone.trim().length;

  if (businessNameLength < 2 || businessNameLength > 150) {
    errors.businessName = "ناوی بزنس دەبێت لە ٢ تا ١٥٠ پیت بێت";
  }
  if (phoneLength < 7 || phoneLength > 30) {
    errors.phone = "ژمارەی مۆبایل دەبێت لە ٧ تا ٣٠ پیت بێت";
  }
  if (!SUBDOMAIN_PATTERN.test(form.requestedSubdomain)) {
    errors.requestedSubdomain = "ساب‌دۆمەینێکی دروست بنووسە";
  } else if (subdomainAvailable === null) {
    errors.subdomainAvailability = "چاوەڕێی پشکنینی ساب‌دۆمەین بکە";
  } else if (!subdomainAvailable) {
    errors.subdomainAvailability = "ئەم ساب‌دۆمەینە بەردەست نییە";
  }

  return errors;
}

export function buildSignupApplicationPayload(form: SignupApplicationForm) {
  return {
    businessName: form.businessName.trim(),
    phone: form.phone.trim(),
    requestedSubdomain: form.requestedSubdomain,
  };
}
