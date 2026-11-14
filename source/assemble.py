from pathlib import Path
import json, re

build = Path("dist/index.html").read_text(encoding="utf-8")
layers = Path("layers")

style_ids = ["unslop-pass", "polish-pass", "mobile-ux", "prospect-dual"]
script_ids = ["mobile-ux-script", "a11y-pass", "unslop-emoji", "photo-manifest", "photo-fallback"]

css_parts = []
for name in style_ids:
    f = layers / f"{name}.html"
    if not f.exists():
        continue
    html = f.read_text(encoding="utf-8")
    inner = re.sub(r"^<style[^>]*>", "", html).rsplit("</style>", 1)[0]
    css_parts.append("/* " + name + " */\n" + inner)

css = "\n".join(css_parts)

# 듀얼 프레임 규칙은 특이도를 높여 런타임 주입 CSS보다 우선시키기
css += """
/* 런타임 주입 CSS보다 우선 (특이도 상향) */
html body .tc-shell.is-champ.is-prospect .tc-frame {
  background:
    radial-gradient(58% 62% at 16% 14%, rgba(255,250,224,.98) 0%, rgba(240,198,96,.72) 34%, rgba(180,130,40,.22) 62%, rgba(0,0,0,0) 78%),
    radial-gradient(58% 62% at 84% 86%, rgba(236,249,255,.98) 0%, rgba(96,165,250,.70) 36%, rgba(37,99,235,.24) 64%, rgba(0,0,0,0) 80%),
    linear-gradient(135deg, #171006 0%, #3a2a0c 26%, #0c111c 52%, #0e2444 74%, #0a1424 100%) !important;
  box-shadow: -7px -7px 24px rgba(250,204,21,.26), 7px 7px 24px rgba(59,130,246,.30), 0 18px 38px rgba(0,0,0,.86) !important;
}
html body .tc-shell.is-champ.is-prospect:hover .tc-frame {
  background:
    radial-gradient(66% 70% at 14% 12%, #ffffff 0%, rgba(250,226,140,.85) 30%, rgba(200,150,50,.28) 60%, rgba(0,0,0,0) 78%),
    radial-gradient(66% 70% at 86% 88%, #ffffff 0%, rgba(160,205,255,.85) 32%, rgba(37,99,235,.30) 62%, rgba(0,0,0,0) 80%),
    linear-gradient(135deg, #1d1408 0%, #46320d 26%, #0d1320 52%, #102a4f 74%, #0a1424 100%) !important;
  box-shadow: -9px -9px 28px rgba(250,204,21,.34), 9px 9px 28px rgba(59,130,246,.40), 0 22px 44px rgba(0,0,0,.9) !important;
}
html body .tc-shell.is-champ.is-prospect .tc-name-text,
html body .tc-shell.is-champ.is-prospect:hover .tc-name-text {
  background: linear-gradient(100deg, #ffe89e 0%, #ffffff 44%, #dbeafe 62%, #60a5fa 100%) !important;
  -webkit-background-clip: text !important;
  background-clip: text !important;
  color: #e0f2fe !important;
  -webkit-text-fill-color: transparent !important;
  text-shadow: none !important;
}
"""

style_boot = (
    '<script id="layer-styles">(function(){if(window.__layerStyles)return;window.__layerStyles=1;'
    "var css=" + json.dumps(css) + ";"
    "function attach(){var s=document.createElement('style');s.id='layers-runtime';s.textContent=css;"
    "document.head.appendChild(s);}"
    "if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',attach);else attach();"
    "})();</script>"
)

scripts = []
for name in script_ids:
    f = layers / f"{name}.html"
    if f.exists():
        scripts.append(f.read_text(encoding="utf-8"))

out = build.replace("</head>", style_boot + "\n</head>", 1)
out = out.replace("</body>", "\n".join(scripts) + "\n</body>", 1)
Path("dist/index-final.html").write_text(out, encoding="utf-8")
print("assembled bytes:", len(out.encode("utf-8")), "| css:", len(css))
