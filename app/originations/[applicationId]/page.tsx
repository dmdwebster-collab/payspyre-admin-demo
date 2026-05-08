import { redirect } from "next/navigation";

interface Props {
  params: Promise<{ applicationId: string }>;
}

/**
 * Index route inside the Loan Header redirects to the Summary tab \u2014
 * the canonical first view of an application.
 */
export default async function ApplicationIndex({ params }: Props) {
  const { applicationId } = await params;
  redirect(`/originations/${applicationId}/summary`);
}
