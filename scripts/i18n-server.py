# Wraps `message: "…"` (and `errors.x = "…"`) in t() in server action files, adds `const t = await getRequestT();` to
# each exported async function that then uses t(, and the import. Usage: python3 scripts/i18n-server.py file...
import re, sys
for p in sys.argv[1:]:
    s = open(p).read()
    s = re.sub(r'(message: |message = |\berr(?:ors)?\.\w+ = )("(?:[^"\\]|\\.)*")', lambda m: f'{m.group(1)}t({m.group(2)})', s)
    out, i = [], 0
    for m in re.finditer(r'export async function \w+\([^)]*\)[^{]*\{\n', s):
        out.append(s[i:m.end()]); i = m.end()
        # body until the next top-level "\n}\n"
        end = s.find('\n}\n', i)
        body = s[i:end if end > 0 else len(s)]
        if re.search(r'\bt\(', body) and 'const t = ' not in body:
            out.append('  const t = await getRequestT();\n')
    out.append(s[i:])
    s = ''.join(out)
    if 'getRequestT' in s and 'from "@/lib/i18n/server"' not in s:
        s = re.sub(r'(\nimport [^\n]+\n)(?!import)', r'\1import { getRequestT } from "@/lib/i18n/server";\n', s, count=1)
    open(p, 'w').write(s)
    print(p, s.count('t("'))
