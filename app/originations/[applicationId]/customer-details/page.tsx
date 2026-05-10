import { notFound } from "next/navigation";
import { repository } from "@/lib/data/repository";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/components/ui/card";
import { formatCAD } from "@/lib/utils";

interface Props {
  params: Promise<{ applicationId: string }>;
}

function age(dobIso: string): number {
  const [y, m, d] = dobIso.split("-").map(Number);
  const dob = new Date(Date.UTC(y, m - 1, d));
  const now = new Date();
  let years = now.getUTCFullYear() - dob.getUTCFullYear();
  const mDelta = now.getUTCMonth() - dob.getUTCMonth();
  if (mDelta < 0 || (mDelta === 0 && now.getUTCDate() < dob.getUTCDate())) {
    years--;
  }
  return years;
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="text-sm font-medium">{value || "—"}</dd>
    </div>
  );
}

export default async function CustomerDetailsTab({ params }: Props) {
  const { applicationId } = await params;
  const application = await repository.getApplication(applicationId);
  if (!application) notFound();

  const { primary } = await repository.getBorrowersForApplication(application.id);
  if (!primary) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Customer details</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Primary borrower record not found.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Identity</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <Field
              label="Full name"
              value={`${primary.first_name} ${primary.last_name}`}
            />
            <Field label="DOB" value={primary.date_of_birth} />
            <Field label="Age" value={age(primary.date_of_birth)} />
            <Field
              label="ID"
              value={
                primary.id_type
                  ? `${primary.id_type} (${primary.id_province ?? "—"})`
                  : "—"
              }
            />
            <Field label="Email" value={primary.email} />
            <Field label="Phone" value={primary.phone} />
          </dl>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Address</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <Field label="Street" value={primary.address_line1} />
            <Field label="City" value={primary.city} />
            <Field label="Province" value={primary.province} />
            <Field label="Postal code" value={primary.postal_code} />
            <Field label="Country" value={primary.country} />
            <Field
              label="Residence"
              value={
                primary.residence_type
                  ? `${primary.residence_type} · ${primary.years_at_address ?? 0}y`
                  : "—"
              }
            />
            <Field
              label="Monthly housing cost"
              value={
                primary.monthly_housing_cost != null
                  ? formatCAD(primary.monthly_housing_cost)
                  : "—"
              }
            />
          </dl>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Employment & income</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <Field label="Employer" value={primary.employer_name} />
            <Field label="Occupation" value={primary.occupation} />
            <Field label="Employment type" value={primary.employment_type} />
            <Field
              label="Years employed"
              value={
                primary.years_employed != null
                  ? `${primary.years_employed}y`
                  : "—"
              }
            />
            <Field
              label="Gross monthly income"
              value={
                primary.gross_monthly_income != null
                  ? formatCAD(primary.gross_monthly_income)
                  : "—"
              }
            />
            <Field label="Income source" value={primary.income_source} />
          </dl>
        </CardContent>
      </Card>
    </div>
  );
}
