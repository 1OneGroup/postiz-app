'use client';
import React, { FC, useCallback, useState } from 'react';
import { useFetch } from '@gitroom/helpers/utils/custom.fetch';
import useSWR from 'swr';
import { useToaster } from '@gitroom/react/toaster/toaster';
import { useT } from '@gitroom/react/translation/get.transation.service.client';
import { Button } from '@gitroom/react/form/button';
import { deleteDialog } from '@gitroom/react/helpers/delete.dialog';

type FolderType = 'project' | 'brand_assets' | 'general';

interface MediaFolder {
  id: string;
  name: string;
  type: FolderType;
  parentId?: string | null;
}

export const useMediaFolders = () => {
  const fetch = useFetch();
  const load = useCallback(async () => {
    return (await fetch('/media-folders')).json();
  }, []);
  return useSWR('media-folders', load, {
    revalidateOnFocus: false,
    revalidateOnReconnect: false,
    revalidateIfStale: false,
    revalidateOnMount: true,
  });
};

export const FolderSelector: FC<{
  selectedFolderId: string | null;
  onFolderChange: (folderId: string | null) => void;
}> = ({ selectedFolderId, onFolderChange }) => {
  const t = useT();
  const { data, isLoading } = useMediaFolders();
  const folders: MediaFolder[] = data?.folders ?? data ?? [];

  if (isLoading) {
    return (
      <div className="flex flex-row gap-[8px] flex-wrap">
        {[...new Array(4)].map((_, i) => (
          <div
            key={i}
            className="px-[12px] py-[6px] rounded-[20px] bg-newColColor animate-pulse w-[60px] h-[28px]"
          />
        ))}
      </div>
    );
  }

  return (
    <div className="flex flex-row gap-[8px] flex-wrap">
      <div
        className={`cursor-pointer px-[12px] py-[6px] rounded-[20px] text-[12px] font-[500] ${
          selectedFolderId === null
            ? 'bg-[#612BD3] text-white'
            : 'bg-newColColor text-textColor hover:bg-forth hover:text-white'
        }`}
        onClick={() => onFolderChange(null)}
      >
        {t('all', 'All')}
      </div>
      {folders.map((folder) => (
        <div
          key={folder.id}
          className={`cursor-pointer px-[12px] py-[6px] rounded-[20px] text-[12px] font-[500] ${
            selectedFolderId === folder.id
              ? 'bg-[#612BD3] text-white'
              : 'bg-newColColor text-textColor hover:bg-forth hover:text-white'
          }`}
          onClick={() => onFolderChange(folder.id)}
        >
          {folder.name}
        </div>
      ))}
    </div>
  );
};

