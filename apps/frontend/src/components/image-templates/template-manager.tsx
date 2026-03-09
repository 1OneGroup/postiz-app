'use client';
import React, { FC, useCallback, useState } from 'react';
import { useFetch } from '@gitroom/helpers/utils/custom.fetch';
import useSWR from 'swr';
import { useToaster } from '@gitroom/react/toaster/toaster';
import { useT } from '@gitroom/react/translation/get.transation.service.client';
import { Button } from '@gitroom/react/form/button';
import { deleteDialog } from '@gitroom/react/helpers/delete.dialog';

interface ImageTemplate {
  id: string;
  name: string;
  projectTag: string;
  promptSkeleton: string;
  visualRules: string;
  linkedAssetIds: string;
  isDefault: boolean;
}

export const useImageTemplates = () => {
  const fetch = useFetch();
  const load = useCallback(async () => {
    return (await fetch('/image-templates')).json();
  }, []);
  return useSWR('image-templates', load, {
    revalidateOnFocus: false,
    revalidateOnReconnect: false,
    revalidateIfStale: false,
    revalidateOnMount: true,
  });
};

const VISUAL_RULES_PLACEHOLDER = `{
  "logoPosition": "bottom-right",
  "logoPadding": 20,
  "logoMaxWidth": "15%",
  "colorPalette": ["#1A3A5C", "#D4A843", "#FFFFFF"],
  "textPlacement": "bottom-bar",
  "style": "modern-architectural",
  "mood": "premium, aspirational"
}`;

const inputClass =
  'w-full bg-newBgColorInner border border-newBorder rounded-[8px] px-[12px] py-[8px] text-[14px] text-textColor outline-none focus:border-[#612BD3]';
const textareaClass =
  'w-full bg-newBgColorInner border border-newBorder rounded-[8px] px-[12px] py-[8px] text-[14px] text-textColor outline-none focus:border-[#612BD3] min-h-[120px] resize-y';
const labelClass = 'text-[14px] text-textColor font-[500]';

interface TemplateFormProps {
  initial?: Partial<ImageTemplate>;
  onSave: (values: Partial<ImageTemplate>) => Promise<void>;
  onCancel: () => void;
}

