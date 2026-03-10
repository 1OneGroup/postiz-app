import { Metadata } from 'next';
import { ProjectsList } from '@gitroom/frontend/components/projects/projects-list';

export const metadata: Metadata = {
  title: 'Postiz - Projects',
  description: '',
};

export default async function Page() {
  return <ProjectsList />;
}
