import sys
import RPi.GPIO as GPIO
import dht11_takemoto as dht11
import time
import datetime
import socket
import json

# ====== 設定 ======
GPIO.setwarnings(True)
GPIO.setmode(GPIO.BCM)
dht11_instance = dht11.DHT11(pin=26)

WAIT_INTERVAL = 10
WAIT_INTERVAL_RETRY = 10

SERVER = '10.192.138.201'
WAITING_PORT = 8765
DEFAULT_LOCATION = "lab-A"
METHOD = "gpio"  # "gpio" or "arduino"
SERIAL_PORT = "/dev/ttyUSB0"
BAUD_RATE = 9600

# ====== DHTデータ取得関数 ======
def read_from_arduino():
    import serial
    try:
        with serial.Serial(SERIAL_PORT, BAUD_RATE, timeout=2) as ser:
            line = ser.readline().decode('utf-8').strip()
            temp_str, hum_str = line.split(",")
            return float(temp_str), float(hum_str)
    except Exception as e:
        print("Arduino read error:", e)
        raise

def read_from_gpio():
    try:
        tempe, hum, check = dht11_instance.read()
        print('Last valid input: ' + str(datetime.datetime.now()))
        print('Temperature: %-3.1f C' % tempe)
        print('Humidity: %-3.1f %%' % hum)
        return float(tempe), float(hum)
    except dht11.DHT11CRCError as e:
        print("DHT11CRCError:", e)
        raise
    except dht11.DHT11MissingDataError as e:
        print("DHT11MissingDataError:", e)
        raise

def get_dht_data():
    if METHOD == "arduino":
        return read_from_arduino()
    else:
        return read_from_gpio()

# ====== ソケット送信メイン関数 ======
def client_data(hostname_v1=SERVER, waiting_port_v1=WAITING_PORT, location_v=DEFAULT_LOCATION):
    node_s = hostname_v1
    port_s = waiting_port_v1
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

            # 異常値検知
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
                "Location": location_v
            }]
            print("Temperature: %f  Humidity: %f" % (tempe, humid), now_date_str, now_time_str, "Flag:", flag_str)
            data_s_json = json.dumps(data_s_list)
            data_s = data_s_json.encode('utf-8')
            socket_r_s.send(data_s)
            socket_r_s.close()

            prev_temp = tempe
            prev_hum = humid

        except Exception as e:
            print(f"Data acquisition error: {e}")
            time.sleep(WAIT_INTERVAL_RETRY)
        except KeyboardInterrupt:
            print("Ctrl-C is hit!")
            break

        next_time = time.time() + WAIT_INTERVAL
        while time.time() < next_time:
            time.sleep(0.1)

# ====== 実行ブロック ======
if __name__ == '__main__':
    print("Start if __name__ == '__main__'")
    sys_argc = len(sys.argv)
    count = 1
    hostname_v = SERVER
    waiting_port_v = WAITING_PORT
    location_v = DEFAULT_LOCATION

    while count < sys_argc:
        option_key = sys.argv[count]
        if option_key == "-h":
            count += 1
            hostname_v = sys.argv[count]
        elif option_key == "-p":
            count += 1
            waiting_port_v = int(sys.argv[count])
        elif option_key in ("-l", "--location"):
            count += 1
            location_v = sys.argv[count]
        elif option_key == "--method":
            count += 1
            METHOD = sys.argv[count]
        count += 1

    print("host:", hostname_v)
    print("port:", waiting_port_v)
    print("location:", location_v)
    print("method:", METHOD)

    client_data(hostname_v, waiting_port_v, location_v)
