'use client';
import React, { FC, useCallback, useState } from 'react';
import { useFetch } from '@gitroom/helpers/utils/custom.fetch';
import useSWR from 'swr';
import { useToaster } from '@gitroom/react/toaster/toaster';
import { useT } from '@gitroom/react/translation/get.transation.service.client';
import { Button } from '@gitroom/react/form/button';

const getNextMonth = () => {
  const now = new Date();
  const next = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  return `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, '0')}`;
};

export const useProjectTags = () => {
  const fetch = useFetch();
  const load = useCallback(async () => {
    return (await fetch('/brand-context/project-tags')).json();
  }, []);
  return useSWR('project-tags', load, {
    revalidateOnFocus: false,
    revalidateOnReconnect: false,
    revalidateIfStale: false,
    revalidateOnMount: true,
  });
};

export const usePlannerConfig = (projectTag: string | null) => {
  const fetch = useFetch();
  const load = useCallback(async () => {
    if (!projectTag) return null;
    return (await fetch(`/monthly-planner/config/${projectTag}`)).json();
  }, [projectTag]);
  return useSWR(
    projectTag ? `planner-config-${projectTag}` : null,
    load,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      revalidateIfStale: false,
      revalidateOnMount: true,
    }
  );
};

type GenerateState = 'idle' | 'generating' | 'success' | 'error';

