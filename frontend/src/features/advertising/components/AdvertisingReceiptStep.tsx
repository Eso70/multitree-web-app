"use client";

import Image from "next/image";
import { useRef, useState, type DragEvent } from "react";
import { Check, CloudUpload, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { PhoneMockup } from "@/components/shared/PhoneMockup";

interface AdvertisingReceiptStepProps {
  receiptUrl: string | null;
  onReceiptChange: (url: string | null) => void;
  exampleImageUrl?: string;
}

export function AdvertisingReceiptStep({ receiptUrl, onReceiptChange, exampleImageUrl }: AdvertisingReceiptStepProps) {
  return (
    <div className="grid w-full grid-cols-2 items-center justify-items-center gap-3 sm:gap-6">
      <div className="relative mx-auto w-[130px] max-w-full sm:w-[150px] lg:w-[190px]">
        <PhoneMockup ariaLabel="پێشبینینی وەسڵی گواستنەوەی پارە" name="Receipt">
          <div className="relative flex h-full w-full items-center justify-center bg-[#f4efe8]">
            <Image
              src={exampleImageUrl || "/images/advertising/example-money-send.jpg"}
              alt="وێنەی نموونەی وەسڵی گواستنەوەی پارە"
              fill
              sizes="190px"
              className="object-contain"
              unoptimized={Boolean(exampleImageUrl)}
            />
          </div>
        </PhoneMockup>
        <p className="mt-2 text-center text-[9px] font-bold uppercase tracking-wide text-black/40 dark:text-white/40 sm:mt-3 sm:text-[10px]">
          نموونەی وەسڵ
        </p>
      </div>

      <div className="relative mx-auto w-[130px] max-w-full sm:w-[150px] lg:w-[190px]">
        <ReceiptDropzone receiptUrl={receiptUrl} onReceiptChange={onReceiptChange} />
        <p className="mt-2 text-center text-[9px] font-bold uppercase tracking-wide text-black/40 dark:text-white/40 sm:mt-3 sm:text-[10px]">
          وێنەی وەسڵەکە لێرە دابگرە
        </p>
      </div>
    </div>
  );
}

function ReceiptDropzone({ receiptUrl, onReceiptChange }: AdvertisingReceiptStepProps) {
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const acceptFile = (file: File | undefined) => {
    if (!file || !file.type.startsWith("image/")) return;
    if (receiptUrl) URL.revokeObjectURL(receiptUrl);
    onReceiptChange(URL.createObjectURL(file));
  };

  const removeFile = () => {
    if (receiptUrl) URL.revokeObjectURL(receiptUrl);
    onReceiptChange(null);
  };

  const onDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragging(false);
    acceptFile(event.dataTransfer.files?.[0]);
  };

  const input = (
    <input
      ref={inputRef}
      type="file"
      accept="image/*"
      className="sr-only"
      onChange={(event) => {
        acceptFile(event.target.files?.[0]);
        event.target.value = "";
      }}
    />
  );

  if (receiptUrl) {
    return (
      <PhoneMockup ariaLabel="پێشبینینی وەسڵی بارکراو" name="Receipt">
        <div className="relative h-full w-full bg-white dark:bg-white/[0.03]">
          {input}
          <Image src={receiptUrl} alt="وەسڵی وەرکراو" fill sizes="190px" className="object-contain" />
          <span className="absolute bottom-2.5 left-2.5 right-2.5 flex items-center gap-1.5 rounded-lg bg-black/70 px-2.5 py-1.5 text-[11px] font-bold text-white">
            <Check className="h-3.5 w-3.5 text-emerald-400" /> دیاریکراوە
          </span>
          <button
            type="button"
            onClick={removeFile}
            aria-label="سڕینەوەی وەسڵ"
            title="سڕینەوەی وەسڵ"
            className="absolute right-2.5 top-2.5 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-black/70 text-white shadow transition-colors hover:bg-black"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </PhoneMockup>
    );
  }

  return (
    <PhoneMockup ariaLabel="بەرزکردنەوەی وەسڵ" name="Upload">
      <div
        role="button"
        tabIndex={0}
        aria-label="بەرزکردنەوەی وەسڵ"
        onClick={() => inputRef.current?.click()}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") inputRef.current?.click();
        }}
        onDragOver={(event) => {
          event.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={onDrop}
        className={cn(
          "flex h-full w-full cursor-pointer flex-col items-center justify-center gap-3 bg-white px-6 text-center transition-colors dark:bg-white/[0.03]",
          isDragging && "bg-emerald-500/5",
        )}
      >
        {input}
        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-black/5 dark:bg-white/10">
          <CloudUpload className="h-6 w-6 text-black/50 dark:text-white/60" />
        </span>
        <div>
          <p className="text-sm font-black" dir="auto">
            کرتە بکە یان وێنە بکێشە بۆ ئێرە
          </p>
          <p className="mt-1 text-xs text-black/45 dark:text-white/45">PNG, JPG</p>
        </div>
      </div>
    </PhoneMockup>
  );
}
