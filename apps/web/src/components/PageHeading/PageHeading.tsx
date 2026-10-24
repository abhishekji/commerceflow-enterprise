import type { ReactNode } from "react";
import "./PageHeading.scss";

interface PageHeadingProps {
  title: string;
  subtitle: string;
  children?: ReactNode;
}

export function PageHeading({ title, subtitle, children }: PageHeadingProps) {
  return (
    <div className="page-heading">
      <div><h1>{title}</h1><p>{subtitle}</p></div>
      {children && <div className="filters">{children}</div>}
    </div>
  );
}
