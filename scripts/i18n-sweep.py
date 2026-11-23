# Rough finder of French text not wrapped in t(): JSX text and string literals with French words, in public code.
import re, sys, pathlib
FR = re.compile(r"\b(le|la|les|des|du|une|ton|ta|tes|pour|avec|sur|dans|est|pas|nous|vous|tu|ici|plus|ou|et)\b|[àâçéèêëîïôûùœ]", re.I)
files = [p for p in pathlib.Path("src").rglob("*.tsx") if "/admin/" not in str(p) and "generated" not in str(p)] + [p for p in pathlib.Path("src/server").rglob("*.ts") if "/admin/" not in str(p)] + list(pathlib.Path("src/lib").rglob("*.ts"))
for p in files:
    if "i18n" in str(p): continue
    for n, line in enumerate(p.read_text().splitlines(), 1):
        s = line.strip()
        if s.startswith(("//", "*", "/*", "import", "{/*")) or "console." in s or "logActivity" in s or "logError" in s or "reportClientError" in s: continue
        # JSX text between tags, or plain quoted strings
        cands = re.findall(r">([^<>{}]{4,})<", s) + re.findall(r'(?<![\w.(])"([^"]{6,})"', s) + re.findall(r"`([^`]{8,})`", s)
        if re.match(r"^[A-ZÀ-Ü][^<>{}=;()]{6,}$", s): cands.append(s)
        for c in cands:
            if FR.search(c) and " " in c and not re.search(r"\bt\(|className|https?:|\.\w{2,4}$|^[a-z-]+(:|\s)", c) and not re.search(r'\bt\(\s*["`]' + re.escape(c[:15]), line):
                print(f"{p}:{n}: {c[:110]}")
                break
