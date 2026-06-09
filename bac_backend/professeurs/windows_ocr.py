import json
import shutil
import subprocess
from pathlib import Path


def extract_pdf_text_with_windows_ocr(pdf_path, language_tag="ar-SA"):
    script_path = Path(__file__).with_name("windows_pdf_ocr.ps1")
    powershell_executable = shutil.which("powershell") or r"C:\Windows\System32\WindowsPowerShell\v1.0\powershell.exe"
    command = [
        powershell_executable,
        "-NoProfile",
        "-ExecutionPolicy",
        "Bypass",
        "-File",
        str(script_path),
        "-PdfPath",
        str(Path(pdf_path)),
        "-LanguageTag",
        str(language_tag or "ar-SA"),
    ]

    result = subprocess.run(
        command,
        capture_output=True,
        text=True,
        encoding="utf-8",
        errors="replace",
        check=False,
    )

    # Some WinRT OCR calls can crash PowerShell on process teardown (exit code != 0)
    # even though the JSON payload is already printed to stdout.
    payload = (result.stdout or "").strip() or (result.stderr or "").strip()
    if not payload:
        return {"text": "", "lines": []}

    try:
        data = json.loads(payload)
    except json.JSONDecodeError as exc:
        if result.returncode != 0:
            error_message = (result.stderr or result.stdout or "").strip()
            raise RuntimeError(error_message or "Windows OCR failed.") from exc
        raise RuntimeError(f"Invalid OCR response: {exc}") from exc

    return {
        "text": str(data.get("text") or ""),
        "lines": [str(line) for line in (data.get("lines") or []) if str(line).strip()],
    }
