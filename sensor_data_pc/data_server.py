import sys
import time
import datetime
import json

#SERVER = 'localhost'
SERVER = '10.192.138.201'
WAITING_PORT = 8765

LOOP_WAIT = 5

now = datetime.date.today()
file_name = './data.csv'

def server_test(server_v1=SERVER, waiting_port_v1=WAITING_PORT):
    import socket
    import threading
    
    def data_recv(socket, client_address):
        data_r = socket.recv(1024)
        data_r_json = data_r.decode('utf-8')
        if not data_r_json.strip():
            print("no data.")
            print(data_r_json)
        else:
            print(data_r_json)

            data_r_list = json.loads(data_r_json)
            print(data_r_list)

            data0 = data_r_list[0]
            date_dht = data0["Date"]
            time_dht = data0["Time"]
            tempe_dht = data0["Temperature"]
            humid_dht = data0["Humidity"]
            flag_dht = data0.get("Flag", "")  # ← 追加（なければ空文字）

            with open(file_name, mode='a') as f:
                row_str = f"{date_dht},{time_dht},{tempe_dht},{humid_dht},{flag_dht}\n"
                f.write(row_str)
                f.write('\n')

            print("tempe:" + str(tempe_dht))
            print("humid:" + str(humid_dht))
            print("time:" + str(time_dht))
            print("flag:" + str(flag_dht))  # ← 追加（確認用）

            time.sleep(LOOP_WAIT)

        print("closing the data socket.")
        socket.close()


    socket_w = socket.socket(socket.AF_INET, socket.SOCK_STREAM)

    socket_w.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)

    node_s = server_v1
    port_s = waiting_port_v1
    socket_w.bind((node_s, port_s)) 

    BACKLOG = 5
    socket_w.listen(BACKLOG)

    print('Waiting for the connection from the client(s). '
        + 'node: ' + node_s + '  '
        + 'port: ' + str(port_s))

    while True:
        try:
            socket_s_r = None
            socket_s_r, client_address = socket_w.accept()
            print('Connection from ' 
                + str(client_address) 
                + " has been established.")

            
            thread = threading.Thread(target=data_recv, args=(socket_s_r, client_address))
            thread.start()

            time.sleep(LOOP_WAIT)

        except json.decoder.JSONDecodeError:
            print("JSONDecodeError")
        except KeyboardInterrupt:
            print("Ctrl-C is hit!")
            print("Now, closing the data socket.")
            socket_s_r.close()
            print("Now, closing the waiting socket.")
            socket_w.close()
            break

if __name__ == '__main__':
    print("Start if __name__ == '__main__'")

    sys_argc = len(sys.argv)
    count = 1
    hostname_v = SERVER
    waiting_port_v = WAITING_PORT

    while True:
            print(count, "/", sys_argc)
            if(count >= sys_argc):
                break

            option_key = sys.argv[count]
            if ("-h" == option_key):
                count = count + 1
                hostname_v = sys.argv[count]

            if ("-p" == option_key):
                count = count + 1
                waiting_port_v = int(sys.argv[count])

            if ("-k" == option_key):
                count = count + 1
                key_id_v = sys.argv[count]


            count = count + 1

    print(hostname_v)
    print(waiting_port_v)
    
    server_test(hostname_v, waiting_port_v)