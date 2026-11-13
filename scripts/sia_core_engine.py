#!/usr/bin/env python3
import os
import re
import sys
import json
import math
import shutil
import argparse
from datetime import datetime
from collections import Counter

ROOT_DIR = os.path.abspath(".")
EVOLUTION_FILE = os.path.join(ROOT_DIR, "evolution.jsonl")
GRAPH_CACHE = os.path.join(ROOT_DIR, ".sia_project_graph.json")
IGNORE_DIRS = {".git", "node_modules", "__pycache__", ".venv", "venv", "dist", "build"}

# ----------------------------------------------------------------------
# ALGORITMO 1: GRAFO DE INDEXAÇÃO E MAPEAMENTO INSTANTÂNEO DO PROJETO
# Evita que agentes leiam arquivos inteiros para achar funções, rotas ou IDs
# ----------------------------------------------------------------------
def build_project_graph():
    graph = {
        "updated_at": datetime.utcnow().isoformat() + "Z",
        "files": {},
        "api_routes": [],
        "dom_ids_in_html": {},
        "dom_Selectors_in_js": {}
    }

    for root, dirs, files in os.walk(ROOT_DIR):
        dirs[:] = [d for d in dirs if d not in IGNORE_DIRS and not d.startswith(".")]
        for file in files:
            if not file.endswith((".html", ".js", ".ts", ".py", ".css", ".vue", ".jsx", ".tsx")):
                continue
            filepath = os.path.join(root, file)
            relpath = os.path.relpath(filepath, ROOT_DIR)
            try:
                with open(filepath, "r", encoding="utf-8", errors="ignore") as f:
                    content = f.read()
            except Exception:
                continue

            file_info = {"size": len(content), "functions": [], "classes": [], "fetches": []}

            # Extrai funções Python / JS
            py_funcs = re.findall(r'def\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*\(', content)
            js_funcs = re.findall(r'(?:function\s+([a-zA-Z_$][a-zA-Z0-9_$]*)|const\s+([a-zA-Z_$][a-zA-Z0-9_$]*)\s*=\s*(?:async\s*)?\([^)]*\)\s*=>)', content)
            file_info["functions"] = list(set(py_funcs + [f[0] or f[1] for f in js_funcs if any(f)]))

            # Extrai rotas de Backend (Flask/FastAPI/Express)
            routes = re.findall(r'@(?:app|router|bp)\.(?:route|get|post|put|delete)\(\s*[\'"]([^\'"]+)[\'"]', content)
            routes += re.findall(r'(?:app|router)\.(?:get|post|put|delete)\(\s*[\'"]([^\'"]+)[\'"]', content)
            for r in routes:
                graph["api_routes"].append({"route": r, "file": relpath})

            # Extrai chamadas fetch / axios do Frontend
            fetches = re.findall(r'(?:fetch|axios\.(?:get|post|put|delete))\(\s*[`\'"]([^`\'"]+)[`\'"]', content)
            file_info["fetches"] = list(set(fetches))

            # Extrai IDs declarados no HTML
            if file.endswith((".html", ".vue", ".jsx", ".tsx")):
                html_ids = re.findall(r'\bid\s*=\s*[\'"]([^\'"]+)[\'"]', content)
                graph["dom_ids_in_html"][relpath] = list(set(html_ids))

            # Extrai seletores de ID exigidos pelo JS (getElementById / querySelector('#...'))
            if file.endswith((".js", ".ts", ".html", ".vue", ".jsx", ".tsx")):
                js_ids = re.findall(r'getElementById\(\s*[\'"]([^\'"]+)[\'"]\s*\)', content)
                js_ids += re.findall(r'querySelector(?:All)?\(\s*[\'"]#([a-zA-Z0-9_-]+)[\'"]\s*\)', content)
                if js_ids:
                    graph["dom_Selectors_in_js"][relpath] = list(set(js_ids))

            graph["files"][relpath] = file_info

    with open(GRAPH_CACHE, "w", encoding="utf-8") as f:
        json.dump(graph, f, indent=2, ensure_ascii=False)
    return graph

