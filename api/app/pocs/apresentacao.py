import html as html_lib
from datetime import date

from app.models import FlagClassificacao, Poc, StatusItem
from app.pocs.roteiro import montar_ambiente_html

_STATUS_LABEL = {
    StatusItem.pendente: "Pendente",
    StatusItem.em_andamento: "Em andamento",
    StatusItem.concluido: "Concluído",
    StatusItem.bloqueado: "Bloqueado",
    StatusItem.nao_aplicavel: "N/A",
}

_FLAG_LABEL = {
    FlagClassificacao.verde: "Validado",
    FlagClassificacao.amarelo: "Em avaliação",
    FlagClassificacao.vermelho: "Não suportado",
}

_FLAG_COLOR = {
    FlagClassificacao.verde: "#1f9a5e",
    FlagClassificacao.amarelo: "#92660a",
    FlagClassificacao.vermelho: "#c2412f",
}

_PINE = "#0c322c"


def _esc(valor: str | None) -> str:
    return html_lib.escape(valor or "")


def montar_apresentacao_html(poc: Poc) -> str:
    total = len(poc.itens)
    concluidos = sum(1 for i in poc.itens if i.status == StatusItem.concluido)
    pendentes = sum(1 for i in poc.itens if i.status in (StatusItem.bloqueado, StatusItem.pendente))
    pct = round(concluidos / total * 100) if total else 0

    fase_titulo = {f["numero"]: f["titulo"] for f in (poc.fases or [])}
    por_fase: dict[int, list] = {}
    for item in poc.itens:
        por_fase.setdefault(item.fase, []).append(item)

    blocos_fase = []
    for numero in sorted(por_fase):
        titulo = fase_titulo.get(numero, f"Fase {numero}")
        linhas = []
        for item in sorted(por_fase[numero], key=lambda i: i.ordem):
            classificacao = item.classificacao
            if classificacao:
                cor = _FLAG_COLOR[classificacao.flag]
                flag_html = f'<span style="color:{cor};font-weight:600">{_FLAG_LABEL[classificacao.flag]}</span>'
            else:
                flag_html = '<span style="color:#888">—</span>'
            linhas.append(
                f"<tr><td>{_esc(item.codigo)}</td><td>{_esc(item.titulo)}</td>"
                f"<td>{_STATUS_LABEL[item.status]}</td><td>{flag_html}</td></tr>"
            )
        blocos_fase.append(
            f"<h3>{_esc(titulo)}</h3>"
            f'<table><thead><tr><th>Item</th><th>Descrição</th><th>Status</th><th>Viabilidade</th></tr></thead>'
            f"<tbody>{''.join(linhas)}</tbody></table>"
        )

    sessoes_ordenadas = sorted(poc.sessoes, key=lambda s: s.data)
    timeline_blocos = []
    proximos_passos_geral: list[str] = []
    for s in sessoes_ordenadas:
        bloco = f"<div class=\"sessao\"><h4>{s.data.strftime('%d/%m/%Y')}</h4>"
        if s.participantes:
            bloco += f"<p class=\"muted\">Participantes: {_esc(', '.join(s.participantes))}</p>"
        if s.agenda:
            bloco += f"<p>{_esc(s.agenda)}</p>"
        for rotulo, campo, cor in (
            ("Resolvido", s.pontos_resolvidos, "#1f9a5e"),
            ("Pendências", s.pontos_falha, "#92660a"),
            ("Próximos passos", s.proximos_passos, "#2b6cb0"),
        ):
            if campo:
                itens_html = "".join(f"<li>{_esc(p)}</li>" for p in campo)
                bloco += f'<p class="tag" style="color:{cor}">{rotulo}</p><ul>{itens_html}</ul>'
        bloco += "</div>"
        timeline_blocos.append(bloco)
        proximos_passos_geral.extend(s.proximos_passos)

    passos_unicos = list(dict.fromkeys(proximos_passos_geral))
    passos_html = "".join(f"<li>{_esc(p)}</li>" for p in passos_unicos) or "<li>Nenhum próximo passo registrado.</li>"

    resumo_paragrafos = "".join(
        f"<p>{_esc(p)}</p>" for p in (poc.resumo_executivo or "").split("\n") if p.strip()
    ) or '<p class="muted">Sumário executivo ainda não foi gerado.</p>'

    blocos_fase_html = "".join(blocos_fase) or '<p class="muted">Nenhum item cadastrado.</p>'
    timeline_html = "".join(timeline_blocos) or '<p class="muted">Nenhuma sessão registrada.</p>'

    return f"""<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<title>{_esc(poc.titulo)} — Apresentação ao cliente</title>
<style>
  body {{ font-family: Arial, Helvetica, sans-serif; color: #1a1a1a; max-width: 900px; margin: 0 auto; padding: 0 20px 60px; }}
  header {{ background: {_PINE}; color: #fff; margin: 0 -20px 32px; padding: 40px 20px; }}
  header h1 {{ margin: 0 0 6px; font-size: 26px; }}
  header .sub {{ opacity: .85; font-size: 14px; }}
  h2 {{ margin-top: 36px; border-bottom: 2px solid {_PINE}; padding-bottom: 6px; color: {_PINE}; }}
  h3 {{ margin-top: 24px; }}
  .stat-grid {{ display: flex; gap: 16px; flex-wrap: wrap; margin-bottom: 8px; }}
  .stat {{ flex: 1; min-width: 140px; background: #f5f6f5; border-radius: 8px; padding: 14px 16px; }}
  .stat b {{ display: block; font-size: 28px; color: {_PINE}; }}
  .stat span {{ font-size: 12px; text-transform: uppercase; letter-spacing: .03em; color: #666; }}
  table {{ width: 100%; border-collapse: collapse; margin-bottom: 8px; }}
  th, td {{ border: 1px solid #ddd; padding: 6px 10px; text-align: left; font-size: 13px; vertical-align: top; }}
  th {{ background: #f0f0f0; }}
  .sessao {{ border-left: 3px solid {_PINE}; padding: 4px 16px; margin-bottom: 16px; }}
  .tag {{ font-size: 12px; text-transform: uppercase; letter-spacing: .03em; font-weight: 700; margin: 10px 0 2px; }}
  .muted {{ color: #666; }}
  ul {{ margin: 4px 0 12px; padding-left: 20px; font-size: 13px; }}
  @media print {{ header {{ -webkit-print-color-adjust: exact; print-color-adjust: exact; }} }}
</style>
</head>
<body>
  <header>
    <h1>{_esc(poc.titulo)}</h1>
    <div class="sub">{_esc(poc.cliente)} · Apresentação de resultados · {date.today().strftime('%d/%m/%Y')}</div>
  </header>

  <h2>Sumário executivo</h2>
  {resumo_paragrafos}

  {montar_ambiente_html(poc)}

  <h2>Resultados em números</h2>
  <div class="stat-grid">
    <div class="stat"><b>{pct}%</b><span>concluído</span></div>
    <div class="stat"><b>{concluidos}/{total}</b><span>itens concluídos</span></div>
    <div class="stat"><b>{pendentes}</b><span>itens pendentes/bloqueados</span></div>
    <div class="stat"><b>{len(poc.sessoes)}</b><span>sessões realizadas</span></div>
  </div>

  <h2>Resultados por fase</h2>
  {blocos_fase_html}

  <h2>Linha do tempo das sessões</h2>
  {timeline_html}

  <h2>Próximos passos</h2>
  <ul>{passos_html}</ul>
</body>
</html>"""
