'use server';

import { revalidatePath } from 'next/cache';
import {
  zetDemoVergunningStatus,
  type VergunningStatus,
} from '@/lib/db/vergunningen-store';
import { bepaalStartgereedheid, type StartgereedheidResultaat } from '@/lib/services/startgereedheid';

export async function zetVergunningStatusAction(
  projectId: string,
  vergunningId: string,
  status: VergunningStatus,
): Promise<StartgereedheidResultaat> {
  zetDemoVergunningStatus(projectId, vergunningId, status);
  revalidatePath(`/project/${projectId}`);
  revalidatePath(`/project/${projectId}/startbesluit`);
  return bepaalStartgereedheid(projectId);
}