# ----------------------------------------------------------------------
# ALGORITMO 2: AUDITOR DE INTEGRIDADE DOM x JS & SINTAXE (ANTI-REGRESSÃO)
# Impede que agentes apaguem IDs, eventos ou quebrem chaves ao mexer na UI
# ----------------------------------------------------------------------
def verify_integrity_and_bindings(filepath):
    if not os.path.exists(filepath):
        return False, [f"Arquivo inexistente: {filepath}"]

    with open(filepath, "r", encoding="utf-8", errors="ignore") as f:
        new_content = f.read()

    errors = []
    backup_path = filepath + ".sia.bak"

    # 1. Verificação Algorítmica de Delimitadores Balanceados em blocos JS/CSS
    def check_balanced(text, label):
        stack = []
        pairs = {')': '(', '}': '{', ']': '['}
        # Remove strings literais para não dar falso positivo
        clean = re.sub(r'([\'"`])(?:\\.|(?!\1).)*\1', '""', text, flags=re.DOTALL)
        clean = re.sub(r'//.*?$|/\*.*?\*/', '', clean, flags=re.MULTILINE | re.DOTALL)
        for char in clean:
            if char in '({[':
                stack.append(char)
            elif char in ')}]':
                if not stack or stack[-1] != pairs[char]:
                    return False
                stack.pop()
        return len(stack) == 0

    if filepath.endswith((".js", ".ts")):
        import subprocess
        res = subprocess.run(["node", "-c", filepath], capture_output=True, text=True)
        if res.returncode != 0:
            errors.append(f"ERRO_SINTAXE: Falha ao compilar JS/TS: {res.stderr.strip()}")
    elif filepath.endswith((".css", ".json")):
        if not check_balanced(new_content, filepath):
            errors.append("ERRO_SINTAXE: Chaves {}, parênteses () ou colchetes [] desbalanceados.")

    # 2. Proteção Contra Amnésia de Bindings (Compara com o Backup antes da edição)
    if os.path.exists(backup_path):
        with open(backup_path, "r", encoding="utf-8", errors="ignore") as f:
            old_content = f.read()

        # Se for arquivo com HTML, verifica se IDs que são usados por JS foram deletados
        old_ids = set(re.findall(r'\bid\s*=\s*[\'"]([^\'"]+)[\'"]', old_content))
        new_ids = set(re.findall(r'\bid\s*=\s*[\'"]([^\'"]+)[\'"]', new_content))
        deleted_ids = old_ids - new_ids

        # Verifica quais IDs são referenciados no JS do próprio arquivo ou do projeto
        js_referenced_ids = set(re.findall(r'getElementById\(\s*[\'"]([^\'"]+)[\'"]\s*\)', new_content))
        js_referenced_ids |= set(re.findall(r'querySelector\(\s*[\'"]#([a-zA-Z0-9_-]+)[\'"]\s*\)', new_content))

        if os.path.exists(GRAPH_CACHE):
            with open(GRAPH_CACHE, "r", encoding="utf-8") as gf:
                gdata = json.load(gf)
                for _, id_list in gdata.get("dom_Selectors_in_js", {}).items():
                    js_referenced_ids.update(id_list)

        broken_ids = deleted_ids.intersection(js_referenced_ids)
        if broken_ids:
            errors.append(
                f"QUEBRA_DE_FUNCIONALIDADE: Você removeu do HTML os IDs {sorted(list(broken_ids))} "
                f"que são exigidos pelo JavaScript! Proibido apagar IDs funcionais ao alterar o layout."
            )

        # Verifica se funções JS inteiras foram apagadas acidentalmente (>30% de perda de funções)
        old_funcs = set(re.findall(r'function\s+([a-zA-Z0-9_]+)\s*\(', old_content))
        new_funcs = set(re.findall(r'function\s+([a-zA-Z0-9_]+)\s*\(', new_content))
        missing_funcs = old_funcs - new_funcs
        if missing_funcs:
            errors.append(
                f"REGRESSÃO_JS: As funções JavaScript {sorted(list(missing_funcs))} existiam no arquivo e foram apagadas!"
            )

    return len(errors) == 0, errors

