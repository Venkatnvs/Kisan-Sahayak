import requests
import json

reqUrl = "http://127.0.0.1:8000/api/core/field-data/"

# Open the image file in binary mode
with open("D:\Reactjs\AgriBot\images.jpeg", "rb") as img_file:
    files = {"img": img_file}  # Attach the file
    json_data = {
        "main_field": 1,
        "temperature": 20,
        "humidity": 20,
        "soil_moisture": 10,
        "description": "",
        "location": json.dumps({"lat": 0, "lng": 0}),
    }

    headers = {"Accept": "*/*", "User-Agent": "Thunder Client"}

    # Send POST request with form-data (not JSON)
    response = requests.post(reqUrl, data=json_data, files=files, headers=headers)

print(response.text)  # Print API response
