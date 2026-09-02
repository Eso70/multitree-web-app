import type { InputHTMLAttributes } from "react";
import { modalInputClass } from "@/components/shared/modal-input-styles";

export interface ModalTextInputProps extends InputHTMLAttributes<HTMLInputElement> {
  hasError?: boolean;
}

export function ModalTextInput({
  hasError = false,
  className = "",
  ...props
}: ModalTextInputProps) {
  return (
    <input
      {...props}
      className={modalInputClass(hasError, className)}
      aria-invalid={hasError || undefined}
    />
  );
}
