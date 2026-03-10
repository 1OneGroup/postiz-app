import { Metadata } from 'next';
import { ProjectDetail } from '@gitroom/frontend/components/projects/project-detail';

export const metadata: Metadata = {
  title: 'Postiz - Project',
  description: '',
};

export default async function Page() {
  return <ProjectDetail />;
}
