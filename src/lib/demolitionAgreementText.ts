// Static legal text for the Demolition Service Agreement & Liability
// Waiver — transcribed from Mobi_Demolition_Service_Agreement.docx.
// Deliberately NOT stored in the database or editable via a plain
// textarea like the general ServiceAgreementSettings text: this is
// carefully-worded, Georgia-law-specific language (cites O.C.G.A.
// sections), and a free-text field risks an accidental edit nobody
// notices until it matters. If the wording ever needs to change, edit
// this file (and re-verify against a lawyer-reviewed copy) rather than
// exposing it as an in-app setting.

export const DEMOLITION_OVERAGE_AUTHORIZATION =
  "Overage Authorization: The quoted price above is based on an estimated debris weight and volume for the structure described. By signing this Agreement, the customer authorizes Mobi Dumpsters LLC to adjust the final price if actual debris tonnage or load count materially exceeds the estimate on which the quote was based. The customer will be notified of any such adjustment, with supporting documentation (scale ticket or dump receipt) where applicable, before additional payment is collected. This overage policy applies to demolition debris only and is separate from the overage terms in Mobi Dumpsters LLC's standard dumpster rental agreement.";

export type DemolitionAgreementSection = {
  heading: string;
  paragraphs: string[];
};

export const DEMOLITION_TERMS_SECTIONS: DemolitionAgreementSection[] = [
  {
    heading: "2.1 Payment & Deposit",
    paragraphs: [
      "Unless otherwise specified in writing at the time of booking, a deposit equal to 50% of the quoted price is due prior to scheduling and mobilization. Mobi Dumpsters LLC reserves the right to require a higher deposit percentage on any job where 50% would not reasonably cover the equipment, labor, permit, and other direct costs committed to the job before work begins. The remaining balance is due in full upon completion of the demolition and removal of debris, unless otherwise agreed in writing. All quoted prices are final based on the scope described; no hidden fees. Payment is accepted via cash, Zelle, Venmo, or card.",
    ],
  },
  {
    heading: "2.2 Lien Rights for Nonpayment",
    paragraphs: [
      "Georgia law grants contractors the right to file a lien against real property for unpaid labor, services, or materials furnished in connection with improvements to that property (O.C.G.A. § 44-14-360 et seq.). If any amount owed under this Agreement is not paid when due, Mobi Dumpsters LLC reserves the right to file a claim of lien against the property described in Section 1 and to pursue all other lawful remedies to collect amounts owed, including reasonable attorney's fees and costs of collection.",
    ],
  },
  {
    heading: "2.3 Cancellation & Rescheduling",
    paragraphs: [
      "Cancellations must be made at least 48 hours prior to the scheduled start time. Cancellations with less notice, or no-shows by the customer, may forfeit the deposit to cover machine rental and scheduling costs already committed. Mobi Dumpsters LLC may reschedule work without penalty due to weather, road conditions, or other circumstances that make safe work impossible, as determined by Mobi Dumpsters LLC.",
    ],
  },
  {
    heading: "2.4 Permits, Licensing & Legal Compliance",
    paragraphs: [
      "Customer represents that they are the owner of the property on which the demolition will occur, or are authorized to act on the owner's behalf. Unless otherwise agreed in writing, Customer is solely responsible for obtaining any demolition permit, inspection, or approval required by the applicable city or county before work begins, and for any associated fees. Where Georgia law permits a property owner to act as their own contractor for work on property they own and occupy (O.C.G.A. § 43-41-17), Customer will serve as the permit applicant of record; Mobi Dumpsters LLC is engaged to provide labor, equipment, and hauling services in connection with that permit.",
      "Mobi Dumpsters LLC does not represent itself as a licensed general contractor unless separately and expressly stated in writing. Mobi Dumpsters LLC will not begin demolition work until Customer confirms that any required permit has been obtained and is provided upon request.",
    ],
  },
  {
    heading: "2.5 Scope of Work; Foundation, Slab & Grading",
    paragraphs: [
      "Unless the corresponding field in Section 1 is marked 'Yes' or otherwise specified in writing, the quoted price covers demolition and removal of the above-ground structure only. Removal of foundations, slabs, driveways, footings, or septic infrastructure, and any site grading, backfill, or restoration of the resulting excavation, are not included unless separately quoted and agreed to in writing.",
    ],
  },
  {
    heading: "2.6 Change Orders",
    paragraphs: [
      "Any change to the scope of work described in Section 1 — including additional structures, foundation or slab removal, or expanded debris removal — must be agreed to in writing (including by text or email) and priced separately before that work begins. Mobi Dumpsters LLC is not obligated to perform, and Customer is not obligated to pay for, any work outside the scope described in Section 1 absent such written agreement.",
    ],
  },
  {
    heading: "2.7 Utility Disconnection",
    paragraphs: [
      "Customer is solely responsible for disconnecting all power, water, gas, and sewer lines serving the structure before demolition begins, and for providing confirmation of disconnection to Mobi Dumpsters LLC (such as a utility company work order or written confirmation) upon request. Mobi Dumpsters LLC will not proceed with demolition until Customer confirms all utilities have been properly disconnected. Mobi Dumpsters LLC is not liable for any damage, injury, or delay resulting from undisclosed or improperly disconnected utilities.",
    ],
  },
  {
    heading: "2.8 Septic Systems & Underground Utilities",
    paragraphs: [
      "Customer is solely responsible for identifying and disclosing, prior to the start of work, the location of any septic tank, septic lines, drain field, leach field, well, water line, sprinkler system, sewer line, gas line, or electrical conduit on the property. Customer is responsible for ensuring septic tanks and other underground systems are properly capped, marked, or protected before equipment operates near them. Mobi Dumpsters LLC is not liable for any damage to underground utilities or septic systems that were not disclosed or clearly marked by Customer before work began.",
    ],
  },
  {
    heading: "2.9 Asbestos & Hazardous Materials",
    paragraphs: [
      "Customer is responsible for disclosing any known or suspected presence of asbestos, lead paint, mold, or other hazardous materials in the structure prior to the start of work. For structures where the age or condition creates reasonable uncertainty, Mobi Dumpsters LLC may require a written asbestos inspection report from a qualified inspector before beginning demolition, at Customer's expense unless otherwise agreed. Mobi Dumpsters LLC will not demolish, disturb, or remove any material known or suspected to contain asbestos or other regulated hazardous material; if such material is discovered during the course of work, Mobi Dumpsters LLC may stop work until the material is properly assessed and, if necessary, abated by a qualified licensed abatement contractor.",
      "If abatement is required, Customer is solely responsible for arranging and paying for abatement by a licensed asbestos abatement contractor. Mobi Dumpsters LLC will resume demolition work only after receiving written clearance confirming the property is safe to proceed. Any deposit paid under this Agreement remains non-refundable to the extent it covers costs and scheduling already committed by Mobi Dumpsters LLC prior to the discovery of hazardous material, unless otherwise agreed in writing. Mobi Dumpsters LLC is not liable for delays, additional costs, or damages arising from the discovery of undisclosed hazardous materials.",
    ],
  },
  {
    heading: "2.10 Debris Removal, Disposal & Dumpster Service",
    paragraphs: [
      "The quoted price includes hauling and lawful disposal of ordinary demolition debris generated by the structure(s) described in Section 1, using Mobi Dumpsters LLC's own equipment. The following items are strictly prohibited from disposal under this Agreement: hazardous materials, chemicals, flammable liquids, asbestos-containing material, paint, tires, batteries, medical waste, or any item prohibited by local, state, or federal law. Debris weight and load count are estimated in advance; see the Overage Authorization in Section 1 for how material deviations from that estimate are handled.",
    ],
  },
  {
    heading: "2.11 Site Access & Conditions",
    paragraphs: [
      "Customer is responsible for ensuring safe and adequate access to the structure for demolition equipment, including clearing obstructions, unlocking gates, and confining pets. Customer is responsible for disclosing the location of any known property line, easement, HOA restriction, or shared structure (such as a shared wall or fence) that may affect the scope of work. Mobi Dumpsters LLC is not responsible for pre-existing damage or conditions present before work begins.",
    ],
  },
  {
    heading: "2.12 Damage",
    paragraphs: [
      "Mobi Dumpsters LLC is not liable for incidental damage to driveways, walkways, lawns, landscaping, fencing, or other surrounding surfaces or property that reasonably occurs during the delivery, use, or operation of demolition equipment in the ordinary course of the work described.",
    ],
  },
  {
    heading: "2.13 Photo & Video Documentation",
    paragraphs: [
      "Mobi Dumpsters LLC may take before, during, and after photographs or video of the property and work performed for documentation, quality control, and liability protection purposes. Mobi Dumpsters LLC may use such photographs or video for business and marketing purposes unless Customer objects in writing prior to the start of work.",
    ],
  },
  {
    heading: "2.14 Signing Authority",
    paragraphs: [
      "By signing this Agreement, the signer confirms they are at least 18 years of age. If signing on behalf of a business or other entity, the signer confirms they are authorized to bind that entity to this Agreement.",
    ],
  },
];

