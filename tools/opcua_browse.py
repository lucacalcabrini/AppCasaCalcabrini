#!/usr/bin/env python3
"""
Browse del PLC OPC UA di casa (Siemens S7-1200).

Replica esattamente la connessione del plugin Android (OpcUaPlugin.java):
endpoint opc.tcp://192.168.178.250:4840, SecurityPolicy=None, anonymous.

Da lanciare dal PC quando sei sulla STESSA WiFi/LAN del PLC (192.168.178.x).

Setup (una volta):
    pip install asyncua

Uso:
    python tools/opcua_browse.py                # browse del DB DbCasa
    python tools/opcua_browse.py --full         # browse di tutto Objects (piu lento)
    python tools/opcua_browse.py --read         # legge anche i nodi noti dall'app
    python tools/opcua_browse.py --host 192.168.1.50  # IP alternativo
"""

import argparse
import asyncio
import sys

from asyncua import Client, ua

DEFAULT_HOST = "192.168.178.250"
DEFAULT_PORT = 4840

# Nodo radice del DB principale (vedi opcua.js / CLAUDE.md)
DB_ROOT = 'ns=3;s="DbCasa"'

NODE_CLASS_NAME = {
    ua.NodeClass.Object: "Object",
    ua.NodeClass.Variable: "Variable",
    ua.NodeClass.Method: "Method",
    ua.NodeClass.ObjectType: "ObjectType",
    ua.NodeClass.VariableType: "VariableType",
    ua.NodeClass.DataType: "DataType",
    ua.NodeClass.View: "View",
    ua.NodeClass.ReferenceType: "ReferenceType",
}


async def describe_variable(node):
    """Restituisce '<tipo> = <valore>' per un nodo Variable, gestendo errori."""
    try:
        dv = await node.read_data_value()
        val = dv.Value.Value
        variant_type = dv.Value.VariantType.name if dv.Value.VariantType else "?"
        status = dv.StatusCode.name if dv.StatusCode else ""
        suffix = f"  [{status}]" if status and status != "Good" else ""
        return f"{variant_type} = {val!r}{suffix}"
    except Exception as e:  # noqa: BLE001
        return f"<lettura fallita: {e}>"


async def browse_recursive(node, depth, max_depth, visited):
    node_str = node.nodeid.to_string()
    if node_str in visited:
        return
    visited.add(node_str)

    try:
        bn = await node.read_browse_name()
        nclass = await node.read_node_class()
    except Exception as e:  # noqa: BLE001
        print("  " * depth + f"- <errore lettura nodo {node_str}: {e}>")
        return

    cls = NODE_CLASS_NAME.get(nclass, str(nclass))
    line = "  " * depth + f"- {bn.Name}  ({cls})  [{node_str}]"

    if nclass == ua.NodeClass.Variable:
        line += "  ->  " + await describe_variable(node)

    print(line)

    if depth >= max_depth:
        return

    try:
        children = await node.get_children()
    except Exception as e:  # noqa: BLE001
        print("  " * (depth + 1) + f"<browse figli fallito: {e}>")
        return

    for child in children:
        await browse_recursive(child, depth + 1, max_depth, visited)


async def read_known_nodes(client):
    """Legge i nodi che usa l'app, come sanity check."""
    print("\n=== LETTURA NODI NOTI (come fa l'app) ===")
    # 16 utenze: Attiva (Bool) + Temp (Real); 32 allarmi: Attivo (Bool)
    for i in range(16):
        for field, kind in (("Attiva", "Bool"), ("Temp", "Real")):
            nid = f'ns=3;s="DbCasa".Utenze[{i}].{field}'
            try:
                val = await client.get_node(nid).read_value()
                print(f"  Utenze[{i:2}].{field:7} ({kind}) = {val!r}")
            except Exception as e:  # noqa: BLE001
                print(f"  Utenze[{i:2}].{field:7} ({kind}) -> errore: {e}")
    for i in range(32):
        nid = f'ns=3;s="DbCasa".Allarmi[{i}].Attivo'
        try:
            val = await client.get_node(nid).read_value()
            print(f"  Allarmi[{i:2}].Attivo (Bool) = {val!r}")
        except Exception as e:  # noqa: BLE001
            print(f"  Allarmi[{i:2}].Attivo (Bool) -> errore: {e}")


async def main():
    parser = argparse.ArgumentParser(description="Browse OPC UA del PLC di casa")
    parser.add_argument("--host", default=DEFAULT_HOST, help="IP del PLC")
    parser.add_argument("--port", type=int, default=DEFAULT_PORT)
    parser.add_argument("--depth", type=int, default=4, help="profondita massima del browse")
    parser.add_argument("--full", action="store_true",
                        help="browse da Objects invece che dal solo DbCasa")
    parser.add_argument("--read", action="store_true",
                        help="leggi anche i nodi noti usati dall'app")
    args = parser.parse_args()

    url = f"opc.tcp://{args.host}:{args.port}"
    print(f"Connessione a {url}  (SecurityPolicy=None, anonymous)...")

    client = Client(url=url)
    # Default asyncua = nessuna security, anonymous: identico al plugin Java.
    try:
        await client.connect()
    except Exception as e:  # noqa: BLE001
        print(f"\n[ERRORE] Connessione fallita: {e}")
        print("Controlla di essere sulla stessa rete del PLC e che la porta 4840 sia raggiungibile.")
        sys.exit(1)

    try:
        print("Connesso.\n")

        # NamespaceArray: l'app hardcoda ns=3, ma l'indice non e' garantito.
        # Qui mappiamo indice -> URI per confermare dove sta il namespace SIMATIC.
        try:
            ns = await client.get_namespace_array()
            print("=== NAMESPACE ARRAY (indice -> URI) ===")
            for i, uri in enumerate(ns):
                print(f"  ns={i}  {uri}")
            print()
        except Exception as e:  # noqa: BLE001
            print(f"<lettura NamespaceArray fallita: {e}>\n")

        visited = set()

        if args.full:
            print("=== BROWSE da Objects ===")
            root = client.nodes.objects
            await browse_recursive(root, 0, args.depth, visited)
        else:
            print(f"=== BROWSE da {DB_ROOT} ===")
            try:
                db = client.get_node(DB_ROOT)
                await browse_recursive(db, 0, args.depth, visited)
            except Exception as e:  # noqa: BLE001
                print(f"Impossibile aprire {DB_ROOT}: {e}")
                print("Riprovo browsando da Objects (usa --full per saltare direttamente qui)...")
                await browse_recursive(client.nodes.objects, 0, args.depth, visited)

        if args.read:
            await read_known_nodes(client)
    finally:
        await client.disconnect()
        print("\nDisconnesso.")


if __name__ == "__main__":
    asyncio.run(main())
