import requests
import json
import time
import threading

# UPDATED: Pointing to the live tunnel for the seismic burst test
BACKEND_URL = "https://tempestuous-cleopatra-scabbily.ngrok-free.dev"

# 6 Virtual Nodes around Pune (VIT area)
NODES = [
    {"id": "node-001", "lat": 18.4636, "lng": 73.8682, "msg": "Seismic Alert - Block A"},
    {"id": "node-002", "lat": 18.4640, "lng": 73.8675, "msg": "Seismic Alert - Block B"},
    {"id": "node-003", "lat": 18.4630, "lng": 73.8690, "msg": "Seismic Alert - Canteen Area"},
    {"id": "node-004", "lat": 18.4625, "lng": 73.8680, "msg": "Seismic Alert - Library"},
    {"id": "node-005", "lat": 18.4645, "lng": 73.8685, "msg": "Seismic Alert - Main Gate"},
    {"id": "node-006", "lat": 18.4633, "lng": 73.8670, "msg": "Seismic Alert - Parking"},
]

def send_sos(node):
    payload = {
        "lat": node["lat"],
        "lng": node["lng"],
        "message": node["msg"],
        "source": "iot_node", # Must be exact per api-contract
        "node_id": node["id"],
        "metadata": {"battery": "88%", "temp_c": 24.5}
    }
    
    try:
        response = requests.post(
            f"{BACKEND_URL}/api/sos",
            json=payload,
            timeout=5
        )
        print(f"[{node['id']}] Status: {response.status_code} - {response.text}")
    except Exception as e:
        print(f"[{node['id']}] Connection Failed: {e}")

def trigger_earthquake_burst():
    print(f"\n--- TRIGGERING SEISMIC BURST (6 NODES) ---")
    threads = []
    for node in NODES:
        t = threading.Thread(target=send_sos, args=(node,))
        threads.append(t)
        t.start()
    
    for t in threads:
        t.join()
    print("--- BURST COMPLETE ---\n")

if __name__ == "__main__":
    while True:
        print("1. Fire single SOS (Node-001)")
        print("2. Fire EARTHQUAKE BURST (All 6 Nodes)")
        print("q. Quit")
        choice = input("Select Option: ")
        
        if choice == '1':
            send_sos(NODES[0])
        elif choice == '2':
            trigger_earthquake_burst()
        elif choice == 'q':
            break