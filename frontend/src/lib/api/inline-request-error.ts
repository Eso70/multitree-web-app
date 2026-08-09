export type InlineRequestErrorStatus = 400 | 409 | 413 | 415 | 422;

export interface InlineRequestErrorData {
  code: string;
  message: string;
  status: InlineRequestErrorStatus | null;
  title: string;
}

interface UploadValidationOptions {
  allowedMimeTypes: readonly string[];
  maxBytes: number;
}

const ERROR_COPY: Record<
  InlineRequestErrorStatus,
  Omit<InlineRequestErrorData, "status">
> = {
  400: {
    code: "BAD_REQUEST",
    title: "داواکارییەکە دروست نییە",
    message: "زانیارییەکان بپشکنە و دووبارە هەوڵ بدەوە.",
  },
  409: {
    code: "CONFLICT",
    title: "ناکۆکی لە زانیارییەکاندا هەیە",
    message: "زانیارییەکان تازە بکەرەوە و گۆڕانکارییەکەت دووبارە بنێرە.",
  },
  413: {
    code: "PAYLOAD_TOO_LARGE",
    title: "قەبارەی فایلەکە زۆرە",
    message: "فایلێکی بچووکتر هەڵبژێرە و دووبارە هەوڵ بدەوە.",
  },
  415: {
    code: "UNSUPPORTED_MEDIA_TYPE",
    title: "جۆری فایلەکە پشتگیری ناکرێت",
    message: "فایلێک بە جۆری ڕێگەپێدراو هەڵبژێرە.",
  },
  422: {
    code: "UNPROCESSABLE_ENTITY",
    title: "فایلەکە ناتوانرێت پرۆسە بکرێت",
    message: "ناوەڕۆکی فایلەکە بپشکنە و فایلێکی دروست هەڵبژێرە.",
  },
};

export function createInlineRequestError(
  status: InlineRequestErrorStatus,
  message?: string,
): InlineRequestErrorData {
  return {
    ...ERROR_COPY[status],
    status,
    ...(message ? { message } : {}),
  };
}

export function createUploadFailureError(): InlineRequestErrorData {
  return {
    code: "UPLOAD_FAILED",
    status: null,
    title: "بارکردن سەرکەوتوو نەبوو",
    message: "پەیوەندییەکەت بپشکنە و دووبارە هەوڵ بدەوە.",
  };
}

export function validateUploadFile(
  file: File,
  options: UploadValidationOptions,
): InlineRequestErrorData | null {
  if (file.size > options.maxBytes) {
    const maxMb = Math.max(1, Math.floor(options.maxBytes / (1024 * 1024)));
    return createInlineRequestError(
      413,
      `قەبارەی فایلەکە نابێت لە ${maxMb}MB زیاتر بێت.`,
    );
  }

  if (!options.allowedMimeTypes.includes(file.type.toLowerCase())) {
    return createInlineRequestError(415);
  }

  return null;
}

export function inlineRequestErrorFromResponse(
  response: Response,
): InlineRequestErrorData {
  const supportedStatuses: readonly number[] = [400, 409, 413, 415, 422];
  return supportedStatuses.includes(response.status)
    ? createInlineRequestError(response.status as InlineRequestErrorStatus)
    : createUploadFailureError();
}
