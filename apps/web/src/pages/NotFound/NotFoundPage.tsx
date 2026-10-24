import { Link } from "react-router-dom";
import { ROUTES } from "../../common/constants";
import { PageHeading } from "../../components/PageHeading";

export function NotFoundPage() {
  return (
    <>
      <PageHeading title="Page not found" subtitle="The page you're looking for doesn't exist" />
      <section className="panel page-panel">
        <p className="empty-state">Check the address or head back to the <Link className="link-inline" to={ROUTES.DASHBOARD}>dashboard</Link>.</p>
      </section>
    </>
  );
}
