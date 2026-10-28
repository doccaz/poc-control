import { NavLink } from "react-router-dom";
import { User } from "../api";
import { useLanguage } from "../i18n";

function linkClass({ isActive }: { isActive: boolean }) {
  return isActive ? "sidebar-link active" : "sidebar-link";
}

export function Sidebar({
  open,
  onClose,
  user,
  onLogout,
}: {
  open: boolean;
  onClose: () => void;
  user: User;
  onLogout: () => void;
}) {
  const { t } = useLanguage();

  return (
    <>
      {open && <div className="sidebar-backdrop" onClick={onClose} />}
      <aside className={open ? "sidebar open" : "sidebar"}>
        <nav className="sidebar-nav">
          <NavLink to="/" className={linkClass} onClick={onClose} end>
            {t("nav.dashboard")}
          </NavLink>
          <NavLink to="/pocs" className={linkClass} onClick={onClose}>
            {t("nav.pocs")}
          </NavLink>
          <NavLink to="/procedimentos" className={linkClass} onClick={onClose}>
            {t("nav.procedimentos")}
          </NavLink>
        </nav>

        <nav className="sidebar-nav sidebar-nav-global">
          {user.is_admin && (
            <NavLink to="/usuarios" className={linkClass} onClick={onClose}>
              {t("nav.usuarios")}
            </NavLink>
          )}
          <NavLink to="/minha-conta" className={linkClass} onClick={onClose}>
            {t("nav.minhaConta")}
          </NavLink>
        </nav>

        <div className="sidebar-footer">
          <span className="sidebar-user">{user.email}</span>
          <button className="btn btn-secondary" onClick={onLogout}>
            {t("action.sair")}
          </button>
        </div>
      </aside>
    </>
  );
}
