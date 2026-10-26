import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api, ProcedimentoListItem } from "@/api";
import { useLanguage } from "@/i18n";

export function Procedimentos() {
  const { t } = useLanguage();
  const [itens, setItens] = useState<ProcedimentoListItem[] | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    api
      .listarProcedimentos()
      .then(setItens)
      .catch(() => setErro(t("procedimentos.erroCarregar")));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div>
      <div className="page-header">
        <h1>{t("procedimentos.titulo")}</h1>
        <Link to="/procedimentos/novo" className="btn btn-primary">
          {t("procedimentos.novoProcedimento")}
        </Link>
      </div>

      {erro && <p className="alert alert-error">{erro}</p>}
      {itens === null && !erro && <p className="muted">{t("common.carregando")}</p>}

      {itens && itens.length === 0 && <div className="card empty-state">{t("procedimentos.nenhum")}</div>}

      {itens && itens.length > 0 && (
        <div className="card">
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>{t("procedimentos.colTitulo")}</th>
                  <th>{t("procedimentos.colTags")}</th>
                  <th>{t("procedimentos.colCliente")}</th>
                  <th>{t("procedimentos.colStatus")}</th>
                  <th>{t("procedimentos.colVersao")}</th>
                </tr>
              </thead>
              <tbody>
                {itens.map((p) => (
                  <tr key={p.id}>
                    <td>
                      <Link to={`/procedimentos/${p.id}`}>{p.titulo}</Link>
                    </td>
                    <td className="muted">{p.tags.join(", ") || "—"}</td>
                    <td>{p.cliente_origem ?? "—"}</td>
                    <td>
                      <span className={`badge badge-${p.status}`}>{p.status}</span>
                    </td>
                    <td>{p.versao}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
