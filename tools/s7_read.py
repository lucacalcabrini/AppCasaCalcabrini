#!/usr/bin/env python3
"""
Test GET/PUT (comunicazione S7) verso il PLC S7-1200.

Modalità:
  1) --db6          legge direttamente DbCasa (DB6) — APPROCCIO PRINCIPALE.
                    Richiede solo: PUT/GET abilitato + DbCasa non ottimizzata.
  2) --temps        legge le temperature da DbRiscaldamento (DB1, sempre non-ottimizzata)
                    — utile per verificare la connessione senza toccare DbCasa.
  3) --raw-real     legge un singolo Real da qualsiasi DB a offset arbitrario.
  4) (default)      legge DbExt (DB20) se è già stata creata in TIA (approccio legacy).

Setup (una volta):
    pip install python-snap7

Uso consigliato:
    python tools/s7_read.py --db6               # legge DbCasa DB6 completo
    python tools/s7_read.py --db6 --write 0 on  # accende luce_camera (Req[0]=1)
    python tools/s7_read.py --temps             # test connessione via DB1

Prerequisito DbCasa: TIA → DbCasa → Proprietà → "Accesso ottimizzato" = OFF → compila+scarica
"""

import argparse
import struct
import sys

import snap7
from snap7.util import get_bool, get_real, get_int, set_int

# ---------------------------------------------------------------------------
# Nomi utenze (da src/config.js)
# ---------------------------------------------------------------------------
LUCI = [
    "luce_camera", "luce_cucina", "luce_sala", "luce_studio", "luce_bagno_bianco",
    "luce_cameretta", "luce_scale", "luce_esterna", "luce_bagno_blu", "luce_ingresso",
    "luce_cantina", "caldaia_pellet", "luce_corridoio", "luce_crepuscolare", "(14)", "(15)",
]
ALLARMI = [
    "POMPA_GUASTO", "TEMP_LOCALE_ALTA", "PORTONE_APERTO", "PERDITA_ACQUA",
    "RISCALDAMENTO_GUASTO", "RETE_ASSENTE", "COMM_PLC_POZZO_KO", "TEMP_EST_CRITICA",
]

# ---------------------------------------------------------------------------
# DbCasa (DB6) — lettura diretta (layout da export TIA 2026-05-21)
# Richiede: "Accesso ottimizzato al blocco" = OFF in TIA → compila+scarica
# ---------------------------------------------------------------------------
DB6_UT_STRIDE     = 542
DB6_UT_ATTIVA_REL = 512   # bit 0
DB6_UT_TEMP_REL   = 514   # float32 BE (+2 rispetto a ATTIVA)
DB6_UT_REQ_REL    = 518   # Int16 BE  (+6 rispetto a ATTIVA) — write
DB6_UT_READ_START = 512
DB6_UT_READ_SIZE  = 15 * DB6_UT_STRIDE + 6   # 8136

DB6_AL_BASE       = 8672  # Allarmi[0] offset assoluto
DB6_AL_STRIDE     = 528
DB6_AL_ATTIVO_REL = 512   # bit 1 (bit 0 = Abilitato)
DB6_AL_READ_START = DB6_AL_BASE + DB6_AL_ATTIVO_REL   # 9184
DB6_AL_NUM        = 8
DB6_AL_READ_SIZE  = (DB6_AL_NUM - 1) * DB6_AL_STRIDE + 1  # 3697

# ---------------------------------------------------------------------------
# DbExt (legacy, default DB20)
# ---------------------------------------------------------------------------
ATTIVA_BYTE = 0
ALLARME_BYTE = 2
TEMP_BYTE = 6
REQ_BYTE = 70
TOTAL_SIZE = 102

