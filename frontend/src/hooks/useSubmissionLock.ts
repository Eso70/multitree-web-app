"use client";

import { useCallback, useRef, useState } from "react";

export function useSubmissionLock() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const lockedRef = useRef(false);

  const beginSubmission = useCallback(() => {
    if (lockedRef.current) return false;
    lockedRef.current = true;
    setIsSubmitting(true);
    return true;
  }, []);

  const resetSubmission = useCallback(() => {
    lockedRef.current = false;
    setIsSubmitting(false);
  }, []);

  return { isSubmitting, beginSubmission, resetSubmission };
}