export const MonthlyPlannerModal: FC<{
  onClose: () => void;
  onGenerated?: () => void;
}> = ({ onClose, onGenerated }) => {
  const t = useT();
  const fetch = useFetch();
  const toaster = useToaster();

  const [selectedProject, setSelectedProject] = useState<string>('');
  const [selectedMonth, setSelectedMonth] = useState<string>(getNextMonth());
  const [postsPerWeek, setPostsPerWeek] = useState<number>(3);
  const [generateState, setGenerateState] = useState<GenerateState>('idle');
  const [createdCount, setCreatedCount] = useState<number>(0);
  const [errorMessage, setErrorMessage] = useState<string>('');

  const { data: projectTags, isLoading: tagsLoading } = useProjectTags();
  const { data: plannerConfig } = usePlannerConfig(selectedProject || null);

  // When planner config loads, pre-fill posts per week
  React.useEffect(() => {
    if (plannerConfig?.postsPerWeek != null) {
      setPostsPerWeek(plannerConfig.postsPerWeek);
    }
  }, [plannerConfig]);

  const handleGenerate = useCallback(async () => {
    if (!selectedProject) {
      toaster.show(t('monthly_planner_select_project', 'Please select a project'), 'warning');
      return;
    }
    if (!selectedMonth) {
      toaster.show(t('monthly_planner_select_month', 'Please select a month'), 'warning');
      return;
    }

    setGenerateState('generating');
    setErrorMessage('');

    try {
      const response = await fetch('/monthly-planner/generate', {
        method: 'POST',
        body: JSON.stringify({
          projectTag: selectedProject,
          month: selectedMonth,
          postsPerWeek: postsPerWeek,
        }),
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err?.message || t('monthly_planner_error_generic', 'Generation failed'));
      }

      const result = await response.json();
      setCreatedCount(result?.count ?? result?.posts?.length ?? 0);
      setGenerateState('success');
      onGenerated?.();
    } catch (err: any) {
      setErrorMessage(err?.message || t('monthly_planner_error_generic', 'Something went wrong'));
      setGenerateState('error');
    }
  }, [selectedProject, selectedMonth, postsPerWeek, fetch, toaster, t, onGenerated]);

  const handleRetry = useCallback(() => {
    setGenerateState('idle');
    setErrorMessage('');
  }, []);

  if (generateState === 'generating') {
    return (
      <div className="flex flex-col items-center justify-center gap-[16px] py-[40px] px-[8px]">
        <div className="w-[40px] h-[40px] border-[3px] border-[#612BD3] border-t-transparent rounded-full animate-spin" />
        <p className="text-[14px] text-textColor font-[500]">
          {t('monthly_planner_generating', 'Generating monthly plan...')}
        </p>
      </div>
    );
  }

  if (generateState === 'success') {
    return (
      <div className="flex flex-col items-center justify-center gap-[20px] py-[40px] px-[8px]">
        <div className="w-[48px] h-[48px] rounded-full bg-[#22c55e] flex items-center justify-center">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <path d="M5 13l4 4L19 7" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <p className="text-[16px] text-textColor font-[600] text-center">
          {t('monthly_planner_success_title', 'Plan Generated!')}
        </p>
        <p className="text-[14px] text-textColor text-center">
          {createdCount > 0
            ? t('monthly_planner_success_count', `${createdCount} posts have been added to your calendar.`).replace(
                '${createdCount}',
                String(createdCount)
              )
            : t('monthly_planner_success_no_count', 'Your monthly plan has been added to the calendar.')}
        </p>
        <button
          onClick={onClose}
          className="cursor-pointer text-white h-[44px] px-[20px] items-center justify-center bg-[#612BD3] flex rounded-[10px] font-[500]"
        >
          {t('monthly_planner_view_calendar', 'View Calendar')}
        </button>
      </div>
    );
  }

  if (generateState === 'error') {
    return (
      <div className="flex flex-col items-center justify-center gap-[20px] py-[40px] px-[8px]">
        <div className="w-[48px] h-[48px] rounded-full bg-[#ef4444] flex items-center justify-center">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <path d="M12 8v4m0 4h.01" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
            <circle cx="12" cy="12" r="9" stroke="white" strokeWidth="2.5" />
          </svg>
        </div>
        <p className="text-[16px] text-textColor font-[600] text-center">
          {t('monthly_planner_error_title', 'Generation Failed')}
        </p>
        {errorMessage ? (
          <p className="text-[13px] text-red-400 text-center max-w-[300px]">{errorMessage}</p>
        ) : null}
        <div className="flex gap-[10px]">
          <button
            onClick={handleRetry}
            className="cursor-pointer text-white h-[44px] px-[20px] items-center justify-center bg-[#612BD3] flex rounded-[10px] font-[500]"
          >
            {t('monthly_planner_retry', 'Try Again')}
          </button>
          <button
            onClick={onClose}
            className="cursor-pointer h-[44px] px-[20px] items-center justify-center border border-newBorder flex rounded-[10px] font-[500] text-textColor"
          >
            {t('cancel', 'Cancel')}
          </button>
        </div>
      </div>
    );
  }

  // idle state - show form
  return (
    <div className="flex flex-col gap-[20px] p-[8px]">
      {/* Project selector */}
      <div className="flex flex-col">
        <label className="text-[14px] text-textColor font-[500] mb-[4px]">
          {t('monthly_planner_project_label', 'Project')}
        </label>
        <select
          value={selectedProject}
          onChange={(e) => setSelectedProject(e.target.value)}
          disabled={tagsLoading}
          className="w-full bg-newBgColorInner border border-newBorder rounded-[8px] px-[12px] py-[10px] text-[14px] text-textColor outline-none focus:border-[#612BD3]"
        >
          <option value="">
            {tagsLoading
              ? t('monthly_planner_loading_projects', 'Loading projects...')
              : t('monthly_planner_select_project_placeholder', 'Select a project')}
          </option>
          {Array.isArray(projectTags) &&
            projectTags.map((tag: string) => (
              <option key={tag} value={tag}>
                {tag}
              </option>
            ))}
        </select>
      </div>

      {/* Month picker */}
      <div className="flex flex-col">
        <label className="text-[14px] text-textColor font-[500] mb-[4px]">
          {t('monthly_planner_month_label', 'Target Month')}
        </label>
        <input
          type="month"
          value={selectedMonth}
          onChange={(e) => setSelectedMonth(e.target.value)}
          className="w-full bg-newBgColorInner border border-newBorder rounded-[8px] px-[12px] py-[10px] text-[14px] text-textColor outline-none focus:border-[#612BD3]"
        />
      </div>

      {/* Posts per week */}
      <div className="flex flex-col">
        <label className="text-[14px] text-textColor font-[500] mb-[4px]">
          {t('monthly_planner_posts_per_week_label', 'Posts Per Week')}
        </label>
        <input
          type="number"
          min={1}
          max={21}
          value={postsPerWeek}
          onChange={(e) => setPostsPerWeek(Math.max(1, parseInt(e.target.value, 10) || 1))}
          className="w-full bg-newBgColorInner border border-newBorder rounded-[8px] px-[12px] py-[10px] text-[14px] text-textColor outline-none focus:border-[#612BD3]"
        />
      </div>

      {/* Actions */}
      <div className="flex gap-[10px] pt-[4px]">
        <button
          onClick={handleGenerate}
          disabled={!selectedProject || !selectedMonth}
          className="cursor-pointer text-white h-[44px] px-[20px] items-center justify-center bg-[#612BD3] flex rounded-[10px] font-[500] disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {t('monthly_planner_generate_button', 'Generate Plan')}
        </button>
        <button
          onClick={onClose}
          className="cursor-pointer h-[44px] px-[20px] items-center justify-center border border-newBorder flex rounded-[10px] font-[500] text-textColor"
        >
          {t('cancel', 'Cancel')}
        </button>
      </div>
    </div>
  );
};

export default MonthlyPlannerModal;
