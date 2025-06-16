from flask import Flask, render_template, jsonify
import csv

app = Flask(__name__)

@app.route("/", methods=["GET"])
def index1():
    return render_template("file_show.html")

@app.route("/data.json", methods=["GET"])
def get_json_data():
    filename = 'data.csv'
    data_list = []
    try:
        with open(filename, encoding='utf-8', newline="") as f:
            csv_data = csv.reader(f)
            for row in csv_data:
                data_list.append({
                    "temp": row[0],
                    "humid": row[1]
                })
    except FileNotFoundError:
        return jsonify({"error": f"File '{filename}' not found."}), 404
    return jsonify(data_list)

if __name__ == "__main__":
    app.run(host = '0.0.0.0', port=5000, debug=True)