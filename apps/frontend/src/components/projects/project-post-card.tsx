'use client';

import React, { FC, useCallback } from 'react';
import { useFetch } from '@gitroom/helpers/utils/custom.fetch';
import dayjs from 'dayjs';
import { useT } from '@gitroom/react/translation/get.transation.service.client';
import ImageWithFallback from '@gitroom/react/helpers/image.with.fallback';
import { useModals } from '@gitroom/frontend/components/layout/new-modal';
import { SchedulePostModal } from '@gitroom/frontend/components/projects/schedule-post-modal';

export interface ProjectPostData {
  id: string;
  content: string;
  suggestedPlatform: string | null;
  suggestedDate: string | null;
  title: string | null;
  image: string | null;
  status: string;
  aiGenerated: boolean;
  notes: string | null;
  createdAt: string;
}

export const ProjectPostCard: FC<{
  post: ProjectPostData;
  projectId: string;
  onMutate: () => void;
}> = ({ post, projectId, onMutate }) => {
  const fetch = useFetch();
  const t = useT();
  const modals = useModals();

  const handleApprove = useCallback(async () => {
    await fetch(`/projects/${projectId}/posts/${post.id}/approve`, {
      method: 'PUT',
    });
    onMutate();
  }, [fetch, projectId, post.id, onMutate]);

  const handleDelete = useCallback(async () => {
    await fetch(`/projects/${projectId}/posts/${post.id}`, {
      method: 'DELETE',
    });
    onMutate();
  }, [fetch, projectId, post.id, onMutate]);

  const handleSchedule = useCallback(() => {
    modals.openModal({
      title: t('schedule_to_calendar', 'Schedule to Calendar'),
      withCloseButton: true,
      children: (close: () => void) => (
        <SchedulePostModal
          post={post}
          projectId={projectId}
          onScheduled={onMutate}
          closeModal={close}
        />
      ),
    });
  }, [modals, post, projectId, onMutate]);

  const stripHtml = (html: string) => {
    return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
  };

  const statusBadgeClass =
    post.status === 'APPROVED'
      ? 'bg-green-500/20 text-green-400'
      : post.status === 'CONVERTED'
        ? 'bg-blue-500/20 text-blue-400'
        : 'bg-newTextColor/10 text-newTextColor/50';

  const statusLabel =
    post.status === 'CONVERTED'
      ? t('scheduled', 'SCHEDULED')
      : post.status;

  return (
    <div className="bg-newBgColorInner rounded-[12px] p-[16px] border border-fifth/20 flex flex-col gap-[10px]">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-[8px]">
          {post.suggestedPlatform && (
            <ImageWithFallback
              fallbackSrc="/icons/platforms/x.png"
              src={`/icons/platforms/${post.suggestedPlatform}.png`}
              alt={post.suggestedPlatform}
              width={20}
              height={20}
              className="rounded-[4px]"
            />
          )}
          <span
            className={`text-[11px] px-[8px] py-[2px] rounded-full ${statusBadgeClass}`}
          >
            {statusLabel}
          </span>
          {post.aiGenerated && (
            <span className="text-[11px] px-[8px] py-[2px] rounded-full bg-purple-500/20 text-purple-400">
              AI
            </span>
          )}
        </div>
        <div className="flex items-center gap-[4px]">
          {post.status === 'DRAFT' && (
            <button
              onClick={handleApprove}
              className="text-[12px] px-[8px] py-[4px] rounded-md hover:bg-green-500/20 text-green-400 transition-colors"
              title={t('approve', 'Approve')}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
              >
                <path
                  d="M20 6L9 17L4 12"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
          )}
          {post.status === 'APPROVED' && (
            <button
              onClick={handleSchedule}
              className="text-[12px] px-[8px] py-[4px] rounded-md hover:bg-blue-500/20 text-blue-400 transition-colors"
              title={t('schedule_to_calendar', 'Schedule to Calendar')}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
              >
                <path
                  d="M8 2V6M16 2V6M3 10H21M5 4H19C20.1046 4 21 4.89543 21 6V20C21 21.1046 20.1046 22 19 22H5C3.89543 22 3 21.1046 3 20V6C3 4.89543 3.89543 4 5 4Z"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
          )}
          <button
            onClick={handleDelete}
            className="text-[12px] px-[8px] py-[4px] rounded-md hover:bg-red-500/20 text-red-400 transition-colors"
            title={t('delete', 'Delete')}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
            >
              <path
                d="M3 6H5H21M8 6V4C8 3.46957 8.21071 2.96086 8.58579 2.58579C8.96086 2.21071 9.46957 2 10 2H14C14.5304 2 15.0391 2.21071 15.4142 2.58579C15.7893 2.96086 16 3.46957 16 4V6M19 6V20C19 20.5304 18.7893 21.0391 18.4142 21.4142C18.0391 21.7893 17.5304 22 17 22H7C6.46957 22 5.96086 21.7893 5.58579 21.4142C5.21071 21.0391 5 20.5304 5 20V6H19Z"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        </div>
      </div>

      {post.title && (
        <h4 className="text-[14px] font-[500]">{post.title}</h4>
      )}

      {post.image && (
        <img
          src={post.image}
          alt={post.title || 'Post image'}
          className="w-full rounded-[8px] object-cover max-h-[200px]"
        />
      )}

      <p className="text-[13px] text-newTextColor/70 line-clamp-4">
        {stripHtml(post.content)}
      </p>

      {post.suggestedDate && (
        <div className="text-[12px] text-newTextColor/40 flex items-center gap-[4px]">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
          >
            <path
              d="M12 8V12L15 15M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          {dayjs(post.suggestedDate).format('MMM D, YYYY h:mm A')}
        </div>
      )}

      {post.notes && (
        <div className="text-[12px] text-newTextColor/40 bg-newBgColor rounded-[6px] p-[8px] mt-[4px]">
          {post.notes}
        </div>
      )}
    </div>
  );
};
