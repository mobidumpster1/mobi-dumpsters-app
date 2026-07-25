import { formatDate } from "@/lib/date";
import {
  DEMOLITION_OVERAGE_AUTHORIZATION,
  DEMOLITION_TERMS_SECTIONS,
  DEMOLITION_LIABILITY_WAIVER_INTRO,
  DEMOLITION_LIABILITY_WAIVER_ITEMS,
  DEMOLITION_GOVERNING_LAW_SECTIONS,
  DEMOLITION_SIGNATURE_ACKNOWLEDGEMENT,
  DEMOLITION_SIGNATURE_CONFIRMATION,
} from "@/lib/demolitionAgreementText";

export type DemolitionAgreementDocumentData = {
  structureDescription: string;
  propertyAddress: string;
  dimensions: string | null;
  foundationRemovalIncluded: boolean;
  quotedPrice: number;
  depositDue: number | null;
  balanceDue: number | null;
  staffSignerName: string;
  staffSignedAt: Date;
  status: string;
  customerName: string | null;
  serviceDate: Date | null;
  serviceAddress: string | null;
  signedAt: Date | null;
};

// The full Demolition Service Agreement & Liability Waiver — Section 1
// (project/pricing, filled by staff) rendered from real data, Sections
// 2-4 (static legal text) rendered from src/lib/demolitionAgreementText.ts,
// and Section 5 (customer info + signatures) shown filled-in once signed
// or blank beforehand. Shared between the internal detail page's
// Print/Save PDF view and the public signing page, so both always show
// the exact same document.
export function DemolitionAgreementDocument({
  businessName,
  data,
}: {
  businessName: string;
  data: DemolitionAgreementDocumentData;
}) {
  const signed = data.status === "signed";

  return (
    <div className="text-sm leading-relaxed text-zinc-700">
      <h2 className="text-lg font-black text-ink">1. Project &amp; Pricing</h2>
      <p className="mt-2 text-zinc-600">
        This Agreement covers structural demolition performed by Mobi Dumpsters LLC,
        including associated debris hauling and disposal.
      </p>
      <dl className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
        <div>
          <dt className="font-semibold text-ink">Structure(s) to be demolished</dt>
          <dd>{data.structureDescription}</dd>
        </div>
        <div>
          <dt className="font-semibold text-ink">Property address / job site</dt>
          <dd>{data.propertyAddress}</dd>
        </div>
        <div>
          <dt className="font-semibold text-ink">Approximate dimensions (L x W x H)</dt>
          <dd>{data.dimensions || "—"}</dd>
        </div>
        <div>
          <dt className="font-semibold text-ink">
            Foundation, slab, or driveway removal included?
          </dt>
          <dd>{data.foundationRemovalIncluded ? "Yes" : "No"}</dd>
        </div>
        <div>
          <dt className="font-semibold text-ink">Quoted price</dt>
          <dd>${data.quotedPrice.toFixed(2)}</dd>
        </div>
        <div>
          <dt className="font-semibold text-ink">Deposit due to schedule</dt>
          <dd>{data.depositDue != null ? `$${data.depositDue.toFixed(2)}` : "—"}</dd>
        </div>
        <div>
          <dt className="font-semibold text-ink">Balance due at completion</dt>
          <dd>{data.balanceDue != null ? `$${data.balanceDue.toFixed(2)}` : "—"}</dd>
        </div>
      </dl>
      <p className="mt-3">{DEMOLITION_OVERAGE_AUTHORIZATION}</p>

      <h2 className="mt-6 text-lg font-black text-ink">2. Terms &amp; Conditions</h2>
      <div className="mt-2 flex flex-col gap-3">
        {DEMOLITION_TERMS_SECTIONS.map((section) => (
          <div key={section.heading}>
            <h3 className="font-semibold text-ink">{section.heading}</h3>
            {section.paragraphs.map((p, i) => (
              <p key={i} className="mt-1">
                {p}
              </p>
            ))}
          </div>
        ))}
      </div>

      <h2 className="mt-6 text-lg font-black text-ink">3. Liability Waiver</h2>
      <p className="mt-2 font-semibold text-ink">{DEMOLITION_LIABILITY_WAIVER_INTRO}</p>
      <ul className="mt-2 list-disc pl-5">
        {DEMOLITION_LIABILITY_WAIVER_ITEMS.map((item) => (
          <li key={item} className="mt-1">
            {item}
          </li>
        ))}
      </ul>

      <h2 className="mt-6 text-lg font-black text-ink">4. Governing Law &amp; General Provisions</h2>
      <div className="mt-2 flex flex-col gap-3">
        {DEMOLITION_GOVERNING_LAW_SECTIONS.map((section) => (
          <div key={section.heading}>
            <h3 className="font-semibold text-ink">{section.heading}</h3>
            {section.paragraphs.map((p, i) => (
              <p key={i} className="mt-1">
                {p}
              </p>
            ))}
          </div>
        ))}
      </div>

      <h2 className="mt-6 text-lg font-black text-ink">5. Customer Information &amp; Signature</h2>
      <dl className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
        <div>
          <dt className="font-semibold text-ink">Full name</dt>
          <dd>{data.customerName || "—"}</dd>
        </div>
        <div>
          <dt className="font-semibold text-ink">Service date</dt>
          <dd>{data.serviceDate ? formatDate(data.serviceDate) : "—"}</dd>
        </div>
        <div>
          <dt className="font-semibold text-ink">Service address</dt>
          <dd>{data.serviceAddress || "—"}</dd>
        </div>
      </dl>
      <p className="mt-3">{DEMOLITION_SIGNATURE_ACKNOWLEDGEMENT}</p>
      <p className="mt-3">
        Customer Signature: {signed ? `${data.customerName} (signed electronically)` : "— pending —"}
        {signed && data.signedAt && <>, {formatDate(data.signedAt)}</>}
      </p>
      <p className="mt-1">
        {businessName} Authorized Signature: {data.staffSignerName}, {formatDate(data.staffSignedAt)}
      </p>
      {signed && <p className="mt-3 text-xs text-zinc-500">{DEMOLITION_SIGNATURE_CONFIRMATION}</p>}
    </div>
  );
}
