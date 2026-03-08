import requests
import json
import time
import threading
import random

# Aryan's live ngrok tunnel
BACKEND_URL = "https://tempestuous-cleopatra-scabbily.ngrok-free.dev"

# 40-Node Pan-India Network
NODES = [
    # --- MAHARASHTRA (Home Base) ---
    {"id": "PN-VIT", "lat": 18.4636, "lng": 73.8682, "loc": "VIT Pune", "region": "West"},
    {"id": "PN-STN", "lat": 18.5289, "lng": 73.8744, "loc": "Pune Station", "region": "West"},
    {"id": "MB-GTW", "lat": 18.9220, "lng": 72.8347, "loc": "Gateway of India, Mumbai", "region": "West"},
    {"id": "NGP-01", "lat": 21.1458, "lng": 79.0882, "loc": "Nagpur Zero Mile", "region": "West"},

    # --- NORTH INDIA ---
    {"id": "DL-CP", "lat": 28.6315, "lng": 77.2167, "loc": "Connaught Place, Delhi", "region": "North"},
    {"id": "DL-AIR", "lat": 28.5562, "lng": 77.1000, "loc": "Indira Gandhi Intl Airport", "region": "North"},
    {"id": "JK-SGR", "lat": 34.0837, "lng": 74.7973, "loc": "Lal Chowk, Srinagar", "region": "North"},
    {"id": "HP-SML", "lat": 31.1048, "lng": 77.1734, "loc": "Mall Road, Shimla", "region": "North"},
    {"id": "PB-ASR", "lat": 31.6200, "lng": 74.8765, "loc": "Golden Temple, Amritsar", "region": "North"},
    {"id": "UK-DDN", "lat": 30.3165, "lng": 78.0322, "loc": "Clock Tower, Dehradun", "region": "North"},

    # --- SOUTH INDIA ---
    {"id": "KA-BLR", "lat": 12.9716, "lng": 77.5946, "loc": "MG Road, Bengaluru", "region": "South"},
    {"id": "TN-CHN", "lat": 13.0827, "lng": 80.2707, "loc": "Marina Beach, Chennai", "region": "South"},
    {"id": "TS-HYD", "lat": 17.3850, "lng": 78.4867, "loc": "Charminar, Hyderabad", "region": "South"},
    {"id": "KL-TVM", "lat": 8.5241, "lng": 76.9366, "loc": "Trivandrum Center", "region": "South"},
    {"id": "PY-PY",  "lat": 11.9416, "lng": 79.8083, "loc": "Pondicherry Promenade", "region": "South"},

    # --- EAST & NORTH-EAST ---
    {"id": "WB-KOL", "lat": 22.5726, "lng": 88.3639, "loc": "Howrah Bridge, Kolkata", "region": "East"},
    {"id": "OR-BBS", "lat": 20.2961, "lng": 85.8245, "loc": "Bhubaneswar Smart City", "region": "East"},
    {"id": "AS-GHY", "lat": 26.1445, "lng": 91.7362, "loc": "Guwahati Node", "region": "East"},
    {"id": "SK-GGT", "lat": 27.3314, "lng": 88.6138, "loc": "Gangtok Ridge", "region": "East"},
    {"id": "ML-SHL", "lat": 25.5788, "lng": 91.8933, "loc": "Shillong Peak", "region": "East"},

    # --- WEST & CENTRAL ---
    {"id": "GJ-AMD", "lat": 23.0225, "lng": 72.5714, "loc": "Sabarmati Ashram, Ahmedabad", "region": "West"},
    {"id": "RJ-JPR", "lat": 26.9124, "lng": 75.7873, "loc": "Hawa Mahal, Jaipur", "region": "West"},
    {"id": "MP-BHP", "lat": 23.2599, "lng": 77.4126, "loc": "Bhopal Lake Node", "region": "Central"},
    {"id": "CH-RPR", "lat": 21.2514, "lng": 81.6296, "loc": "Raipur Central", "region": "Central"},
    {"id": "GOA-P",  "lat": 15.4909, "lng": 73.8278, "loc": "Panaji Node", "region": "West"},
]

def send_sos(node):
    magnitude = round(random.uniform(2.0, 8.5), 1)
    payload = {
        "lat": node["lat"],
        "lng": node["lng"],
        "message": f"SEISMIC PULSE: {node['loc']} detected {magnitude} Richter",
        "source": "iot_node",
        "node_id": node["id"],
        "metadata": {
            "battery": f"{random.randint(60, 100)}%",
            "magnitude": magnitude,
            "region": node["region"]
        }
    }
    
    try:
        response = requests.post(f"{BACKEND_URL}/api/sos", json=payload, timeout=5)
        print(f"[{node['id']}] Status: {response.status_code} | {node['loc']} ({node['region']})")
    except Exception as e:
        print(f"[{node['id']}] Failed: {e}")

def run_threads(node_list, title):
    print(f"\n--- {title} ---")
    threads = [threading.Thread(target=send_sos, args=(n,)) for n in node_list]
    for t in threads: t.start()
    for t in threads: t.join()
    print(f"--- {title} COMPLETE ---\n")

if __name__ == "__main__":
    while True:
        print("\nDIST.RESS National IoT Simulator")
        print("1. Fire Local Node (VIT Pune)")
        print("2. Fire NATIONAL DISASTER (All 40 Nodes)")
        print("3. Regional Pulse (Random Region)")
        print("q. Quit")
        choice = input("Select: ")
        
        if choice == '1':
            send_sos(NODES[0])
        elif choice == '2':
            run_threads(NODES, "NATIONAL EMERGENCY BURST")
        elif choice == '3':
            region = random.choice(["North", "South", "East", "West", "Central"])
            regional_nodes = [n for n in NODES if n["region"] == region]
            run_threads(regional_nodes, f"REGIONAL PULSE: {region.upper()}")
        elif choice == 'q':
            break