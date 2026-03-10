'use client';

import React, { FC, useCallback } from 'react';
import useSWR from 'swr';
import { useFetch } from '@gitroom/helpers/utils/custom.fetch';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ProjectPostCard,
  ProjectPostData,
} from '@gitroom/frontend/components/projects/project-post-card';
import { useT } from '@gitroom/react/translation/get.transation.service.client';

interface Project {
  id: string;
  name: string;
  description: string | null;
  color: string | null;
}

const useProject = (projectId: string) => {
  const fetch = useFetch();
  const load = useCallback(async () => {
    return (await fetch(`/projects/${projectId}`)).json();
  }, [projectId]);
  return useSWR<Project>(`project-${projectId}`, load, {
    revalidateOnFocus: false,
  });
};

const useProjectPosts = (projectId: string) => {
  const fetch = useFetch();
  const load = useCallback(async () => {
    return (await fetch(`/projects/${projectId}/posts`)).json();
  }, [projectId]);
  return useSWR<ProjectPostData[]>(`project-posts-${projectId}`, load, {
    revalidateOnFocus: false,
  });
};

export const ProjectDetail: FC = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const router = useRouter();
  const { data: project } = useProject(projectId);
  const { data: posts, mutate: mutatePosts } = useProjectPosts(projectId);
  const fetch = useFetch();
  const t = useT();

  const handleDelete = useCallback(async () => {
    if (!confirm(t('delete_project_confirm', 'Are you sure you want to delete this project?'))) {
      return;
    }
    await fetch(`/projects/${projectId}`, { method: 'DELETE' });
    router.push('/projects');
  }, [fetch, projectId, router]);

  if (!project) {
    return (
      <div className="p-[24px] flex items-center justify-center flex-1">
        <div className="text-newTextColor/40">
          {t('loading', 'Loading...')}
        </div>
      </div>
    );
  }

  return (
    <div className="p-[24px] flex flex-col gap-[24px] flex-1">
      {/* Header */}
      <div className="flex items-center gap-[16px]">
        <Link
          href="/projects"
          className="text-newTextColor/40 hover:text-newTextColor transition-colors"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
          >
            <path
              d="M19 12H5M12 19L5 12L12 5"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </Link>
        <div
          className="w-[14px] h-[14px] rounded-full"
          style={{ backgroundColor: project.color || '#6366f1' }}
        />
        <h1 className="text-[24px] font-[600] flex-1">{project.name}</h1>
        <Link
          href={`/projects/${projectId}/chat/new`}
          className="bg-btnPrimary text-white px-[16px] py-[8px] rounded-md flex items-center gap-[8px] text-[14px]"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
          >
            <path
              d="M21 15C21 15.5304 20.7893 16.0391 20.4142 16.4142C20.0391 16.7893 19.5304 17 19 17H7L3 21V5C3 4.46957 3.21071 3.96086 3.58579 3.58579C3.96086 3.21071 4.46957 3 5 3H19C19.5304 3 20.0391 3.21071 20.4142 3.58579C20.7893 3.96086 21 4.46957 21 5V15Z"
              stroke="white"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          {t('chat_with_agent', 'Chat with Agent')}
        </Link>
        <button
          onClick={handleDelete}
          className="text-red-400 hover:bg-red-500/20 px-[12px] py-[8px] rounded-md transition-colors text-[14px]"
        >
          {t('delete', 'Delete')}
        </button>
      </div>

      {project.description && (
        <p className="text-[14px] text-newTextColor/60">
          {project.description}
        </p>
      )}

      {/* Posts Section */}
      <div className="flex items-center justify-between">
        <h2 className="text-[18px] font-[500]">
          {t('sample_posts', 'Sample Posts')}
        </h2>
        <span className="text-[13px] text-newTextColor/40">
          {posts?.length || 0} {t('posts', 'posts')}
        </span>
      </div>

      {(!posts || posts.length === 0) && (
        <div className="flex flex-col items-center justify-center flex-1 gap-[12px] text-newTextColor/50 py-[40px]">
          <p className="text-[16px]">
            {t('no_sample_posts', 'No sample posts yet')}
          </p>
          <p className="text-[14px]">
            {t(
              'chat_to_create_posts',
              'Chat with the AI agent to brainstorm and create post ideas'
            )}
          </p>
          <Link
            href={`/projects/${projectId}/chat/new`}
            className="bg-btnPrimary text-white px-[20px] py-[10px] rounded-md mt-[8px]"
          >
            {t('start_chatting', 'Start chatting')}
          </Link>
        </div>
      )}

      {posts && posts.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-[12px]">
          {posts.map((post) => (
            <ProjectPostCard
              key={post.id}
              post={post}
              projectId={projectId}
              onMutate={mutatePosts}
            />
          ))}
        </div>
      )}
    </div>
  );
};
