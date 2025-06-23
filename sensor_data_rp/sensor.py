#!/usr/bin/env /usr/bin/python3
# -*- coding: utf-8 -*-
# Sample Implemantation of IPUT Course IoT Device Programming 3 (2023 Summer)
# Michiharu Takemoto (takemoto.development@gmail.com)
#
# 2025/04/27
# Get temperature and humidity data from DHT11
# Loop vesion with exception
#
# NOT MIT License
#
# You have to use dht11_takemoto libraries by
# storing dht11_takemoto.py in the same directory.
# And, you have to install RPi.GPIO by
# $ pip install RPi.GPIO
# .

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
WAIT_INTERVAL = 2
WAIT_INTERVAL_RETRY = 5

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

def client_data(hostname_v1 = SERVER, waiting_port_v1 = WAITING_PORT, message1 = MESSAGE_FROM_CLIENT):
    node_s = hostname_v1
    port_s = waiting_port_v1
    count = 0
    tempe = 40.0
    humid = 85.0
    while True:
        socket_r_s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        socket_r_s.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
        print("node_s:", node_s,  " port_s:", str(port_s))
        socket_r_s.connect((node_s, port_s))
        print('Connecting to the server. '
            + 'node: ' + node_s + '  '
            + 'port: ' + str(port_s))
        try:
            tempe, humid = get_dht_data()
            now_str = str(datetime.datetime.now().strftime("%H:%M:%S"))
            data_s_list = [{"Temperature": tempe, "Humidity": humid, "Time": now_str}]
            print("Temperature: %f  Humidity: %f" % (tempe, humid), now_str)
            data_s_json = json.dumps(data_s_list)
            data_s = data_s_json.encode('utf-8')
            socket_r_s.send(data_s)
            socket_r_s.close()
        except dht11.DHT11CRCError:
            print("DHT11CRCError in get_dht_data(). Let us ignore it!")
            time.sleep(WAIT_INTERVAL_RETRY)
        except dht11.DHT11MissingDataError:
            print("DHT11MissingDataError in get_dht_data(). Let us ignore it!")
            time.sleep(WAIT_INTERVAL_RETRY)
        except KeyboardInterrupt:
            print("Ctrl-C is hit!")
            break
        time.sleep(WAIT_INTERVAL)
        # count = count + 1
        # if (count > 5):
        #     break

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