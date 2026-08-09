"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { Copy, Download, QrCode, Share2, X } from "lucide-react";
import { motion } from "motion/react";
import type { ProfileLike } from "../../types";
import { SWISS_ACCENT_BACKGROUND } from "../liquid-glass-utils";

/**
 * The share sheet: a QR code of the current page plus the native share and
 * clipboard routes. The QR download counts as an internal share, never as a
 * TikTok-conversion event.
 */
export function ShareDialog({
  profile,
  onClose,
}: {
  profile: ProfileLike;
  onClose: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const [qr, setQr] = useState("");
  const url = typeof window !== "undefined" ? window.location.href : "";

  useEffect(() => {
    if (!url) return;
    let cancelled = false;
    void import("qrcode")
      .then(({ default: QRCodeGenerator }) =>
        QRCodeGenerator.toDataURL(url, {
          width: 360,
          margin: 2,
          color: { dark: "#0f172a", light: "#ffffff" },
        }),
      )
      .then((value) => {
        if (!cancelled) setQr(value);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [url]);

  const copy = async () => {
    await navigator.clipboard?.writeText(url);
    setCopied(true);
  };
  const share = async () => {
    if (navigator.share) {
      await navigator.share({
        title: profile.name,
        text: profile.headline,
        url,
      });
    } else {
      await copy();
    }
  };

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-xl"
      role="dialog"
      aria-modal="true"
      aria-labelledby="share-mini-website-title"
      onClick={onClose}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      <motion.div
        className="w-full max-w-sm rounded-[1.75rem] border border-white/25 bg-white/90 p-5 text-slate-900 shadow-[0_28px_80px_-38px_rgba(0,0,0,0.55)] backdrop-blur-2xl dark:border-white/10 dark:bg-slate-900/90 dark:text-white sm:p-6"
        onClick={(event) => event.stopPropagation()}
        initial={{ opacity: 0, y: 10, scale: 0.985 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.42, ease: [0.16, 1, 0.3, 1] }}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2
              id="share-mini-website-title"
              className="text-base font-black tracking-tight sm:text-lg"
            >
              هاوبەشکردنی مینی وێبسایت
            </h2>
            <p className="mt-1 text-[11px] font-semibold leading-5 text-slate-500">
              لینک یان QR کۆدەکە هاوبەش بکە
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="داخستنی هاوبەشکردن"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-slate-200/80 bg-slate-50/80 transition duration-300 hover:bg-slate-100/90"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {qr && (
          <div className="relative mx-auto mt-5 w-52 overflow-hidden rounded-[1.6rem] border border-slate-100/80 bg-white p-3 shadow-[0_18px_46px_-30px_rgba(15,23,42,0.42)]">
            <Image
              src={qr}
              alt="QR کۆدی مینی وێبسایت"
              width={360}
              height={360}
              className="h-auto w-full rounded-xl"
              unoptimized
            />
          </div>
        )}

        <div className="mt-5 grid grid-cols-3 gap-2">
          <button
            type="button"
            onClick={() => void share()}
            className="flex h-12 items-center justify-center gap-1.5 rounded-2xl text-[10px] font-black text-white shadow-md transition duration-300 hover:-translate-y-0.5"
            style={{ background: SWISS_ACCENT_BACKGROUND }}
          >
            <Share2 className="h-4 w-4" />
            هاوبەشکردن
          </button>
          <button
            type="button"
            onClick={() => void copy()}
            className="flex h-12 items-center justify-center gap-1.5 rounded-2xl border border-slate-200 bg-slate-50 text-[10px] font-black transition hover:bg-slate-100"
          >
            <Copy className="h-4 w-4" />
            {copied ? "کۆپی کرا" : "کۆپی"}
          </button>
          <a
            href={qr || undefined}
            download={`${profile.slug}-qr.png`}
            data-mini-action="mini:vcard"
            // Counted for the business, never reported to TikTok: saving the
            // page's QR image is sharing, not the contact-card download this
            // key otherwise stands for.
            data-mini-track="internal"
            className="flex h-12 items-center justify-center gap-1.5 rounded-2xl border border-slate-200 bg-slate-50 text-[10px] font-black transition hover:bg-slate-100"
          >
            <Download className="h-4 w-4" />
            QR
          </a>
        </div>

        <div className="mt-3 flex items-center gap-3 rounded-2xl border border-slate-100 bg-slate-50 p-3">
          <QrCode className="h-5 w-5 shrink-0 text-slate-400" />
          <p className="min-w-0 truncate text-[10px] text-slate-500" dir="ltr">
            {url}
          </p>
        </div>
      </motion.div>
    </motion.div>
  );
}