const TemplateForm: FC<TemplateFormProps> = ({ initial, onSave, onCancel }) => {
  const t = useT();
  const [name, setName] = useState(initial?.name ?? '');
  const [projectTag, setProjectTag] = useState(initial?.projectTag ?? '');
  const [promptSkeleton, setPromptSkeleton] = useState(
    initial?.promptSkeleton ?? ''
  );
  const [visualRules, setVisualRules] = useState(initial?.visualRules ?? '');
  const [linkedAssetIds, setLinkedAssetIds] = useState(
    initial?.linkedAssetIds ?? ''
  );
  const [isDefault, setIsDefault] = useState(initial?.isDefault ?? false);
  const [saving, setSaving] = useState(false);

  const handleSave = useCallback(async () => {
    setSaving(true);
    try {
      await onSave({
        name,
        projectTag,
        promptSkeleton,
        visualRules,
        linkedAssetIds,
        isDefault,
      });
    } finally {
      setSaving(false);
    }
  }, [name, projectTag, promptSkeleton, visualRules, linkedAssetIds, isDefault, onSave]);

  return (
    <div className="flex flex-col gap-[16px]">
      <div className="flex flex-col gap-[6px]">
        <label className={labelClass}>{t('template_name', 'Name')}</label>
        <input
          className={inputClass}
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={t('template_name_placeholder', 'e.g. Property Listing Hero')}
        />
      </div>

      <div className="flex flex-col gap-[6px]">
        <label className={labelClass}>
          {t('template_project_tag', 'Project Tag')}
        </label>
        <input
          className={inputClass}
          value={projectTag}
          onChange={(e) => setProjectTag(e.target.value)}
          placeholder={t('template_project_tag_placeholder', 'e.g. clermont-mohali')}
        />
      </div>

      <div className="flex flex-col gap-[6px]">
        <label className={labelClass}>
          {t('template_prompt_skeleton', 'Prompt Skeleton')}
        </label>
        <textarea
          className={textareaClass}
          value={promptSkeleton}
          onChange={(e) => setPromptSkeleton(e.target.value)}
          placeholder={t(
            'template_prompt_skeleton_placeholder',
            'Enter the template prompt with placeholders, e.g. {{property_name}}, {{price}}, {{location}}'
          )}
          style={{ minHeight: '160px' }}
        />
      </div>

      <div className="flex flex-col gap-[6px]">
        <label className={labelClass}>
          {t('template_visual_rules', 'Visual Rules (JSON)')}
        </label>
        <textarea
          className={textareaClass}
          value={visualRules}
          onChange={(e) => setVisualRules(e.target.value)}
          placeholder={VISUAL_RULES_PLACEHOLDER}
          style={{ minHeight: '160px', fontFamily: 'monospace' }}
        />
      </div>

      <div className="flex flex-col gap-[6px]">
        <label className={labelClass}>
          {t('template_linked_asset_ids', 'Linked Asset IDs (comma-separated)')}
        </label>
        <input
          className={inputClass}
          value={linkedAssetIds}
          onChange={(e) => setLinkedAssetIds(e.target.value)}
          placeholder={t(
            'template_linked_asset_ids_placeholder',
            'e.g. asset-id-1, asset-id-2'
          )}
        />
      </div>

      <div className="flex items-center gap-[10px]">
        <input
          type="checkbox"
          id="isDefault"
          checked={isDefault}
          onChange={(e) => setIsDefault(e.target.checked)}
          className="w-[16px] h-[16px] cursor-pointer accent-[#612BD3]"
        />
        <label htmlFor="isDefault" className={labelClass + ' cursor-pointer'}>
          {t('template_is_default', 'Set as default template')}
        </label>
      </div>

      <div className="flex gap-[12px]">
        <Button onClick={handleSave} loading={saving}>
          {t('save', 'Save')}
        </Button>
        <Button onClick={onCancel} secondary>
          {t('cancel', 'Cancel')}
        </Button>
      </div>
    </div>
  );
};

interface TemplateCardProps {
  template: ImageTemplate;
  onEdit: (template: ImageTemplate) => void;
  onDelete: (template: ImageTemplate) => void;
}

