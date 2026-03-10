'use client';

import React, { useCallback, useState } from 'react';
import { useFetch } from '@gitroom/helpers/utils/custom.fetch';
import useSWR from 'swr';
import { useToaster } from '@gitroom/react/toaster/toaster';
import { useT } from '@gitroom/react/translation/get.transation.service.client';
import { Button } from '@gitroom/react/form/button';
import { deleteDialog } from '@gitroom/react/helpers/delete.dialog';
import { Slider } from '@gitroom/react/form/slider';

type BrandContextType = 'project' | 'company' | 'voice' | 'compliance';

interface BrandContext {
  id: string;
  name: string;
  type: BrandContextType;
  content: string;
  projectTag?: string;
  location?: string;
  priority: number;
  isActive: boolean;
}

interface BrandContextFormState {
  name: string;
  type: BrandContextType;
  content: string;
  projectTag: string;
  location: string;
  priority: number;
  isActive: boolean;
}

const EMPTY_FORM: BrandContextFormState = {
  name: '',
  type: 'company',
  content: '',
  projectTag: '',
  location: '',
  priority: 0,
  isActive: true,
};

const useBrandContexts = () => {
  const fetch = useFetch();
  const load = useCallback(async () => {
    return (await fetch('/brand-context')).json();
  }, []);
  return useSWR('brand-contexts', load, {
    revalidateOnFocus: false,
    revalidateOnReconnect: false,
    revalidateIfStale: false,
    revalidateOnMount: true,
  });
};

const TYPE_LABELS: Record<BrandContextType, string> = {
  project: 'Project',
  company: 'Company',
  voice: 'Voice',
  compliance: 'Compliance',
};

const TYPE_ORDER: BrandContextType[] = ['project', 'company', 'voice', 'compliance'];

