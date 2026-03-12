'use client';

import React, { useCallback, useState } from 'react';
import { useFetch } from '@gitroom/helpers/utils/custom.fetch';
import useSWR from 'swr';
import { useToaster } from '@gitroom/react/toaster/toaster';
import { useT } from '@gitroom/react/translation/get.transation.service.client';
import { Button } from '@gitroom/react/form/button';
import { deleteDialog } from '@gitroom/react/helpers/delete.dialog';
import { Slider } from '@gitroom/react/form/slider';
import { useModals } from '@gitroom/frontend/components/layout/new-modal';
import { FormProvider, useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import { object, string, number, boolean } from 'yup';
import { Input } from '@gitroom/react/form/input';
import { Select } from '@gitroom/react/form/select';

// ─── Types & Constants ────────────────────────────────────────────────────────

type BrandContextType = 'project' | 'company' | 'voice' | 'compliance';

interface BrandContext {
  id: string;
  name: string;
  type: BrandContextType;
  content: string;
  projectTag?: string;
  location?: string;
  googleDriveFolderId?: string;
  priority: number;
  isActive: boolean;
}

const TYPE_LABELS: Record<BrandContextType, string> = {
  project: 'Project',
  company: 'Company',
  voice: 'Voice',
  compliance: 'Compliance',
};

const TYPE_ORDER: BrandContextType[] = ['project', 'company', 'voice', 'compliance'];

const TYPE_CONFIG: Record<
  BrandContextType,
  { color: string; icon: React.ReactNode }
> = {
  project: {
    color: '#4f46e5',
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path
          d="M14 4.5V13C14 13.2652 13.8946 13.5196 13.7071 13.7071C13.5196 13.8946 13.2652 14 13 14H3C2.73478 14 2.48043 13.8946 2.29289 13.7071C2.10536 13.5196 2 13.2652 2 13V3C2 2.73478 2.10536 2.48043 2.29289 2.29289C2.48043 2.10536 2.73478 2 3 2H9.5L14 4.5Z"
          stroke="currentColor"
          strokeWidth="1.25"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path d="M9 2V5H14" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  company: {
    color: '#32d583',
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path
          d="M2 14V5L8 2L14 5V14"
          stroke="currentColor"
          strokeWidth="1.25"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M2 14H14"
          stroke="currentColor"
          strokeWidth="1.25"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M6 14V10H10V14"
          stroke="currentColor"
          strokeWidth="1.25"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M5.5 7H6.5M9.5 7H10.5M5.5 9H6.5M9.5 9H10.5"
          stroke="currentColor"
          strokeWidth="1.25"
          strokeLinecap="round"
        />
      </svg>
    ),
  },
  voice: {
    color: '#8155dd',
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path
          d="M10 2L3 6H1V10H3L10 14V2Z"
          stroke="currentColor"
          strokeWidth="1.25"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M13.07 2.93C13.9475 3.80752 14.4397 4.99836 14.4397 6.24C14.4397 7.48164 13.9475 8.67248 13.07 9.55"
          stroke="currentColor"
          strokeWidth="1.25"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M11.54 4.46C11.9787 4.89868 12.2248 5.4941 12.2248 6.115C12.2248 6.7359 11.9787 7.33132 11.54 7.77"
          stroke="currentColor"
          strokeWidth="1.25"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    ),
  },
  compliance: {
    color: '#f97066',
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path
          d="M8 1L2 3.5V8C2 11.3 4.6 14.4 8 15C11.4 14.4 14 11.3 14 8V3.5L8 1Z"
          stroke="currentColor"
          strokeWidth="1.25"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M8 5V8.5"
          stroke="currentColor"
          strokeWidth="1.25"
          strokeLinecap="round"
        />
        <circle cx="8" cy="10.5" r="0.75" fill="currentColor" />
      </svg>
    ),
  },
};

// ─── SWR Hook ─────────────────────────────────────────────────────────────────

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

// ─── Yup Schema ───────────────────────────────────────────────────────────────

