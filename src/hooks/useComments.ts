import { useState, useCallback } from "react";
import type { LineComment } from "../types/diff";

export function useComments() {
  const [comments, setComments] = useState<Map<string, LineComment>>(new Map());
  const [activeCommentLines, setActiveCommentLines] = useState<Set<string>>(new Set());
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const getCommentKey = useCallback((filePath: string, lineNumber: number, lineType: string) => {
    return `${filePath}:${lineNumber}:${lineType}`;
  }, []);

  const getFileCommentKey = useCallback((filePath: string) => {
    return `${filePath}:file-level`;
  }, []);

  const openComment = useCallback((filePath: string, lineNumber: number, lineType: string) => {
    const key = getCommentKey(filePath, lineNumber, lineType);
    setActiveCommentLines((prev) => new Set(prev).add(key));
    setDeleteConfirmId(null);
  }, [getCommentKey]);

  const openFileComment = useCallback((filePath: string) => {
    const key = getFileCommentKey(filePath);
    setActiveCommentLines((prev) => new Set(prev).add(key));
    setDeleteConfirmId(null);
  }, [getFileCommentKey]);

  const saveComment = useCallback((
    filePath: string,
    lineNumber: number,
    lineType: 'addition' | 'deletion' | 'context',
    hunkIndex: number,
    content: string
  ) => {
    const key = getCommentKey(filePath, lineNumber, lineType);

    setComments((prev) => {
      const existingComment = prev.get(key);
      const now = Date.now();

      const comment: LineComment = {
        id: existingComment?.id || crypto.randomUUID(),
        filePath,
        lineNumber,
        lineType,
        hunkIndex,
        content,
        createdAt: existingComment?.createdAt || now,
        updatedAt: now,
      };

      const next = new Map(prev);
      next.set(key, comment);
      return next;
    });

    setActiveCommentLines((prev) => {
      const next = new Set(prev);
      next.delete(key);
      return next;
    });
    setEditingCommentId(null);
  }, [getCommentKey]);

  const saveFileComment = useCallback((
    filePath: string,
    content: string
  ) => {
    const key = getFileCommentKey(filePath);

    setComments((prev) => {
      const existingComment = prev.get(key);
      const now = Date.now();

      const comment: LineComment = {
        id: existingComment?.id || crypto.randomUUID(),
        filePath,
        lineType: 'file',
        content,
        createdAt: existingComment?.createdAt || now,
        updatedAt: now,
      };

      const next = new Map(prev);
      next.set(key, comment);
      return next;
    });

    setActiveCommentLines((prev) => {
      const next = new Set(prev);
      next.delete(key);
      return next;
    });
    setEditingCommentId(null);
  }, [getFileCommentKey]);

  const cancelComment = useCallback((commentKey: string) => {
    setActiveCommentLines((prev) => {
      const next = new Set(prev);
      next.delete(commentKey);
      return next;
    });
    setEditingCommentId(null);
  }, []);

  const editComment = useCallback((commentKey: string) => {
    const comment = comments.get(commentKey);
    if (comment) {
      setActiveCommentLines((prev) => new Set(prev).add(commentKey));
      setEditingCommentId(comment.id);
      setDeleteConfirmId(null);
    }
  }, [comments]);

  const requestDelete = useCallback((commentId: string) => {
    setDeleteConfirmId(commentId);
  }, []);

  const confirmDelete = useCallback((commentKey: string) => {
    setComments((prev) => {
      const next = new Map(prev);
      next.delete(commentKey);
      return next;
    });
    setDeleteConfirmId(null);
  }, []);

  const cancelDelete = useCallback(() => {
    setDeleteConfirmId(null);
  }, []);

  return {
    comments,
    activeCommentLines,
    editingCommentId,
    deleteConfirmId,
    getCommentKey,
    getFileCommentKey,
    openComment,
    openFileComment,
    saveComment,
    saveFileComment,
    cancelComment,
    editComment,
    requestDelete,
    confirmDelete,
    cancelDelete,
  };
}

export type UseCommentsReturn = ReturnType<typeof useComments>;
