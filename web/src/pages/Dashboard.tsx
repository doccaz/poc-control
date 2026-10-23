import { Link } from "react-router-dom";
import { User } from "../api";
import { useLanguage } from "../i18n";

export function Dashboard({ user }: { user: User }) {
  const { t } = useLanguage();

  return (
    <div>
      <div className="page-header">
        <h1>
          {t("dashboard.greeting")}, {user.email.split("@")[0]}
        </h1>
      </div>
      <p className="muted">{t("dashboard.welcome")}</p>

      <div className="shortcut-grid">
        <Link to="/pocs" className="shortcut-card">
          <strong>{t("dashboard.pocs.title")}</strong>
          <span>{t("dashboard.pocs.desc")}</span>
        </Link>
        <Link to="/procedimentos" className="shortcut-card">
          <strong>{t("dashboard.procedimentos.title")}</strong>
          <span>{t("dashboard.procedimentos.desc")}</span>
        </Link>
      </div>
    </div>
  );
}