const brandContextSchema = object().shape({
  name: string().required('Name is required'),
  type: string()
    .oneOf(['project', 'company', 'voice', 'compliance'] as const)
    .required(),
  content: string().required('Content is required'),
  projectTag: string().optional().default(''),
  location: string().optional().default(''),
  priority: number().min(0).required().default(0),
  isActive: boolean().required().default(true),
  googleDriveFolderId: string().optional().default(''),
});

// ─── BrandContextFormModal ────────────────────────────────────────────────────

const BrandContextFormModal: React.FC<{
  data?: BrandContext;
  reload: () => void;
}> = ({ data, reload }) => {
  const t = useT();
  const fetch = useFetch();
  const toaster = useToaster();
  const modal = useModals();

  const form = useForm({
    resolver: yupResolver(brandContextSchema),
    values: {
      name: data?.name ?? '',
      type: data?.type ?? 'company',
      content: data?.content ?? '',
      projectTag: data?.projectTag ?? '',
      location: data?.location ?? '',
      priority: data?.priority ?? 0,
      isActive: data?.isActive ?? true,
      googleDriveFolderId: data?.googleDriveFolderId ?? '',
    },
  });

  const isActive = form.watch('isActive');

  const submit = useCallback(
    async (values: Record<string, any>) => {
      const payload = {
        ...values,
        projectTag: values.projectTag || undefined,
        location: values.location || undefined,
        googleDriveFolderId: values.googleDriveFolderId || undefined,
      };
      try {
        if (data?.id) {
          const response = await fetch(`/brand-context/${data.id}`, {
            method: 'PUT',
            body: JSON.stringify(payload),
          });
          if (!response.ok) {
            const err = await response.json().catch(() => ({}));
            throw new Error(
              err?.message ??
                t('brand_context_save_error', 'Failed to save brand context')
            );
          }
          toaster.show(
            t('brand_context_updated', 'Brand context updated'),
            'success'
          );
        } else {
          const response = await fetch('/brand-context', {
            method: 'POST',
            body: JSON.stringify(payload),
          });
          if (!response.ok) {
            const err = await response.json().catch(() => ({}));
            throw new Error(
              err?.message ??
                t('brand_context_save_error', 'Failed to save brand context')
            );
          }
          toaster.show(
            t('brand_context_created', 'Brand context created'),
            'success'
          );
        }
        modal.closeAll();
        reload();
      } catch (err: any) {
        toaster.show(
          err?.message ??
            t('brand_context_save_error', 'Failed to save brand context'),
          'warning'
        );
      }
    },
    [data, fetch, toaster, modal, reload, t]
  );

  const contentError = form.formState.errors.content;

  return (
    <FormProvider {...form}>
      <form onSubmit={form.handleSubmit(submit)}>
        <div className="relative flex gap-[16px] flex-col flex-1 p-[16px] pt-0">
          <Input
            label={t('brand_context_name', 'Name')}
            name="name"
          />

          <Select
            label={t('brand_context_type', 'Type')}
            name="type"
          >
            {TYPE_ORDER.map((type) => (
              <option key={type} value={type}>
                {TYPE_LABELS[type]}
              </option>
            ))}
          </Select>

          <div className="flex flex-col gap-[6px]">
            <label className="text-[12px] text-customColor18">
              {t('brand_context_content', 'Content')}
            </label>
            <textarea
              {...form.register('content')}
              placeholder={t(
                'brand_context_content_placeholder',
                'Describe this brand context block...'
              )}
              rows={5}
              className="bg-input border border-fifth rounded-[4px] px-[12px] py-[8px] text-[14px] outline-none w-full resize-vertical"
            />
            {contentError && (
              <div className="text-[11px] text-red-400">
                {contentError.message}
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-[12px]">
            <Input
              label={t('brand_context_project_tag', 'Project Tag')}
              name="projectTag"
            />
            <Input
              label={t('brand_context_location', 'Location')}
              name="location"
            />
          </div>

          <Input
            label={t('brand_context_priority', 'Priority')}
            name="priority"
            type="number"
          />

          <div className="flex flex-col gap-[6px]">
            <label className="text-[12px] text-customColor18">
              {t('brand_context_google_drive', 'Google Drive Folder URL')}
            </label>
            <input
              {...form.register('googleDriveFolderId')}
              type="text"
              placeholder="https://drive.google.com/drive/folders/..."
              className="bg-input border border-fifth rounded-[4px] px-[12px] py-[8px] text-[14px] outline-none w-full"
            />
            <div className="text-[11px] text-customColor18">
              {t(
                'brand_context_drive_help',
                'Optional. Share the folder with your service account email for access.'
              )}
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex flex-col">
              <div className="text-[14px]">
                {t('brand_context_is_active', 'Active')}
              </div>
              <div className="text-[12px] text-customColor18">
                {t(
                  'brand_context_is_active_description',
                  'Enable or disable this context block'
                )}
              </div>
            </div>
            <Slider
              value={isActive ? 'on' : 'off'}
              onChange={(v) => form.setValue('isActive', v === 'on')}
              fill={true}
            />
          </div>

          <Button type="submit" loading={form.formState.isSubmitting}>
            {t('brand_context_save', 'Save')}
          </Button>
        </div>
      </form>
    </FormProvider>
  );
};

// ─── BrandContextCard ─────────────────────────────────────────────────────────

const BrandContextCard: React.FC<{
  item: BrandContext;
  onEdit: (item: BrandContext) => void;
  onDelete: (item: BrandContext) => void;
}> = ({ item, onEdit, onDelete }) => {
  const t = useT();
  const config = TYPE_CONFIG[item.type];

  return (
    <div
      className="bg-sixth border border-fifth rounded-[4px] border-l-[4px] p-[16px] flex flex-col gap-[12px]"
      style={{ borderLeftColor: config.color }}
    >
      {/* Header row */}
      <div className="flex items-center gap-[8px]">
        <span style={{ color: config.color }} className="shrink-0 flex items-center">
          {config.icon}
        </span>
        <span className="text-[14px] font-medium truncate flex-1">{item.name}</span>
        {item.isActive ? (
          <span className="text-[11px] px-[8px] py-[2px] rounded-full bg-[#32d583]/10 text-[#32d583] shrink-0">
            {t('brand_context_active', 'Active')}
          </span>
        ) : (
          <span className="text-[11px] px-[8px] py-[2px] rounded-full bg-fifth text-customColor18 shrink-0">
            {t('brand_context_inactive', 'Inactive')}
          </span>
        )}
      </div>

      {/* Type + Priority row */}
      <div className="flex items-center gap-[8px]">
        <span
          className="text-[11px] px-[8px] py-[2px] rounded-full"
          style={{
            backgroundColor: `${config.color}1a`,
            color: config.color,
          }}
        >
          {TYPE_LABELS[item.type]}
        </span>
        <span className="text-[11px] text-customColor18">
          {t('brand_context_priority_label', 'Priority')}: {item.priority}
        </span>
      </div>

      {/* Content preview */}
      <div className="text-[12px] text-customColor18 line-clamp-2 break-words">
        {item.content}
      </div>

      {/* Metadata chips */}
      {(item.projectTag || item.location || item.googleDriveFolderId) && (
        <div className="flex flex-wrap gap-[8px]">
          {item.projectTag && (
            <span className="text-[11px] px-[8px] py-[2px] rounded-[4px] bg-fifth/50 text-customColor18">
              {t('brand_context_tag', 'Tag')}: {item.projectTag}
            </span>
          )}
          {item.location && (
            <span className="text-[11px] px-[8px] py-[2px] rounded-[4px] bg-fifth/50 text-customColor18">
              {t('brand_context_location_label', 'Location')}: {item.location}
            </span>
          )}
          {item.googleDriveFolderId && (
            <span className="text-[11px] px-[8px] py-[2px] rounded-[4px] flex items-center gap-[4px]" style={{ backgroundColor: 'rgba(66, 133, 244, 0.1)', color: '#4285f4' }}>
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M2 10L4.5 5.5L7.5 10.5H2.5" stroke="currentColor" strokeWidth="1" strokeLinejoin="round" />
                <path d="M4.5 5.5L7 1L10 5.5" stroke="currentColor" strokeWidth="1" strokeLinejoin="round" />
                <path d="M7.5 10.5L10 5.5H4.5" stroke="currentColor" strokeWidth="1" strokeLinejoin="round" />
              </svg>
              {t('brand_context_drive_linked', 'Drive Linked')}
            </span>
          )}
        </div>
      )}

      {/* Action footer */}
      <div className="border-t border-fifth pt-[12px] flex justify-between">
        <Button onClick={() => onEdit(item)}>
          {t('edit', 'Edit')}
        </Button>
        <Button secondary onClick={() => onDelete(item)}>
          {t('delete', 'Delete')}
        </Button>
      </div>
    </div>
  );
};

// ─── Empty State ──────────────────────────────────────────────────────────────

const EmptyState: React.FC<{ onAdd: () => void }> = ({ onAdd }) => {
  const t = useT();
  return (
    <div className="flex flex-col items-center justify-center py-[48px] gap-[16px]">
      <svg
        width="48"
        height="48"
        viewBox="0 0 48 48"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="text-fifth"
      >
        <rect
          x="10"
          y="6"
          width="28"
          height="36"
          rx="3"
          stroke="currentColor"
          strokeWidth="2"
        />
        <path
          d="M18 4H30C30 4 30 8 24 8C18 8 18 4 18 4Z"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinejoin="round"
        />
        <path d="M16 20H32" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        <path d="M16 26H32" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        <path d="M16 32H26" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      </svg>
      <div className="text-[14px] font-medium">
        {t('brand_context_empty_title', 'No brand contexts yet')}
      </div>
      <div className="text-[12px] text-customColor18">
        {t(
          'brand_context_empty_description',
          'Add brand context blocks to guide AI-generated content.'
        )}
      </div>
      <Button onClick={onAdd}>
        {t('brand_context_add', 'Add Brand Context')}
      </Button>
    </div>
  );
};

// ─── Filter Bar ───────────────────────────────────────────────────────────────

const FilterBar: React.FC<{
  search: string;
  filterType: string;
  onSearchChange: (v: string) => void;
  onFilterTypeChange: (v: string) => void;
}> = ({ search, filterType, onSearchChange, onFilterTypeChange }) => {
  const t = useT();
  return (
    <div className="flex items-center gap-[12px]">
      <div className="flex items-center bg-input border border-fifth rounded-[4px] px-[12px] py-[8px] gap-[8px] flex-1">
        <svg
          width="14"
          height="14"
          viewBox="0 0 14 14"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="text-customColor18 shrink-0"
        >
          <circle
            cx="6"
            cy="6"
            r="4.5"
            stroke="currentColor"
            strokeWidth="1.25"
          />
          <path
            d="M9.5 9.5L12.5 12.5"
            stroke="currentColor"
            strokeWidth="1.25"
            strokeLinecap="round"
          />
        </svg>
        <input
          type="text"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder={t('brand_context_search_placeholder', 'Search by name or content...')}
          className="bg-transparent outline-none text-[14px] w-full"
        />
      </div>
      <select
        value={filterType}
        onChange={(e) => onFilterTypeChange(e.target.value)}
        className="bg-input border border-fifth rounded-[4px] px-[12px] py-[8px] text-[14px] outline-none"
      >
        <option value="">
          {t('brand_context_filter_all', 'All Types')}
        </option>
        {TYPE_ORDER.map((type) => (
          <option key={type} value={type}>
            {TYPE_LABELS[type]}
          </option>
        ))}
      </select>
    </div>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────

export const BrandContextSettings = () => {
  const t = useT();
  const fetch = useFetch();
  const toaster = useToaster();
  const modals = useModals();
  const { data, mutate, isLoading, error } = useBrandContexts();

  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('');

  const handleAdd = useCallback(() => {
    modals.openModal({
      title: t('brand_context_add_title', 'New Brand Context'),
      withCloseButton: true,
      children: <BrandContextFormModal reload={mutate} />,
    });
  }, [modals, mutate, t]);

  const handleEdit = useCallback(
    (item: BrandContext) => {
      modals.openModal({
        title: t('brand_context_edit_title', 'Edit Brand Context'),
        withCloseButton: true,
        children: <BrandContextFormModal data={item} reload={mutate} />,
      });
    },
    [modals, mutate, t]
  );

  const handleDelete = useCallback(
    async (item: BrandContext) => {
      const confirmed = await deleteDialog(
        t(
          'brand_context_delete_confirm',
          'Are you sure you want to delete "{name}"?',
          { name: item.name }
        )
      );
      if (!confirmed) return;
      try {
        const response = await fetch(`/brand-context/${item.id}`, {
          method: 'DELETE',
        });
        if (!response.ok) {
          const err = await response.json().catch(() => ({}));
          throw new Error(
            err?.message ??
              t('brand_context_delete_error', 'Failed to delete brand context')
          );
        }
        toaster.show(
          t('brand_context_deleted', 'Brand context deleted'),
          'success'
        );
        await mutate();
      } catch (err: any) {
        toaster.show(
          err?.message ??
            t('brand_context_delete_error', 'Failed to delete brand context'),
          'warning'
        );
      }
    },
    [fetch, mutate, toaster, t]
  );

  const items: BrandContext[] = Array.isArray(data) ? data : [];

  const filteredItems = items.filter((item) => {
    const matchesSearch =
      !search ||
      item.name.toLowerCase().includes(search.toLowerCase()) ||
      item.content.toLowerCase().includes(search.toLowerCase());
    const matchesType = !filterType || item.type === filterType;
    return matchesSearch && matchesType;
  });

  const grouped = TYPE_ORDER.reduce<Record<BrandContextType, BrandContext[]>>(
    (acc, type) => {
      acc[type] = filteredItems.filter((i) => i.type === type);
      return acc;
    },
    { project: [], company: [], voice: [], compliance: [] }
  );

  const hasItems = items.length > 0;
  const hasFilteredItems = filteredItems.length > 0;

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
            {t(
              'brand_context_load_error',
              'Failed to load brand contexts. Please try refreshing the page.'
            )}
          </div>
        )}

        {!isLoading && !error && !hasItems && (
          <EmptyState onAdd={handleAdd} />
        )}

        {!isLoading && !error && hasItems && (
          <>
            <FilterBar
              search={search}
              filterType={filterType}
              onSearchChange={setSearch}
              onFilterTypeChange={setFilterType}
            />

            {!hasFilteredItems && (
              <div className="text-[12px] text-customColor18 text-center py-[24px]">
                {t(
                  'brand_context_no_results',
                  'No brand contexts match your search.'
                )}
              </div>
            )}

            {hasFilteredItems && (
              <div className="flex flex-col gap-[24px]">
                {TYPE_ORDER.map((type) => {
                  const group = grouped[type];
                  if (group.length === 0) return null;
                  const config = TYPE_CONFIG[type];
                  return (
                    <div key={type} className="flex flex-col gap-[12px]">
                      <div className="flex items-center gap-[8px] border-b border-fifth pb-[8px]">
                        <span
                          style={{ color: config.color }}
                          className="flex items-center"
                        >
                          {config.icon}
                        </span>
                        <span className="text-[14px] font-medium">
                          {TYPE_LABELS[type]}
                        </span>
                        <span className="text-[11px] px-[6px] py-[1px] rounded-full bg-fifth text-customColor18">
                          {group.length}
                        </span>
                      </div>
                      <div className="grid grid-cols-1 gap-[12px]">
                        {group.map((item) => (
                          <BrandContextCard
                            key={item.id}
                            item={item}
                            onEdit={handleEdit}
                            onDelete={handleDelete}
                          />
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            <div>
              <Button onClick={handleAdd}>
                {t('brand_context_add', 'Add Brand Context')}
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default BrandContextSettings;
