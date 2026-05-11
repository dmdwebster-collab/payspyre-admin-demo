import { redirect } from "next/navigation";

interface Props {
  params: Promise<{ applicationId: string }>;
}

/** Underwriting Application view default → Decision tab. */
export default async function UnderwritingApplicationIndex({ params }: Props) {
  const { applicationId } = await params;
  redirect(`/underwriting/${applicationId}/decision`);
}
