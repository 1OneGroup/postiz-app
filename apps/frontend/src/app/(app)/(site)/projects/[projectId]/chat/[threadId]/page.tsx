import { Metadata } from 'next';
import { ProjectChat } from '@gitroom/frontend/components/projects/project-chat';

export const metadata: Metadata = {
  title: 'Postiz - Project Agent',
  description: '',
};

export default async function Page() {
  return <ProjectChat />;
}
