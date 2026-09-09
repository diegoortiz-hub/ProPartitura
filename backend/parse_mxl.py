"""
parse_mxl.py — Convierte la salida de Audiveris (MXL/XML) en partitura notada.

Llamado desde backend/server.js vía spawnSync. Delega en backend-py/notation.py
para no duplicar la lógica de notación entre la ruta de imagen y la de audio.

A diferencia del audio, el MusicXML de Audiveris ya trae compases y figuras del
grabador original. Lo que faltaba antes era conservar los silencios: sin ellos la
suma de tiempos de cada compás nunca cuadra con la cifra indicadora.

Salida: JSON por stdout — {"notes", "voices", "musicXml", "timeSignature", ...}
        o {"error": "..."}
"""
import sys
import json
import os

# notation.py vive en el backend de Python; se comparte entre ambas rutas
_NOTATION_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "backend-py")
sys.path.insert(0, os.path.abspath(_NOTATION_DIR))


def parse(path: str) -> dict:
    import notation
    return notation.notated_xml_to_output(path, max_notes=128)


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print(json.dumps({"error": "Uso: parse_mxl.py <ruta_archivo.mxl>"}))
        sys.exit(1)
    try:
        result = parse(sys.argv[1])
        if not result.get("notes"):
            print(json.dumps({"error": "No se detectaron notas en la partitura."}))
            sys.exit(1)
        print(json.dumps(result))
    except Exception as exc:
        print(json.dumps({"error": f"{type(exc).__name__}: {exc}"}))
        sys.exit(1)