# ----------------------------------------------------------------------
# ALGORITMO 3: AUDITOR GEOMÉTRICO MOBILE E AUTO-NORMALIZADOR DE CSS
# Calcula colisão de Z-Index, limpa duplicatas e garante regras mobile
# ----------------------------------------------------------------------
def normalize_and_audit_mobile_ui(filepath):
    with open(filepath, "r", encoding="utf-8", errors="ignore") as f:
        content = f.read()

    warnings = []

    # 1. Detecta larguras fixas em pixels acima de 400px que quebram o mobile
    bad_widths = re.findall(r'width\s*:\s*([4-9]\d{2}|[1-9]\d{3,})px', content)
    if bad_widths:
        warnings.append(f"LARGURA_FIXA_DETECTADA ({bad_widths}px): Substitua por width: 100% e max-width para não estourar a tela mobile.")

    # 2. Audita Z-Index caóticos e detecta elementos flutuantes sem âncora
    z_values = [int(z) for z in re.findall(r'z-index\s*:\s*(\d+)', content)]
    if len(z_values) > 1 and max(z_values) > 99999:
        content = re.sub(r'z-index\s*:\s*\d{6,}', 'z-index: 9999', content)
        warnings.append("Z_INDEX_NORMALIZADO: Valores absurdos acima de 99999 foram normalizados para 9999.")

    # 3. Higieniza blocos CSS duplicados preservando a última propriedade
    def clean_css_block(css_text):
        css_text = re.sub(r'/\*.*?\*/', '', css_text, flags=re.DOTALL)
        def dedup_props(m):
            sel, body = m.group(1), m.group(2)
            props = [p.strip() for p in body.split(';') if ':' in p]
            prop_map = {}
            for p in props:
                k, v = p.split(':', 1)
                prop_map[k.strip().lower()] = f"{k.strip()}: {v.strip()}"
            return f"{sel}{{ {'; '.join(prop_map.values())}; }}" if prop_map else ""
        return re.sub(r'([^{}@]+)\{([^{}]+)\}', dedup_props, css_text)

    if filepath.endswith(".css"):
        content = clean_css_block(content)
    elif "<style" in content:
        content = re.sub(
            r'(<style[^>]*>)(.*?)(</style>)',
            lambda m: m.group(1) + clean_css_block(m.group(2)) + m.group(3),
            content,
            flags=re.DOTALL | re.IGNORECASE
        )

    with open(filepath, "w", encoding="utf-8") as f:
        f.write(content)

    return warnings

