import { redirect } from "next/navigation";

interface Props {
  params: Promise<{ loanId: string }>;
}

/** Servicing Loan view default → Schedule tab. */
export default async function ServicingLoanIndex({ params }: Props) {
  const { loanId } = await params;
  redirect(`/servicing/${loanId}/schedule`);
}
