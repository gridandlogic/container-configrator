"""Resize preview finish maps with Pillow; keep originals in the ignored build cache."""
from io import BytesIO
from pathlib import Path
import shutil
from PIL import Image

root = Path(__file__).resolve().parents[1]
assets = root / "public/container-configurator/textures"
backup = root / "node_modules/.cache/original-preview-textures"
before = after = count = 0
for folder in ("wood/light-oak", "wood/natural-oak", "wood/dark-walnut", "wood/warm-wood", "walls/concrete"):
    for channel in ("color", "normal", "arm"):
        target = assets / folder / f"{channel}.webp"
        original = target.read_bytes()
        with Image.open(BytesIO(original)) as source:
            if max(source.size) <= 512:
                continue
            source = source.convert("RGB")
            source.thumbnail((512, 512), Image.Resampling.LANCZOS)
            result = BytesIO()
            source.save(result, "WEBP", quality={"color": 84, "normal": 94, "arm": 92}[channel], method=6)
        encoded = result.getvalue()
        if len(encoded) >= len(original):
            continue
        saved = backup / folder / target.name
        saved.parent.mkdir(parents=True, exist_ok=True)
        if not saved.exists():
            shutil.copyfile(target, saved)
        target.write_bytes(encoded)
        before += len(original)
        after += len(encoded)
        count += 1
print(f"{count} finish maps: {before:,} -> {after:,} bytes ({(1-after/before)*100:.1f}% smaller)." if before else "Finish maps are already optimized.")
