'use client';

import React, { FC, useCallback, useMemo, useState } from 'react';
import { useFetch } from '@gitroom/helpers/utils/custom.fetch';
import { useToaster } from '@gitroom/react/toaster/toaster';
import { useIntegrationList } from '@gitroom/frontend/components/launches/helpers/use.integration.list';
import { ProjectPostData } from '@gitroom/frontend/components/projects/project-post-card';
import { useT } from '@gitroom/react/translation/get.transation.service.client';
import dayjs from 'dayjs';
import ImageWithFallback from '@gitroom/react/helpers/image.with.fallback';

export const SchedulePostModal: FC<{
  post: ProjectPostData;
  projectId: string;
  onScheduled: () => void;
  closeModal: () => void;
}> = ({ post, projectId, onScheduled, closeModal }) => {
  const fetch = useFetch();
  const toaster = useToaster();
  const t = useT();
  const { data: integrations } = useIntegrationList();

  const [selectedIntegrationId, setSelectedIntegrationId] = useState('');
  const [date, setDate] = useState(
    post.suggestedDate
      ? dayjs(post.suggestedDate).format('YYYY-MM-DDTHH:mm')
      : dayjs().add(1, 'day').set('hour', 10).set('minute', 0).format('YYYY-MM-DDTHH:mm')
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const sortedIntegrations = useMemo(() => {
    if (!integrations?.length) return [];
    if (!post.suggestedPlatform) return integrations;
    const platform = post.suggestedPlatform.toLowerCase();
    return [...integrations].sort((a: any, b: any) => {
      const aMatch = a.identifier?.toLowerCase().startsWith(platform) ? 0 : 1;
      const bMatch = b.identifier?.toLowerCase().startsWith(platform) ? 0 : 1;
      return aMatch - bMatch;
    });
  }, [integrations, post.suggestedPlatform]);

  const handleSchedule = useCallback(async () => {
    if (!selectedIntegrationId) {
      setError(t('select_channel', 'Please select a channel'));
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await fetch(
        `/projects/${projectId}/posts/${post.id}/schedule`,
        {
          method: 'POST',
          body: JSON.stringify({
            integrationId: selectedIntegrationId,
            date: dayjs(date).utc().format('YYYY-MM-DDTHH:mm:ss') + 'Z',
          }),
        }
      );
      if (res.ok) {
        toaster.show(t('post_scheduled', 'Post scheduled to calendar!'), 'success');
        onScheduled();
        closeModal();
      } else {
        const data = await res.json();
        setError(data.message || t('schedule_error', 'Failed to schedule post'));
      }
    } catch {
      setError(t('schedule_error', 'Failed to schedule post'));
    } finally {
      setLoading(false);
    }
  }, [selectedIntegrationId, date, fetch, projectId, post.id, onScheduled, closeModal]);

  const stripHtml = (html: string) => {
    return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
  };

  return (
    <div className="flex flex-col gap-[16px] p-[8px]">
      {/* Post preview */}
      <div className="bg-newBgColor rounded-[8px] p-[12px]">
        {post.title && (
          <h4 className="text-[14px] font-[500] mb-[4px]">{post.title}</h4>
        )}
        <p className="text-[13px] text-newTextColor/70 line-clamp-3">
          {stripHtml(post.content)}
        </p>
      </div>

      {/* Channel selector */}
      <div className="flex flex-col gap-[6px]">
        <label className="text-[13px] text-newTextColor/60">
          {t('select_channel_label', 'Channel')}
        </label>
        {sortedIntegrations.length === 0 ? (
          <p className="text-[13px] text-red-400">
            {t('no_channels', 'No channels connected. Please add a channel first.')}
          </p>
        ) : (
          <div className="flex flex-col gap-[6px] max-h-[200px] overflow-y-auto">
            {sortedIntegrations.map((integration: any) => (
              <button
                key={integration.id}
                onClick={() => setSelectedIntegrationId(integration.id)}
                className={`flex items-center gap-[10px] p-[10px] rounded-[8px] border transition-colors text-left ${
                  selectedIntegrationId === integration.id
                    ? 'border-btnPrimary bg-btnPrimary/10'
                    : 'border-fifth/20 hover:border-fifth/40'
                }`}
              >
                <ImageWithFallback
                  fallbackSrc="/icons/platforms/x.png"
                  src={integration.picture}
                  alt={integration.name}
                  width={28}
                  height={28}
                  className="rounded-full"
                />
                <div className="flex flex-col">
                  <span className="text-[13px] font-[500]">
                    {integration.name}
                  </span>
                  <span className="text-[11px] text-newTextColor/40">
                    {integration.identifier?.split('-')[0]}
                  </span>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Date picker */}
      <div className="flex flex-col gap-[6px]">
        <label className="text-[13px] text-newTextColor/60">
          {t('publish_date', 'Publish Date')}
        </label>
        <input
          type="datetime-local"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="bg-newBgColor border border-fifth/20 rounded-[8px] p-[10px] text-[13px] text-newTextColor outline-none focus:border-btnPrimary"
        />
      </div>

      {/* Error */}
      {error && (
        <p className="text-[13px] text-red-400">{error}</p>
      )}

      {/* Actions */}
      <div className="flex justify-end gap-[8px]">
        <button
          onClick={closeModal}
          className="px-[16px] py-[8px] rounded-[8px] text-[13px] text-newTextColor/60 hover:bg-newBgColor transition-colors"
        >
          {t('cancel', 'Cancel')}
        </button>
        <button
          onClick={handleSchedule}
          disabled={loading || !selectedIntegrationId}
          className="bg-btnPrimary text-white px-[16px] py-[8px] rounded-[8px] text-[13px] disabled:opacity-50 transition-colors"
        >
          {loading
            ? t('scheduling', 'Scheduling...')
            : t('schedule_to_calendar', 'Schedule to Calendar')}
        </button>
      </div>
    </div>
  );
};
