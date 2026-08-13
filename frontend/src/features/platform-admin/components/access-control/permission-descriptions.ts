const KURDISH_PERMISSION_DESCRIPTIONS: Readonly<Record<string, string>> = {
  "business:dashboard:view": "کردنەوە و بینینی داشبۆردی بزنس",
  "business:pages:linktrees-access": "دەستگەیشتن بە پەڕەی لینکترێکان",
  "business:pages:templates-access": "دەستگەیشتن بە پەڕەی قاڵبەکان",
  "business:pages:profile-access": "دەستگەیشتن بە پەڕەی پڕۆفایلی بزنس",
  "business:pages:settings-access": "دەستگەیشتن بە پەڕەی ڕێکخستنەکانی بزنس",
  "business:pages:mini-websites-access":
    "دەستگەیشتن بە پەڕەی مینی وێبسایت و بەڕێوەبردنی",
  "business:settings:profile-access":
    "کردنەوەی بەشی ڕێکخستنەکانی پڕۆفایل",
  "business:settings:defaults-access":
    "کردنەوەی بەشی ڕێکخستنە بنەڕەتییەکانی پەڕە",
  "business:settings:security-access":
    "کردنەوەی بەشی ڕێکخستنەکانی پاراستنی هەژمار",
  "business:settings:integrations-access":
    "کردنەوەی بەشی ڕێکخستنەکانی پەیوەستکراوەکان",
  "business:profile:read": "بینینی پڕۆفایلی بزنس",
  "business:profile:update":
    "نوێکردنەوەی خانە تۆمارکراوەکانی پڕۆفایلی بزنس",
  "business:profile-assets:upload":
    "بارکردنی وێنە و فایلەکانی براندی بزنس",
  "business:defaults:read": "بینینی ڕێکخستنە بنەڕەتییەکانی بزنس",
  "business:defaults:update":
    "نوێکردنەوەی خانە بنەڕەتییە تۆمارکراوەکانی بزنس",
  "business:security:email-update": "گۆڕینی ناونیشانی ئیمەیڵی خاوەنی بزنس",
  "business:security:username-update": "گۆڕینی ناوی بەکارهێنەری خاوەنی بزنس",
  "business:security:sessions-revoke": "کۆتاییهێنان بە دانیشتنەکانی چوونەژوورەوەی بزنس",
  "business:templates:browse": "گەڕان و بینینی کەتەلۆگی قاڵبەکان",
  "business:templates:use": "بەکارهێنانی قاڵبێکی بەردەست",
  "business:templates:set-default": "دانانی قاڵبی بنەڕەتی بۆ بزنس",
  "business:tiktok:read": "بینینی ڕێکخستنە شاراوەکانی پیکسڵی TikTok",
  "business:tiktok:create": "دروستکردنی ڕێکخستنێکی نوێی پیکسڵی TikTok",
  "business:tiktok:update": "نوێکردنەوەی ڕێکخستنێکی پیکسڵی TikTok",
  "business:tiktok:delete": "سڕینەوەی ڕێکخستنێکی پیکسڵی TikTok",
  "business:tiktok:secret-read": "ئاشکراکردنی تۆکنەکانی Events APIی TikTok",
  "business:linktrees:read": "بینینی لینکترێکان",
  "business:linktrees:create": "دروستکردنی لینکترێی نوێ",
  "business:linktrees:update": "نوێکردنەوەی خانە تۆمارکراوەکانی لینکترێ",
  "business:linktrees:delete": "سڕینەوەی لینکترێ",
  "business:linktrees:upload": "بارکردنی وێنە و فایلەکانی لینکترێ",
  "business:links:read": "بینینی لینکەکان",
  "business:links:create": "دروستکردنی لینکی نوێ",
  "business:links:update": "نوێکردنەوەی خانە تۆمارکراوەکانی لینک",
  "business:links:delete": "سڕینەوەی لینک",
  "business:links:sync": "هاوکاتکردنی کۆمەڵە لینکەکانی لینکترێ",
  "business:links:reorder": "گۆڕینی ڕیزبەندی لینکەکان",
  "business:analytics:totals-read": "بینینی کۆی گشتی ئامارەکان",
  "business:analytics:details-read": "بینینی وردەکاری ئامارەکانی لینکترێ",
  "business:analytics:tiktok-health-read":
    "بینینی دۆخی گەیاندنی ڕووداوەکانی TikTok و هەوڵدانەوە",
  "business:analytics:daily-read": "بینینی ئامارە ڕۆژانەکان",
  "business:analytics:range-read":
    "گەڕان لە ئامارەکان بە پێی ماوەی بەروار",
  "business:analytics:clear-linktree":
    "سڕینەوەی ئامارەکانی تەنها یەک لینکترێ",
  "business:analytics:clear-all": "سڕینەوەی هەموو ئامارەکانی بزنس",
};

export function getKurdishPermissionDescription(permissionKey: string) {
  return (
    KURDISH_PERMISSION_DESCRIPTIONS[permissionKey] ||
    "ڕوونکردنەوەی کوردی بۆ ئەم مۆڵەتە دیاری نەکراوە."
  );
}
