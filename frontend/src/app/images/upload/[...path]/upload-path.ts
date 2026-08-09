import { existsSync } from "fs";
import { basename, isAbsolute, join, relative, resolve } from "path";

const LEGACY_MULTITREE_UPLOAD_SEGMENT = "system";

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
  const legacyPublicDirectory = join(
    basename(resolvedWorkingDirectory).toLowerCase() === "frontend"
      ? resolvedWorkingDirectory
      : join(projectRoot, "frontend"),
    "public",
    "images",
    "upload",
  );

  return runtimeDirectory === legacyPublicDirectory
    ? [runtimeDirectory]
    : [runtimeDirectory, legacyPublicDirectory];
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

  const candidatePaths = [pathArray];
  if (pathArray[0] === LEGACY_MULTITREE_UPLOAD_SEGMENT) {
    candidatePaths.push(["multitree", ...pathArray.slice(1)]);
  }
  if (pathArray.length === 1) {
    candidatePaths.push(["_legacy", "flat", pathArray[0]]);
  }

  for (const uploadDirectory of uploadDirectories) {
    const resolvedUploadDirectory = resolve(
      /* turbopackIgnore: true */ uploadDirectory,
    );
    for (const candidatePath of candidatePaths) {
      const filePath = resolve(
        /* turbopackIgnore: true */ resolvedUploadDirectory,
        ...candidatePath,
      );
      if (
        isInsideDirectory(resolvedUploadDirectory, filePath) &&
        fileExists(filePath)
      ) {
        return filePath;
      }
    }
  }

  return null;
}
