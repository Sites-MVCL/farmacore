#!/usr/bin/env python3
"""Monta o index.html a partir de src/ (conteúdo em JSON + CSS + JS + shell)."""
import json, pathlib, sys
root = pathlib.Path(__file__).parent
src = root / "src"
cont = src / "conteudo"
m = json.loads((cont / "missoes.json").read_text(encoding="utf-8"))
jogos = {}
for f in ("jogos_a.json", "jogos_b.json"):
    jogos.update(json.loads((cont / f).read_text(encoding="utf-8")))
for ms in m["missoes"]:
    f = cont / f"aula_{ms['id']}.json"
    if f.exists():
        a = json.loads(f.read_text(encoding="utf-8")); a.pop("id", None); ms["aula"] = a
ids = {b["id"] for ms in m["missoes"] for b in ms["treino"] if b["t"] == "game"}
falta = ids - set(jogos); sobra = set(jogos) - ids
if falta or sobra:
    sys.exit(f"Jogos inconsistentes. Faltam: {falta}  Sobram: {sobra}")
data = {"meta": m["meta"], "missoes": m["missoes"], "jogos": jogos}
(root / "conteudo.json").write_text(json.dumps(data, ensure_ascii=False, indent=1), encoding="utf-8")
blob = json.dumps(data, ensure_ascii=False, separators=(",", ":")).replace("</", "<\\/")
html = (src / "shell.html").read_text(encoding="utf-8")
html = html.replace("/*{{CSS}}*/", (src / "style.css").read_text(encoding="utf-8"))
html = html.replace("{{DATA}}", blob)
html = html.replace("/*{{JS}}*/", (src / "app.js").read_text(encoding="utf-8"))
(root / "index.html").write_text(html, encoding="utf-8")
print(f"ok: {len(m['missoes'])} missões, {len(jogos)} jogos, index.html {len(html)//1024} KB")