export const FolderManager: FC = () => {
  const t = useT();
  const fetch = useFetch();
  const toaster = useToaster();
  const { data, mutate, isLoading } = useMediaFolders();
  const folders: MediaFolder[] = data?.folders ?? data ?? [];

  const [open, setOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [newType, setNewType] = useState<FolderType>('general');
  const [saving, setSaving] = useState(false);

  const toggleOpen = useCallback(() => {
    setOpen((prev) => !prev);
    setNewName('');
    setNewType('general');
  }, []);

  const createFolder = useCallback(async () => {
    if (!newName.trim()) {
      toaster.show(t('folder_name_required', 'Folder name is required'), 'warning');
      return;
    }
    setSaving(true);
    try {
      const res = await fetch('/media-folders', {
        method: 'POST',
        body: JSON.stringify({ name: newName.trim(), type: newType }),
        headers: { 'Content-Type': 'application/json' },
      });
      if (!res.ok) {
        throw new Error('Failed to create folder');
      }
      toaster.show(t('folder_created', 'Folder created'), 'success');
      setNewName('');
      setNewType('general');
      await mutate();
    } catch {
      toaster.show(t('folder_create_error', 'Failed to create folder'), 'warning');
    } finally {
      setSaving(false);
    }
  }, [newName, newType, fetch, mutate, toaster, t]);

  const deleteFolder = useCallback(
    (folder: MediaFolder) => async () => {
      const confirmed = await deleteDialog(
        t('confirm_delete_folder', 'Are you sure you want to delete this folder?')
      );
      if (!confirmed) return;
      try {
        const res = await fetch(`/media-folders/${folder.id}`, { method: 'DELETE' });
        if (!res.ok) {
          throw new Error('Failed to delete folder');
        }
        toaster.show(t('folder_deleted', 'Folder deleted'), 'success');
        await mutate();
      } catch {
        toaster.show(t('folder_delete_error', 'Failed to delete folder'), 'warning');
      }
    },
    [fetch, mutate, toaster, t]
  );

  return (
    <div className="relative">
      <button
        onClick={toggleOpen}
        className="cursor-pointer flex items-center justify-center w-[28px] h-[28px] rounded-[6px] bg-newColColor text-textColor hover:bg-forth hover:text-white transition-colors"
        title={t('manage_folders', 'Manage folders')}
      >
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="12" cy="12" r="3" />
          <path d="M19.07 4.93a10 10 0 0 1 0 14.14M4.93 4.93a10 10 0 0 0 0 14.14" />
          <path d="M12 2v2M12 20v2M2 12h2M20 12h2" />
        </svg>
      </button>

      {open && (
        <div className="absolute top-[36px] end-0 z-[200] bg-newBgColorInner border border-newBorder rounded-[12px] p-[16px] w-[280px] shadow-lg">
          <div className="text-[13px] font-[600] text-textColor mb-[12px]">
            {t('manage_folders', 'Manage Folders')}
          </div>

          <div className="flex flex-col gap-[8px] mb-[16px]">
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder={t('folder_name_placeholder', 'Folder name')}
              className="w-full px-[10px] py-[6px] text-[12px] bg-newBgColor border border-newBorder rounded-[6px] text-textColor placeholder:text-textColor/50 outline-none focus:border-[#612BD3]"
              onKeyDown={(e) => {
                if (e.key === 'Enter') createFolder();
              }}
            />
            <select
              value={newType}
              onChange={(e) => setNewType(e.target.value as FolderType)}
              className="w-full px-[10px] py-[6px] text-[12px] bg-newBgColor border border-newBorder rounded-[6px] text-textColor outline-none focus:border-[#612BD3]"
            >
              <option value="general">{t('folder_type_general', 'General')}</option>
              <option value="project">{t('folder_type_project', 'Project')}</option>
              <option value="brand_assets">{t('folder_type_brand_assets', 'Brand Assets')}</option>
            </select>
            <Button
              onClick={createFolder}
              disabled={saving || !newName.trim()}
              className="w-full justify-center text-[12px] h-[32px]"
            >
              {saving
                ? t('creating', 'Creating...')
                : t('create_folder', 'Create Folder')}
            </Button>
          </div>

          {!isLoading && folders.length > 0 && (
            <div className="flex flex-col gap-[6px] border-t border-newBorder pt-[12px]">
              <div className="text-[11px] text-textColor/60 mb-[4px]">
                {t('existing_folders', 'Existing folders')}
              </div>
              {folders.map((folder) => (
                <div
                  key={folder.id}
                  className="flex items-center justify-between gap-[8px] px-[8px] py-[4px] rounded-[6px] hover:bg-newColColor group"
                >
                  <span className="text-[12px] text-textColor truncate flex-1">
                    {folder.name}
                  </span>
                  <span className="text-[10px] text-textColor/50 shrink-0">
                    {folder.type === 'brand_assets'
                      ? t('folder_type_brand_assets', 'Brand Assets')
                      : folder.type === 'project'
                      ? t('folder_type_project', 'Project')
                      : t('folder_type_general', 'General')}
                  </span>
                  <button
                    onClick={deleteFolder(folder)}
                    className="cursor-pointer shrink-0 opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-500 transition-opacity"
                    title={t('delete_folder', 'Delete folder')}
                  >
                    <svg
                      width="12"
                      height="12"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <polyline points="3 6 5 6 21 6" />
                      <path d="M19 6l-1 14H6L5 6" />
                      <path d="M10 11v6M14 11v6" />
                      <path d="M9 6V4h6v2" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          )}

          {!isLoading && folders.length === 0 && (
            <div className="text-[12px] text-textColor/50 text-center py-[8px]">
              {t('no_folders_yet', 'No folders yet')}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default FolderSelector;
