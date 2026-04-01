#!/usr/bin/env python3
"""Generate images using Gemini API (google-genai SDK).

Usage:
  python3 ai-image.py "A minimal logo" -o ./assets/logo.png
  python3 ai-image.py "Abstract data viz" -o ./assets/hero.png --style "flat, minimal"
  python3 ai-image.py "Chart icon" -o ./assets/icon.png --remove-bg
  python3 ai-image.py "Similar style" -o ./assets/v2.png --reference ./assets/v1.png

Config:
  Set GEMINI_API_KEY or GOOGLE_API_KEY env var.
  Or create .spartan/ai.env with: GEMINI_API_KEY=your-key-here
  Model: Set GEMINI_IMAGE_MODEL env var (default: gemini-2.0-flash-preview-image-generation)

Setup:
  pip install google-genai Pillow
  pip install rembg          # only needed for --remove-bg
"""

import os
import sys
import argparse
import mimetypes
from pathlib import Path


def load_env():
    """Load env files in priority order: .spartan/ai.env, .env, ~/.spartan/ai.env"""
    search_paths = [
        Path(".spartan/ai.env"),
        Path(".env"),
        Path.home() / ".spartan" / "ai.env",
    ]

    for env_path in search_paths:
        if env_path.exists():
            with open(env_path) as f:
                for line in f:
                    line = line.strip()
                    if line and not line.startswith("#") and "=" in line:
                        key, _, value = line.partition("=")
                        key = key.strip()
                        value = value.strip()
                        if key not in os.environ:
                            os.environ[key] = value
            break


def load_reference_image(image_path, types_module):
    """Load a reference image and return it as a Gemini Part."""
    path = Path(image_path)
    if not path.exists():
        print(f"ERROR: Reference image not found: {image_path}", file=sys.stderr)
        sys.exit(1)

    mime_type, _ = mimetypes.guess_type(str(path))
    if not mime_type or not mime_type.startswith("image/"):
        mime_type = "image/png"

    image_bytes = path.read_bytes()
    print(
        f"  Reference image loaded: {path} ({len(image_bytes)} bytes, {mime_type})",
        file=sys.stderr,
    )

    return types_module.Part.from_bytes(data=image_bytes, mime_type=mime_type)


def remove_background(image_bytes):
    """Remove background from image bytes using rembg. Returns PNG bytes with alpha."""
    try:
        from rembg import remove
        from PIL import Image
        import io
    except ImportError:
        print(
            "ERROR: rembg not installed. Run: pip install rembg",
            file=sys.stderr,
        )
        sys.exit(1)

    print("  Removing background...", file=sys.stderr)
    input_image = Image.open(io.BytesIO(image_bytes))
    output_image = remove(input_image)

    buf = io.BytesIO()
    output_image.save(buf, format="PNG")
    result = buf.getvalue()
    print(
        f"  Background removed ({len(image_bytes)} -> {len(result)} bytes)",
        file=sys.stderr,
    )
    return result


def main():
    load_env()

    parser = argparse.ArgumentParser(description="Generate images with Gemini")
    parser.add_argument("prompt", help="Image generation prompt")
    parser.add_argument(
        "-o", "--output", required=True, help="Output file path (png)"
    )
    parser.add_argument(
        "--model",
        default=os.environ.get(
            "GEMINI_IMAGE_MODEL", "gemini-2.0-flash-preview-image-generation"
        ),
        help="Gemini model to use for image generation",
    )
    parser.add_argument("--style", help="Style hint appended to prompt")
    parser.add_argument(
        "--context",
        help="Extra context about the project/brand to include in the prompt",
    )
    parser.add_argument(
        "--reference",
        action="append",
        dest="references",
        help="Reference image path. Can be used multiple times. "
        "Gemini will see these images as visual context for generation.",
    )
    parser.add_argument(
        "--remove-bg",
        action="store_true",
        help="Remove background after generation (requires: pip install rembg). "
        "Outputs PNG with transparent alpha channel.",
    )
    parser.add_argument(
        "--retries",
        type=int,
        default=2,
        help="Number of retries if generation fails (default: 2)",
    )
    args = parser.parse_args()

    # Check dependencies
    try:
        from google import genai
        from google.genai import types
    except ImportError:
        print(
            "ERROR: google-genai not installed. Run: pip install google-genai",
            file=sys.stderr,
        )
        sys.exit(1)

    # Check API key
    api_key = os.environ.get("GEMINI_API_KEY") or os.environ.get("GOOGLE_API_KEY")
    if not api_key:
        print(
            "ERROR: No API key found. Set GEMINI_API_KEY env var or create .spartan/ai.env",
            file=sys.stderr,
        )
        sys.exit(1)

    # Build the text prompt with structured format
    text_parts = []
    if args.context:
        text_parts.append(f"Brand context: {args.context}")
    text_parts.append(f"Image description: {args.prompt}")
    if args.style:
        text_parts.append(f"Visual style: {args.style}")
    text_parts.append("Requirements: High quality, no watermarks, no text unless asked.")
    if args.remove_bg:
        text_parts.append(
            "Place the subject on a plain solid white background. "
            "Keep the subject cleanly separated from the background."
        )
    if args.references:
        text_parts.append(
            "Reference images are attached. Match their style, mood, and quality. "
            "Use them as visual inspiration, not as exact copies."
        )
    text_prompt = "\n".join(text_parts)

    # Build multimodal contents: reference images first, then text prompt
    contents = []
    if args.references:
        for ref_path in args.references:
            contents.append(load_reference_image(ref_path, types))
    contents.append(text_prompt)

    # Create output directory
    output_path = Path(args.output)
    output_path.parent.mkdir(parents=True, exist_ok=True)

    # Generate
    client = genai.Client(api_key=api_key)
    last_error = None

    for attempt in range(1, args.retries + 1):
        try:
            ref_note = ""
            if args.references:
                ref_note = f" with {len(args.references)} reference(s)"
            print(
                f"Generating image (attempt {attempt}/{args.retries}){ref_note}...",
                file=sys.stderr,
            )
            response = client.models.generate_content(
                model=args.model,
                contents=contents,
                config=types.GenerateContentConfig(
                    response_modalities=["TEXT", "IMAGE"],
                    image_config=types.ImageConfig(
                        image_size="1K",
                    ),
                ),
            )

            # Find the image part in the response
            if not response.candidates:
                print("  No candidates in response", file=sys.stderr)
                continue

            for part in response.candidates[0].content.parts:
                if hasattr(part, "inline_data") and part.inline_data is not None:
                    mime = part.inline_data.mime_type
                    if mime and mime.startswith("image/"):
                        image_bytes = part.inline_data.data

                        # Remove background if requested
                        if args.remove_bg:
                            image_bytes = remove_background(image_bytes)

                        output_path.write_bytes(image_bytes)
                        print(f"OK {output_path}", flush=True)
                        return

            # No image found — check for text explaining why
            for part in response.candidates[0].content.parts:
                if hasattr(part, "text") and part.text:
                    print(f"  Model response: {part.text[:200]}", file=sys.stderr)

            last_error = "No image data in response"

        except Exception as e:
            last_error = str(e)
            print(f"  Error: {last_error}", file=sys.stderr)

    print(f"FAILED after {args.retries} attempts: {last_error}", file=sys.stderr)
    sys.exit(1)


if __name__ == "__main__":
    main()
