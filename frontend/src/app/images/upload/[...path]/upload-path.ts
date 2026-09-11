import { existsSync } from "fs";
import { basename, isAbsolute, join, relative, resolve } from "path";

export function getUploadDirectories(
  workingDirectory = process.cwd(),
  configuredDirectory = process.env.UPLOAD_DIR,
): string[] {
  const resolvedWorkingDirectory = resolve(workingDirectory);
  const projectRoot = ["backend", "frontend"].includes(
    basename(resolvedWorkingDirectory).toLowerCase(),
  )
    ? resolve(resolvedWorkingDirectory, "..")
    : resolvedWorkingDirectory;
  const runtimeDirectory = resolve(
    /* turbopackIgnore: true */
    configuredDirectory || join(projectRoot, ".runtime", "uploads"),
  );
  return [runtimeDirectory];
}

function isInsideDirectory(rootDirectory: string, filePath: string): boolean {
  const relativePath = relative(rootDirectory, filePath);
  return (
    relativePath === "" ||
    (!relativePath.startsWith("..") && !isAbsolute(relativePath))
  );
}

export function resolveUploadPath(
  pathArray: string[],
  fileExists: (path: string) => boolean = existsSync,
  uploadDirectories = getUploadDirectories(),
): string | null {
  if (
    pathArray.length === 0 ||
    pathArray.some(
      (segment) =>
        !segment ||
        segment === "." ||
        segment === ".." ||
        segment.includes("/") ||
        segment.includes("\\") ||
        segment.includes("~"),
    )
  ) {
    return null;
  }

  for (const uploadDirectory of uploadDirectories) {
    const resolvedUploadDirectory = resolve(
      /* turbopackIgnore: true */ uploadDirectory,
    );
    const filePath = resolve(
      /* turbopackIgnore: true */ resolvedUploadDirectory,
      ...pathArray,
    );
    if (
      isInsideDirectory(resolvedUploadDirectory, filePath) &&
      fileExists(filePath)
    ) {
      return filePath;
    }
  }

  return null;
}
