# Adds entries to src/lib/i18n/en.ts: python3 scripts/en-add.py "Section" <<< '{"fr": "en", ...}' (JSON on stdin). Existing keys are kept.
import json, sys, re
p = "src/lib/i18n/en.ts"
s = open(p).read()
new = json.loads(sys.stdin.read())
have = set(json.loads(m) for m in re.findall(r'^\s*("(?:[^"\\]|\\.)*")\s*:', s, re.M))
lines = [f"  {json.dumps(k, ensure_ascii=False)}: {json.dumps(v, ensure_ascii=False)}," for k, v in new.items() if k not in have]
if lines:
    block = f"\n  // {sys.argv[1]}\n" + "\n".join(lines) + "\n"
    i = s.rindex("};")
    s = s[:i].rstrip("\n") + "\n" + block + "};\n"
    open(p, "w").write(s)
print(f"+{len(lines)}")
