/**
 * Bayan — screen 04: client-side profile form contract.
 * All values are DEMONSTRATION data. The backend is the sole account authority.
 */
export type ProfileDraft = {
  displayName: string;
  jobTitle: string;
  phone: string;
};
export type ProfileField = keyof ProfileDraft;
export type ProfileErrors = Partial<Record<ProfileField, string>>;

export const demoIdentity = {
  officialName: "أحمد محمد",
  organization: "جامعة بيان التجريبية",
  department: "شؤون الطلاب",
  email: "ahmed@university.example",
  accountStatus: "حساب تجريبي",
} as const;

export const initialProfile: ProfileDraft = {
  displayName: "أحمد محمد",
  jobTitle: "موظف شؤون الطلاب",
  phone: "",
};

/** Keep this validation aligned with the future FastAPI request schema. */
export function validateProfile(draft: ProfileDraft): ProfileErrors {
  const errors: ProfileErrors = {};
  const name = draft.displayName.trim();
  const job = draft.jobTitle.trim();
  const phone = draft.phone.replace(/[\s()-]/g, "");
  if (name.length < 2 || name.length > 70) {
    errors.displayName = "يجب أن يكون الاسم المعروض بين حرفين و70 حرفًا.";
  }
  if (job.length > 80) {
    errors.jobTitle = "يجب ألا يتجاوز المسمى الوظيفي 80 حرفًا.";
  }
  if (phone && !/^\+?[0-9]{7,15}$/.test(phone)) {
    errors.phone = "أدخل رقم هاتف صالحًا من 7 إلى 15 رقمًا، مع رمز الدولة عند الحاجة.";
  }
  return errors;
}

export function cleanProfile(draft: ProfileDraft): ProfileDraft {
  return {
    displayName: draft.displayName.trim(),
    jobTitle: draft.jobTitle.trim(),
    phone: draft.phone.trim(),
  };
}
