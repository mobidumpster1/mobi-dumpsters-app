"use client";

import { useState } from "react";
import { Field, inputClass } from "@/components/Field";
import { quickAddCustomer } from "@/app/(internal)/customers/actions";

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
      const customer = await quickAddCustomer(formData);
      setOptions((prev) => [...prev, customer].sort((a, b) => a.name.localeCompare(b.name)));
      setSelectedId(customer.id);
      setShowAddForm(false);
      setNewName("");
      setNewPhone("");
      setNewEmail("");
      setNewAddress("");
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
            required
            className={inputClass}
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
            {showAddForm ? "Cancel" : "+ New Customer"}
          </button>
        </div>

        {showAddForm && (
          <div className="flex flex-col gap-2 rounded-xl border border-zinc-200 bg-zinc-50 p-3">
            <input
              placeholder="Name"
              className={inputClass}
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
            />
            <input
              placeholder="Phone"
              type="tel"
              className={inputClass}
              value={newPhone}
              onChange={(e) => setNewPhone(e.target.value)}
            />
            <input
              placeholder="Email"
              type="email"
              className={inputClass}
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
            />
            <input
              placeholder="Address"
              className={inputClass}
              value={newAddress}
              onChange={(e) => setNewAddress(e.target.value)}
            />
            {error && <p className="text-sm text-red-600">{error}</p>}
            <button
              type="button"
              onClick={handleAdd}
              disabled={adding}
              className="self-start rounded-xl bg-brand px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-brand-dark disabled:opacity-60"
            >
              {adding ? "Adding…" : "Add Customer"}
            </button>
          </div>
        )}
      </div>
    </Field>
  );
}
