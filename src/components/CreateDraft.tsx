type Props = { schemaKey: string; uiSchema?: Record<string, unknown>; initialFormData?: unknown; onCreated?: (id: string) => void };

export default function CreateDraft({ schemaKey }: Props) {
  return (
    <div className="content-padding">
      <h3>Create {schemaKey}</h3>
      <div>
        <strong>Creation UI disabled</strong>
        <div className="mt-sm">CreateDraft is disabled during the MaterialBlueprint migration.</div>
      </div>
    </div>
  );
}
