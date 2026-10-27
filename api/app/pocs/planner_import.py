import json
from typing import Any


def extrair_parametros_tecnicos(texto: str) -> dict[str, Any] | None:
    """Se o texto de entrada for o JSON exportado pelo Planejar PoC (botão "Exportar Projeto"
    na etapa Resumo do SUSE PoC Planner), extrai os parâmetros técnicos direto da estrutura
    conhecida do JSON — produtos selecionados, rede e infraestrutura — sem passar pelo Gemini,
    para não arriscar o LLM alucinar ou perder um IP/hostname. Usado depois para montar o
    roteiro do dia (app/pocs/roteiro.py) e a seção "Ambiente técnico" da apresentação final.

    Nunca inclui o bloco `credentials` do planejador: credenciais não entram nem no roteiro
    nem em nenhum relatório gerado a partir daqui.

    Devolve None se o texto não for esse formato (ex.: PDF/texto livre de escopo), e quem
    chamar simplesmente não grava `parametros_tecnicos` na PoC.
    """
    try:
        dados = json.loads(texto)
    except (ValueError, TypeError):
        return None
    if not isinstance(dados, dict):
        return None

    # v2 do Planejar PoC (schema 2) exporta {schema, planner, eib, poc_markdown}, com o estado
    # de verdade dentro de `planner` -- antes (v1) era o estado solto, direto na raiz do JSON.
    # Aceita os dois formatos: se tiver `planner`, usa ele; senão assume que já é o estado.
    estado = dados.get("planner") if isinstance(dados.get("planner"), dict) else dados
    if "selectedProducts" not in estado:
        return None

    projeto = estado.get("project") or {}
    produtos_selecionados = sorted(k for k, v in (estado.get("selectedProducts") or {}).items() if v)
    rede = estado.get("network") or {}
    portas = estado.get("ports") or {}

    return {
        "origem": "planejador",
        "projeto": {
            "nome": projeto.get("projectName"),
            "organizacao": projeto.get("clientOrganization") or projeto.get("organization"),
            "responsavel": projeto.get("leadEngineer"),
        },
        "produtos_selecionados": produtos_selecionados,
        "rede": {
            "cidr_gerenciamento": rede.get("managementCidr"),
            "gateway": rede.get("gatewayIp"),
            "vip_cluster": rede.get("clusterVip"),
            "pool_ip_inicio": rede.get("ipPoolStart"),
            "pool_ip_fim": rede.get("ipPoolEnd"),
            "vms": rede.get("vms") or [],
        },
        "infra": estado.get("infra") or {},
        "portas_concluidas": sum(1 for v in (portas.get("checked") or {}).values() if v),
        "portas_total": len(portas.get("checked") or {}),
    }
