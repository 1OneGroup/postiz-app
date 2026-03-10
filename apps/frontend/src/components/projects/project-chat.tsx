'use client';

import React, { FC, useCallback, useEffect, useMemo } from 'react';
import { CopilotChat, CopilotKitCSSProperties } from '@copilotkit/react-ui';
import { CopilotKit, useCopilotMessagesContext } from '@copilotkit/react-core';
import { useVariables } from '@gitroom/react/helpers/variable.context';
import { useParams, useRouter } from 'next/navigation';
import { useFetch } from '@gitroom/helpers/utils/custom.fetch';
import useSWR from 'swr';
import { TextMessage } from '@copilotkit/runtime-client-gql';
import Link from 'next/link';
import clsx from 'clsx';
import { useT } from '@gitroom/react/translation/get.transation.service.client';

const useProjectThreads = (projectId: string) => {
  const fetch = useFetch();
  const load = useCallback(async () => {
    return (await fetch(`/projects/${projectId}/agent/threads`)).json();
  }, [projectId]);
  return useSWR(`project-threads-${projectId}`, load);
};

export const ProjectChat: FC = () => {
  const { backendUrl } = useVariables();
  const { projectId, threadId } = useParams<{
    projectId: string;
    threadId: string;
  }>();
  const t = useT();

  return (
    <CopilotKit
      {...(threadId === 'new' ? {} : { threadId })}
      credentials="include"
      runtimeUrl={backendUrl + `/projects/${projectId}/agent`}
      showDevConsole={false}
      agent="projectAgent"
    >
      <LoadMessages projectId={projectId} threadId={threadId} />
      <div className="flex flex-1 h-full">
        <div
          style={
            {
              '--copilot-kit-primary-color': 'var(--new-btn-text)',
              '--copilot-kit-background-color': 'var(--new-bg-color)',
            } as CopilotKitCSSProperties
          }
          className="trz agent bg-newBgColorInner flex flex-col gap-[15px] transition-all flex-1 items-center relative"
        >
          <div className="absolute left-0 w-full h-full pb-[20px]">
            <CopilotChat
              className="w-full h-full"
              labels={{
                title: t('project_agent', 'Project Agent'),
                initial: t(
                  'project_agent_welcome',
                  `Hello! I'm your project content strategist.

I can help you:
- Brainstorm post ideas for different platforms
- Create sample draft posts with suggested dates
- Develop a content strategy for your project

What would you like to create?`
                ),
              }}
            />
          </div>
        </div>
        <ProjectThreadsSidebar projectId={projectId} threadId={threadId} />
      </div>
    </CopilotKit>
  );
};

const LoadMessages: FC<{ projectId: string; threadId: string }> = ({
  projectId,
  threadId,
}) => {
  const { setMessages } = useCopilotMessagesContext();
  const fetch = useFetch();

  const loadMessages = useCallback(
    async (idToSet: string) => {
      const data = await (
        await fetch(
          `/projects/${projectId}/agent/threads/${idToSet}/list`
        )
      ).json();
      setMessages(
        data.uiMessages.map((p: any) => {
          return new TextMessage({
            content: p.content,
            role: p.role,
          });
        })
      );
    },
    [projectId]
  );

  useEffect(() => {
    if (threadId === 'new') {
      setMessages([]);
      return;
    }
    loadMessages(threadId);
  }, [threadId]);

  return null;
};

const ProjectThreadsSidebar: FC<{
  projectId: string;
  threadId: string;
}> = ({ projectId, threadId }) => {
  const { data } = useProjectThreads(projectId);
  const t = useT();

  return (
    <div className="trz bg-newBgColorInner flex flex-col gap-[15px] transition-all relative w-[260px]">
      <div className="absolute top-0 start-0 w-full h-full p-[20px] overflow-auto scrollbar scrollbar-thumb-fifth scrollbar-track-newBgColor">
        <div className="mb-[15px] flex flex-col gap-[10px]">
          <Link
            href={`/projects/${projectId}`}
            className="text-newTextColor/60 hover:text-newTextColor text-[13px] flex items-center gap-[6px] transition-colors"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="14"
              height="14"
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
            {t('back_to_project', 'Back to project')}
          </Link>
          <Link
            href={`/projects/${projectId}/chat/new`}
            className="text-white whitespace-nowrap flex-1 pt-[12px] pb-[14px] ps-[16px] pe-[20px] min-h-[44px] max-h-[44px] rounded-md bg-btnPrimary flex justify-center items-center gap-[5px] outline-none"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="21"
              height="20"
              viewBox="0 0 21 20"
              fill="none"
              className="min-w-[21px] min-h-[20px]"
            >
              <path
                d="M10.5001 4.16699V15.8337M4.66675 10.0003H16.3334"
                stroke="white"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <div className="flex-1 text-start text-[16px]">
              {t('new_chat', 'New chat')}
            </div>
          </Link>
        </div>
        <div className="flex flex-col gap-[1px]">
          {data?.threads?.map((p: any) => (
            <Link
              className={clsx(
                'overflow-ellipsis overflow-hidden whitespace-nowrap hover:bg-newBgColor px-[10px] py-[6px] rounded-[10px] cursor-pointer',
                p.id === threadId && 'bg-newBgColor'
              )}
              href={`/projects/${projectId}/chat/${p.id}`}
              key={p.id}
            >
              {p.title}
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
};
