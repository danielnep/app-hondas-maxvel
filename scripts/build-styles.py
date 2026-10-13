"""Preserve existing component structure while compiling one consistent visual theme."""
from pathlib import Path
import re

ROOT = Path(__file__).resolve().parent.parent
SOURCES = [
    'styles.css', 'assets/horizon-operacional.css', 'assets/horizon-graphite.css',
    'assets/maxvel-mobile-02.css', 'assets/maxvel-rev3.css', 'assets/maxvel-04.css',
    'assets/maxvel-05.css', 'assets/maxvel-obsidian-06.css', 'assets/maxvel-refinement-07.css',
]


def split_top(text, separator):
    start = depth = 0
    quote = None
    escaped = False
    for i, char in enumerate(text):
        if escaped:
            escaped = False
            continue
        if char == '\\':
            escaped = True
            continue
        if quote:
            if char == quote:
                quote = None
            continue
        if char in "\"'":
            quote = char
        elif char == '(':
            depth += 1
        elif char == ')':
            depth -= 1
        elif char == separator and depth == 0:
            yield text[start:i]
            start = i + 1
    yield text[start:]


def declarations(selector, block):
    result = []
    geographic = any(key in selector for key in ('map-marker', 'map-person', 'map-pin-host', 'map-person-host'))
    for declaration in split_top(block, ';'):
        if ':' not in declaration:
            continue
        prop, value = declaration.split(':', 1)
        prop, value = prop.strip(), value.strip()
        if prop.startswith('--') or prop in ('font-family', 'font', 'color-scheme'):
            continue
        if not geographic and (prop.startswith('background') or prop in ('color', 'box-shadow', 'text-shadow', 'border-radius') or prop.endswith('-radius')):
            continue
        if prop == 'border-color' or prop.endswith('-color') and prop.startswith('border'):
            value = 'var(--mx-line)' + ('!important' if '!important' in value else '')
        elif prop in ('border', 'border-top', 'border-bottom', 'border-left', 'border-right', 'border-block', 'border-inline'):
            value = re.sub(r'#[0-9a-fA-F]{3,8}\b', 'var(--mx-line)', value)
        result.append(prop + ':' + value)
    return ';'.join(result)


def structure(text, only=None):
    text = re.sub(r'/\*.*?\*/', '', text, flags=re.S)
    output = []
    cursor = 0
    while cursor < len(text):
        opening = text.find('{', cursor)
        if opening < 0:
            break
        selector = text[cursor:opening].strip()
        # Legacy font imports are deliberately replaced by one shared family.
        selector = re.sub(r'@import\s+[^;]*;', '', selector).strip()
        level, end, quote = 1, opening + 1, None
        while end < len(text) and level:
            char = text[end]
            if quote:
                if char == quote and text[end - 1] != '\\':
                    quote = None
            elif char in "\"'":
                quote = char
            elif char == '{':
                level += 1
            elif char == '}':
                level -= 1
            end += 1
        if level:
            raise ValueError('Unclosed CSS block: ' + selector[:80])
        block = text[opening + 1:end - 1]
        body = structure(block, only) if selector.startswith(('@media', '@supports', '@keyframes', '@container')) else (declarations(selector, block) if only is None or only in selector else '')
        if body and selector:
            output.append(selector + '{' + body + '}')
        cursor = end
    return '\n'.join(output)


font = "@import url('https://fonts.googleapis.com/css2?family=Exo+2:wght@400;500;600;700&family=Rajdhani:wght@400;500;600;700&display=swap');\n"
compiled = font + '\n'.join(structure((ROOT / source).read_text()) for source in SOURCES)
compiled += '\n' + structure((ROOT / 'assets/maxvel-06.css').read_text(), only='ux06')
compiled += '\n' + (ROOT / 'assets/ronda-pro-theme.css').read_text()
compiled += '\n' + (ROOT / 'assets/ronda-pro-layout.css').read_text()
compiled += '\n' + (ROOT / 'assets/ronda-pro-motion.css').read_text()
(ROOT / 'assets/ronda-pro.css').write_text(compiled)
print('Compiled one stylesheet:', len(compiled), 'characters')