export const DEMOLITION_LIABILITY_WAIVER_INTRO =
  "BY SIGNING THIS AGREEMENT, THE CUSTOMER AGREES TO RELEASE, INDEMNIFY, AND HOLD HARMLESS MOBI DUMPSTERS LLC, ITS OWNERS, EMPLOYEES, AND AGENTS FROM ANY AND ALL CLAIMS, LOSSES, DAMAGES, LIABILITIES, OR EXPENSES (INCLUDING ATTORNEY FEES) ARISING OUT OF OR RELATED TO:";

export const DEMOLITION_LIABILITY_WAIVER_ITEMS: string[] = [
  "The performance of demolition, debris removal, or hauling services provided by Mobi Dumpsters LLC.",
  "Personal injury or property damage sustained during demolition or related debris removal.",
  "Damage to underground utilities, septic systems, water, sewer, gas, or electrical lines not disclosed or properly marked by Customer.",
  "Damage resulting from undisclosed or improperly disconnected utilities.",
  "The discovery of asbestos or other hazardous materials not disclosed by Customer prior to the start of work, and any resulting delay or abatement cost.",
  "Incidental surface damage to driveways, lawns, or surrounding property occurring in the ordinary course of demolition work.",
  "Any permit, licensing, or regulatory compliance matter for which Customer is responsible under Section 2.4.",
  "Any third-party claims arising from Customer's use of Mobi Dumpsters LLC's demolition services.",
];