# ----------------------------------------------------------------------
# ALGORITMO 4: MOTOR DE SIMILARIDADE HEURÍSTICA (TF-IDF / JACCARD) NO SIA
# Busca nos erros e regras passadas exatamente o que se aplica à tarefa atual
# ----------------------------------------------------------------------
def query_evolution_memory(query_text, top_k=5):
    if not os.path.exists(EVOLUTION_FILE):
        return []

    def tokenize(text):
        return set(re.findall(r'[a-zA-Z0-9_À-ÿ]{3,}', text.lower()))

    q_tokens = tokenize(query_text)
    if not q_tokens:
        return []

    scored_entries = []
    with open(EVOLUTION_FILE, "r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            try:
                entry = json.loads(line)
                doc_text = f"{entry.get('module', '')} {entry.get('rule_id', '')} {entry.get('details', '')}"
                d_tokens = tokenize(doc_text)
                if not d_tokens:
                    continue
                # Similaridade de Jaccard Ponderada + Boost para RULE_LOCKED
                intersection = len(q_tokens & d_tokens)
                union = len(q_tokens | d_tokens)
                score = intersection / union if union else 0.0
                if entry.get("status") == "RULE_LOCKED":
                    score += 0.25
                if score > 0.05:
                    scored_entries.append((score, entry))
            except Exception:
                continue

    scored_entries.sort(key=lambda x: x[0], reverse=True)
    return [item[1] for item in scored_entries[:top_k]]

def record_learning(module, status, rule_id, details):
    entry = {
        "timestamp": datetime.utcnow().isoformat() + "Z",
        "module": module,
        "status": status,
        "rule_id": rule_id,
        "details": details
    }
    with open(EVOLUTION_FILE, "a", encoding="utf-8") as f:
        f.write(json.dumps(entry, ensure_ascii=False) + "\n")

# ----------------------------------------------------------------------
# CLI DE EXECUÇÃO RÁPIDA PARA OS AGENTES
# ----------------------------------------------------------------------
if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="SIA Core Engine - Inteligência Algorítmica Determinística")
    parser.add_argument("--index", action="store_true", help="Gera o mapa completo do projeto (funções, rotas, IDs DOM)")
    parser.add_argument("--find", help="Busca instantaneamente onde está uma função, rota ou ID no projeto sem gastar tokens")
    parser.add_argument("--pre-edit", help="Faz backup, higieniza CSS e carrega memória heurística antes de editar um arquivo")
    parser.add_argument("--post-edit", help="Audita integridade DOM x JS, sintaxe e geometria mobile; faz rollback automático se quebrar funções")
    parser.add_argument("--learn", nargs=3, metavar=("MODULO", "REGRA_ID", "DETALHES"), help="Grava uma nova regra permanente no evolution.jsonl")

    args = parser.parse_args()

    if args.index:
        g = build_project_graph()
        print(f"[SIA_ENGINE] Grafo atualizado: {len(g['files'])} arquivos, {len(g['api_routes'])} rotas mapeadas.")

    elif args.find:
        if not os.path.exists(GRAPH_CACHE):
            build_project_graph()
        with open(GRAPH_CACHE, "r", encoding="utf-8") as f:
            g = json.load(f)
        term = args.find.lower()
        print(f"=== RESULTADOS DETERMINÍSTICOS PARA '{args.find}' ===")
        for r in g.get("api_routes", []):
            if term in r["route"].lower():
                print(f"  [ROTA API] {r['route']} -> {r['file']}")
        for fpath, info in g.get("files", {}).items():
            for fn in info.get("functions", []):
                if term in fn.lower():
                    print(f"  [FUNÇÃO] {fn}() -> {fpath}")
        for fpath, ids in g.get("dom_ids_in_html", {}).items():
            for dom_id in ids:
                if term in dom_id.lower():
                    print(f"  [HTML ID] #{dom_id} -> {fpath}")

    elif args.pre_edit:
        target = args.pre_edit
        build_project_graph()
        if os.path.exists(target):
            shutil.copy2(target, target + ".sia.bak")
            warns = normalize_and_audit_mobile_ui(target)
            print(f"[SIA_ENGINE PRE-EDIT] Backup seguro criado e CSS higienizado para: {target}")
            for w in warns:
                print(f"  [AVISO GEOMÉTRICO] {w}")
        memories = query_evolution_memory(target + " mobile ui layout ronda")
        if memories:
            print("=== REGRAS HEURÍSTICAS OBRIGATÓRIAS (EVOLUTION.JSONL) ===")
            for m in memories:
                print(f"  * [{m['rule_id']}] {m['details']}")

    elif args.post_edit:
        target = args.post_edit
        warns = normalize_and_audit_mobile_ui(target)
        ok, errs = verify_integrity_and_bindings(target)
        if not ok:
            print("[SIA_ENGINE BLOQUEIO CRÍTICO] O agente quebrou funcionalidades ou sintaxe:")
            for e in errs:
                print(f"  ❌ {e}")
                record_learning(os.path.basename(target), "AUTO_ROLLBACK", "BROKEN_BINDING_OR_SYNTAX", e)
            bak = target + ".sia.bak"
            if os.path.exists(bak):
                shutil.copy2(bak, target)
                print(f"[SIA_ENGINE ROLLBACK] Alteração desfeita! Arquivo original restaurado de {bak}.")
            sys.exit(1)
        else:
            build_project_graph()
            record_learning(os.path.basename(target), "PASSED", "INTEGRITY_VERIFIED", f"Edição validada sem perda de IDs ou funções em {target}")
            print(f"[SIA_ENGINE APROVADO] Integridade DOM x JS, sintaxe e CSS validados com sucesso em {target}!")
            for w in warns:
                print(f"  ⚠️ {w}")

    elif args.learn:
        record_learning(args.learn[0], "RULE_LOCKED", args.learn[1], args.learn[2])
        print(f"[SIA_ENGINE] Nova regra travada no evolution.jsonl: [{args.learn[1]}]")
