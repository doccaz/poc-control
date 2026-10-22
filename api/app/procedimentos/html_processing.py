from dataclasses import dataclass

from bs4 import BeautifulSoup
from markdownify import markdownify

_SELECT = "h1,h2,h3,p,ul,ol,table,pre"


@dataclass
class Secao:
    heading_level: int
    heading_title: str
    parent_heading_title: str | None
    order_index: int
    content_text: str


def extrair_secoes(html: str) -> list[Secao]:
    soup = BeautifulSoup(html, "lxml")
    nodes = soup.select(_SELECT)

    secoes: list[Secao] = []
    order_index = 0
    current_level = 2
    current_title = "Visão geral"
    current_parent: str | None = None
    current_h2_title: str | None = None
    current_nodes: list = []

    def flush() -> None:
        nonlocal order_index
        if not current_nodes:
            return
        fragment = "".join(str(node) for node in current_nodes)
        body = markdownify(fragment, heading_style="ATX").strip()
        text = f"## {current_title}\n\n{body}" if body else f"## {current_title}"
        secoes.append(
            Secao(
                heading_level=current_level,
                heading_title=current_title,
                parent_heading_title=current_parent,
                order_index=order_index,
                content_text=text,
            )
        )
        order_index += 1

    for node in nodes:
        if node.name == "h1":
            continue
        if node.name in ("h2", "h3"):
            flush()
            current_nodes = []
            current_title = node.get_text(" ", strip=True)
            if node.name == "h2":
                current_level = 2
                current_parent = None
                current_h2_title = current_title
            else:
                current_level = 3
                current_parent = current_h2_title
        else:
            current_nodes.append(node)

    flush()
    return secoes