export const DEMOLITION_GOVERNING_LAW_SECTIONS: DemolitionAgreementSection[] = [
  {
    heading: "4.1 Governing Law",
    paragraphs: [
      "This Agreement shall be governed by the laws of the State of Georgia. Any disputes shall be resolved in the appropriate courts of Crawford County, Georgia. Mobi Dumpsters LLC's standard Service Agreement & Liability Waiver continues to govern any dumpster rental, junk removal, material delivery, or trailer rental service booked separately from the demolition scope described in Section 1.",
    ],
  },
  {
    heading: "4.2 Severability",
    paragraphs: [
      "If any provision of this Agreement is found to be invalid or unenforceable by a court of competent jurisdiction, the remaining provisions shall remain in full force and effect.",
    ],
  },
  {
    heading: "4.3 Entire Agreement; Amendments",
    paragraphs: [
      "This Agreement, together with Section 1 as completed at booking, constitutes the entire agreement between the parties regarding the demolition services described and supersedes any prior discussions or representations on that subject. No amendment or modification to this Agreement shall be effective unless made in writing and signed, or otherwise agreed to in writing (including by text or email), by both parties.",
    ],
  },
];

export const DEMOLITION_SIGNATURE_ACKNOWLEDGEMENT =
  "By signing below, the customer acknowledges they have read, understand, and agree to all terms of this Demolition Service Agreement and Liability Waiver.";

export const DEMOLITION_SIGNATURE_CONFIRMATION =
  "I confirm that I have read, understand, and agree to all terms of this Demolition Service Agreement and Liability Waiver, and that my signature above is legally binding.";
