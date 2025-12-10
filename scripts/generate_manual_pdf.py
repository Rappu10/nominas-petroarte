import re
import textwrap
from datetime import date
from pathlib import Path

from reportlab.lib.pagesizes import A4
from reportlab.pdfgen import canvas


def main() -> None:
    manual_path = Path("manual_usuario.md")
    if not manual_path.exists():
        raise SystemExit("manual_usuario.md no encontrado")
    content = manual_path.read_text(encoding="utf-8")

    out_path = Path("manual_usuario.pdf")
    width, height = A4
    margin = 30
    line_gap = 4

    c = canvas.Canvas(str(out_path), pagesize=A4)
    c.setTitle("Manual de Usuario · PetroArte Nóminas")

    y = height - margin

    def new_page() -> None:
        nonlocal y
        c.showPage()
        y = height - margin

    def line_height(font_size: float) -> float:
        return font_size * 1.25 + line_gap

    def ensure_space(lines_needed: int, font_size: float) -> None:
        nonlocal y
        needed = line_height(font_size) * lines_needed
        if y - needed < margin:
            new_page()

    def draw_wrapped(text: str, font_name: str, font_size: float, indent: float = 0, width_chars: int = 90) -> None:
        nonlocal y
        wrapper = textwrap.wrap(text, width=width_chars)
        if not wrapper:
            wrapper = [""]
        for line in wrapper:
            ensure_space(1, font_size)
            c.setFont(font_name, font_size)
            c.drawString(margin + indent, y, line)
            y -= line_height(font_size)

    lines = content.splitlines()
    for raw in lines:
        line = raw.rstrip()
        if not line:
            y -= line_height(10)
            continue
        if line.startswith("# "):
            ensure_space(2, 24)
            draw_wrapped(line[2:].strip(), "Helvetica-Bold", 24, indent=0, width_chars=60)
            date_line = f"Generado el {date.today():%d/%m/%Y}"
            ensure_space(1, 10)
            c.setFont("Helvetica-Oblique", 10)
            c.drawString(margin, y, date_line)
            y -= line_height(10)
            y -= line_gap
            continue
        if line.startswith("## "):
            ensure_space(2, 16)
            draw_wrapped(line[3:].strip(), "Helvetica-Bold", 16, indent=0, width_chars=80)
            y -= line_gap
            continue
        numbered = re.match(r"^(\d+)\.\s+(.*)$", line)
        if numbered:
            num, tail = numbered.groups()
            ensure_space(1, 12)
            draw_wrapped(f"{num}. {tail.strip()}", "Helvetica", 12, indent=16, width_chars=74)
            continue
        if line.startswith("- "):
            ensure_space(1, 12)
            draw_wrapped(line[2:].strip(), "Helvetica", 12, indent=14, width_chars=70)
            continue
        draw_wrapped(line.strip(), "Helvetica", 12, indent=0, width_chars=90)
    c.save()


if __name__ == "__main__":
    main()
