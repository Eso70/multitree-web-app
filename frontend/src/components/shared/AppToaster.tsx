"use client";

import { Toaster } from "sonner";
import { CheckCircle2, CircleAlert, CircleX, Info, LoaderCircle } from "lucide-react";
import { MotionSpinner } from "@/components/motion/MotionPrimitives";

export function AppToaster() {
  return (
    <Toaster
      position="top-center"
      dir="rtl"
      duration={4000}
      visibleToasts={4}
      gap={12}
      offset={24}
      icons={{
        success: <CheckCircle2 />,
        error: <CircleX />,
        warning: <CircleAlert />,
        info: <Info />,
        loading: (
          <MotionSpinner>
            <LoaderCircle />
          </MotionSpinner>
        ),
      }}
      toastOptions={{
        classNames: {
          toast: "app-toast",
          title: "app-toast-title",
          description: "app-toast-description",
          success: "app-toast-success",
          error: "app-toast-error",
          warning: "app-toast-warning",
          info: "app-toast-info",
          actionButton: "app-toast-action",
          cancelButton: "app-toast-cancel",
        },
      }}
    />
  );
}