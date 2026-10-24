import { useNotice } from "../../context/NoticeContext";
import "./Notice.scss";

export function Notice() {
  const { notice, dismissNotice } = useNotice();
  if (!notice) return null;
  return (
    <div className="notice" role="status">
      {notice}
      <button onClick={dismissNotice} aria-label="Dismiss notification">×</button>
    </div>
  );
}
