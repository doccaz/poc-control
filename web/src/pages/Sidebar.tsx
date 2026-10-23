import { NavLink, useNavigate } from "react-router-dom";
import { User } from "../api";
import { useLanguage } from "../i18n";

function linkClass({ isActive }: { isActive: boolean }) {
  return isActive ? "sidebar-link active" : "sidebar-link";
}

export function Sidebar({
  open,
  onClose,
  mode,
  user,
  onLogout,
}: {
  open: boolean;
  onClose: () => void;
  mode: "run" | "plan";
  user: User;
  onLogout: () => void;
}) {
  const navigate = useNavigate();
  const { t } = useLanguage();

  function irPara(path: string) {
    navigate(path);
    onClose();
  }

  return (
    <>
      {open && <div className="sidebar-backdrop" onClick={onClose} />}
      <aside className={open ? "sidebar open" : "sidebar"}>
        <div className="sidebar-modes">
          <button className={mode === "run" ? "sidebar-mode active" : "sidebar-mode"} onClick={() => irPara("/")}>
            {t("mode.run")}
          </button>
          <button
            className={mode === "plan" ? "sidebar-mode active" : "sidebar-mode"}
            onClick={() => irPara("/plan")}
          >
            {t("mode.plan")}
          </button>
        </div>

        {mode === "run" && (
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
            {user.is_admin && (
              <NavLink to="/usuarios" className={linkClass} onClick={onClose}>
                {t("nav.usuarios")}
              </NavLink>
            )}
            <NavLink to="/minha-conta" className={linkClass} onClick={onClose}>
              {t("nav.minhaConta")}
            </NavLink>
          </nav>
        )}

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