const BrandContextForm: React.FC<{
  initial?: BrandContext;
  onSave: (values: BrandContextFormState) => Promise<void>;
  onCancel: () => void;
  saving: boolean;
}> = ({ initial, onSave, onCancel, saving }) => {
  const t = useT();
  const [form, setForm] = useState<BrandContextFormState>(
    initial
      ? {
          name: initial.name,
          type: initial.type,
          content: initial.content,
          projectTag: initial.projectTag ?? '',
          location: initial.location ?? '',
          priority: initial.priority,
          isActive: initial.isActive,
        }
      : EMPTY_FORM
  );

  const set = useCallback(
    <K extends keyof BrandContextFormState>(key: K, value: BrandContextFormState[K]) => {
      setForm((prev) => ({ ...prev, [key]: value }));
    },
    []
  );

  const handleSubmit = useCallback(
    async () => {
      if (!form.name || !form.content) return;
      await onSave(form);
    },
    [form, onSave]
  );

  return (
    <div className="flex flex-col gap-[16px]">
      <div className="flex flex-col gap-[6px]">
        <label className="text-[12px] text-customColor18">
          {t('brand_context_name', 'Name')}
        </label>
        <input
          type="text"
          value={form.name}
          onChange={(e) => set('name', e.target.value)}
          placeholder={t('brand_context_name_placeholder', 'e.g. Brand Voice Guide')}
          className="bg-input border border-fifth rounded-[4px] px-[12px] py-[8px] text-[14px] outline-none w-full"
        />
      </div>

      <div className="flex flex-col gap-[6px]">
        <label className="text-[12px] text-customColor18">
          {t('brand_context_type', 'Type')}
        </label>
        <select
          value={form.type}
          onChange={(e) => set('type', e.target.value as BrandContextType)}
          className="bg-input border border-fifth rounded-[4px] px-[12px] py-[8px] text-[14px] outline-none w-full"
        >
          {TYPE_ORDER.map((type) => (
            <option key={type} value={type}>
              {TYPE_LABELS[type]}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-[6px]">
        <label className="text-[12px] text-customColor18">
          {t('brand_context_content', 'Content')}
        </label>
        <textarea
          value={form.content}
          onChange={(e) => set('content', e.target.value)}
          placeholder={t('brand_context_content_placeholder', 'Describe this brand context block...')}
          rows={5}
          className="bg-input border border-fifth rounded-[4px] px-[12px] py-[8px] text-[14px] outline-none w-full resize-vertical"
        />
      </div>

      <div className="grid grid-cols-2 gap-[12px]">
        <div className="flex flex-col gap-[6px]">
          <label className="text-[12px] text-customColor18">
            {t('brand_context_project_tag', 'Project Tag (optional)')}
          </label>
          <input
            type="text"
            value={form.projectTag}
            onChange={(e) => set('projectTag', e.target.value)}
            placeholder={t('brand_context_project_tag_placeholder', 'e.g. acme-launch')}
            className="bg-input border border-fifth rounded-[4px] px-[12px] py-[8px] text-[14px] outline-none w-full"
          />
        </div>

        <div className="flex flex-col gap-[6px]">
          <label className="text-[12px] text-customColor18">
            {t('brand_context_location', 'Location (optional)')}
          </label>
          <input
            type="text"
            value={form.location}
            onChange={(e) => set('location', e.target.value)}
            placeholder={t('brand_context_location_placeholder', 'e.g. global, twitter')}
            className="bg-input border border-fifth rounded-[4px] px-[12px] py-[8px] text-[14px] outline-none w-full"
          />
        </div>
      </div>

      <div className="flex flex-col gap-[6px]">
        <label className="text-[12px] text-customColor18">
          {t('brand_context_priority', 'Priority')}
        </label>
        <input
          type="number"
          value={form.priority}
          onChange={(e) => set('priority', Number(e.target.value))}
          min={0}
          className="bg-input border border-fifth rounded-[4px] px-[12px] py-[8px] text-[14px] outline-none w-full"
        />
      </div>

      <div className="flex items-center justify-between">
        <div className="flex flex-col">
          <div className="text-[14px]">
            {t('brand_context_is_active', 'Active')}
          </div>
          <div className="text-[12px] text-customColor18">
            {t('brand_context_is_active_description', 'Enable or disable this context block')}
          </div>
        </div>
        <Slider
          value={form.isActive ? 'on' : 'off'}
          onChange={(v) => set('isActive', v === 'on')}
          fill={true}
        />
      </div>

      <div className="flex gap-[12px]">
        <Button type="button" loading={saving} onClick={handleSubmit}>
          {t('brand_context_save', 'Save')}
        </Button>
        <Button type="button" secondary onClick={onCancel}>
          {t('cancel', 'Cancel')}
        </Button>
      </div>
    </div>
  );
};

const BrandContextItem: React.FC<{
  item: BrandContext;
  onEdit: (item: BrandContext) => void;
  onDelete: (item: BrandContext) => void;
}> = ({ item, onEdit, onDelete }) => {
  const t = useT();
  return (
    <div className="border border-fifth rounded-[4px] p-[16px] flex flex-col gap-[8px]">
      <div className="flex items-start justify-between gap-[12px]">
        <div className="flex flex-col gap-[4px] flex-1 min-w-0">
          <div className="flex items-center gap-[8px]">
            <span className="text-[14px] font-medium truncate">{item.name}</span>
            <span className="text-[11px] px-[8px] py-[2px] rounded-full bg-forth/20 text-customColor18 shrink-0">
              {TYPE_LABELS[item.type]}
            </span>
            {!item.isActive && (
              <span className="text-[11px] px-[8px] py-[2px] rounded-full bg-fifth text-customColor18 shrink-0">
                {t('brand_context_inactive', 'Inactive')}
              </span>
            )}
          </div>
          <div className="text-[12px] text-customColor18 line-clamp-2 break-words">
            {item.content}
          </div>
          <div className="flex flex-wrap gap-[12px] mt-[4px]">
            {item.projectTag && (
              <span className="text-[11px] text-customColor18">
                {t('brand_context_tag', 'Tag')}: {item.projectTag}
              </span>
            )}
            {item.location && (
              <span className="text-[11px] text-customColor18">
                {t('brand_context_location_label', 'Location')}: {item.location}
              </span>
            )}
            <span className="text-[11px] text-customColor18">
              {t('brand_context_priority_label', 'Priority')}: {item.priority}
            </span>
          </div>
        </div>
        <div className="flex gap-[8px] shrink-0">
          <Button onClick={() => onEdit(item)}>
            {t('edit', 'Edit')}
          </Button>
          <Button onClick={() => onDelete(item)}>
            {t('delete', 'Delete')}
          </Button>
        </div>
      </div>
    </div>
  );
};

export const BrandContextSettings = () => {
  const t = useT();
  const fetch = useFetch();
  const toaster = useToaster();
  const { data, mutate, isLoading, error } = useBrandContexts();

  const [showForm, setShowForm] = useState(false);
  const [editingItem, setEditingItem] = useState<BrandContext | null>(null);
  const [saving, setSaving] = useState(false);

  const handleAdd = useCallback(() => {
    setEditingItem(null);
    setShowForm(true);
  }, []);

  const handleEdit = useCallback((item: BrandContext) => {
    setEditingItem(item);
    setShowForm(true);
  }, []);

  const handleCancel = useCallback(() => {
    setShowForm(false);
    setEditingItem(null);
  }, []);

  const handleSave = useCallback(
    async (values: BrandContextFormState) => {
      setSaving(true);
      const payload = {
        ...values,
        projectTag: values.projectTag || undefined,
        location: values.location || undefined,
      };
      try {
        if (editingItem) {
          const response = await fetch(`/brand-context/${editingItem.id}`, {
            method: 'PUT',
            body: JSON.stringify(payload),
          });
          if (!response.ok) {
            const err = await response.json().catch(() => ({}));
            throw new Error(err?.message || t('brand_context_save_error', 'Failed to save brand context'));
          }
          toaster.show(t('brand_context_updated', 'Brand context updated'), 'success');
        } else {
          const response = await fetch('/brand-context', {
            method: 'POST',
            body: JSON.stringify(payload),
          });
          if (!response.ok) {
            const err = await response.json().catch(() => ({}));
            throw new Error(err?.message || t('brand_context_save_error', 'Failed to save brand context'));
          }
          toaster.show(t('brand_context_created', 'Brand context created'), 'success');
        }
        await mutate();
        setShowForm(false);
        setEditingItem(null);
      } catch (err: any) {
        toaster.show(err?.message || t('brand_context_save_error', 'Failed to save brand context'), 'warning');
      } finally {
        setSaving(false);
      }
    },
    [editingItem, fetch, mutate, toaster, t]
  );

  const handleDelete = useCallback(
    async (item: BrandContext) => {
      const confirmed = await deleteDialog(
        t('brand_context_delete_confirm', 'Are you sure you want to delete "{name}"?', {
          name: item.name,
        })
      );
      if (!confirmed) return;
      try {
        const response = await fetch(`/brand-context/${item.id}`, { method: 'DELETE' });
        if (!response.ok) {
          const err = await response.json().catch(() => ({}));
          throw new Error(err?.message || t('brand_context_delete_error', 'Failed to delete brand context'));
        }
        toaster.show(t('brand_context_deleted', 'Brand context deleted'), 'success');
        await mutate();
      } catch (err: any) {
        toaster.show(err?.message || t('brand_context_delete_error', 'Failed to delete brand context'), 'warning');
      }
    },
    [fetch, mutate, toaster, t]
  );

  const items: BrandContext[] = Array.isArray(data) ? data : [];

  const grouped = TYPE_ORDER.reduce<Record<BrandContextType, BrandContext[]>>(
    (acc, type) => {
      acc[type] = items.filter((i) => i.type === type);
      return acc;
    },
    { project: [], company: [], voice: [], compliance: [] }
  );

  return (
    <div className="flex flex-col">
      <h3 className="text-[20px]">{t('brand_context', 'Brand Context')}</h3>
      <div className="text-customColor18 mt-[4px]">
        {t(
          'brand_context_description',
          'Manage brand context blocks used to guide AI-generated content.'
        )}
      </div>

      <div className="my-[16px] mt-[16px] bg-sixth border-fifth border rounded-[4px] p-[24px] flex flex-col gap-[24px]">
        {isLoading && (
          <div className="animate-pulse text-[14px]">
            {t('loading', 'Loading...')}
          </div>
        )}

        {!isLoading && error && (
          <div className="text-[12px] text-red-400">
            {t('brand_context_load_error', 'Failed to load brand contexts. Please try refreshing the page.')}
          </div>
        )}

        {!isLoading && !error && !showForm && (
          <>
            {items.length === 0 && (
              <div className="text-[12px] text-customColor18">
                {t('brand_context_empty', 'No brand context blocks yet. Add one to get started.')}
              </div>
            )}

            {TYPE_ORDER.map((type) => {
              const group = grouped[type];
              if (group.length === 0) return null;
              return (
                <div key={type} className="flex flex-col gap-[12px]">
                  <div className="text-[14px] font-medium border-b border-fifth pb-[8px]">
                    {TYPE_LABELS[type]}
                  </div>
                  {group.map((item) => (
                    <BrandContextItem
                      key={item.id}
                      item={item}
                      onEdit={handleEdit}
                      onDelete={handleDelete}
                    />
                  ))}
                </div>
              );
            })}

            <div>
              <Button onClick={handleAdd}>
                {t('brand_context_add', 'Add Brand Context')}
              </Button>
            </div>
          </>
        )}

        {!isLoading && showForm && (
          <div className="flex flex-col gap-[16px]">
            <div className="text-[14px] font-medium">
              {editingItem
                ? t('brand_context_edit_title', 'Edit Brand Context')
                : t('brand_context_add_title', 'New Brand Context')}
            </div>
            <BrandContextForm
              initial={editingItem ?? undefined}
              onSave={handleSave}
              onCancel={handleCancel}
              saving={saving}
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default BrandContextSettings;
