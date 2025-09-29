type Props = { setupId: string; schemaKey: string; draftId?: string };

export default function FormRenderer(_props: Props) {
  // mark props as used while this is a stub so linters don't complain
  void _props;

  return (
    <div className="content-padding">
      <strong>Form renderer unavailable</strong>
      <div className="mt-sm">
        This form renderer has been stubbed while migrating off Material UI. Implement
        Blueprint-compatible JSON Forms renderers to restore functionality.
      </div>
    </div>
  );
}