const TemplateCard: FC<TemplateCardProps> = ({ template, onEdit, onDelete }) => {
  const t = useT();

  let parsedRules: Record<string, unknown> | null = null;
  try {
    parsedRules = template.visualRules ? JSON.parse(template.visualRules) : null;
  } catch {
    parsedRules = null;
  }

  return (
    <div className="bg-newBgColorInner border border-newBorder rounded-[8px] p-[16px] flex flex-col gap-[12px]">
      <div className="flex items-start justify-between gap-[8px]">
        <div className="flex flex-col gap-[4px] flex-1 min-w-0">
          <div className="flex items-center gap-[8px] flex-wrap">
            <span className="text-[16px] font-[600] text-textColor truncate">
              {template.name}
            </span>
            {template.isDefault && (
              <span className="text-[11px] bg-[#612BD3] text-white px-[8px] py-[2px] rounded-[4px] font-[500] shrink-0">
                {t('default', 'Default')}
              </span>
            )}
          </div>
          {template.projectTag && (
            <span className="text-[12px] text-textColor opacity-60">
              {template.projectTag}
            </span>
          )}
        </div>
      </div>

      {parsedRules && (
        <div className="flex flex-col gap-[4px]">
          <span className="text-[12px] text-textColor opacity-60 font-[500]">
            {t('visual_rules', 'Visual Rules')}
          </span>
          <div className="flex flex-wrap gap-[6px]">
            {parsedRules.style && (
              <span className="text-[11px] bg-newBgColorInner border border-newBorder rounded-[4px] px-[8px] py-[3px] text-textColor">
                {String(parsedRules.style)}
              </span>
            )}
            {parsedRules.mood && (
              <span className="text-[11px] bg-newBgColorInner border border-newBorder rounded-[4px] px-[8px] py-[3px] text-textColor">
                {String(parsedRules.mood)}
              </span>
            )}
            {parsedRules.textPlacement && (
              <span className="text-[11px] bg-newBgColorInner border border-newBorder rounded-[4px] px-[8px] py-[3px] text-textColor">
                {t('text', 'text')}: {String(parsedRules.textPlacement)}
              </span>
            )}
            {Array.isArray(parsedRules.colorPalette) && (
              <div className="flex items-center gap-[4px]">
                {(parsedRules.colorPalette as string[]).map((color) => (
                  <span
                    key={color}
                    className="w-[16px] h-[16px] rounded-full border border-newBorder inline-block"
                    style={{ backgroundColor: color }}
                    title={color}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {template.promptSkeleton && (
        <div className="text-[12px] text-textColor opacity-60 line-clamp-2">
          {template.promptSkeleton}
        </div>
      )}

      <div className="flex gap-[8px] mt-auto">
        <Button onClick={() => onEdit(template)}>
          {t('edit', 'Edit')}
        </Button>
        <Button onClick={() => onDelete(template)} secondary>
          {t('delete', 'Delete')}
        </Button>
      </div>
    </div>
  );
};

export const TemplateManager: FC = () => {
  const t = useT();
  const fetch = useFetch();
  const toaster = useToaster();
  const { data, mutate } = useImageTemplates();

  const [showForm, setShowForm] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<ImageTemplate | null>(null);

  const handleAdd = useCallback(() => {
    setEditingTemplate(null);
    setShowForm(true);
  }, []);

  const handleEdit = useCallback((template: ImageTemplate) => {
    setEditingTemplate(template);
    setShowForm(true);
  }, []);

  const handleCancel = useCallback(() => {
    setShowForm(false);
    setEditingTemplate(null);
  }, []);

  const handleSave = useCallback(
    async (values: Partial<ImageTemplate>) => {
      if (editingTemplate?.id) {
        await fetch(`/image-templates/${editingTemplate.id}`, {
          method: 'PUT',
          body: JSON.stringify(values),
        });
        toaster.show(t('template_updated', 'Template updated successfully'), 'success');
      } else {
        await fetch('/image-templates', {
          method: 'POST',
          body: JSON.stringify(values),
        });
        toaster.show(t('template_created', 'Template created successfully'), 'success');
      }
      setShowForm(false);
      setEditingTemplate(null);
      mutate();
    },
    [editingTemplate, fetch, mutate, t, toaster]
  );

  const handleDelete = useCallback(
    async (template: ImageTemplate) => {
      if (
        !(await deleteDialog(
          t(
            'are_you_sure_delete_template',
            `Are you sure you want to delete "${template.name}"?`,
            { name: template.name }
          )
        ))
      ) {
        return;
      }
      await fetch(`/image-templates/${template.id}`, {
        method: 'DELETE',
      });
      toaster.show(t('template_deleted', 'Template deleted successfully'), 'success');
      mutate();
    },
    [fetch, mutate, t, toaster]
  );

  const templates: ImageTemplate[] = data ?? [];

  return (
    <div className="flex flex-col">
      <h3 className="text-[20px]">{t('image_templates', 'Image Templates')}</h3>
      <div className="text-customColor18 mt-[4px]">
        {t(
          'image_templates_description',
          'Manage reusable image generation templates with visual rules and prompt skeletons.'
        )}
      </div>

      <div className="my-[16px] bg-sixth border-fifth border rounded-[4px] p-[24px] flex flex-col gap-[16px]">
        {showForm ? (
          <div className="flex flex-col gap-[16px]">
            <h4 className="text-[16px] font-[600] text-textColor">
              {editingTemplate
                ? t('edit_template', 'Edit Template')
                : t('add_template', 'Add Template')}
            </h4>
            <TemplateForm
              initial={editingTemplate ?? undefined}
              onSave={handleSave}
              onCancel={handleCancel}
            />
          </div>
        ) : (
          <>
            {templates.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-[16px]">
                {templates.map((template) => (
                  <TemplateCard
                    key={template.id}
                    template={template}
                    onEdit={handleEdit}
                    onDelete={handleDelete}
                  />
                ))}
              </div>
            )}
            <div>
              <Button onClick={handleAdd}>
                {t('add_template', 'Add Template')}
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default TemplateManager;
