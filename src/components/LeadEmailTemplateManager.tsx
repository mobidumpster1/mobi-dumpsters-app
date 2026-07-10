import { Field, inputClass } from "@/components/Field";
import { ConfirmButton } from "@/components/ConfirmButton";

type Template = { id: string; name: string; subject: string; body: string };

// Manages the reusable outreach messages used by SendLeadEmailButton on
// each lead row. {{businessName}} in the subject/body gets swapped for the
// lead's actual name when a message is sent.
export function LeadEmailTemplateManager({
  templates,
  addAction,
  removeAction,
}: {
  templates: Template[];
  addAction: (formData: FormData) => Promise<void>;
  removeAction: (templateId: string) => Promise<void>;
}) {
  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
      <h2 className="text-sm font-semibold text-zinc-700">Email Templates</h2>
      <p className="mt-1 text-xs text-zinc-500">
        Write a message once, then send it to any lead in one click. Use{" "}
        <code className="rounded bg-zinc-100 px-1 py-0.5">{"{{businessName}}"}</code>{" "}
        anywhere you want the lead&rsquo;s name filled in automatically.
      </p>

      {templates.length > 0 && (
        <div className="mt-3 flex flex-col gap-2">
          {templates.map((t) => (
            <div
              key={t.id}
              className="flex items-center justify-between gap-3 rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2"
            >
              <div className="min-w-0">
                <div className="truncate text-sm font-medium text-zinc-900">{t.name}</div>
                <div className="truncate text-xs text-zinc-500">{t.subject}</div>
              </div>
              <form action={removeAction.bind(null, t.id)}>
                <ConfirmButton
                  message={`Delete the "${t.name}" template? Leads it's been sent to already keep their send history.`}
                  className="flex-shrink-0 text-xs font-semibold text-red-600 hover:underline"
                >
                  Delete
                </ConfirmButton>
              </form>
            </div>
          ))}
        </div>
      )}

      <form action={addAction} className="mt-3 flex flex-col gap-3 border-t border-zinc-100 pt-3">
        <p className="text-sm font-medium text-ink">Add a Template</p>
        <Field label="Name (for your reference)" htmlFor="templateName">
          <input
            id="templateName"
            name="name"
            required
            placeholder="e.g. Roofers - Intro"
            className={`${inputClass} py-2.5 text-sm`}
          />
        </Field>
        <Field label="Subject" htmlFor="templateSubject">
          <input
            id="templateSubject"
            name="subject"
            required
            placeholder="e.g. Reliable dumpster service for {{businessName}}"
            className={`${inputClass} py-2.5 text-sm`}
          />
        </Field>
        <Field label="Message" htmlFor="templateBody">
          <textarea
            id="templateBody"
            name="body"
            required
            rows={5}
            placeholder={`Hi {{businessName}},\n\nWe work with contractors around Byron/Macon on dumpster rentals for job sites...`}
            className={`${inputClass} text-sm`}
          />
        </Field>
        <div>
          <button
            type="submit"
            className="rounded-xl bg-brand px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-brand-dark"
          >
            + Add Template
          </button>
        </div>
      </form>
    </div>
  );
}
