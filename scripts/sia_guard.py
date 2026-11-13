#!/usr/bin/env python3
import os
import re
import sys
import json
import shutil
import argparse
from datetime import datetime

EVOLUTION_FILE = os.path.abspath("./evolution.jsonl")

def log_evolution(module, status, rule_id, details):
    entry = {
        "timestamp": datetime.utcnow().isoformat() + "Z",
        "module": module,
        "status": status,
        "rule_id": rule_id,
        "details": details
    }
    with open(EVOLUTION_FILE, "a", encoding="utf-8") as f:
        f.write(json.dumps(entry, ensure_ascii=False) + "\n")

def load_constraints(module_keyword):
    if not os.path.exists(EVOLUTION_FILE):
        return []
    constraints = []
    with open(EVOLUTION_FILE, "r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            try:
                data = json.loads(line)
                if module_keyword.lower() in data.get("module", "").lower():
                    constraints.append(f"[{data.get('rule_id')}] {data.get('details')}")
            except json.JSONDecodeError:
                continue
    return constraints

def clean_css_content(css_text):
    # Remove comentarios inuteis e espacos duplicados excessivos
    css_text = re.sub(r'/\*.*?\*/', '', css_text, flags=re.DOTALL)
    # Remove blocos de regras vazios: seletor { }
    css_text = re.sub(r'[^\r\n,{}]+\{\s*\}', '', css_text)
    
    # Deduplica propriedades identicas dentro do mesmo bloco CSS mantendo a ultima declaracao
    def dedup_block(match):
        selector = match.group(1)
        body = match.group(2)
        props = [p.strip() for p in body.split(';') if p.strip()]
        seen = {}
        for p in props:
            if ':' in p:
                k, v = p.split(':', 1)
                seen[k.strip().lower()] = f"{k.strip()}: {v.strip()}"
        clean_body = "; ".join(seen.values())
        if clean_body:
            clean_body += ";"
        return f"{selector} {{ {clean_body} }}"

    css_text = re.sub(r'([^{}]+)\{([^{}]+)\}', dedup_block, css_text)
    return css_text

def sanitize_file(filepath):
    if not os.path.exists(filepath):
        print(f"[SIA_GUARD ERRO] Arquivo não encontrado: {filepath}")
        sys.exit(1)
    
    backup_path = filepath + ".sia.bak"
    shutil.copy2(filepath, backup_path)
    
    with open(filepath, "r", encoding="utf-8") as f:
        content = f.read()

    if filepath.endswith(".css"):
        content = clean_css_content(content)
    elif filepath.endswith((".html", ".vue", ".jsx", ".tsx")):
        content = re.sub(
            r'(<style[^>]*>)(.*?)(</style>)',
            lambda m: m.group(1) + clean_css_content(m.group(2)) + m.group(3),
            content,
            flags=re.DOTALL | re.IGNORECASE
        )

    with open(filepath, "w", encoding="utf-8") as f:
        f.write(content)
    print(f"[SIA_GUARD OK] Backup criado ({backup_path}) e CSS higienizado em: {filepath}")

def validate_ronda_mobile(filepath):
    if not os.path.exists(filepath):
        print(f"[SIA_GUARD ERRO] Arquivo não encontrado: {filepath}")
        sys.exit(1)

    with open(filepath, "r", encoding="utf-8") as f:
        content = f.read()

    errors = []

    # 1. Verifica Mapa Fullscreen (100vh ou 100dvh)
    if not re.search(r'100d?vh', content):
        errors.append("VIOLAÇÃO_VIEWPORT: O mapa base deve ocupar 100vh/100dvh.")

    # 2. Verifica Glassmorphism (backdrop-filter: blur)
    if not re.search(r'backdrop-filter\s*:\s*blur|backdrop-blur', content):
        errors.append("VIOLAÇÃO_ESTILO: Ausência de Glassmorphism (backdrop-filter: blur / backdrop-blur).")

    # 3. Verifica Identidade e Elementos Obrigatórios da Ronda
    required_tokens = [
        ("Ronda Pro", "Título 'Ronda Pro' ausente no Header."),
        ("Lanterna", "Botão compacto 'Lanterna' ausente."),
        ("SOS", "Botão 'SOS' ausente no topo."),
        ("Painel de Rondas", "Bottom Sheet 'Painel de Rondas' ausente."),
        ("Próximas Rondas", "Seção 'Próximas Rondas' ausente na Bottom Sheet."),
        ("Rondas Disponíveis", "Item 'Rondas Disponíveis' ausente no Menu Lateral."),
        ("Histórico", "Item 'Histórico' ausente no Menu Lateral.")
    ]
    for token, msg in required_tokens:
        if token not in content:
            errors.append(f"VIOLAÇÃO_ELEMENTO: {msg}")

    # 4. Proíbe uso da palavra errada "Honda" no texto visível
    if re.search(r'\bHonda(s)?\b', content):
        errors.append("VIOLAÇÃO_ORTOGRAFIA: Termo incorreto 'Honda' detectado. Use estritamente 'Ronda'.")

    if errors:
        print("[SIA_GUARD REPROVADO] Falhas determinísticas detectadas:")
        for err in errors:
            print(f"  - {err}")
            log_evolution("ronda_mobile", "FAILED", err.split(":")[0], err)
        
        backup_path = filepath + ".sia.bak"
        if os.path.exists(backup_path):
            shutil.copy2(backup_path, filepath)
            print(f"[SIA_GUARD ROLLBACK] Arquivo restaurado automaticamente de {backup_path}")
        sys.exit(1)

    log_evolution("ronda_mobile", "PASSED", "VALIDATION_OK", f"Validação mobile aprovada em {filepath}")
    print(f"[SIA_GUARD APROVADO] Página de Ronda validada com sucesso: {filepath}")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Motor Determinístico SIA Guard")
    parser.add_argument("--context", help="Exibe regras aprendidas no evolution.jsonl para o módulo")
    parser.add_argument("--check", help="Faz backup e higieniza CSS duplicado antes da edição")
    parser.add_argument("--validate", help="Valida regras determinísticas da página de Ronda e faz rollback se falhar")
    args = parser.parse_args()

    if args.context:
        rules = load_constraints(args.context)
        print("=== RESTRIÇÕES DETERMINÍSTICAS SIA (EVOLUTION.JSONL) ===")
        for r in rules:
            print(r)
    elif args.check:
        sanitize_file(args.check)
    elif args.validate:
        validate_ronda_mobile(args.validate)
