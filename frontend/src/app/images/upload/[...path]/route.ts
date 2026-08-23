import { readFile } from "fs/promises";
import { NextRequest, NextResponse } from "next/server";
import { getUploadContentType } from "./content-type";
import { resolveUploadPath } from "./upload-path";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
) {
  try {
    const { path: pathArray } = await params;
    const imagePath = pathArray.join("/");

    if (
      imagePath.includes("..") ||
      imagePath.includes("~") ||
      imagePath.startsWith("/")
    ) {
      return NextResponse.json(
        { error: "Invalid image path" },
        { status: 400 },
      );
    }

    const filePath = resolveUploadPath(pathArray);
    if (!filePath) {
      return NextResponse.json({ error: "Image not found" }, { status: 404 });
    }

    const extension = imagePath.split(".").pop()?.toLowerCase() || "";
    return new NextResponse(await readFile(filePath), {
      status: 200,
      headers: {
        "Content-Type": getUploadContentType(extension),
        "Cache-Control": "public, max-age=31536000, immutable",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    console.error("Error serving uploaded image:", error);
    return NextResponse.json(
      { error: "Failed to serve image" },
      { status: 500 },
    );
  }
}
