import { redirect } from 'next/navigation';

export default async function Page({
  params,
}: {
  params: { projectId: string };
}) {
  return redirect(`/projects/${params.projectId}/chat/new`);
}
