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

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="text-sm font-medium">{value || "—"}</dd>
    </div>
  );
}

export default async function CoBorrowerTab({ params }: Props) {
  const { applicationId } = await params;
  const application = await repository.getApplication(applicationId);
  if (!application) notFound();

  const { co } = await repository.getBorrowersForApplication(application.id);

  if (!co) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Co-borrower</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          No co-borrower on this application. A co-borrower can be added via
          the available actions panel on the Summary tab.
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
              value={`${co.first_name} ${co.last_name}`}
            />
            <Field label="DOB" value={co.date_of_birth} />
            <Field
              label="ID"
              value={
                co.id_type ? `${co.id_type} (${co.id_province ?? "—"})` : "—"
              }
            />
            <Field label="Email" value={co.email} />
            <Field label="Phone" value={co.phone} />
          </dl>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Address</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <Field label="Street" value={co.address_line1} />
            <Field label="City" value={co.city} />
            <Field label="Province" value={co.province} />
            <Field label="Postal code" value={co.postal_code} />
            <Field
              label="Residence"
              value={
                co.residence_type
                  ? `${co.residence_type} · ${co.years_at_address ?? 0}y`
                  : "—"
              }
            />
            <Field
              label="Monthly housing cost"
              value={
                co.monthly_housing_cost != null
                  ? formatCAD(co.monthly_housing_cost)
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
            <Field label="Employer" value={co.employer_name} />
            <Field label="Occupation" value={co.occupation} />
            <Field label="Employment type" value={co.employment_type} />
            <Field
              label="Years employed"
              value={co.years_employed != null ? `${co.years_employed}y` : "—"}
            />
            <Field
              label="Gross monthly income"
              value={
                co.gross_monthly_income != null
                  ? formatCAD(co.gross_monthly_income)
                  : "—"
              }
            />
            <Field label="Income source" value={co.income_source} />
          </dl>
        </CardContent>
      </Card>
    </div>
  );
}
