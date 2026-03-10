'use client';

import React, { FC, useCallback, useState } from 'react';
import { useFetch } from '@gitroom/helpers/utils/custom.fetch';
import { useT } from '@gitroom/react/translation/get.transation.service.client';

const COLORS = [
  '#6366f1',
  '#ec4899',
  '#f59e0b',
  '#10b981',
  '#3b82f6',
  '#8b5cf6',
  '#ef4444',
  '#14b8a6',
];

export const ProjectCreateModal: FC<{ onCreated: () => void }> = ({
  onCreated,
}) => {
  const fetch = useFetch();
  const t = useT();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [color, setColor] = useState(COLORS[0]);
  const [loading, setLoading] = useState(false);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!name.trim()) return;
      setLoading(true);
      try {
        await fetch('/projects', {
          method: 'POST',
          body: JSON.stringify({ name: name.trim(), description, color }),
        });
        onCreated();
      } catch (err) {
        // handle error
      } finally {
        setLoading(false);
      }
    },
    [name, description, color, fetch, onCreated]
  );

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-[16px] p-[20px]">
      <div className="flex flex-col gap-[6px]">
        <label className="text-[14px] font-[500]">
          {t('project_name', 'Project Name')} *
        </label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={t('project_name_placeholder', 'e.g., The Clermont')}
          className="bg-newBgColor border border-fifth/30 rounded-[8px] px-[12px] py-[10px] text-[14px] outline-none focus:border-btnPrimary"
          autoFocus
        />
      </div>

      <div className="flex flex-col gap-[6px]">
        <label className="text-[14px] font-[500]">
          {t('description', 'Description')}
        </label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder={t(
            'project_desc_placeholder',
            'Describe your project, brand, or campaign...'
          )}
          rows={3}
          className="bg-newBgColor border border-fifth/30 rounded-[8px] px-[12px] py-[10px] text-[14px] outline-none focus:border-btnPrimary resize-none"
        />
      </div>

      <div className="flex flex-col gap-[6px]">
        <label className="text-[14px] font-[500]">
          {t('color', 'Color')}
        </label>
        <div className="flex gap-[8px]">
          {COLORS.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setColor(c)}
              className="w-[28px] h-[28px] rounded-full transition-all"
              style={{
                backgroundColor: c,
                outline: color === c ? '2px solid currentColor' : 'none',
                outlineOffset: '2px',
              }}
            />
          ))}
        </div>
      </div>

      <button
        type="submit"
        disabled={!name.trim() || loading}
        className="bg-btnPrimary text-white px-[20px] py-[10px] rounded-md mt-[8px] disabled:opacity-50"
      >
        {loading
          ? t('creating', 'Creating...')
          : t('create_project', 'Create Project')}
      </button>
    </form>
  );
};
