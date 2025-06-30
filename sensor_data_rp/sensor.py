import sys
import RPi.GPIO as GPIO
import dht11_takemoto as dht11
import time
import datetime
import socket
import json

# initialize GPIO
GPIO.setwarnings(True)
GPIO.setmode(GPIO.BCM)
dht11_instance = dht11.DHT11(pin=26)
WAIT_INTERVAL = 10
WAIT_INTERVAL_RETRY = 10

#SERVER = 'localhost'
SERVER = '10.192.138.201'
WAITING_PORT = 8765
MESSAGE_FROM_CLIENT = "Hello, I am a client."

def get_dht_data():
    tempe = 200.0 # unnecessary value-setting
    hum = 100.0 # unnecessary value-setting
    try:
        tempe, hum, check = dht11_instance.read()
        print('Last valid input: ' + str(datetime.datetime.now()))
        print('Temperature: %-3.1f C' % tempe)
        print('Humidity: %-3.1f %%' % hum)
    except dht11.DHT11CRCError:
        print('DHT11CRCError: ' + str(datetime.datetime.now()))
        time.sleep(WAIT_INTERVAL_RETRY)
        raise(dht11.DHT11CRCError)
    except dht11.DHT11MissingDataError:
        print('DHT11MissingDataError: ' + str(datetime.datetime.now()))
        time.sleep(WAIT_INTERVAL_RETRY)
        raise(dht11.DHT11MissingDataError)
    return float(tempe), float(hum)

# ...（上部は変更なし）

def client_data(hostname_v1 = SERVER, waiting_port_v1 = WAITING_PORT, message1 = MESSAGE_FROM_CLIENT):
    node_s = hostname_v1
    port_s = waiting_port_v1
    count = 0
    tempe = 40.0
    humid = 85.0
    prev_temp = None
    prev_hum = None
    while True:
        socket_r_s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        socket_r_s.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
        print("node_s:", node_s,  " port_s:", str(port_s))
        socket_r_s.connect((node_s, port_s))
        print('Connecting to the server. ' + 'node: ' + node_s + '  ' + 'port: ' + str(port_s))
        try:
            tempe, humid = get_dht_data()
            now = datetime.datetime.now()
            now_time_str = now.strftime("%H:%M:%S")
            now_date_str = now.strftime("%Y-%m-%d")

            # フラグ判定
            flag_list = []
            if prev_temp is not None and abs(tempe - prev_temp) >= 5.0:
                flag_list.append("TEMP")
            if prev_hum is not None and abs(humid - prev_hum) >= 10.0:
                flag_list.append("HUM")
            flag_str = ",".join(flag_list)

            data_s_list = [{
                "Date": now_date_str,
                "Time": now_time_str,
                "Temperature": tempe,
                "Humidity": humid,
                "Flag": flag_str
            }]
            print("Temperature: %f  Humidity: %f" % (tempe, humid), now_date_str, now_time_str, "Flag:", flag_str)
            data_s_json = json.dumps(data_s_list)
            data_s = data_s_json.encode('utf-8')
            socket_r_s.send(data_s)
            socket_r_s.close()

            prev_temp = tempe
            prev_hum = humid

        except dht11.DHT11CRCError:
            print("DHT11CRCError in get_dht_data(). Let us ignore it!")
            time.sleep(WAIT_INTERVAL_RETRY)
        except dht11.DHT11MissingDataError:
            print("DHT11MissingDataError in get_dht_data(). Let us ignore it!")
            time.sleep(WAIT_INTERVAL_RETRY)
        except KeyboardInterrupt:
            print("Ctrl-C is hit!")
            break

        next_time = time.time() + WAIT_INTERVAL
        while time.time() < next_time:
            time.sleep(0.1)

if __name__ == '__main__':
    print("Start if __name__ == '__main__'")
    sys_argc = len(sys.argv)
    count = 1
    hostname_v = SERVER
    waiting_port_v = WAITING_PORT
    message_v = MESSAGE_FROM_CLIENT
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
        if ("-m" == option_key):
            count = count + 1
            message_v = sys.argv[count]
        count = count + 1
    print(hostname_v)
    print(waiting_port_v)
    print(message_v)
    client_data(hostname_v, waiting_port_v, message_v)