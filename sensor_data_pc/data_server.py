import sys
import json
import socket
import threading
import queue
import os

# ====== 設定 ======
SERVER = '10.192.138.204'
WAITING_PORT = 8765
LOOP_WAIT = 10
base_dir = os.path.dirname(os.path.abspath(__file__))
file_name = os.path.join(base_dir, 'data.csv')
write_queue = queue.Queue()

# ====== 書き込みスレッド ======
def file_writer():
    print("[Writer] Writer thread started.")
    while True:
        row = write_queue.get()
        if row is None:
            print("[Writer] Stop signal received.")
            break
        try:
            with open(file_name, 'a', encoding='utf-8') as f:
                f.write(row + '\n')
            print(f"[Writer] Wrote row: {row}, QueueSize={write_queue.qsize()}")
        except Exception as e:
            print(f"[Writer] Write error: {e}")
        write_queue.task_done()

# ====== 受信スレッド ======
def data_recv(client_socket, client_address):
    print(f"[Receiver] Connection from {client_address}")
    try:
        data_raw = client_socket.recv(1024)
        data_json = data_raw.decode('utf-8').strip()
        if not data_json:
            print("[Receiver] No data received.")
            return

        data_list = json.loads(data_json)
        data = data_list[0]
        row = f"{data['Date']},{data['Time']},{data['Temperature']},{data['Humidity']},{data.get('Location', 'unknown')}"
        method = data.get("Method", "unknown")
        write_queue.put(row)
        print(f"[Receiver] Queued row: {row}, Method={method}, QueueSize={write_queue.qsize()}")

    except Exception as e:
        print(f"[Receiver] Error: {e}")
    finally:
        print("[Receiver] Closing socket.")
        client_socket.close()

# ====== サーバ起動 ======
def server_test(server_ip=SERVER, port=WAITING_PORT):
    sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    sock.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
    sock.bind((server_ip, port))
    sock.listen(5)
    print(f"[Server] Listening on {server_ip}:{port}")

    writer_thread = threading.Thread(target=file_writer, daemon=True)
    writer_thread.start()

    try:
        while True:
            client_sock, client_addr = sock.accept()
            threading.Thread(target=data_recv, args=(client_sock, client_addr), daemon=True).start()
    except KeyboardInterrupt:
        print("\n[Server] KeyboardInterrupt: Shutting down.")
        write_queue.put(None)
        writer_thread.join()
    finally:
        sock.close()
        print("[Server] Socket closed.")

# ====== 実行ブロック ======
if __name__ == '__main__':
    print("Start if __name__ == '__main__'")
    hostname = SERVER
    port = WAITING_PORT

    args = sys.argv[1:]
    i = 0
    while i < len(args):
        if args[i] == "-h":
            i += 1; hostname = args[i]
        elif args[i] == "-p":
            i += 1; port = int(args[i])
        i += 1

    print(f"host: {hostname}")
    print(f"port: {port}")
    server_test(hostname, port)
