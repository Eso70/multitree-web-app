import { toast } from "sonner";

let uploadChain: Promise<unknown> = Promise.resolve();

const UPLOADING_LABEL = "وێنە بار دەکرێت...";
const SUCCESS_LABEL = "وێنەکە بارکرا";
const FAILURE_LABEL = "بارکردنی وێنە سەرکەوتوو نەبوو";

/**
 * Runs one image upload behind a global serial queue. Only one upload runs at
 * a time; further uploads wait until the active one finishes. A loading toast
 * stays visible for the whole upload and is replaced by the final outcome.
 * The task returns the image URL or null on failure; any thrown error also
 * ends the queue item. Callers keep their own inline error state for form
 * context.
 */
export async function enqueueImageUpload(
  task: () => Promise<string | null>,
): Promise<string | null> {
  const toastId = toast.loading(UPLOADING_LABEL);
  let ok = false;
  const run = uploadChain.then(async () => {
    const url = await task();
    ok = url !== null;
    return url;
  });
  uploadChain = run.catch(() => undefined);
  try {
    return await run;
  } finally {
    if (ok) {
      toast.success(SUCCESS_LABEL, { id: toastId });
    } else {
      toast.error(FAILURE_LABEL, { id: toastId });
    }
  }
}