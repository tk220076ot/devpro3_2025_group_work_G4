import sys
import time
import datetime
import json
import socket
import threading
import queue

#SERVER = 'localhost'
SERVER = '10.192.138.201'
WAITING_PORT = 8765
LOOP_WAIT = 10
file_name = './data.csv'

write_queue = queue.Queue()

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
            print(f"[Writer] Wrote row: {row}")
        except Exception as e:
            print(f"[Writer] Write error: {e}")
        write_queue.task_done()

def data_recv(socket, client_address):
    print(f"[Receiver] Connection from {client_address}")
    try:
        data_r = socket.recv(1024)
        data_r_json = data_r.decode('utf-8')
        if not data_r_json.strip():
            print("[Receiver] No data.")
            return
        data_r_list = json.loads(data_r_json)
        data0 = data_r_list[0]
        date_dht = data0["Date"]
        time_dht = data0["Time"]
        tempe_dht = data0["Temperature"]
        humid_dht = data0["Humidity"]
        location = data0.get("Location", "unknown")

        row_str = f"{date_dht},{time_dht},{tempe_dht},{humid_dht},{location}"
        write_queue.put(row_str)

    except Exception as e:
        print(f"[Receiver] Error: {e}")
    finally:
        print("[Receiver] Closing socket.")
        socket.close()

def server_test(server_v1=SERVER, waiting_port_v1=WAITING_PORT):
    socket_w = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    socket_w.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
    socket_w.bind((server_v1, waiting_port_v1))
    socket_w.listen(5)

    print(f"[Server] Listening on {server_v1}:{waiting_port_v1}")

    writer_thread = threading.Thread(target=file_writer, daemon=True)
    writer_thread.start()

    try:
        while True:
            try:
                socket_s_r, client_address = socket_w.accept()
                thread = threading.Thread(target=data_recv, args=(socket_s_r, client_address), daemon=True)
                thread.start()
            except json.decoder.JSONDecodeError:
                print("[Server] JSONDecodeError")
            time.sleep(LOOP_WAIT)
    except KeyboardInterrupt:
        print("[Server] KeyboardInterrupt: Shutting down.")
        write_queue.put(None)
        writer_thread.join()
        socket_w.close()

if __name__ == '__main__':
    print("Start if __name__ == '__main__'")

    sys_argc = len(sys.argv)
    count = 1
    hostname_v = SERVER
    waiting_port_v = WAITING_PORT

    while count < sys_argc:
        option_key = sys.argv[count]
        if option_key == "-h":
            count += 1
            hostname_v = sys.argv[count]
        elif option_key == "-p":
            count += 1
            waiting_port_v = int(sys.argv[count])
        count += 1

    print(hostname_v)
    print(waiting_port_v)
    
    server_test(hostname_v, waiting_port_v)