# ---------------------------------------------------------------------------
# DbRiscaldamento (DB1) — temperature stanze (OFFSETS.md)
# Ogni stanza: ActTemp = base + 134, Real (float32 BE)
# ---------------------------------------------------------------------------
DB1_TEMPS = [
    (  10, "Camera"),
    ( 218, "Cameretta"),
    ( 426, "Ingresso"),
    ( 634, "Studio"),
    ( 842, "Corridoio"),
    (1050, "Cantina"),
    (1258, "Salone"),
    (1466, "Cucina"),
    (1674, "BagnoBlu"),
    (1882, "BagnoBianco"),
]
DB1_ACTTEMP_REL = 134  # offset relativo di ActTemp dentro TempStanze


def read_real_be(data: bytearray, offset: int) -> float:
    """Legge un Real S7 (float32 big-endian) da un bytearray."""
    return struct.unpack_from(">f", data, offset)[0]


def dump_dbext(data: bytearray) -> None:
    print("\n=== DbExt — UTENZE (Attiva / Temp / Req) ===")
    for i in range(16):
        att = get_bool(data, ATTIVA_BYTE + i // 8, i % 8)
        temp = get_real(data, TEMP_BYTE + i * 4)
        req = get_int(data, REQ_BYTE + i * 2)
        nome = LUCI[i] if i < len(LUCI) else f"({i})"
        print(f"  [{i:2}] {nome:20} attiva={int(att)}  temp={temp:6.1f}°C  req={req}")

    print("\n=== DbExt — ALLARMI (Attivo) ===")
    for i in range(32):
        att = get_bool(data, ALLARME_BYTE + i // 8, i % 8)
        nome = ALLARMI[i] if i < len(ALLARMI) else f"allarme_{i}"
        flag = "ATTIVO" if att else "-"
        print(f"  [{i:2}] {nome:24} {flag}")


def dump_db6(client: snap7.client.Client, write_idx: int | None = None, write_val: int | None = None) -> None:
    """Legge (e opzionalmente scrive) direttamente DbCasa (DB6)."""
    # scrittura comando (Req[idx])
    if write_idx is not None and write_val is not None:
        offset = write_idx * DB6_UT_STRIDE + DB6_UT_REQ_REL
        buf = bytearray(2)
        set_int(buf, 0, write_val)
        client.db_write(6, offset, bytes(buf))
        print(f"Scritto DB6 Req[{write_idx}] = {write_val} ({'ON' if write_val == 1 else 'OFF'})  @ offset {offset}")

    # lettura utenze
    ut_raw = bytearray(client.db_read(6, DB6_UT_READ_START, DB6_UT_READ_SIZE))
    print(f"\n=== DbCasa DB6 — UTENZE  (batch start={DB6_UT_READ_START}, size={DB6_UT_READ_SIZE}) ===")
    for i, nome in enumerate(LUCI):
        off = i * DB6_UT_STRIDE
        attiva = (ut_raw[off] & 1) == 1
        temp = read_real_be(ut_raw, off + (DB6_UT_TEMP_REL - DB6_UT_ATTIVA_REL))
        print(f"  [{i:2}] {nome:20} attiva={int(attiva)}  temp={temp:6.1f}°C")

    # lettura allarmi
    al_raw = bytearray(client.db_read(6, DB6_AL_READ_START, DB6_AL_READ_SIZE))
    print(f"\n=== DbCasa DB6 — ALLARMI  (batch start={DB6_AL_READ_START}, size={DB6_AL_READ_SIZE}) ===")
    for j in range(DB6_AL_NUM):
        off = j * DB6_AL_STRIDE
        attivo = (al_raw[off] >> 1) & 1   # bit 1
        nome = ALLARMI[j] if j < len(ALLARMI) else f"allarme_{j}"
        flag = "ATTIVO" if attivo else "-"
        print(f"  [{j}] {nome:28} {flag}")


def dump_db1_temps(client: snap7.client.Client) -> None:
    """Legge ActTemp di tutte le stanze da DbRiscaldamento (DB1)."""
    print("\n=== DbRiscaldamento (DB1) — Temperature stanze ===")
    for base, nome in DB1_TEMPS:
        offset = base + DB1_ACTTEMP_REL
        try:
            raw = client.db_read(1, offset, 4)
            temp = read_real_be(bytearray(raw), 0)
            print(f"  {nome:12} (DB1 +{offset:4})  {temp:.1f} °C")
        except Exception as e:  # noqa: BLE001
            print(f"  {nome:12} (DB1 +{offset:4})  ERRORE: {e}")


def connect(host: str, rack: int, slot: int) -> snap7.client.Client:
    client = snap7.client.Client()
    print(f"Connessione a {host} rack={rack} slot={slot} (S7comm :102)...")
    try:
        client.connect(host, rack, slot)
    except Exception as e:  # noqa: BLE001
        print(f"\n[ERRORE] Connessione fallita: {e}")
        print("Verifica: PUT/GET abilitato in TIA, stessa rete, porta 102 raggiungibile.")
        sys.exit(1)
    if not client.get_connected():
        print("[ERRORE] Non connesso.")
        sys.exit(1)
    print("Connesso. ✓")
    return client


def main() -> None:
    p = argparse.ArgumentParser(
        description="Test S7 GET/PUT — legge DB del PLC S7-1200",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=__doc__,
    )
    p.add_argument("--host", default="192.168.178.250")
    p.add_argument("--rack", type=int, default=0)
    p.add_argument("--slot", type=int, default=1)

    mode = p.add_mutually_exclusive_group()
    mode.add_argument(
        "--db6", action="store_true",
        help="legge DbCasa (DB6) direttamente — approccio principale dell'app",
    )
    mode.add_argument(
        "--temps", action="store_true",
        help="legge temperature da DbRiscaldamento DB1",
    )
    mode.add_argument(
        "--raw-real", nargs="+", metavar=("DB", "OFFSET"),
        help="legge Real da DB OFFSET [nome opzionale], es: --raw-real 1 144 Camera",
    )
    mode.add_argument(
        "--db", type=int, default=None, metavar="N",
        help="legge DbExt legacy dal DB numero N (default 20)",
    )

    p.add_argument(
        "--write", nargs=2, metavar=("IDX", "STATO"),
        help="(con --db6 o --db) scrive Req[IDX]=on|off, poi rilegge",
    )
    args = p.parse_args()

    # Se nessuna modalità → default DB6
    if not args.db6 and not args.temps and args.raw_real is None and args.db is None:
        args.db6 = True

    client = connect(args.host, args.rack, args.slot)
    try:
        if args.db6:
            wi, wv = None, None
            if args.write:
                wi = int(args.write[0])
                wv = 1 if args.write[1].lower() in ("on", "1") else 2
            dump_db6(client, wi, wv)

        elif args.temps:
            dump_db1_temps(client)

        elif args.raw_real is not None:
            if len(args.raw_real) < 2:
                p.error("--raw-real richiede almeno DB e OFFSET")
            db_num = int(args.raw_real[0])
            offset = int(args.raw_real[1])
            label = args.raw_real[2] if len(args.raw_real) > 2 else f"DB{db_num}[{offset}]"
            raw = client.db_read(db_num, offset, 4)
            temp = read_real_be(bytearray(raw), 0)
            print(f"\n  {label} = {temp:.2f}  (raw: {raw.hex()})")

        else:
            db_num = args.db
            if args.write:
                idx = int(args.write[0])
                val = 1 if args.write[1].lower() in ("on", "1") else 2
                buf = bytearray(2)
                set_int(buf, 0, val)
                client.db_write(db_num, REQ_BYTE + idx * 2, buf)
                print(f"Scritto Req[{idx}] = {val} ({'ON' if val == 1 else 'OFF'})")
            data = bytearray(client.db_read(db_num, 0, TOTAL_SIZE))
            dump_dbext(data)

    finally:
        client.disconnect()
        print("\nDisconnesso.")


if __name__ == "__main__":
    main()
