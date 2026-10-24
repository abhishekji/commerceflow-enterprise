import { PageHeading } from "../../components/PageHeading";

export function ComingSoonPage({ title }: { title: string }) {
  return (
    <>
      <PageHeading title={title} subtitle={`${title} overview`} />
      <section className="panel page-panel"><p className="empty-state">{title} isn't available in this version yet.</p></section>
    </>
  );
}
