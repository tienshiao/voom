import type { FileDiff } from "../types/diff";

interface ImageDiffProps {
  file: FileDiff;
}

export function ImageDiff({ file }: ImageDiffProps) {
  const { status, oldPath, newPath } = file;

  // Build image URLs
  const currentImageUrl = `/api/image?file=${encodeURIComponent(newPath)}`;
  const gitImageUrl = `/api/image/git?file=${encodeURIComponent(oldPath)}&ref=HEAD`;

  if (status === "added") {
    return (
      <div className="image-diff image-diff-added">
        <div className="image-diff-label">Added</div>
        <div className="image-diff-container">
          <img
            src={currentImageUrl}
            alt={`Added: ${newPath}`}
            className="image-diff-img"
          />
        </div>
      </div>
    );
  }

  if (status === "deleted") {
    return (
      <div className="image-diff image-diff-deleted">
        <div className="image-diff-label">Deleted</div>
        <div className="image-diff-container">
          <img
            src={gitImageUrl}
            alt={`Deleted: ${oldPath}`}
            className="image-diff-img"
          />
        </div>
      </div>
    );
  }

  // Modified: show side-by-side comparison
  return (
    <div className="image-diff image-diff-modified">
      <div className="image-diff-comparison">
        <div className="image-diff-side image-diff-before">
          <div className="image-diff-label">Before</div>
          <div className="image-diff-container">
            <img
              src={gitImageUrl}
              alt={`Before: ${oldPath}`}
              className="image-diff-img"
            />
          </div>
        </div>
        <div className="image-diff-side image-diff-after">
          <div className="image-diff-label">After</div>
          <div className="image-diff-container">
            <img
              src={currentImageUrl}
              alt={`After: ${newPath}`}
              className="image-diff-img"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
