#!/bin/sh
# Copia, SEM alterar, o index.html do SUSE PoC Planner (repo FlavioFGM/EIB-SUSE-PoC, pasta poc-planner/)
# para web/public/planner/, de onde o nginx serve na MESMA origem do /api -- é isso que dá ao planejador
# o cookie de sessão e liga o conector (importar documento, aderência por pesquisa na web).
# É um artefato vendorizado, não um fork: o arquivo nunca é editado aqui; pra mudar o planejador,
# mude lá e rode este script de novo. Grava de onde veio em web/public/planner/SOURCE.
#
# Uso: scripts/vendor-planner.sh /caminho/do/EIB-SUSE-PoC

set -eu

ORIGEM="${1:?uso: $0 /caminho/do/clone/EIB-SUSE-PoC}"
PROJECT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
DESTINO="$PROJECT_DIR/web/public/planner"
ARQUIVO="$ORIGEM/poc-planner/index.html"

[ -f "$ARQUIVO" ] || { echo "não achei $ARQUIVO" >&2; exit 1; }
if [ -n "$(git -C "$ORIGEM" status --porcelain -- poc-planner/index.html)" ]; then
  echo "poc-planner/index.html tem alterações não commitadas; commite antes de vendorizar" >&2
  exit 1
fi

mkdir -p "$DESTINO"
cp "$ARQUIVO" "$DESTINO/index.html"
{
  echo "repo=$(git -C "$ORIGEM" remote get-url origin)"
  echo "commit=$(git -C "$ORIGEM" rev-parse HEAD)"
  echo "sha256=$(sha256sum "$DESTINO/index.html" | cut -d' ' -f1)"
} > "$DESTINO/SOURCE"
echo "planejador vendorizado em $DESTINO (commit $(git -C "$ORIGEM" rev-parse --short HEAD))"
