'use client';
import React, { FC, useCallback } from 'react';
import { useFetch } from '@gitroom/helpers/utils/custom.fetch';
import useSWR from 'swr';
import { useT } from '@gitroom/react/translation/get.transation.service.client';

interface ImageTemplate {
  id: string;
  name: string;
  projectTag: string;
  visualRules: string;
  promptSkeleton: string;
  linkedAssetIds: string;
  isDefault: boolean;
}

export const useImageTemplatesForSelector = () => {
  const fetch = useFetch();
  const load = useCallback(async () => {
    return (await fetch('/image-templates')).json();
  }, []);
  return useSWR('image-templates-selector', load, {
    revalidateOnFocus: false,
    revalidateOnReconnect: false,
    revalidateIfStale: false,
    revalidateOnMount: true,
  });
};

const SkeletonCard: FC = () => (
  <div className="bg-newBgColorInner border border-newBorder rounded-[8px] p-[16px] flex flex-col gap-[10px] animate-pulse">
    <div className="h-[16px] bg-newBorder rounded-[4px] w-[60%]" />
    <div className="h-[12px] bg-newBorder rounded-[4px] w-[40%]" />
  </div>
);

interface TemplateSelectorProps {
  onSelect: (template: ImageTemplate) => void;
  projectTag?: string;
}

export const TemplateSelector: FC<TemplateSelectorProps> = ({
  onSelect,
  projectTag,
}) => {
  const t = useT();
  const { data, isLoading } = useImageTemplatesForSelector();

  const allTemplates: ImageTemplate[] = data ?? [];

  const templates = projectTag
    ? allTemplates.filter(
        (tpl) => !tpl.projectTag || tpl.projectTag === projectTag
      )
    : allTemplates;

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 gap-[12px]">
        <SkeletonCard />
        <SkeletonCard />
        <SkeletonCard />
      </div>
    );
  }

  if (templates.length === 0) {
    return (
      <div className="text-[14px] text-textColor opacity-60 py-[16px] text-center">
        {t('no_templates_yet', 'No templates yet')}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-[12px]">
      {templates.map((template) => (
        <div
          key={template.id}
          onClick={() => onSelect(template)}
          className="cursor-pointer bg-newBgColorInner border border-newBorder rounded-[8px] p-[16px] hover:border-[#612BD3] transition-colors"
        >
          <div className="flex items-center gap-[8px] flex-wrap">
            <span className="text-[14px] font-[600] text-textColor truncate">
              {template.name}
            </span>
            {template.isDefault && (
              <span className="text-[11px] bg-[#612BD3] text-white px-[8px] py-[2px] rounded-[4px] font-[500] shrink-0">
                {t('default', 'Default')}
              </span>
            )}
          </div>
          {template.projectTag && (
            <div className="text-[12px] text-textColor opacity-60 mt-[4px]">
              {template.projectTag}
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

export default TemplateSelector;
