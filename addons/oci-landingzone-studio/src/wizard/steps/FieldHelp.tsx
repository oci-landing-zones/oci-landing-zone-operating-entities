import InfoButton from '../../components/InfoButton';

export interface FieldHelpContent {
  description: string;
  example: string;
  docs?: string;
  cli?: string;
}

export default function FieldHelp({ id, label, help }: { id?: string; label: string; help: FieldHelpContent }) {
  return <InfoButton id={id} title={label}>
    <p>{help.description}</p>
    <p><strong>Example:</strong> {help.example}</p>
    {help.cli && <>
      <p>List provider services with OCI CLI. Replace the tenancy OCID and region, then copy the matching service's <code>id</code> from the output.</p>
      <pre style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}><code>{help.cli}</code></pre>
    </>}
    {help.docs && <p><a className="guide-link" href={help.docs} target="_blank" rel="noreferrer">Oracle documentation</a></p>}
  </InfoButton>;
}
