from flask import Flask, render_template, jsonify
import pandas as pd
import os

app = Flask(__name__)

def load_csv():
    base_dir = os.path.dirname(os.path.abspath(__file__))
    file_path = os.path.join(base_dir, "data.csv")
    df = pd.read_csv(file_path, names=["date", "time", "temp", "humid", "location"])
    return df

@app.route("/")
def index():
    df = load_csv()

    stats = {
        "temp_max": df["temp"].max(),
        "temp_median": df["temp"].median(),
        "temp_mean": round(df["temp"].mean(),2),
        "temp_mode": df["temp"].mode().iloc[0],
        "humid_max": df["humid"].max(),
        "humid_median": df["humid"].median(),
        "humid_mean": round(df["humid"].mean(),2),
        "humid_mode": df["humid"].mode().iloc[0],
    }

    locations = sorted(df["location"].dropna().unique())
    return render_template("file_show.html", stats=stats, locations=locations)

@app.route("/data.json")
def get_json_data():
    df = load_csv()
    return jsonify(df.to_dict(orient="records"))

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)
