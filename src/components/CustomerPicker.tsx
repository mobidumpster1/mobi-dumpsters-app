"use client";

import { useState } from "react";
import { Field, inputClass } from "@/components/Field";
import { quickAddCustomer } from "@/app/(internal)/customers/actions";
import { LEAD_SOURCE_LABELS } from "@/lib/leadSource";

type CustomerOption = { id: string; name: string };

// A customer <select> for forms that need to pick a customer, with a
// "+ New Customer" toggle that adds one inline (name/phone/email/address)
// without leaving the page — for staff booking a job for someone who isn't
// in the system yet.
export function CustomerPicker({
  customers,
  initialSelectedId,
}: {
  customers: CustomerOption[];
  initialSelectedId?: string;
}) {
  const [options, setOptions] = useState(customers);
  const [selectedId, setSelectedId] = useState(
    initialSelectedId ?? customers[0]?.id ?? ""
  );
  const [showAddForm, setShowAddForm] = useState(false);
  const [newName, setNewName] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newAddress, setNewAddress] = useState("");
  const [newLeadSource, setNewLeadSource] = useState("");
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleAdd() {
    if (!newName.trim()) {
      setError("Name is required");
      return;
    }
    setAdding(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.set("name", newName);
      formData.set("phone", newPhone);
      formData.set("email", newEmail);
      formData.set("address", newAddress);
      formData.set("leadSource", newLeadSource);
      const customer = await quickAddCustomer(formData);
      setOptions((prev) => [...prev, customer].sort((a, b) => a.name.localeCompare(b.name)));
      setSelectedId(customer.id);
      setShowAddForm(false);
      setNewName("");
      setNewPhone("");
      setNewEmail("");
      setNewAddress("");
      setNewLeadSource("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't add that customer");
    } finally {
      setAdding(false);
    }
  }

  return (
    <Field label="Customer" htmlFor="customerId">
      <div className="flex flex-col gap-2">
        <div className="flex gap-2">
          <select
            id="customerId"
            name="customerId"
            required={!showAddForm}
            disabled={showAddForm}
            className={`${inputClass} disabled:bg-zinc-100 disabled:text-zinc-400`}
            value={selectedId}
            onChange={(e) => setSelectedId(e.target.value)}
          >
            {options.length === 0 && <option value="">No customers yet</option>}
            {options.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => setShowAddForm((v) => !v)}
            className="flex-shrink-0 rounded-xl border border-zinc-300 px-4 py-2 text-sm font-semibold text-zinc-700 transition-colors hover:bg-zinc-50"
          >
            {showAddForm ? "Use Existing" : "+ New Customer"}
          </button>
        </div>

        {showAddForm && (
          <div className="flex flex-col gap-2 rounded-xl border border-zinc-200 bg-zinc-50 p-3">
            <p className="text-xs text-zinc-500">
              The existing-customer dropdown above is turned off while adding someone new —
              this new customer is who the booking will be for.
            </p>
            <input
              name="newCustomerName"
              placeholder="Name"
              required={showAddForm}
              className={inputClass}
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
            />
            <input
              name="newCustomerPhone"
              placeholder="Phone"
              type="tel"
              className={inputClass}
              value={newPhone}
              onChange={(e) => setNewPhone(e.target.value)}
            />
            <input
              name="newCustomerEmail"
              placeholder="Email"
              type="email"
              className={inputClass}
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
            />
            <input
              name="newCustomerAddress"
              placeholder="Address"
              className={inputClass}
              value={newAddress}
              onChange={(e) => setNewAddress(e.target.value)}
            />
            <select
              name="newCustomerLeadSource"
              className={inputClass}
              value={newLeadSource}
              onChange={(e) => setNewLeadSource(e.target.value)}
            >
              <option value="">How did they find us? (optional)</option>
              {Object.entries(LEAD_SOURCE_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <p className="text-xs text-zinc-500">
              This customer is created automatically when you submit the form below — no
              extra step needed. Only click below if you want to add them without
              submitting yet.
            </p>
            <button
              type="button"
              onClick={handleAdd}
              disabled={adding}
              className="self-start rounded-lg border border-zinc-300 px-4 py-2 text-sm font-semibold text-zinc-700 transition-colors hover:bg-zinc-50 disabled:opacity-60"
            >
              {adding ? "Adding…" : "Add Customer Now (optional)"}
            </button>
          </div>
        )}
      </div>
    </Field>
  );
}
