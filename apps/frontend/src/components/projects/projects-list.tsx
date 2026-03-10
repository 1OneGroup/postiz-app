'use client';

import React, { FC, useCallback, useState } from 'react';
import useSWR from 'swr';
import { useFetch } from '@gitroom/helpers/utils/custom.fetch';
import { useModals } from '@gitroom/frontend/components/layout/new-modal';
import { ProjectCreateModal } from '@gitroom/frontend/components/projects/project-create-modal';
import Link from 'next/link';
import { useT } from '@gitroom/react/translation/get.transation.service.client';

interface Project {
  id: string;
  name: string;
  description: string | null;
  color: string | null;
  createdAt: string;
  _count: { posts: number };
}

const useProjects = () => {
  const fetch = useFetch();
  const load = useCallback(async () => {
    return (await fetch('/projects')).json();
  }, []);
  return useSWR<Project[]>('projects', load, {
    revalidateOnFocus: false,
    revalidateIfStale: false,
  });
};

export const ProjectsList: FC = () => {
  const { data: projects, mutate } = useProjects();
  const modals = useModals();
  const t = useT();

  const openCreateModal = useCallback(() => {
    modals.openModal({
      title: t('create_project', 'Create Project'),
      withCloseButton: true,
      classNames: {
        modal: 'w-[100%] max-w-[500px] text-textColor',
      },
      children: (
        <ProjectCreateModal
          onCreated={() => {
            mutate();
            modals.closeAll();
          }}
        />
      ),
    });
  }, [modals, mutate]);

  return (
    <div className="p-[24px] flex flex-col gap-[24px] flex-1">
      <div className="flex items-center justify-between">
        <h1 className="text-[24px] font-[600]">
          {t('projects', 'Projects')}
        </h1>
        <button
          onClick={openCreateModal}
          className="bg-btnPrimary text-white px-[20px] py-[10px] rounded-md flex items-center gap-[8px]"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
          >
            <path
              d="M12 5V19M5 12H19"
              stroke="white"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          {t('new_project', 'New Project')}
        </button>
      </div>

      {(!projects || projects.length === 0) && (
        <div className="flex flex-col items-center justify-center flex-1 gap-[16px] text-newTextColor/50">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="64"
            height="64"
            viewBox="0 0 24 24"
            fill="none"
          >
            <path
              d="M22 19C22 19.5304 21.7893 20.0391 21.4142 20.4142C21.0391 20.7893 20.5304 21 20 21H4C3.46957 21 2.96086 20.7893 2.58579 20.4142C2.21071 20.0391 2 19.5304 2 19V5C2 4.46957 2.21071 3.96086 2.58579 3.58579C2.96086 3.21071 3.46957 3 4 3H9L11 6H20C20.5304 6 21.0391 6.21071 21.4142 6.58579C21.7893 6.96086 22 7.46957 22 8V19Z"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <p className="text-[16px]">
            {t('no_projects_yet', 'No projects yet')}
          </p>
          <p className="text-[14px]">
            {t(
              'create_project_desc',
              'Create a project to start brainstorming content with the AI agent'
            )}
          </p>
          <button
            onClick={openCreateModal}
            className="bg-btnPrimary text-white px-[20px] py-[10px] rounded-md mt-[8px]"
          >
            {t('create_first_project', 'Create your first project')}
          </button>
        </div>
      )}

      {projects && projects.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-[16px]">
          {projects.map((project) => (
            <Link
              key={project.id}
              href={`/projects/${project.id}`}
              className="bg-newBgColorInner rounded-[12px] p-[20px] hover:bg-boxHover transition-all cursor-pointer border border-fifth/20 flex flex-col gap-[12px]"
            >
              <div className="flex items-center gap-[10px]">
                <div
                  className="w-[12px] h-[12px] rounded-full"
                  style={{
                    backgroundColor: project.color || '#6366f1',
                  }}
                />
                <h3 className="text-[18px] font-[500] flex-1">
                  {project.name}
                </h3>
              </div>
              {project.description && (
                <p className="text-[14px] text-newTextColor/60 line-clamp-2">
                  {project.description}
                </p>
              )}
              <div className="flex items-center gap-[8px] text-[13px] text-newTextColor/40 mt-auto">
                <span>
                  {project._count.posts}{' '}
                  {project._count.posts === 1
                    ? t('post', 'post')
                    : t('posts', 'posts')}
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
};
